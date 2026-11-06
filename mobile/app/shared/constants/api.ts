/** PrepPros API base URL; set EXPO_PUBLIC_API_URL to your machine's LAN address when using a phone. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

export const API_TIMEOUT_MS = 20_000;
