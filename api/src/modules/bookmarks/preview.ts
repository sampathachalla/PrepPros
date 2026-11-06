import type { LinkShareMethod, SocialPost } from '../../generated/prisma/client.js';
import { AppError } from '../../utils/AppError.js';
import { identifyPost, readSocialPost, rememberSharedLink } from '../socialPosts/service.js';

const MAX_TITLE_LENGTH = 100;

/** Details read from a pasted link, used to pre-fill the import form. */
export interface LinkPreview {
  /** The stored post; pass-through for clients that want its full details. */
  socialPostId: string;
  source: 'instagram' | 'youtube';
  url: string;
  title: string;
  author: string;
  thumbnailUrl?: string;
  /** Instagram caption or YouTube description, which often hold the recipe. */
  description?: string;
  /** What is said in the video (YouTube captions). */
  transcript?: string;
}

/** First caption line without hashtags, shortened at a word boundary. */
export function titleFromCaption(caption: string): string | undefined {
  const line = caption
    .split('\n')
    .map((text) => text.replace(/#[\p{L}\p{N}_]+/gu, '').replace(/^[\s|•·:–—-]+/u, '').trim())
    .find(Boolean);
  if (!line || line.length <= MAX_TITLE_LENGTH) return line;
  return `${line.slice(0, MAX_TITLE_LENGTH - 1).replace(/\s+\S*$/, '')}…`;
}

/** How a post's creator is shown: Instagram handles get an @, YouTube channels keep their name. */
export function postAuthor(post: SocialPost): string {
  if (post.platform === 'youtube') return post.authorUsername ?? 'YouTube';
  return post.authorUsername ? `@${post.authorUsername}` : 'Instagram';
}

/** The best title a post offers. */
export function postTitle(post: SocialPost): string {
  return (
    post.title ??
    (post.caption && titleFromCaption(post.caption)) ??
    (post.platform === 'instagram' ? `Recipe from ${postAuthor(post)}` : 'YouTube video')
  );
}

/** Reads a link the user provided and remembers it for them, even when reading it fails. */
export async function previewLink(userId: string, rawUrl: string, via: LinkShareMethod): Promise<LinkPreview> {
  const url = new URL(rawUrl);
  identifyPost(url); // unsupported links are rejected before anything is stored

  let post;
  try {
    post = await readSocialPost(url);
  } catch (error) {
    if (error instanceof AppError) {
      await rememberSharedLink(userId, rawUrl, via).catch((rememberError) =>
        console.error('Could not record shared link', rememberError),
      );
    }
    throw error;
  }
  await rememberSharedLink(userId, rawUrl, via);

  return {
    socialPostId: post.id,
    source: post.platform,
    url: post.url,
    title: postTitle(post),
    author: postAuthor(post),
    thumbnailUrl: post.thumbnailUrl ?? undefined,
    description: post.caption ?? undefined,
    transcript: post.transcript ?? undefined,
  };
}
