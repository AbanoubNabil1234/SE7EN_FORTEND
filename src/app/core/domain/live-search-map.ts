import type {
  CatalogFamily,
  CatalogOffer,
  CatalogPack
} from './models/catalog-family.model';
import type {
  LiveSearchFamilyPack,
  LiveSearchGroup,
  LiveSearchOffer
} from './models/live-search.model';

export function mapLiveGroupsToFamilies(groups: LiveSearchGroup[]): CatalogFamily[] {
  return groups.map(mapLiveGroupToFamily).filter((f): f is CatalogFamily => f !== null);
}

function mapLiveGroupToFamily(group: LiveSearchGroup): CatalogFamily | null {
  const label = (group.label || '').trim();
  if (!label) return null;

  const packs: CatalogPack[] = [];
  const primary = mapLivePack(group, group.offers);
  if (primary) packs.push(primary);

  for (const related of group.relatedPacks ?? []) {
    const pack = mapRelatedPack(related);
    if (pack) packs.push(pack);
  }

  if (packs.length === 0) return null;

  const imageUrl =
    group.offers.map((o) => o.imageUrl).find((u): u is string => !!u) ??
    packs.flatMap((p) => p.offers.map((o) => o.imageUrl)).find((u): u is string => !!u) ??
    null;

  const familyKey =
    (group.familyKey || group.normalizedKey || label).trim() || label;

  return {
    familyKey,
    brand: group.brand?.trim() || null,
    label,
    dosageForm: group.dosageForm?.trim() || null,
    strength: group.strength?.trim() || null,
    imageUrl,
    groupCode: null,
    packs
  };
}

function mapRelatedPack(related: LiveSearchFamilyPack): CatalogPack | null {
  const offers = (related.offers ?? []).map(mapLiveOffer);
  if (offers.length === 0) return null;
  const lowest = related.lowestPrice || Math.min(...offers.map((o) => o.price));
  const highest = Math.max(...offers.map((o) => o.price));
  const savings =
    highest > lowest ? Math.round(((100 * (highest - lowest)) / highest) * 10) / 10 : null;
  return {
    masterId: `live:${related.label}:${related.packSize ?? ''}`,
    label: related.label,
    packSize: related.packSize?.trim() ?? '',
    barcode:
      related.barcode?.trim() ||
      (related.offers ?? []).map((o) => o.barcode?.trim()).find((code): code is string => !!code) ||
      null,
    lowestPrice: lowest,
    highestPrice: highest,
    savingsPercent: savings,
    pharmacyCount: related.availablePharmacies || distinctPharmacyCount(offers),
    matchType: 'Comparable',
    priceSyncEnabled: true,
    offers
  };
}

function mapLivePack(group: LiveSearchGroup, offersRaw: LiveSearchOffer[]): CatalogPack | null {
  const offers = offersRaw.map(mapLiveOffer);
  if (offers.length === 0) return null;
  const lowest =
    group.lowestPrice > 0 ? group.lowestPrice : Math.min(...offers.map((o) => o.price));
  const highest =
    group.highestPrice > 0 ? group.highestPrice : Math.max(...offers.map((o) => o.price));
  return {
    masterId: `live:${group.familyKey || group.normalizedKey || group.label}`,
    label: group.label,
    packSize: group.packSize?.trim() ?? '',
    barcode:
      group.barcode?.trim() ||
      offersRaw.map((o) => o.barcode?.trim()).find((code): code is string => !!code) ||
      null,
    lowestPrice: lowest,
    highestPrice: highest,
    savingsPercent: group.savingsPercent ?? null,
    pharmacyCount: group.availablePharmacies || distinctPharmacyCount(offers),
    matchType:
      group.isProbable && (group.matchType || '').trim().toLowerCase() !== 'exact'
        ? 'Pending'
        : group.matchType || 'Pending',
    priceSyncEnabled: true,
    offers
  };
}

function mapLiveOffer(offer: LiveSearchOffer): CatalogOffer {
  return {
    pharmacyCode: offer.pharmacyCode,
    pharmacyName: offer.pharmacyName,
    listingName: offer.productName?.trim() || null,
    price: offer.price,
    oldPrice: offer.oldPrice ?? null,
    discountPercent: offer.discountPercent ?? null,
    currency: offer.currency || 'SAR',
    availability: 'InStock',
    productUrl: offer.productUrl,
    imageUrl: offer.imageUrl,
    pharmacyProductId: null
  };
}

function distinctPharmacyCount(offers: CatalogOffer[]): number {
  return new Set(offers.map((o) => o.pharmacyCode.toLowerCase()).filter(Boolean)).size;
}

export function mergeCatalogFamilies(
  live: CatalogFamily[],
  catalog: CatalogFamily[],
  options?: { livePrimary?: boolean }
): CatalogFamily[] {
  if (options?.livePrimary && live.length > 0) {
    return live.map((family) => {
      const matches = catalog.filter((row) => sameComparisonFamily(family, row));
      return matches.reduce((acc, row) => enrichLiveWithCatalog(acc, row), family);
    });
  }

  const byKey = new Map<string, CatalogFamily>();
  const keyOf = (f: CatalogFamily) => (f.familyKey || f.label).trim().toLowerCase();

  for (const f of live) {
    byKey.set(keyOf(f), f);
  }
  for (const f of catalog) {
    const key = keyOf(f);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, f);
    } else {
      byKey.set(key, enrichLiveWithCatalog(existing, f));
    }
  }

  return [...byKey.values()];
}

function sameComparisonFamily(live: CatalogFamily, catalog: CatalogFamily): boolean {
  const liveKey = (live.familyKey || live.label).trim().toLowerCase();
  const catalogKey = (catalog.familyKey || catalog.label).trim().toLowerCase();
  if (liveKey && catalogKey && liveKey === catalogKey) return true;

  const liveCodes = barcodesOf(live);
  const catalogCodes = barcodesOf(catalog);
  for (const code of liveCodes) {
    if (catalogCodes.has(code)) return true;
  }

  const liveBrand = (live.brand || '').trim().toLowerCase();
  const catalogBrand = (catalog.brand || '').trim().toLowerCase();
  if (!liveBrand || liveBrand !== catalogBrand) return false;

  const liveCounts = new Set(live.packs.map((pack) => packCount(pack.packSize)).filter(Boolean));
  return catalog.packs.some((pack) => {
    const count = packCount(pack.packSize);
    return Boolean(count && liveCounts.has(count));
  });
}

function barcodesOf(family: CatalogFamily): Set<string> {
  return new Set(
    family.packs
      .map((pack) => pack.barcode?.trim())
      .filter((code): code is string => Boolean(code))
  );
}

function packCount(packSize: string | null | undefined): string {
  const match = (packSize || '').replace(/,/g, '').match(/(\d+)/);
  return match ? match[1] : '';
}

function enrichLiveWithCatalog(live: CatalogFamily, catalog: CatalogFamily): CatalogFamily {
  return {
    ...live,
    groupCode: live.groupCode || catalog.groupCode,
    packs: live.packs.map((pack) => enrichPack(pack, catalog.packs))
  };
}

function enrichPack(livePack: CatalogPack, catalogPacks: CatalogPack[]): CatalogPack {
  const catalogPack = catalogPacks.find((pack) => samePackSize(pack, livePack));
  if (!catalogPack) return livePack;

  const offers = unionOffers(livePack.offers, catalogPack.offers);
  const prices = offers.map((offer) => offer.price).filter((price) => price > 0);
  const lowest = prices.length > 0 ? Math.min(...prices) : livePack.lowestPrice;
  const highest = prices.length > 0 ? Math.max(...prices) : livePack.highestPrice;
  const savings =
    highest > lowest ? Math.round(((100 * (highest - lowest)) / highest) * 10) / 10 : livePack.savingsPercent;

  return {
    ...livePack,
    barcode: livePack.barcode || catalogPack.barcode,
    priceSyncEnabled: catalogPack.priceSyncEnabled,
    offers,
    pharmacyCount: distinctPharmacyCount(offers),
    lowestPrice: lowest,
    highestPrice: highest,
    savingsPercent: savings
  };
}

function samePackSize(a: CatalogPack, b: CatalogPack): boolean {
  const left = (a.packSize || '').trim().toLowerCase();
  const right = (b.packSize || '').trim().toLowerCase();
  if (left && right && left === right) return true;
  const leftCount = packCount(a.packSize);
  const rightCount = packCount(b.packSize);
  return Boolean(leftCount && rightCount && leftCount === rightCount);
}

function unionOffers(liveOffers: CatalogOffer[], catalogOffers: CatalogOffer[]): CatalogOffer[] {
  const byCode = new Map<string, CatalogOffer>();
  for (const offer of liveOffers) {
    byCode.set(offer.pharmacyCode.toLowerCase(), offer);
  }
  for (const offer of catalogOffers) {
    const key = offer.pharmacyCode.toLowerCase();
    const existing = byCode.get(key);
    if (!existing) {
      byCode.set(key, offer);
    } else if (!existing.pharmacyProductId && offer.pharmacyProductId) {
      byCode.set(key, { ...existing, pharmacyProductId: offer.pharmacyProductId });
    }
  }
  return [...byCode.values()];
}
