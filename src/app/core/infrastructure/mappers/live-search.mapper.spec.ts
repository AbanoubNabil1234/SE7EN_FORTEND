import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { CatalogFamily, CatalogOffer, CatalogPack } from '../../domain/models/catalog-family.model.ts';
import { familyMatchType } from '../../domain/models/catalog-family.model.ts';
import type { LiveSearchGroup } from '../../domain/models/live-search.model.ts';
import { mapLiveGroupsToFamilies, mergeCatalogFamilies } from '../../domain/live-search-map.ts';

function offer(code: string, extras: Partial<CatalogOffer> = {}): CatalogOffer {
  return {
    pharmacyCode: code,
    pharmacyName: code,
    listingName: extras.listingName ?? null,
    price: 40,
    oldPrice: null,
    discountPercent: null,
    currency: 'SAR',
    availability: 'InStock',
    productUrl: `https://example/${code}`,
    imageUrl: null,
    pharmacyProductId: extras.pharmacyProductId ?? null
  };
}

function pack(partial: Partial<CatalogPack> & { offers: CatalogOffer[] }): CatalogPack {
  return {
    masterId: partial.masterId ?? 'm',
    label: partial.label ?? 'Sensibio',
    packSize: partial.packSize ?? '40ml',
    barcode: partial.barcode ?? null,
    lowestPrice: partial.lowestPrice ?? 40,
    highestPrice: partial.highestPrice ?? 55,
    savingsPercent: partial.savingsPercent ?? 20,
    pharmacyCount: partial.pharmacyCount ?? partial.offers.length,
    matchType: partial.matchType ?? 'Pending',
    priceSyncEnabled: partial.priceSyncEnabled ?? true,
    offers: partial.offers
  };
}

function fam(partial: Partial<CatalogFamily> & { packs: CatalogPack[] }): CatalogFamily {
  return {
    familyKey: partial.familyKey ?? 'bioderma-sensibio-40',
    brand: partial.brand ?? 'Bioderma',
    label: partial.label ?? 'Bioderma Sensibio',
    dosageForm: null,
    strength: null,
    imageUrl: null,
    groupCode: partial.groupCode ?? null,
    packs: partial.packs
  };
}

describe('mapLiveGroupsToFamilies', () => {
  it('keeps live Pending matchType and barcode from an offer', () => {
    const group: LiveSearchGroup = {
      label: 'Bioderma Sensibio AR 40ml',
      brand: 'Bioderma',
      baseName: 'Sensibio',
      strength: null,
      packSize: '40ml',
      dosageForm: null,
      normalizedKey: 'bioderma-sensibio-40',
      variants: [],
      availablePharmacies: 3,
      totalPharmacies: 7,
      matchConfidence: 0.4,
      matchType: 'Pending',
      matchMethod: 'name',
      offers: [
        {
          pharmacyCode: 'nahdi',
          pharmacyName: 'Nahdi',
          productName: 'Bioderma Sensibio',
          price: 41,
          currency: 'SAR',
          productUrl: 'https://nahdi.example/p',
          imageUrl: null,
          packSize: '40ml',
          barcode: '3401570364236'
        }
      ],
      familyKey: 'bioderma-sensibio-40',
      isProbable: true,
      lowestPrice: 41,
      highestPrice: 55,
      savingsPercent: 25,
      barcode: null
    };

    const mapped = mapLiveGroupsToFamilies([group]);
    assert.equal(mapped.length, 1);
    assert.equal(mapped[0].packs[0].matchType, 'Pending');
    assert.equal(mapped[0].packs[0].barcode, '3401570364236');
    assert.equal(mapped[0].packs[0].offers[0].listingName, 'Bioderma Sensibio');
    assert.equal(familyMatchType(mapped[0]), 'Pending');
  });
});

describe('mergeCatalogFamilies', () => {
  it('keeps the live card when catalog has fewer pharmacies and Exact identity', () => {
    const live = fam({
      packs: [
        pack({
          matchType: 'Pending',
          offers: [offer('nahdi'), offer('aldawaa'), offer('whites')]
        })
      ]
    });
    const catalog = fam({
      groupCode: 'G-ABC',
      packs: [
        pack({
          matchType: 'Exact',
          pharmacyCount: 5,
          offers: [offer('nahdi', { pharmacyProductId: 'pp-1' }), offer('united')]
        })
      ]
    });

    const merged = mergeCatalogFamilies([live], [catalog]);
    assert.equal(merged.length, 1);
    assert.equal(familyMatchType(merged[0]), 'Pending');
    assert.equal(merged[0].groupCode, 'G-ABC');
    const codes = merged[0].packs[0].offers.map((o) => o.pharmacyCode).sort();
    assert.deepEqual(codes, ['aldawaa', 'nahdi', 'united', 'whites']);
    assert.equal(
      merged[0].packs[0].offers.find((o) => o.pharmacyCode === 'nahdi')?.pharmacyProductId,
      'pp-1'
    );
  });

  it('does not drop a live family that is absent from catalog', () => {
    const live = fam({
      familyKey: 'live-only',
      packs: [pack({ matchType: 'Pending', offers: [offer('ibrand')] })]
    });
    const catalog = fam({
      familyKey: 'catalog-only',
      groupCode: 'G-X',
      packs: [pack({ matchType: 'Exact', offers: [offer('nahdi')] })]
    });

    const merged = mergeCatalogFamilies([live], [catalog]);
    const keys = merged.map((f) => f.familyKey).sort();
    assert.deepEqual(keys, ['catalog-only', 'live-only']);
  });

  it('live-primary keeps live order and hides unmatched catalog Exact cards', () => {
    const live = fam({
      familyKey: 'live-pampers-116',
      brand: 'Pampers',
      label: 'بامبرز مقاس 3 - 116',
      packs: [
        pack({
          packSize: '116 pcs',
          barcode: '8700216584470',
          matchType: 'Pending',
          offers: [
            offer('aldawaa'),
            offer('pharmabrand'),
            offer('ibrand'),
            offer('nahdi'),
            offer('whites'),
            offer('united')
          ]
        })
      ]
    });
    const catalog = fam({
      familyKey: 'catalog-pampers-gtin',
      brand: 'PAMPERS',
      label: 'بامبرز حفاضات راحة متكاملة مقاس 3 - 116 قطعة',
      groupCode: 'G-8P5Y41',
      packs: [
        pack({
          packSize: '116 قطعة',
          barcode: '8700216577588',
          matchType: 'Exact',
          offers: [offer('ibrand', { pharmacyProductId: 'pp-1' }), offer('nahdi'), offer('united')]
        })
      ]
    });

    const merged = mergeCatalogFamilies([live], [catalog], { livePrimary: true });
    assert.equal(merged.length, 1);
    assert.equal(merged[0].familyKey, 'live-pampers-116');
    assert.equal(familyMatchType(merged[0]), 'Pending');
    assert.equal(merged[0].groupCode, 'G-8P5Y41');
    assert.equal(merged[0].packs[0].offers.length, 6);
  });
});
