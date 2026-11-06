import { randomUUID } from 'node:crypto';
import { prisma } from '../../config/db.js';
import { ensureBucket, isStorageConfigured, uploadJsonl } from './storage.js';

const BACKUP_INTERVAL_MS = 60_000;
const BATCH_SIZE = 200;
/** Limits one run, so a row that can never be marked done cannot loop forever. */
const MAX_BATCHES = 50;

/**
 * JSONL backup of what users share, in a private Supabase Storage bucket:
 *   links/YYYY/MM/DD/<time>-<id>.jsonl      Instagram and YouTube links, and who shared them
 *   instagram/YYYY/MM/DD/<time>-<id>.jsonl  Bright Data's extracted Instagram content
 *
 * Storage objects cannot be appended to, so each run writes new files and existing ones never change.
 * A row is marked after its file is uploaded: a crash can repeat a line, never lose one. To restore,
 * keep the line with the newest `updated_at` for each `id`.
 */
function objectPath(folder: string, now = new Date()) {
  const [date, time] = now.toISOString().split('T');
  return `${folder}/${date.replaceAll('-', '/')}/${time.replace(/\D/g, '')}-${randomUUID()}.jsonl`;
}

const toJsonl = (rows: unknown[]) => `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`;

async function backupLinks(): Promise<number> {
  const pending = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM shared_links
    WHERE supabase_backed_up_at IS NULL OR supabase_backed_up_at < updated_at
    ORDER BY updated_at LIMIT ${BATCH_SIZE}`;
  if (pending.length === 0) return 0;

  const links = await prisma.sharedLink.findMany({
    where: { id: { in: pending.map(({ id }) => id) } },
    include: { socialPost: true },
  });
  await uploadJsonl(
    objectPath('links'),
    toJsonl(
      links.map((link) => ({
        type: 'link',
        id: link.id,
        user_id: link.userId,
        social_post_id: link.socialPostId,
        platform: link.socialPost.platform,
        content_type: link.socialPost.contentType,
        shortcode: link.socialPost.shortcode,
        url: link.url,
        canonical_url: link.socialPost.url,
        via: link.via,
        share_count: link.shareCount,
        first_shared_at: link.firstSharedAt,
        last_shared_at: link.lastSharedAt,
        updated_at: link.updatedAt,
      })),
    ),
  );
  // Raw SQL so updated_at is left alone; a row changed since it was read stays due
  for (const link of links) {
    await prisma.$executeRaw`UPDATE shared_links SET supabase_backed_up_at = ${link.updatedAt} WHERE id = ${link.id}::uuid`;
  }
  return links.length;
}

async function backupInstagramContent(): Promise<number> {
  const pending = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM social_posts
    WHERE platform = 'instagram' AND status = 'ready'
      AND (supabase_backed_up_at IS NULL OR supabase_backed_up_at < updated_at)
    ORDER BY updated_at LIMIT ${BATCH_SIZE}`;
  if (pending.length === 0) return 0;

  const posts = await prisma.socialPost.findMany({
    where: { id: { in: pending.map(({ id }) => id) } },
    include: { sharedLinks: { select: { userId: true } } },
  });
  await uploadJsonl(
    objectPath('instagram'),
    toJsonl(
      posts.map((post) => ({
        type: 'instagram_content',
        id: post.id,
        user_ids: post.sharedLinks.map((link) => link.userId),
        content_type: post.contentType,
        shortcode: post.shortcode,
        url: post.url,
        scraped_at: post.scrapedAt,
        updated_at: post.updatedAt,
        raw: post.raw,
      })),
    ),
  );
  for (const post of posts) {
    await prisma.$executeRaw`UPDATE social_posts SET supabase_backed_up_at = ${post.updatedAt} WHERE id = ${post.id}::uuid`;
  }
  return posts.length;
}

/** Writes everything not yet backed up. Returns how many rows were written. */
export async function backupPending(): Promise<number> {
  if (!isStorageConfigured()) return 0;
  let written = 0;
  for (const backup of [backupLinks, backupInstagramContent]) {
    for (let batch = 0; batch < MAX_BATCHES; batch++) {
      const count = await backup();
      written += count;
      if (count < BATCH_SIZE) break;
    }
  }
  return written;
}

let timer: NodeJS.Timeout | undefined;

/** Runs the backup every minute. Rows stay pending through any failure, so nothing is skipped. */
export function startSupabaseBackup() {
  if (!isStorageConfigured()) {
    console.log('SUPABASE_SECRET_KEY is not set: the Storage backup is off, rows wait until it is set');
    return;
  }
  let bucketReady = false;
  const run = async () => {
    try {
      if (!bucketReady) {
        await ensureBucket();
        bucketReady = true;
      }
      const written = await backupPending();
      if (written > 0) console.log(`Backed up ${written} rows to Supabase Storage`);
    } catch (error) {
      console.warn(`Supabase Storage backup failed, will retry: ${(error as Error).message}`);
    }
  };
  void run();
  timer = setInterval(run, BACKUP_INTERVAL_MS);
  timer.unref();
}

export function stopSupabaseBackup() {
  clearInterval(timer);
}
