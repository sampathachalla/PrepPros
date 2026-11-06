import { env } from '../../../config/env.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import { AppError } from '../../../utils/AppError.js';
import { extractHashtags, toBigInt, toInt, type PostIdentity, type ScrapedPost } from '../types.js';

const API_URL = 'https://api.brightdata.com/datasets/v3';
/** Bright Data Instagram scraper datasets. */
const DATASET_IDS = {
  reel: 'gd_lyclm20il4r5helnj',
  post: 'gd_lk5ns7kz21pck8jpis',
} as const;

/** Bright Data replies within about a minute, otherwise it hands back a snapshot id to wait on. */
const SCRAPE_TIMEOUT_MS = 75_000;
const SNAPSHOT_WAIT_MS = 30_000;
const SNAPSHOT_POLL_MS = 2_000;

interface BrightDataRecord {
  url?: string;
  post_id?: string;
  user_posted?: string;
  user_profile_url?: string;
  profile_image_link?: string;
  followers?: number;
  is_verified?: boolean;
  description?: string;
  hashtags?: string[] | null;
  thumbnail?: string;
  photos?: string[];
  video_url?: string;
  videos?: string[];
  length?: string | number;
  likes?: number;
  num_comments?: number;
  views?: number | null;
  video_play_count?: number | null;
  date_posted?: string;
  error?: string;
  error_code?: string;
}

/**
 * The only error that means the post itself is gone. Anything else (e.g. crawl_error, when Instagram
 * answers Bright Data with a block page) says nothing about the post, so it is worth trying again.
 */
const POST_GONE_ERRORS = new Set(['dead_page']);

const unavailable = () => new AppError(502, 'Could not read this Instagram link right now');

/** Works out the reel or post a link points to, and its canonical form. */
export function identifyInstagramPost(url: URL): PostIdentity | null {
  const segments = url.pathname.split('/').filter(Boolean);
  // Also matches links that include the username, e.g. /{username}/reel/{shortcode}
  const index = segments.findIndex((segment) => ['p', 'reel', 'reels', 'tv'].includes(segment));
  const shortcode = index >= 0 ? segments[index + 1] : undefined;
  if (!shortcode || !/^[\w-]+$/.test(shortcode)) return null;

  const contentType = segments[index] === 'p' ? 'post' : 'reel';
  return {
    platform: 'instagram',
    contentType,
    shortcode,
    url: `https://www.instagram.com/${contentType === 'post' ? 'p' : 'reel'}/${shortcode}/`,
  };
}

async function brightData(path: string, init?: RequestInit & { timeoutMs?: number }) {
  if (!env.BRIGHT_DATA_API_KEY) {
    throw new AppError(503, 'Instagram link previews are not configured');
  }
  try {
    return await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${env.BRIGHT_DATA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(init?.timeoutMs ?? 10_000),
    });
  } catch (error) {
    console.error('Bright Data request failed', error);
    throw unavailable();
  }
}

async function readJson<T>(response: Response, step: string): Promise<T> {
  if (!response.ok) {
    console.error(`Bright Data ${step} returned HTTP ${response.status}: ${await response.text()}`);
    throw unavailable();
  }
  return (await response.json()) as T;
}

/** Waits for a scrape that outlived the synchronous window, then downloads its records. */
async function waitForSnapshot(snapshotId: string): Promise<BrightDataRecord[]> {
  const deadline = Date.now() + SNAPSHOT_WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, SNAPSHOT_POLL_MS));
    const progress = await readJson<{ status: string }>(
      await brightData(`/progress/${encodeURIComponent(snapshotId)}`),
      'progress',
    );
    if (progress.status === 'ready') {
      return readJson(
        await brightData(`/snapshot/${encodeURIComponent(snapshotId)}?format=json`),
        'snapshot download',
      );
    }
    if (progress.status === 'failed' || progress.status === 'canceled') {
      console.error(`Bright Data snapshot ${snapshotId} ended as ${progress.status}`);
      throw unavailable();
    }
  }
  throw new AppError(504, 'Instagram is taking too long to respond, please try again');
}

const datasetFor = (post: PostIdentity) => DATASET_IDS[post.contentType === 'post' ? 'post' : 'reel'];

/** Turns Bright Data's records for a post into a row, or a 422 if the post could not be read. */
function toScrapedPost(post: PostIdentity, records: BrightDataRecord[]): ScrapedPost {
  const record = records[0];
  if (!record?.user_posted) {
    if (record?.error || record?.error_code) {
      console.warn(`Bright Data could not read ${post.url}: ${record.error_code ?? record.error}`);
      if (!POST_GONE_ERRORS.has(record.error_code ?? '')) throw unavailable();
    }
    throw new AppError(422, 'This Instagram post is private or unavailable');
  }

  const caption = record.description?.trim() || undefined;
  const hashtags = record.hashtags?.length
    ? [...new Set(record.hashtags.map((tag) => tag.replace(/^#/, '').toLowerCase()))]
    : extractHashtags(caption);
  const duration = Number(record.length);

  return {
    ...post,
    externalId: record.post_id,
    authorUsername: record.user_posted.replace(/^@/, ''),
    authorProfileUrl: record.user_profile_url,
    authorAvatarUrl: record.profile_image_link,
    authorFollowers: toInt(record.followers),
    authorIsVerified: record.is_verified,
    caption,
    hashtags,
    thumbnailUrl: record.thumbnail ?? record.photos?.[0],
    videoUrl: record.video_url ?? record.videos?.[0],
    photos: record.photos ?? [],
    videos: record.videos ?? [],
    durationSeconds: Number.isFinite(duration) ? duration : undefined,
    likesCount: toBigInt(record.likes),
    commentsCount: toInt(record.num_comments),
    viewsCount: toBigInt(record.views ?? record.video_play_count),
    postedAt: record.date_posted ? new Date(record.date_posted) : undefined,
    raw: record as Prisma.InputJsonValue,
  };
}

/**
 * Starts a background scrape and returns its snapshot id; the record arrives about a minute later.
 * Every other try of a reel goes through the posts scraper as a /p/ link: it returns the same fields,
 * and keeps imports working when the reels scraper is the one being blocked.
 */
export async function startInstagramScrape(post: PostIdentity, attempt = 0): Promise<string> {
  const useFallback = post.contentType === 'reel' && attempt % 2 === 1;
  const datasetId = useFallback ? DATASET_IDS.post : datasetFor(post);
  const url = useFallback ? `https://www.instagram.com/p/${post.shortcode}/` : post.url;
  const response = await brightData(
    `/trigger?dataset_id=${datasetId}&format=json&notify=false&include_errors=true`,
    { method: 'POST', body: JSON.stringify({ input: [{ url }] }), timeoutMs: 30_000 },
  );
  const { snapshot_id: snapshotId } = await readJson<{ snapshot_id?: string }>(response, 'trigger');
  if (!snapshotId) throw unavailable();
  return snapshotId;
}

/** The finished post for a background scrape, or null while Bright Data is still working on it. */
export async function checkInstagramScrape(post: PostIdentity, snapshotId: string): Promise<ScrapedPost | null> {
  const id = encodeURIComponent(snapshotId);
  const { status } = await readJson<{ status: string }>(await brightData(`/progress/${id}`), 'progress');
  if (status === 'failed' || status === 'canceled') {
    console.error(`Bright Data snapshot ${snapshotId} ended as ${status}`);
    throw unavailable();
  }
  if (status !== 'ready') return null;

  const records = await readJson<BrightDataRecord[]>(
    await brightData(`/snapshot/${id}?format=json`, { timeoutMs: 30_000 }),
    'snapshot download',
  );
  return toScrapedPost(post, records);
}

/** Reads a public Instagram reel or post through Bright Data. */
export async function fetchInstagramPost(post: PostIdentity): Promise<ScrapedPost> {
  const response = await brightData(
    // include_errors returns private/deleted posts as error records instead of dropping them
    `/scrape?dataset_id=${datasetFor(post)}&format=json&notify=false&include_errors=true`,
    {
      method: 'POST',
      body: JSON.stringify({ input: [{ url: post.url }] }),
      timeoutMs: SCRAPE_TIMEOUT_MS,
    },
  );

  let records: BrightDataRecord[];
  if (response.status === 202) {
    const { snapshot_id: snapshotId } = await readJson<{ snapshot_id?: string }>(response, 'scrape');
    if (!snapshotId) throw unavailable();
    records = await waitForSnapshot(snapshotId);
  } else {
    const body = await readJson<BrightDataRecord[] | BrightDataRecord>(response, 'scrape');
    records = Array.isArray(body) ? body : [body];
  }

  return toScrapedPost(post, records);
}
