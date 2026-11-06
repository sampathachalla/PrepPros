import type { Prisma, SocialContentType, SocialPlatform } from '../../generated/prisma/client.js';

/** Which post a link points to, worked out from the URL alone (no network). */
export interface PostIdentity {
  platform: SocialPlatform;
  contentType: SocialContentType;
  /** Instagram shortcode or YouTube video id. */
  shortcode: string;
  /** Canonical link to the post. */
  url: string;
}

/** Everything read from a platform, ready to store as a `social_posts` row. */
export interface ScrapedPost extends PostIdentity {
  externalId?: string;
  authorUsername?: string;
  authorProfileUrl?: string;
  authorAvatarUrl?: string;
  authorFollowers?: number;
  authorIsVerified?: boolean;
  title?: string;
  caption?: string;
  transcript?: string;
  transcriptLanguage?: string;
  hashtags: string[];
  thumbnailUrl?: string;
  videoUrl?: string;
  photos?: string[];
  videos?: string[];
  durationSeconds?: number;
  likesCount?: bigint;
  commentsCount?: number;
  viewsCount?: bigint;
  postedAt?: Date;
  raw: Prisma.InputJsonValue;
}

/** Hashtags found in free text, lowercase and without '#'. */
export function extractHashtags(text: string | undefined): string[] {
  const tags = text?.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  return [...new Set(tags.map((tag) => tag.slice(1).toLowerCase()))];
}

export const toBigInt = (value: unknown): bigint | undefined => {
  const number = typeof value === 'string' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) ? BigInt(Math.trunc(number)) : undefined;
};

export const toInt = (value: unknown): number | undefined => {
  const number = typeof value === 'string' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) ? Math.trunc(number) : undefined;
};
