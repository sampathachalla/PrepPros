import { prisma } from '../../config/db.js';
import type { LinkShareMethod, Prisma, SocialPlatform } from '../../generated/prisma/client.js';
import type { ListSocialPostsQuery } from './schema.js';
import type { PostIdentity, ScrapedPost } from './types.js';

export function findByShortcode(platform: SocialPlatform, shortcode: string) {
  return prisma.socialPost.findUnique({ where: { platform_shortcode: { platform, shortcode } } });
}

export function findById(id: string) {
  return prisma.socialPost.findUnique({ where: { id } });
}

/** Stores a fresh scrape, replacing what was there before. */
export function saveScrapedPost({ platform, shortcode, ...post }: ScrapedPost) {
  const data = { ...post, status: 'ready' as const, scrapeError: null, scrapedAt: new Date() };
  return prisma.socialPost.upsert({
    where: { platform_shortcode: { platform, shortcode } },
    create: { platform, shortcode, ...data },
    update: data,
  });
}

/** Records a failed scrape; data from an earlier successful scrape is kept. */
export function saveFailedScrape({ platform, shortcode, contentType, url }: PostIdentity, error: string) {
  const data = { status: 'failed' as const, scrapeError: error, scrapedAt: new Date() };
  return prisma.socialPost.upsert({
    where: { platform_shortcode: { platform, shortcode } },
    create: { platform, shortcode, contentType, url, ...data },
    update: data,
  });
}

/** Marks a failed post as waiting to be read again. */
export function markPending(id: string) {
  return prisma.socialPost.updateMany({ where: { id, status: 'failed' }, data: { status: 'pending', scrapeError: null } });
}

export function findReadyPosts(query: ListSocialPostsQuery) {
  const where: Prisma.SocialPostWhereInput = { status: 'ready' };
  if (query.platform) where.platform = query.platform;
  if (query.hashtag) where.hashtags = { has: query.hashtag };
  if (query.author) where.authorUsername = { equals: query.author, mode: 'insensitive' };
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { caption: { contains: query.search, mode: 'insensitive' } },
      { transcript: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  return prisma.socialPost.findMany({
    where,
    orderBy: [{ scrapedAt: 'desc' }, { id: 'asc' }],
    take: query.limit,
    skip: query.offset,
  });
}

/** The post row for a link, created as `pending` when nothing has been read from it yet. */
export function ensurePostRow({ platform, shortcode, contentType, url }: PostIdentity) {
  return prisma.socialPost.upsert({
    where: { platform_shortcode: { platform, shortcode } },
    create: { platform, shortcode, contentType, url, status: 'pending' },
    update: {},
  });
}

/**
 * Records that a user provided a link. `countShare` adds to the share count; it is off when the same
 * link is saved right after being previewed, so one paste counts once.
 */
export function recordSharedLink(
  userId: string,
  socialPostId: string,
  url: string,
  via: LinkShareMethod,
  countShare: boolean,
) {
  return prisma.sharedLink.upsert({
    where: { userId_socialPostId: { userId, socialPostId } },
    create: { userId, socialPostId, url, via },
    update: countShare ? { url, via, shareCount: { increment: 1 }, lastSharedAt: new Date() } : {},
  });
}
