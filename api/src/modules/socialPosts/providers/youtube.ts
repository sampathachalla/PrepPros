import { getSubtitles } from 'youtube-caption-extractor';
import { env } from '../../../config/env.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import { AppError } from '../../../utils/AppError.js';
import { extractHashtags, toBigInt, toInt, type PostIdentity, type ScrapedPost } from '../types.js';

const DATA_API_URL = 'https://www.googleapis.com/youtube/v3/videos';
const OEMBED_URL = 'https://www.youtube.com/oembed';
const REQUEST_TIMEOUT_MS = 10_000;
const CAPTIONS_TIMEOUT_MS = 20_000;

interface DataApiVideo {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
    defaultLanguage?: string;
    defaultAudioLanguage?: string;
    thumbnails?: Record<string, { url: string } | undefined>;
  };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
}

const unavailable = () => new AppError(502, 'Could not read this YouTube link right now');
const notFound = () => new AppError(422, 'This YouTube video is private or unavailable');

/** Finds the video id in watch, youtu.be, Shorts, embed and live links. */
export function extractVideoId(url: URL): string | null {
  let id: string | null | undefined;
  if (url.hostname.toLowerCase().endsWith('youtu.be')) {
    id = url.pathname.split('/')[1];
  } else {
    id = url.searchParams.get('v');
    if (!id) {
      const [kind, pathId] = url.pathname.split('/').filter(Boolean);
      id = kind && ['shorts', 'embed', 'live', 'v'].includes(kind) ? pathId : undefined;
    }
  }
  return id && /^[\w-]{6,20}$/.test(id) ? id : null;
}

export function identifyYouTubeVideo(url: URL): PostIdentity | null {
  const videoId = extractVideoId(url);
  if (!videoId) return null;
  const isShort = url.pathname.split('/').filter(Boolean)[0] === 'shorts';
  return {
    platform: 'youtube',
    contentType: isShort ? 'short' : 'video',
    shortcode: videoId,
    url: isShort ? `https://www.youtube.com/shorts/${videoId}` : `https://www.youtube.com/watch?v=${videoId}`,
  };
}

/** ISO 8601 duration (e.g. PT1H2M3S) to seconds. */
export function parseIsoDuration(duration: string | undefined): number | undefined {
  const match = duration?.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
  if (!match) return undefined;
  const [, days = 0, hours = 0, minutes = 0, seconds = 0] = match;
  return Number(days) * 86400 + Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

async function getJson<T>(url: string, describe: string): Promise<{ status: number; body?: T }> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (error) {
    console.error(`${describe} request failed`, error);
    throw unavailable();
  }
  if (!response.ok) {
    return { status: response.status };
  }
  return { status: response.status, body: (await response.json()) as T };
}

/** Video details from the YouTube Data API (needs YOUTUBE_API_KEY). */
async function fetchFromDataApi(videoId: string, apiKey: string): Promise<DataApiVideo> {
  const params = new URLSearchParams({ part: 'snippet,contentDetails,statistics', id: videoId, key: apiKey });
  const { status, body } = await getJson<{ items?: DataApiVideo[] }>(
    `${DATA_API_URL}?${params}`,
    'YouTube Data API',
  );
  if (!body) {
    // 400/403 here mean a bad key or exhausted quota, not a bad video
    console.error(`YouTube Data API returned HTTP ${status}`);
    throw unavailable();
  }
  const video = body.items?.[0];
  if (!video) throw notFound();
  return video;
}

/** Title, channel and thumbnail only, through oEmbed (no API key needed). */
async function fetchFromOEmbed(videoId: string): Promise<DataApiVideo> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const { status, body } = await getJson<{ title?: string; author_name?: string; thumbnail_url?: string }>(
    `${OEMBED_URL}?format=json&url=${encodeURIComponent(watchUrl)}`,
    'YouTube oEmbed',
  );
  // oEmbed answers 400/401/403/404 for private, removed or non-embeddable videos
  if (!body && status < 500) throw notFound();
  if (!body) {
    console.error(`YouTube oEmbed returned HTTP ${status}`);
    throw unavailable();
  }
  return {
    id: videoId,
    snippet: {
      title: body.title,
      channelTitle: body.author_name,
      thumbnails: body.thumbnail_url ? { high: { url: body.thumbnail_url } } : undefined,
    },
  };
}

/**
 * The video's captions (uploaded or auto-generated) as timed segments, or none.
 * Read from YouTube's public caption feed: the Data API only lets the video owner download captions.
 */
async function fetchCaptions(videoId: string, language: string) {
  try {
    const segments = await Promise.race([
      getSubtitles({ videoID: videoId, lang: language }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timed out')), CAPTIONS_TIMEOUT_MS),
      ),
    ]);
    return segments.length > 0 ? segments : undefined;
  } catch (error) {
    console.warn(`No captions for YouTube video ${videoId}: ${(error as Error).message}`);
    return undefined;
  }
}

/** Reads a public YouTube video: details from the Data API (or oEmbed without a key) plus its captions. */
export async function fetchYouTubeVideo(post: PostIdentity): Promise<ScrapedPost> {
  const video = env.YOUTUBE_API_KEY
    ? await fetchFromDataApi(post.shortcode, env.YOUTUBE_API_KEY)
    : await fetchFromOEmbed(post.shortcode);
  const snippet = video.snippet ?? {};

  const language = (snippet.defaultAudioLanguage ?? snippet.defaultLanguage ?? 'en').split('-')[0];
  const captions = await fetchCaptions(post.shortcode, language);
  const thumbnails = snippet.thumbnails ?? {};
  const thumbnail = ['maxres', 'standard', 'high', 'medium', 'default']
    .map((size) => thumbnails[size]?.url)
    .find(Boolean);
  const caption = snippet.description?.trim() || undefined;

  return {
    ...post,
    externalId: post.shortcode,
    authorUsername: snippet.channelTitle,
    authorProfileUrl: snippet.channelId ? `https://www.youtube.com/channel/${snippet.channelId}` : undefined,
    title: snippet.title?.trim() || undefined,
    caption,
    transcript: captions
      ?.map((segment) => segment.text.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join(' '),
    transcriptLanguage: captions ? language : undefined,
    // Shorts often carry their hashtags in the title rather than the description
    hashtags: extractHashtags(`${snippet.title ?? ''}\n${caption ?? ''}`),
    thumbnailUrl: thumbnail,
    durationSeconds: parseIsoDuration(video.contentDetails?.duration),
    likesCount: toBigInt(video.statistics?.likeCount),
    commentsCount: toInt(video.statistics?.commentCount),
    viewsCount: toBigInt(video.statistics?.viewCount),
    postedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : undefined,
    raw: { video, captions: captions ?? null } as unknown as Prisma.InputJsonValue,
  };
}
