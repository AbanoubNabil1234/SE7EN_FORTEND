export interface CatalogOffer {
  pharmacyCode: string;
  pharmacyName: string;
  listingName: string | null;
  englishListingName?: string | null;
  packSize?: string | null;
  price: number;
  oldPrice: number | null;
  discountPercent: number | null;
  currency: string;
  availability: string;
  productUrl: string | null;
  imageUrl: string | null;
  pharmacyProductId: string | null;
  barcode?: string | null;
  matchMethod?: string | null;
}

export interface CatalogPack {
  masterId: string;
  label: string;
  arabicName?: string | null;
  englishName?: string | null;
  packSize: string;
  barcode: string | null;
  lowestPrice: number;
  highestPrice: number;
  savingsPercent: number | null;
  pharmacyCount: number;
  matchType?: string | null;
  priceSyncEnabled: boolean;
  requiresPackReview?: boolean;
  offers: CatalogOffer[];
}

export interface CatalogFamily {
  familyKey: string;
  brand: string | null;
  label: string;
  arabicName?: string | null;
  englishName?: string | null;
  dosageForm: string | null;
  strength: string | null;
  imageUrl: string | null;
  groupCode: string | null;
  packs: CatalogPack[];
}

export interface CatalogFamilyPage {
  page: number;
  pageSize: number;
  total: number;
  data: CatalogFamily[];
}

export interface FamilyAiSuggestion {
  id: string;
  name: string;
  englishName?: string | null;
  pharmacyCode: string;
  pharmacyName: string;
  barcode?: string | null;
  price?: number | null;
  oldPrice?: number | null;
  currency: string;
  imageUrl?: string | null;
  productUrl?: string | null;
  packSize?: string | null;
  manualGroupCode?: string | null;
  confidence: number;
  matchMethod: string;
  decisionReason?: string | null;
}

export function isAiMatch(methodOrOffer?: string | null | CatalogOffer): boolean {
  if (!methodOrOffer) return false;
  const method = typeof methodOrOffer === 'string' ? methodOrOffer : methodOrOffer.matchMethod;
  if (!method || !method.trim()) return false;
  const normalized = method.trim().toLowerCase();
  if (
    normalized === 'exactbarcode' ||
    normalized.includes('barcode') ||
    normalized.includes('gtin')
  ) {
    return false;
  }
  return (
    normalized.includes('ai') ||
    normalized.includes('entityresolution') ||
    normalized.includes('model') ||
    normalized.includes('crossencoder') ||
    normalized.includes('normalizedkey') ||
    normalized.includes('titlemerge')
  );
}

export function isConfirmedMatch(matchType?: string | null): boolean {
  return (matchType ?? '').trim().toLowerCase() === 'exact';
}

export function familyMatchType(family: CatalogFamily): string {
  const types = family.packs.map((pack) => (pack.matchType || 'Pending').toLowerCase());
  if (types.some((type) => type === 'exact')) return 'Exact';
  if (types.length > 0 && types.every((type) => type === 'single')) return 'Single';
  if (types.some((type) => type === 'comparable')) return 'Comparable';
  return 'Pending';
}

export type MatchStatus = 'Exact' | 'Pending' | 'Comparable' | 'Single';

export function matchStatus(family: CatalogFamily): MatchStatus {
  const raw = familyMatchType(family);
  if (raw === 'Exact' || raw === 'Single' || raw === 'Comparable') return raw;
  return 'Pending';
}

export function catalogListingKey(family: CatalogFamily): string {
  return family.packs[0]?.masterId || family.familyKey;
}

/** One list card per harvested SKU so grouped sizes are not hidden behind a count. */
export function flattenFamilyPacks(families: CatalogFamily[]): CatalogFamily[] {
  return families.flatMap((family) => {
    if (family.packs.length <= 1) {
      return [
        {
          ...family,
          imageUrl: familyHeroImage(family)
        }
      ];
    }
    return family.packs.map((pack) => ({
      ...family,
      label: pack.label || family.label,
      arabicName: pack.arabicName || family.arabicName,
      englishName: pack.englishName || family.englishName,
      imageUrl: packHeroImage(pack) ?? family.imageUrl,
      packs: [pack]
    }));
  });
}

const HERO_PHARMACY_CODES = ['nahdi', 'united', 'aldawaa'] as const;
const HERO_LAST_PHARMACY = 'whites';

export function packHeroImage(pack: CatalogPack): string | null {
  return pickHeroImage(pack.offers);
}

export function familyHeroImage(family: CatalogFamily): string | null {
  return pickHeroImage(family.packs.flatMap((pack) => pack.offers)) ?? family.imageUrl;
}

function pickHeroImage(offers: CatalogOffer[]): string | null {
  const withImage = offers.filter((offer) => !!offer.imageUrl?.trim());
  for (const code of HERO_PHARMACY_CODES) {
    const hit = withImage.find((offer) => offer.pharmacyCode.toLowerCase() === code);
    if (hit?.imageUrl) return hit.imageUrl;
  }
  const other = withImage.find((offer) => offer.pharmacyCode.toLowerCase() !== HERO_LAST_PHARMACY);
  return other?.imageUrl ?? withImage[0]?.imageUrl ?? null;
}

const HAS_ARABIC_REGEX = /[\u0600-\u06FF]/;

export function catalogFamilyTitle(family: CatalogFamily | null | undefined, locale?: string | null): string {
  if (!family) return '';
  const isEn = locale === 'en';
  if (isEn) {
    if (family.englishName?.trim()) return family.englishName.trim();
    if (family.label && !HAS_ARABIC_REGEX.test(family.label)) return family.label.trim();
    return (family.label || family.arabicName || '').trim();
  } else {
    if (family.arabicName?.trim()) return family.arabicName.trim();
    if (family.label && HAS_ARABIC_REGEX.test(family.label)) return family.label.trim();
    return (family.label || family.englishName || '').trim();
  }
}

export function catalogPackTitle(pack: CatalogPack | null | undefined, locale?: string | null): string {
  if (!pack) return '';
  const isEn = locale === 'en';
  if (isEn) {
    if (pack.englishName?.trim()) return pack.englishName.trim();
    if (pack.label && !HAS_ARABIC_REGEX.test(pack.label)) return pack.label.trim();
    return (pack.label || pack.arabicName || '').trim();
  } else {
    if (pack.arabicName?.trim()) return pack.arabicName.trim();
    if (pack.label && HAS_ARABIC_REGEX.test(pack.label)) return pack.label.trim();
    return (pack.label || pack.englishName || '').trim();
  }
}

export function catalogOfferTitle(offer: CatalogOffer | null | undefined, locale?: string | null): string {
  if (!offer) return '';
  const isEn = locale === 'en';
  if (isEn) {
    if (offer.englishListingName?.trim()) return offer.englishListingName.trim();
    if (offer.listingName && !HAS_ARABIC_REGEX.test(offer.listingName)) return offer.listingName.trim();
    return (offer.listingName || '').trim();
  } else {
    if (offer.listingName && HAS_ARABIC_REGEX.test(offer.listingName)) return offer.listingName.trim();
    return (offer.listingName || offer.englishListingName || '').trim();
  }
}

export function offerListingTitle(offer: CatalogOffer, locale?: string | null): string {
  return catalogOfferTitle(offer, locale);
}

export function isCatalogSearchReady(query: string | null | undefined): boolean {
  const term = (query ?? '').trim();
  if (term.length === 0) return true;
  if (/^\d+$/.test(term)) return term.length >= 4;
  return term.length >= 2;
}

export interface GroupCodeLinkResult {
  code: string;
  familyKey: string;
  pharmacyProductId: string;
  masterProductId: string;
  overrideId: string;
}

export interface GroupCodeMergeResult {
  targetCode: string;
  sourceCode: string;
  mergedCount: number;
  success: boolean;
  errorMessage?: string | null;
}

export interface PharmacyProductSearchHit {
  id: string;
  name: string;
  englishName?: string | null;
  pharmacyCode: string;
  pharmacyName: string;
  barcode?: string | null;
  price?: number | null;
  oldPrice?: number | null;
  currency?: string | null;
  imageUrl?: string | null;
  productUrl?: string | null;
  packSize?: string | null;
  manualGroupCode?: string | null;
  masterProductId?: string | null;
}

export interface ProductPharmacyImageOption {
  pharmacyProductId: string;
  pharmacyCode: string;
  pharmacyName: string;
  imageUrl: string;
  price?: number;
  isCurrentCustom: boolean;
}

export interface ProductImagesResponse {
  masterId: string;
  customImageUrl: string | null;
  pharmacyImages: ProductPharmacyImageOption[];
}

