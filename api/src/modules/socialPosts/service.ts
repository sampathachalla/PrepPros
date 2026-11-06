import type { LinkShareMethod, SocialPost } from '../../generated/prisma/client.js';
import { AppError, notFound } from '../../utils/AppError.js';
import { syncSharedLinkSoon } from '../supabaseSync/service.js';
import { detectPlatform } from './links.js';
import { fetchInstagramPost, identifyInstagramPost } from './providers/instagram.js';
import { fetchYouTubeVideo, identifyYouTubeVideo } from './providers/youtube.js';
import * as repository from './repository.js';
import type { ListSocialPostsQuery } from './schema.js';
import type { PostIdentity } from './types.js';

/**
 * A stored post is reused for this long before it is read again. Instagram media links expire after a
 * few days, and every Instagram read is a paid Bright Data request, so a day balances both.
 */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** API shape of a stored post (`raw` is left out; counts become plain numbers). */
export function toSocialPostResponse(post: SocialPost) {
  const { raw: _raw, likesCount, viewsCount, ...rest } = post;
  return {
    ...rest,
    likesCount: likesCount === null ? null : Number(likesCount),
    viewsCount: viewsCount === null ? null : Number(viewsCount),
    postedAt: post.postedAt?.toISOString() ?? null,
    scrapedAt: post.scrapedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

export type SocialPostResponse = ReturnType<typeof toSocialPostResponse>;

/** Which post a link points to, or a 400 explaining what links are supported. */
export function identifyPost(url: URL): PostIdentity {
  const platform = detectPlatform(url);
  if (!platform) {
    throw new AppError(400, 'Only Instagram (Reels/Posts) and YouTube (Videos/Shorts) links are supported');
  }
  const post = platform === 'instagram' ? identifyInstagramPost(url) : identifyYouTubeVideo(url);
  if (!post) {
    throw new AppError(
      400,
      platform === 'instagram'
        ? 'Paste a link to an Instagram post or reel'
        : 'Paste a link to a YouTube video or Short',
    );
  }
  return post;
}

const isFresh = (post: SocialPost) =>
  post.status === 'ready' && post.scrapedAt !== null && Date.now() - post.scrapedAt.getTime() < CACHE_TTL_MS;

/** Returns the stored post for a link, reading it from Instagram/YouTube when missing or stale. */
export async function readSocialPost(url: URL): Promise<SocialPost> {
  const identity = identifyPost(url);
  const stored = await repository.findByShortcode(identity.platform, identity.shortcode);
  if (stored && isFresh(stored)) return stored;

  try {
    const scraped =
      identity.platform === 'instagram' ? await fetchInstagramPost(identity) : await fetchYouTubeVideo(identity);
    return await repository.saveScrapedPost(scraped);
  } catch (error) {
    // Remember posts that are gone or private; temporary failures are not recorded
    if (error instanceof AppError && error.statusCode === 422) {
      await repository.saveFailedScrape(identity, error.message);
    }
    throw error;
  }
}

/**
 * Remembers that a user provided this link (shared into the app or pasted), creating a pending post
 * row if nothing has been read from it yet, and copies it to Supabase.
 */
export async function rememberSharedLink(
  userId: string,
  rawUrl: string,
  via: LinkShareMethod,
  { countShare = true } = {},
) {
  const identity = identifyPost(new URL(rawUrl));
  const post = await repository.ensurePostRow(identity);
  const link = await repository.recordSharedLink(userId, post.id, rawUrl, via, countShare);
  await syncSharedLinkSoon(link.id);
  return { post, link };
}

export async function listSocialPosts(query: ListSocialPostsQuery) {
  const posts = await repository.findReadyPosts(query);
  return posts.map(toSocialPostResponse);
}

export async function getSocialPost(id: string) {
  const post = await repository.findById(id);
  if (!post) throw notFound('Post');
  return toSocialPostResponse(post);
}
