export type LinkPlatform = 'instagram' | 'youtube';

const TRACKING_PARAMS = ['igsh', 'si', 'utm_source', 'utm_medium', 'utm_campaign', 'feature'];

export function detectPlatform(url: URL): LinkPlatform | null {
  const host = url.hostname.toLowerCase();
  const isHost = (domain: string) => host === domain || host.endsWith(`.${domain}`);
  if (isHost('instagram.com') || isHost('instagr.am')) return 'instagram';
  if (isHost('youtube.com') || isHost('youtu.be')) return 'youtube';
  return null;
}

export function stripTrackingParams(url: URL): string {
  const clean = new URL(url);
  TRACKING_PARAMS.forEach((param) => clean.searchParams.delete(param));
  return clean.toString();
}
