import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { CatalogFamily, CatalogOffer } from './catalog-family.model.ts';
import {
  catalogListingKey,
  familyHeroImage,
  familyMatchType,
  flattenFamilyPacks,
  isCatalogSearchReady,
  isConfirmedMatch,
  matchStatus,
  offerListingTitle
} from './catalog-family.model.ts';

function family(matchTypes: Array<string | null | undefined>): CatalogFamily {
  return {
    familyKey: 'k',
    brand: 'Bioderma',
    label: 'Sensibio',
    dosageForm: null,
    strength: null,
    imageUrl: null,
    groupCode: null,
    packs: matchTypes.map((matchType, i) => ({
      masterId: `m${i}`,
      label: 'Sensibio',
      packSize: '40ml',
      barcode: null,
      lowestPrice: 10,
      highestPrice: 12,
      savingsPercent: null,
      pharmacyCount: 2,
      matchType,
      priceSyncEnabled: true,
      offers: []
    }))
  };
}

describe('matchStatus', () => {
  it('keeps Exact only when a pack is Exact', () => {
    assert.equal(matchStatus(family(['Exact'])), 'Exact');
    assert.equal(isConfirmedMatch(familyMatchType(family(['Exact']))), true);
  });

  it('does not promote Pending or Review to Exact', () => {
    assert.equal(matchStatus(family(['Pending'])), 'Pending');
    assert.equal(matchStatus(family(['Review'])), 'Pending');
    assert.equal(isConfirmedMatch(familyMatchType(family(['Pending']))), false);
  });

  it('labels Single and Comparable without calling them Exact', () => {
    assert.equal(matchStatus(family(['Single'])), 'Single');
    assert.equal(matchStatus(family(['Comparable'])), 'Comparable');
  });
});

describe('flattenFamilyPacks', () => {
  it('emits one card per pack so grouped sizes are not hidden', () => {
    const grouped = family(['Single', 'Single']);
    grouped.packs[0] = { ...grouped.packs[0], masterId: 'a', label: '118 ml', packSize: '118 ml' };
    grouped.packs[1] = { ...grouped.packs[1], masterId: 'b', label: '473 ml', packSize: '473 ml' };

    const cards = flattenFamilyPacks([grouped]);
    assert.equal(cards.length, 2);
    assert.equal(cards[0].packs.length, 1);
    assert.equal(cards[1].packs.length, 1);
    assert.equal(cards[0].label, '118 ml');
    assert.equal(cards[1].label, '473 ml');
    assert.equal(catalogListingKey(cards[0]), 'a');
    assert.equal(catalogListingKey(cards[1]), 'b');
  });
});

describe('familyHeroImage', () => {
  it('prefers nahdi then united then aldawaa and keeps whites last', () => {
    const row = family(['Exact']);
    row.packs[0] = {
      ...row.packs[0],
      offers: [
        offerImage('whites', 'https://img/whites.jpg'),
        offerImage('lemon', 'https://img/lemon.jpg'),
        offerImage('aldawaa', 'https://img/aldawaa.jpg'),
        offerImage('united', 'https://img/united.jpg'),
        offerImage('nahdi', 'https://img/nahdi.jpg')
      ]
    };

    assert.equal(familyHeroImage(row), 'https://img/nahdi.jpg');
  });

  it('uses lemon before whites when preferred pharmacies are missing', () => {
    const row = family(['Exact']);
    row.packs[0] = {
      ...row.packs[0],
      offers: [offerImage('whites', 'https://img/whites.jpg'), offerImage('lemon', 'https://img/lemon.jpg')]
    };

    assert.equal(familyHeroImage(row), 'https://img/lemon.jpg');
    assert.equal(flattenFamilyPacks([row])[0].imageUrl, 'https://img/lemon.jpg');
  });
});

describe('offerListingTitle', () => {
  it('uses the pharmacy listing name, not the family label', () => {
    assert.equal(
      offerListingTitle(offerImage('nahdi', 'https://img/nahdi.jpg', 'سيتافيل لوشن النهدي')),
      'سيتافيل لوشن النهدي'
    );
    assert.equal(offerListingTitle(offerImage('united', 'https://img/united.jpg')), '');
  });
});

describe('isCatalogSearchReady', () => {
  it('waits for two letters or four digits', () => {
    assert.equal(isCatalogSearchReady(''), true);
    assert.equal(isCatalogSearchReady('س'), false);
    assert.equal(isCatalogSearchReady('سي'), true);
    assert.equal(isCatalogSearchReady('12'), false);
    assert.equal(isCatalogSearchReady('1234'), true);
  });
});

function offerImage(code: string, imageUrl: string, listingName: string | null = null): CatalogOffer {
  return {
    pharmacyCode: code,
    pharmacyName: code,
    listingName,
    price: 10,
    oldPrice: null,
    discountPercent: null,
    currency: 'SAR',
    availability: 'InStock',
    productUrl: null,
    imageUrl,
    pharmacyProductId: null
  };
}
