/** Live API host. Empty on localhost so Angular proxy avoids CORS. */
export const API_ORIGIN =
  typeof window !== 'undefined' &&
  /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)
    ? ''
    : 'https://api.se-7en.com';

/** Prefix relative API asset paths so images load from the online server. */
export function resolveApiUrl(url: string | null | undefined): string | null {
  if (url == null) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('assets/')) return trimmed;
  if (trimmed.startsWith('/')) {
    const origin = API_ORIGIN || 'https://api.se-7en.com';
    return `${origin}${trimmed}`;
  }
  return trimmed;
}
