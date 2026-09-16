export type PackSizeLocale = 'ar' | 'en';

const COUNT_UNIT =
  /(?:قرص|أقراص|حبة|حبات|حفاضة|حفاضات|كلوت|كبسولة|كبسولات|tablets?|capsules?|pcs?|ct|قطعة|قطع)/i;

const SIZE_TOKEN =
  /(\d+(?:[.,]\d+)?\s*(?:قرص|أقراص|حبة|حبات|حفاضة|حفاضات|كلوت|كبسولة|كبسولات|مل|ملجم|مجم|جم|غرام|كجم|لتر|طقم|قطعة|قطع|tablets?|capsules?|ml|mg|kg|l|g|gm|pcs?|ct|s\b))/gi;

const STAGE = /(?:stage|size|مقاس|مرحلة|رقم)\s*[-:]?\s*([1-8])/i;

/** Localize common unit abbreviations for Arabic UI. */
export function displayPackSize(
  packSize: string | null | undefined,
  locale: PackSizeLocale = 'ar'
): string {
  const raw = (packSize || '').trim();
  if (!raw) return '';
  if (locale !== 'ar') return raw;
  return raw
    .replace(/ml\b/gi, 'مل')
    .replace(/mg\b/gi, 'مجم')
    .replace(/kg\b/gi, 'كجم')
    .replace(/(\d)\s*g\b/gi, '$1 جم')
    .replace(/\bl\b/gi, 'لتر')
    .replace(/\bcs\b/gi, 'قطعة')
    .replace(/\bpcs?\b/gi, 'قطعة');
}

/** Extract a compact size token (e.g. "24 قرص", "100 مل") from free text. */
export function extractPackSizeToken(text: string | null | undefined): string | null {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;

  const stage = trimmed.match(STAGE);
  if (stage) return `مقاس ${stage[1]}`;

  const matches = [...trimmed.matchAll(SIZE_TOKEN)].map((m) => m[1]?.trim()).filter(Boolean) as string[];
  if (matches.length === 0) return null;

  const countMatch = matches.find((m) => COUNT_UNIT.test(m));
  const picked = countMatch ?? matches[matches.length - 1];
  return normalizeSizeToken(picked);
}

/** Size-only label for pack navigation chips — never falls back to product name. */
export function packChipLabel(
  packSize: string | null | undefined,
  label: string | null | undefined,
  options?: { locale?: PackSizeLocale; fallback?: string }
): string {
  const locale = options?.locale ?? 'ar';
  const fallback = options?.fallback ?? 'عبوة';

  for (const source of [packSize, label]) {
    const extracted = extractPackSizeToken(source);
    if (extracted) return displayPackSize(extracted, locale);
  }

  const rawSize = (packSize || '').trim();
  if (rawSize && isCompactPackSize(rawSize)) {
    return displayPackSize(rawSize, locale);
  }

  return fallback;
}

export function packSizeDir(text: string | null | undefined): 'ltr' | null {
  const value = (text || '').trim();
  return /[A-Za-z]/.test(value) ? 'ltr' : null;
}

function isCompactPackSize(text: string): boolean {
  if (text.length > 28) return false;
  return extractPackSizeToken(text) !== null;
}

function normalizeSizeToken(token: string): string {
  return token
    .replace(/tablets?/gi, 'قرص')
    .replace(/capsules?/gi, 'كبسولة')
    .replace(/ml\b/gi, 'ml')
    .replace(/\bmg\b/gi, 'mg')
    .replace(/\bg\b|\bgm\b|غرام/gi, 'g')
    .replace(/\bpcs?\b/gi, 'قطعة')
    .replace(/\bs\b/gi, ' قرص')
    .replace(/\s+/g, ' ')
    .trim();
}
