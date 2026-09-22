import { API_ORIGIN } from '../infrastructure/http/api-origin';

/**
 * Pharmacy domains whose image servers block cross-origin requests.
 * Images from these hosts are rewritten to go through our server-side proxy.
 */
const PROXY_HOSTS = new Set([
  'www.al-dawaa.com',
  'al-dawaa.com',
  'cdn.al-dawaa.com',
  'www.whites.sa',
  'whites.sa',
  'cdn.whites.sa',
  'www.mujtamapharmacy.com',
  'mujtamapharmacy.com',
  'cdn.mujtamapharmacy.com',
  'united-pharmacy.com',
  'www.united-pharmacy.com',
  'cdn.united-pharmacy.com',
  'static.united-pharmacy.com',
  'ibrandsa.com',
  'www.ibrandsa.com',
  'cdn.ibrandsa.com',
  'img.ibrandsa.com',
  'www.almutahidapharmacy.com',
  'almutahidapharmacy.com',
]);

/**
 * If the given URL belongs to a pharmacy whose image server blocks
 * cross-origin requests, rewrite it to go through our backend image proxy.
 * Otherwise return the URL unchanged.
 */
export function proxyImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (PROXY_HOSTS.has(parsed.hostname)) {
      const origin = API_ORIGIN || 'https://api.se-7en.com';
      return `${origin}/api/v1/image-proxy?url=${encodeURIComponent(trimmed)}`;
    }
  } catch {
    // Not a valid absolute URL — return as-is
  }

  return trimmed;
}
