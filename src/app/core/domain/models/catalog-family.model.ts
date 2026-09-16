export interface CatalogOffer {
  pharmacyCode: string;
  pharmacyName: string;
  listingName: string | null;
  packSize?: string | null;
  price: number;
  oldPrice: number | null;
  discountPercent: number | null;
  currency: string;
  availability: string;
  productUrl: string | null;
  imageUrl: string | null;
  pharmacyProductId: string | null;
}

export interface CatalogPack {
  masterId: string;
  label: string;
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

export function offerListingTitle(offer: CatalogOffer): string {
  return (offer.listingName || '').trim();
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
