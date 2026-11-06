import { prisma } from '../../config/db.js';
import type { Prisma, SocialPlatform, SocialPost } from '../../generated/prisma/client.js';
import { AppError } from '../../utils/AppError.js';
import { fillBookmarksFromPost } from '../bookmarks/service.js';
import { checkInstagramScrape, startInstagramScrape } from '../socialPosts/providers/instagram.js';
import { fetchYouTubeVideo } from '../socialPosts/providers/youtube.js';
import * as posts from '../socialPosts/repository.js';
import type { PostIdentity, ScrapedPost } from '../socialPosts/types.js';

const TICK_MS = 2_000;
const BATCH_SIZE = 5;
/** Long enough for any one step; after this a crashed worker's job is picked up again. */
const LOCK_SECONDS = 120;
const MAX_ATTEMPTS = 5;
const BASE_RETRY_MS = 30_000;
/** Bright Data usually needs about a minute, so the first check waits for most of it. */
const FIRST_CHECK_MS = 30_000;
const NEXT_CHECK_MS = 5_000;
/** A scrape still unfinished after this is abandoned and tried again. */
const SNAPSHOT_MAX_AGE_MS = 10 * 60 * 1000;

/** Jobs averaged for the wait shown to users: recent enough to follow how Bright Data is doing today. */
const AVERAGE_SAMPLE_SIZE = 20;
/** Used until a platform has finished jobs to average. */
const DEFAULT_WAIT_SECONDS: Record<SocialPlatform, number> = { instagram: 60, youtube: 10 };

type Job = Prisma.ScrapeJobGetPayload<{ include: { socialPost: true } }>;

const identityOf = ({ platform, contentType, shortcode, url }: SocialPost): PostIdentity => ({
  platform,
  contentType,
  shortcode,
  url,
});

let workerStarted = false;

/** Queues a post to be read. A job already waiting or running is left alone; a finished one starts over. */
export async function enqueueScrape(socialPostId: string) {
  await prisma.$executeRaw`
    INSERT INTO scrape_jobs (social_post_id) VALUES (${socialPostId}::uuid)
    ON CONFLICT (social_post_id) DO UPDATE SET
      status = 'queued', attempts = 0, run_at = now(), locked_until = NULL,
      snapshot_id = NULL, snapshot_started_at = NULL, last_error = NULL,
      enqueued_at = now(), finished_at = NULL, updated_at = now()
    WHERE scrape_jobs.status IN ('done', 'failed')`;
  if (workerStarted) void tick();
}

/** How long recent imports took per platform, queueing and retries included. */
export async function averageWaitSeconds(): Promise<Record<SocialPlatform, number>> {
  const rows = await prisma.$queryRaw<{ platform: SocialPlatform; seconds: number }[]>`
    SELECT platform, avg(seconds)::float8 AS seconds FROM (
      SELECT p.platform, extract(epoch FROM j.finished_at - j.enqueued_at) AS seconds,
        row_number() OVER (PARTITION BY p.platform ORDER BY j.finished_at DESC) AS recency
      FROM scrape_jobs j JOIN social_posts p ON p.id = j.social_post_id
      WHERE j.status = 'done' AND j.finished_at IS NOT NULL
    ) recent
    WHERE recency <= ${AVERAGE_SAMPLE_SIZE}
    GROUP BY platform`;
  const averages = { ...DEFAULT_WAIT_SECONDS };
  for (const { platform, seconds } of rows) averages[platform] = Math.max(1, Math.round(seconds));
  return averages;
}

/** Takes due jobs. SKIP LOCKED lets several API instances share the queue without taking the same job. */
async function claimDueJobs(): Promise<Job[]> {
  const claimed = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE scrape_jobs SET
      status = 'running',
      locked_until = now() + make_interval(secs => ${LOCK_SECONDS}),
      updated_at = now()
    WHERE id IN (
      SELECT id FROM scrape_jobs
      WHERE status IN ('queued', 'running')
        AND run_at <= now()
        AND (locked_until IS NULL OR locked_until < now())
      ORDER BY run_at
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id`;
  return prisma.scrapeJob.findMany({
    where: { id: { in: claimed.map(({ id }) => id) } },
    include: { socialPost: true },
  });
}

/** Comes back to a job later without counting a failed try. */
const checkAgain = (job: Job, delayMs: number, data: Prisma.ScrapeJobUpdateInput = {}) =>
  prisma.scrapeJob.update({
    where: { id: job.id },
    data: { ...data, runAt: new Date(Date.now() + delayMs), lockedUntil: null },
  });

async function finish(job: Job, scraped: ScrapedPost) {
  const post = await posts.saveScrapedPost(scraped);
  await fillBookmarksFromPost(post);
  await prisma.scrapeJob.update({
    where: { id: job.id },
    data: {
      status: 'done',
      finishedAt: new Date(),
      lockedUntil: null,
      snapshotId: null,
      snapshotStartedAt: null,
      lastError: null,
    },
  });
}

async function advanceInstagram(job: Job, identity: PostIdentity) {
  if (!job.snapshotId) {
    const snapshotId = await startInstagramScrape(identity, job.attempts);
    await checkAgain(job, FIRST_CHECK_MS, { snapshotId, snapshotStartedAt: new Date() });
    return;
  }
  if (Date.now() - (job.snapshotStartedAt?.getTime() ?? 0) > SNAPSHOT_MAX_AGE_MS) {
    throw new AppError(504, 'Instagram is taking too long to respond, please try again');
  }
  const scraped = await checkInstagramScrape(identity, job.snapshotId);
  if (scraped) await finish(job, scraped);
  else await checkAgain(job, NEXT_CHECK_MS);
}

/** After a failure: gives up on posts that are gone or out of tries, otherwise backs off and retries. */
async function handleFailure(job: Job, identity: PostIdentity, error: unknown) {
  const attempts = job.attempts + 1;
  const message = error instanceof AppError ? error.message : 'Could not read this link right now';
  const permanent = error instanceof AppError && error.statusCode === 422;

  if (permanent || attempts >= MAX_ATTEMPTS) {
    await posts.saveFailedScrape(identity, message);
    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: { status: 'failed', attempts, lastError: message, lockedUntil: null, snapshotId: null, snapshotStartedAt: null },
    });
    return;
  }
  if (!(error instanceof AppError)) console.error(`Scrape job ${job.id} failed`, error);
  await checkAgain(job, BASE_RETRY_MS * 2 ** job.attempts, {
    attempts,
    lastError: message,
    snapshotId: null,
    snapshotStartedAt: null,
  });
}

async function runJob(job: Job) {
  const identity = identityOf(job.socialPost);
  try {
    if (identity.platform === 'instagram') await advanceInstagram(job, identity);
    else await finish(job, await fetchYouTubeVideo(identity));
  } catch (error) {
    await handleFailure(job, identity, error);
  }
}

/** Works through every job that is due now. Returns how many were handled. */
export async function processDueJobs(): Promise<number> {
  let handled = 0;
  for (;;) {
    const jobs = await claimDueJobs();
    if (jobs.length === 0) return handled;
    await Promise.all(jobs.map(runJob));
    handled += jobs.length;
  }
}

let timer: NodeJS.Timeout | undefined;
let ticking: Promise<void> | undefined;

function tick(): Promise<void> {
  ticking ??= processDueJobs()
    .then(() => undefined)
    .catch((error) => console.error('Scrape queue tick failed', error))
    .finally(() => {
      ticking = undefined;
    });
  return ticking;
}

export function startScrapeWorker() {
  workerStarted = true;
  timer = setInterval(() => void tick(), TICK_MS);
  timer.unref();
  void tick();
}

/** Stops taking new jobs and waits for the ones in hand. */
export async function stopScrapeWorker() {
  workerStarted = false;
  clearInterval(timer);
  await ticking;
}
