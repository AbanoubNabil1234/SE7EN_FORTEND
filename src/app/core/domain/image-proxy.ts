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
  'cd3c14-whites.akinoncloudcdn.com',
  'akinoncloudcdn.com',
  'www.mujtamapharmacy.com',
  'mujtamapharmacy.com',
  'cdn.mujtamapharmacy.com',
  'united-pharmacy.com',
  'www.united-pharmacy.com',
  'cdn.united-pharmacy.com',
  'static.united-pharmacy.com',
  'imagenew.unitedpharmacy.sa',
  'unitedpharmacy.sa',
  'www.unitedpharmacy.sa',
  'ibrandsa.com',
  'www.ibrandsa.com',
  'cdn.ibrandsa.com',
  'img.ibrandsa.com',
  'www.almutahidapharmacy.com',
  'almutahidapharmacy.com',
  'ecombe.nahdionline.com',
  'nahdionline.com',
  'www.nahdionline.com',
  'cdn.nahdi.sa',
  'cdn.salla.sa',
  'cdn.files.salla.network',
  'salla.sa',
  'lemon.sa',
  'www.lemon.sa',
  'cdn.lemon.sa',
  'cdn.supercommerce.io',
  'supercommerce.io',
  'adamonline.com',
  'www.adamonline.com',
  'cdn.adamonline.com',
  'images.ctfassets.net',
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
      const prefix = API_ORIGIN ? API_ORIGIN : '';
      return `${prefix}/api/v1/image-proxy?url=${encodeURIComponent(trimmed)}`;
    }
  } catch {
    // Not a valid absolute URL — return as-is
  }

  return trimmed;
}
