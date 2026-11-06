import { prisma } from '../../config/db.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { ListBookmarksQuery } from './schema.js';

/** What `importStatus` is worked out from. */
const withPostStatus = {
  socialPost: {
    select: {
      status: true,
      scrapeError: true,
      contentType: true,
      caption: true,
      hashtags: true,
      photos: true,
      videos: true,
      videoUrl: true,
      durationSeconds: true,
      likesCount: true,
      commentsCount: true,
      viewsCount: true,
      postedAt: true,
      scrapeJob: { select: { enqueuedAt: true } },
    },
  },
} as const;

export type BookmarkWithPost = Prisma.BookmarkGetPayload<{ include: typeof withPostStatus }>;

export function findUserBookmarks(userId: string, query: ListBookmarksQuery): Promise<BookmarkWithPost[]> {
  const where: Prisma.BookmarkWhereInput = { userId };
  if (query.source !== 'all') where.source = query.source;
  if (query.category !== 'all') where.category = query.category;
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { author: { contains: query.search, mode: 'insensitive' } },
      { notes: { contains: query.search, mode: 'insensitive' } },
      { ingredients: { has: query.search } },
      { socialPost: { caption: { contains: query.search, mode: 'insensitive' } } },
      { socialPost: { title: { contains: query.search, mode: 'insensitive' } } },
      { socialPost: { authorUsername: { contains: query.search, mode: 'insensitive' } } },
      { socialPost: { hashtags: { has: query.search.replace(/^#/, '').toLowerCase() } } },
    ];
  }

  return prisma.bookmark.findMany({
    where,
    include: withPostStatus,
    orderBy:
      query.sort === 'title_asc'
        ? [{ title: 'asc' }, { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }, { id: 'asc' }],
  });
}

export function findUserBookmark(userId: string, id: string) {
  return prisma.bookmark.findFirst({ where: { id, userId }, include: withPostStatus });
}

/** The bookmark a user already has for a post, if any. */
export function findUserBookmarkForPost(userId: string, socialPostId: string) {
  return prisma.bookmark.findFirst({ where: { userId, socialPostId }, include: withPostStatus });
}

/** Fills in every bookmark still waiting on this post; bookmarks edited or finished earlier are left alone. */
export function fillAwaitingBookmarks(socialPostId: string, data: Prisma.BookmarkUncheckedUpdateManyInput) {
  return prisma.bookmark.updateMany({
    where: { socialPostId, awaitingContent: true },
    data: { ...data, awaitingContent: false },
  });
}

export function createBookmark(data: Prisma.BookmarkUncheckedCreateInput) {
  return prisma.bookmark.create({ data, include: withPostStatus });
}

/** Deletes the bookmark if it belongs to the user; returns how many rows were removed. */
export async function deleteUserBookmark(userId: string, id: string): Promise<number> {
  const { count } = await prisma.bookmark.deleteMany({ where: { id, userId } });
  return count;
}
