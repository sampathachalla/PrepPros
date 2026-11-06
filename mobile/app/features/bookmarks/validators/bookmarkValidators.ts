export interface BookmarkValidationResult {
  valid: boolean;
  error?: string;
}

export function isValidUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  try {
    return /^https?:\/\/[^\s$.?#].[^\s]*$/i.test(trimmed);
  } catch {
    return false;
  }
}

export function detectPlatformFromUrl(urlStr: string): 'instagram' | 'youtube' | 'unknown' {
  if (!urlStr) return 'unknown';
  const lower = urlStr.trim().toLowerCase();

  if (lower.includes('instagram.com') || lower.includes('instagr.am')) {
    return 'instagram';
  }
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    return 'youtube';
  }

  return 'unknown';
}

export function validateImportBookmarkInput(params: { url: string }): BookmarkValidationResult {
  const url = params.url?.trim() ?? '';

  if (!url) {
    return { valid: false, error: 'Please paste a recipe link from Instagram or YouTube' };
  }

  if (!isValidUrl(url)) {
    return { valid: false, error: 'Please enter a valid web URL starting with http:// or https://' };
  }

  const platform = detectPlatformFromUrl(url);
  if (platform === 'unknown') {
    return {
      valid: false,
      error: 'Only Instagram (Reels/Posts) and YouTube (Videos/Shorts) links are supported',
    };
  }

  return { valid: true };
}
