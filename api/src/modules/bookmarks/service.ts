import type { Bookmark, LinkShareMethod, SocialPlatform, SocialPost } from '../../generated/prisma/client.js';
import { AppError, notFound } from '../../utils/AppError.js';
import { averageWaitSeconds, enqueueScrape } from '../scrapeQueue/service.js';
import { detectPlatform, stripTrackingParams } from '../socialPosts/links.js';
import * as socialPosts from '../socialPosts/repository.js';
import { rememberSharedLink } from '../socialPosts/service.js';
import { bookmarkDetailsFromPost } from './recipeDetails.js';
import * as repository from './repository.js';
import type { ImportBookmarkInput, ListBookmarksQuery } from './schema.js';

const DEFAULT_THUMBNAILS = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80',
];

const DEFAULT_AUTHORS = { instagram: '@InstagramChef', youtube: '@YouTubeChef' } as const;
/** Shown until the post has been read. */
const PLACEHOLDER_AUTHORS = { instagram: 'Instagram', youtube: 'YouTube' } as const;
const PLACEHOLDER_TITLES = { instagram: 'Instagram recipe', youtube: 'YouTube recipe' } as const;

type BookmarkWithOptionalPost = Bookmark & {
  socialPost?:
    | (Pick<
        SocialPost,
        | 'status'
        | 'scrapeError'
        | 'contentType'
        | 'caption'
        | 'hashtags'
        | 'photos'
        | 'videos'
        | 'videoUrl'
        | 'durationSeconds'
        | 'likesCount'
        | 'commentsCount'
        | 'viewsCount'
        | 'postedAt'
      > & { scrapeJob?: { enqueuedAt: Date } | null })
    | null;
};

type WaitAverages = Record<SocialPlatform, number>;

/** Whether a bookmark's content has arrived. Only bookmarks imported from a bare link ever wait. */
function importStatus({ awaitingContent, socialPost }: BookmarkWithOptionalPost) {
  if (!awaitingContent) return 'ready' as const;
  return socialPost?.status === 'failed' ? ('failed' as const) : ('processing' as const);
}

/** Same shape as the mobile app's `Bookmark` type. */
export function toBookmarkResponse(bookmark: BookmarkWithOptionalPost, averages?: WaitAverages) {
  const status = importStatus(bookmark);
  const enqueuedAt = bookmark.socialPost?.scrapeJob?.enqueuedAt;
  const showEstimate = status === 'processing' && averages && enqueuedAt && bookmark.source !== 'app';
  return {
    id: bookmark.id,
    title: bookmark.title,
    source: bookmark.source,
    url: bookmark.url,
    thumbnailUrl: bookmark.thumbnailUrl,
    author: bookmark.author,
    category: bookmark.category ?? undefined,
    prepTimeMinutes: bookmark.prepTimeMinutes ?? undefined,
    cookTimeMinutes: bookmark.cookTimeMinutes ?? undefined,
    servings: bookmark.servings ?? undefined,
    ingredients: bookmark.ingredients,
    notes: bookmark.notes ?? undefined,
    createdAt: bookmark.createdAt.toISOString(),
    recipeId: bookmark.recipeId ?? undefined,
    socialPostId: bookmark.socialPostId ?? undefined,
    social: bookmark.socialPost
      ? {
          contentType: bookmark.socialPost.contentType,
          caption: bookmark.socialPost.caption ?? undefined,
          hashtags: bookmark.socialPost.hashtags,
          photos: bookmark.socialPost.photos,
          videos: bookmark.socialPost.videos,
          videoUrl: bookmark.socialPost.videoUrl ?? undefined,
          durationSeconds: bookmark.socialPost.durationSeconds ?? undefined,
          likesCount: bookmark.socialPost.likesCount === null ? undefined : Number(bookmark.socialPost.likesCount),
          commentsCount: bookmark.socialPost.commentsCount ?? undefined,
          viewsCount: bookmark.socialPost.viewsCount === null ? undefined : Number(bookmark.socialPost.viewsCount),
          postedAt: bookmark.socialPost.postedAt?.toISOString(),
        }
      : undefined,
    importStatus: status,
    importError: status === 'failed' ? (bookmark.socialPost?.scrapeError ?? undefined) : undefined,
    /**
     * For showing a countdown. Elapsed time comes from the server so a wrong phone clock or reopening
     * the app can't throw it off.
     */
    importEstimate: showEstimate
      ? {
          averageSeconds: averages[bookmark.source as SocialPlatform],
          elapsedSeconds: Math.max(0, Math.floor((Date.now() - enqueuedAt.getTime()) / 1000)),
        }
      : undefined,
  };
}

export type BookmarkResponse = ReturnType<typeof toBookmarkResponse>;

const totalMinutes = (bookmark: Bookmark) =>
  (bookmark.prepTimeMinutes ?? 0) + (bookmark.cookTimeMinutes ?? 0);

export async function listBookmarks(userId: string, query: ListBookmarksQuery) {
  const bookmarks = await repository.findUserBookmarks(userId, query);
  if (query.sort === 'time') {
    // Quickest first; stable sort keeps newest-first among equal times
    bookmarks.sort((a, b) => totalMinutes(a) - totalMinutes(b));
  }
  const averages = bookmarks.some((bookmark) => bookmark.awaitingContent) ? await averageWaitSeconds() : undefined;
  return bookmarks.map((bookmark) => toBookmarkResponse(bookmark, averages));
}

export async function getBookmark(userId: string, id: string) {
  const bookmark = await repository.findUserBookmark(userId, id);
  if (!bookmark) throw notFound('Bookmark');
  return toBookmarkResponse(bookmark, bookmark.awaitingContent ? await averageWaitSeconds() : undefined);
}

/** Copies what was read from a post into every bookmark waiting for it. */
export async function fillBookmarksFromPost(post: SocialPost) {
  await repository.fillAwaitingBookmarks(post.id, bookmarkDetailsFromPost(post));
}

/** Queues the post again after a failed read; the bookmark shows as processing meanwhile. */
async function requeue(socialPostId: string) {
  await socialPosts.markPending(socialPostId);
  await enqueueScrape(socialPostId);
}

/**
 * Saves a link straight away and reads it in the background, since Instagram takes about a minute. The
 * bookmark starts as a placeholder and is filled in when the post is ready. Saving a link the user
 * already has returns the existing bookmark, trying again if it had failed.
 */
export async function importLink(userId: string, rawUrl: string, via: LinkShareMethod) {
  const url = new URL(rawUrl);
  const { post } = await rememberSharedLink(userId, rawUrl, via);

  const existing = await repository.findUserBookmarkForPost(userId, post.id);
  if (existing) {
    if (importStatus(existing) === 'failed') await requeue(post.id);
    return getBookmark(userId, existing.id);
  }

  const platform = post.platform;
  const bookmark = await repository.createBookmark({
    userId,
    socialPostId: post.id,
    source: platform,
    url: stripTrackingParams(url),
    title: PLACEHOLDER_TITLES[platform],
    author: PLACEHOLDER_AUTHORS[platform],
    thumbnailUrl: DEFAULT_THUMBNAILS[Math.floor(Math.random() * DEFAULT_THUMBNAILS.length)],
    ingredients: [],
    awaitingContent: true,
  });

  if (post.status === 'failed') await requeue(post.id);
  else if (post.status === 'pending') await enqueueScrape(post.id);

  // Read again rather than trusting `post`: the worker may have finished before the bookmark existed,
  // in which case nobody else will fill it in
  const current = await socialPosts.findById(post.id);
  if (current?.status === 'ready') await fillBookmarksFromPost(current);
  return getBookmark(userId, bookmark.id);
}

/** Tries reading a failed import again. */
export async function retryImport(userId: string, id: string) {
  const bookmark = await repository.findUserBookmark(userId, id);
  if (!bookmark) throw notFound('Bookmark');
  if (importStatus(bookmark) !== 'failed' || !bookmark.socialPostId) {
    throw new AppError(409, 'This bookmark has nothing to retry');
  }
  await requeue(bookmark.socialPostId);
  return getBookmark(userId, id);
}

/** Saves an Instagram or YouTube recipe link. */
export async function importBookmark(userId: string, input: ImportBookmarkInput) {
  const url = new URL(input.url);
  const platform = detectPlatform(url);
  if (!platform) {
    throw new AppError(400, 'Only Instagram (Reels/Posts) and YouTube (Videos/Shorts) links are supported');
  }
  if (input.source && input.source !== platform) {
    throw new AppError(400, `This link is from ${platform}, not ${input.source}`);
  }

  const ingredients =
    input.ingredientsText
      ?.split('\n')
      .map((line) => line.trim())
      .filter(Boolean) ?? [];

  // Every saved link is remembered for the user; saving right after a preview doesn't count twice
  const { post } = await rememberSharedLink(userId, input.url, input.via, { countShare: false });
  if (post.status === 'pending') await enqueueScrape(post.id);

  const bookmark = await repository.createBookmark({
    userId,
    socialPostId: post.id,
    source: platform,
    url: stripTrackingParams(url),
    title: input.title,
    category: input.category,
    author: input.author ?? DEFAULT_AUTHORS[platform],
    thumbnailUrl:
      input.thumbnailUrl ?? DEFAULT_THUMBNAILS[Math.floor(Math.random() * DEFAULT_THUMBNAILS.length)],
    prepTimeMinutes: input.prepTimeMinutes,
    cookTimeMinutes: input.cookTimeMinutes,
    servings: input.servings,
    ingredients,
    notes: input.notes,
  });
  return toBookmarkResponse(bookmark);
}

export async function deleteBookmark(userId: string, id: string) {
  const deleted = await repository.deleteUserBookmark(userId, id);
  if (deleted === 0) throw notFound('Bookmark');
}
