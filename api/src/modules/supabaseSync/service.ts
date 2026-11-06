import type pg from 'pg';
import { prisma } from '../../config/db.js';
import type { SharedLink, SocialPost } from '../../generated/prisma/client.js';
import { getSupabasePool } from './db.js';
import { runSupabaseMigrations } from './migrations.js';

const REQUEST_SYNC_TIMEOUT_MS = 5_000;
const RETRY_INTERVAL_MS = 5 * 60 * 1000;
const BATCH_SIZE = 100;

/** Values for preppros.social_posts. YouTube rows carry the link only, never the extracted content. */
function socialPostValues(post: SocialPost) {
  const content = post.platform === 'instagram';
  const keep = <T>(value: T) => (content ? value : null);
  return [
    post.id,
    post.platform,
    post.contentType,
    post.shortcode,
    post.url,
    post.status,
    post.scrapeError,
    post.scrapedAt,
    keep(post.externalId),
    keep(post.authorUsername),
    keep(post.authorProfileUrl),
    keep(post.authorAvatarUrl),
    keep(post.authorFollowers),
    keep(post.authorIsVerified),
    keep(post.caption),
    content ? post.hashtags : [],
    keep(post.thumbnailUrl),
    keep(post.videoUrl),
    keep(post.durationSeconds),
    keep(post.likesCount?.toString() ?? null),
    keep(post.commentsCount),
    keep(post.viewsCount?.toString() ?? null),
    keep(post.postedAt),
    content && post.raw !== null ? JSON.stringify(post.raw) : null,
    post.createdAt,
    post.updatedAt,
  ];
}

const SOCIAL_POST_COLUMNS = [
  'id', 'platform', 'content_type', 'shortcode', 'url', 'status', 'scrape_error', 'scraped_at',
  'external_id', 'author_username', 'author_profile_url', 'author_avatar_url', 'author_followers',
  'author_is_verified', 'caption', 'hashtags', 'thumbnail_url', 'video_url', 'duration_seconds',
  'likes_count', 'comments_count', 'views_count', 'posted_at', 'raw', 'created_at', 'updated_at',
];

const upsertSql = (table: string, columns: string[], conflict: string) => `
  INSERT INTO preppros.${table} (${columns.join(', ')})
  VALUES (${columns.map((_, index) => `$${index + 1}`).join(', ')})
  ON CONFLICT (${conflict}) DO UPDATE SET
    ${columns.map((column) => `${column} = EXCLUDED.${column}`).join(', ')}, synced_at = now()`;

const SOCIAL_POST_UPSERT = upsertSql('social_posts', SOCIAL_POST_COLUMNS, 'platform, shortcode');

const SHARED_LINK_COLUMNS = [
  'id', 'user_id', 'social_post_id', 'url', 'via', 'share_count', 'first_shared_at', 'last_shared_at',
  'updated_at',
];
const SHARED_LINK_UPSERT = upsertSql('shared_links', SHARED_LINK_COLUMNS, 'user_id, social_post_id');

const isPending = (row: { supabaseSyncedAt: Date | null; updatedAt: Date }) =>
  row.supabaseSyncedAt === null || row.supabaseSyncedAt < row.updatedAt;

// Marked with raw SQL: a Prisma update would bump updatedAt and make the row look changed again
const markPostSynced = (post: SocialPost) =>
  prisma.$executeRaw`UPDATE social_posts SET supabase_synced_at = ${post.updatedAt} WHERE id = ${post.id}::uuid`;
const markLinkSynced = (link: SharedLink) =>
  prisma.$executeRaw`UPDATE shared_links SET supabase_synced_at = ${link.updatedAt} WHERE id = ${link.id}::uuid`;

async function copyPost(pool: pg.Pool, post: SocialPost) {
  await pool.query(SOCIAL_POST_UPSERT, socialPostValues(post));
  await markPostSynced(post);
}

async function copyLink(pool: pg.Pool, link: SharedLink & { socialPost: SocialPost }) {
  // The link points at the post, so the post has to be there first
  if (isPending(link.socialPost)) await copyPost(pool, link.socialPost);
  await pool.query(SHARED_LINK_UPSERT, [
    link.id,
    link.userId,
    link.socialPostId,
    link.url,
    link.via,
    link.shareCount,
    link.firstSharedAt,
    link.lastSharedAt,
    link.updatedAt,
  ]);
  await markLinkSynced(link);
}

/** Copies one shared link (and its post) to Supabase. */
export async function syncSharedLink(id: string) {
  const pool = getSupabasePool();
  if (!pool) return;
  const link = await prisma.sharedLink.findUnique({ where: { id }, include: { socialPost: true } });
  if (link) await copyLink(pool, link);
}

/**
 * Copies a shared link right after the user provided it, without ever failing their request: if
 * Supabase is slow or down, the row stays pending and the retry loop copies it later.
 */
export async function syncSharedLinkSoon(id: string) {
  if (!getSupabasePool()) return;
  const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), REQUEST_SYNC_TIMEOUT_MS).unref());
  const outcome = await Promise.race([
    syncSharedLink(id).catch((error: Error) => error),
    timeout,
  ]);
  if (outcome instanceof Error) console.warn(`Supabase copy of shared link ${id} failed, will retry: ${outcome.message}`);
}

/** Copies every row that changed since its last copy. Returns how many rows were copied. */
export async function syncPending(): Promise<number> {
  const pool = getSupabasePool();
  if (!pool) return 0;
  let copied = 0;

  for (;;) {
    const posts = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM social_posts
      WHERE supabase_synced_at IS NULL OR supabase_synced_at < updated_at
      ORDER BY updated_at LIMIT ${BATCH_SIZE}`;
    if (posts.length === 0) break;
    for (const { id } of posts) {
      const post = await prisma.socialPost.findUnique({ where: { id } });
      if (post) await copyPost(pool, post);
      copied++;
    }
  }

  for (;;) {
    const links = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM shared_links
      WHERE supabase_synced_at IS NULL OR supabase_synced_at < updated_at
      ORDER BY updated_at LIMIT ${BATCH_SIZE}`;
    if (links.length === 0) break;
    for (const { id } of links) {
      await syncSharedLink(id);
      copied++;
    }
  }
  return copied;
}

let retryTimer: NodeJS.Timeout | undefined;

/** Prepares the Supabase tables, copies anything pending, then keeps retrying every few minutes. */
export async function startSupabaseSync() {
  const pool = getSupabasePool();
  if (!pool) {
    console.log('SUPABASE_DB_URL is not set: links are stored in the local database only');
    return;
  }

  const run = async () => {
    try {
      const copied = await syncPending();
      if (copied > 0) console.log(`Copied ${copied} pending rows to Supabase`);
    } catch (error) {
      console.warn(`Supabase copy failed, will retry: ${(error as Error).message}`);
    }
  };

  try {
    const applied = await runSupabaseMigrations(pool);
    if (applied.length > 0) console.log(`Applied Supabase migrations: ${applied.join(', ')}`);
  } catch (error) {
    console.error('Supabase migrations could not run; copying is paused until restart', error);
    return;
  }
  await run();
  retryTimer = setInterval(run, RETRY_INTERVAL_MS);
  retryTimer.unref();
}

export function stopSupabaseSync() {
  clearInterval(retryTimer);
}
