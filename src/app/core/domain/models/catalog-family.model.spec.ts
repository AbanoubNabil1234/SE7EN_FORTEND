import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { CatalogFamily, CatalogOffer } from './catalog-family.model.ts';
import {
  catalogFamilyTitle,
  catalogListingKey,
  catalogOfferTitle,
  catalogPackTitle,
  familyHeroImage,
  familyMatchType,
  flattenFamilyPacks,
  isAiMatch,
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

describe('isAiMatch', () => {
  it('returns true for AI and entity resolution match methods', () => {
    assert.equal(isAiMatch('AI_HYBRID_MODEL'), true);
    assert.equal(isAiMatch('EntityResolution_v2.5'), true);
    assert.equal(isAiMatch('EntityResolution_v2.4'), true);
    assert.equal(isAiMatch('MODEL_V3_PHARMACY_LINK'), true);
    assert.equal(isAiMatch('AiCrossEncoder+StrongKeyVeto'), true);
    assert.equal(isAiMatch('NormalizedKey'), true);
    assert.equal(isAiMatch('ExactTitleMerge'), true);
    assert.equal(isAiMatch({ matchMethod: 'AI_HYBRID_MODEL' } as CatalogOffer), true);
  });

  it('returns false for barcode match methods', () => {
    assert.equal(isAiMatch('ExactBarcode'), false);
    assert.equal(isAiMatch('GTIN/Barcode'), false);
    assert.equal(isAiMatch('Whites_Barcode_Match'), false);
    assert.equal(isAiMatch('MASTER_EXPANSION_GTIN_COMMERCIAL'), false);
    assert.equal(isAiMatch({ matchMethod: 'ExactBarcode' } as CatalogOffer), false);
  });

  it('returns false for empty, null, or undefined methods', () => {
    assert.equal(isAiMatch(null), false);
    assert.equal(isAiMatch(undefined), false);
    assert.equal(isAiMatch(''), false);
    assert.equal(isAiMatch('   '), false);
    assert.equal(isAiMatch({ matchMethod: null } as CatalogOffer), false);
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

describe('catalogFamilyTitle and bilingual helpers', () => {
  it('returns englishName when locale is en', () => {
    const f: CatalogFamily = {
      familyKey: 'panadol',
      brand: 'Panadol',
      label: 'بنادول إكسترا',
      arabicName: 'بنادول إكسترا',
      englishName: 'Panadol Extra 500mg',
      dosageForm: null,
      strength: null,
      imageUrl: null,
      groupCode: null,
      packs: []
    };
    assert.equal(catalogFamilyTitle(f, 'en'), 'Panadol Extra 500mg');
    assert.equal(catalogFamilyTitle(f, 'ar'), 'بنادول إكسترا');
  });

  it('falls back gracefully when preferred language is missing', () => {
    const f: CatalogFamily = {
      familyKey: 'k',
      brand: 'B',
      label: 'Cetaphil Gentle Cleanser',
      arabicName: null,
      englishName: null,
      dosageForm: null,
      strength: null,
      imageUrl: null,
      groupCode: null,
      packs: []
    };
    assert.equal(catalogFamilyTitle(f, 'en'), 'Cetaphil Gentle Cleanser');
    assert.equal(catalogFamilyTitle(f, 'ar'), 'Cetaphil Gentle Cleanser');
  });

  it('localizes pack title correctly', () => {
    const pack = {
      masterId: '1',
      label: 'بانادول 500 ملجم',
      arabicName: 'بانادول 500 ملجم',
      englishName: 'Panadol 500mg',
      packSize: '24 Tablets',
      barcode: '12345',
      lowestPrice: 10,
      highestPrice: 15,
      savingsPercent: 33,
      pharmacyCount: 3,
      priceSyncEnabled: true,
      offers: []
    };
    assert.equal(catalogPackTitle(pack, 'en'), 'Panadol 500mg');
    assert.equal(catalogPackTitle(pack, 'ar'), 'بانادول 500 ملجم');
  });

  it('localizes offer listing title correctly', () => {
    const offer: CatalogOffer = {
      pharmacyCode: 'nahdi',
      pharmacyName: 'Nahdi',
      listingName: 'كريم مرطب نهدي',
      englishListingName: 'Nahdi Moisturizing Cream',
      price: 50,
      oldPrice: null,
      discountPercent: null,
      currency: 'SAR',
      availability: 'InStock',
      productUrl: null,
      imageUrl: null,
      pharmacyProductId: null
    };
    assert.equal(catalogOfferTitle(offer, 'en'), 'Nahdi Moisturizing Cream');
    assert.equal(catalogOfferTitle(offer, 'ar'), 'كريم مرطب نهدي');
  });

  it('preserves offer barcode when present', () => {
    const offer: CatalogOffer = {
      pharmacyCode: 'whites',
      pharmacyName: 'Whites',
      listingName: 'كريم',
      price: 50,
      oldPrice: null,
      discountPercent: null,
      currency: 'SAR',
      availability: 'InStock',
      productUrl: null,
      imageUrl: null,
      pharmacyProductId: null,
      barcode: '628100000001'
    };
    assert.equal(offer.barcode, '628100000001');
  });

  it('correctly constructs PharmacyProductSearchHit with pharmacy metadata', () => {
    const hit = {
      id: 'p1',
      name: 'كريم مرطب',
      englishName: 'Moisturizing Cream',
      pharmacyCode: 'almujtama',
      pharmacyName: 'المجتمع',
      barcode: '628123456789',
      price: 25.5,
      oldPrice: 30.0,
      currency: 'SAR',
      imageUrl: 'https://example.com/img.jpg',
      productUrl: 'https://example.com/item',
      packSize: '100ml',
      manualGroupCode: 'G-12345',
      masterProductId: 'm1'
    };
    assert.equal(hit.pharmacyCode, 'almujtama');
    assert.equal(hit.price, 25.5);
    assert.equal(hit.barcode, '628123456789');
    assert.equal(hit.manualGroupCode, 'G-12345');
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

describe('target product hero image resolution', () => {
  it('prefers family hero image from offers when family.imageUrl is null', () => {
    const f: CatalogFamily = {
      familyKey: 'f1',
      brand: 'Panadol',
      label: 'بنادول إكسترا',
      arabicName: 'بنادول إكسترا',
      englishName: 'Panadol Extra',
      dosageForm: 'أقراص',
      strength: '500mg',
      imageUrl: null,
      groupCode: 'G-EXTRA1',
      packs: [
        {
          masterId: 'm1',
          label: '24 قرص',
          packSize: '24',
          barcode: '6281001',
          lowestPrice: 15,
          highestPrice: 20,
          savingsPercent: 25,
          pharmacyCount: 2,
          priceSyncEnabled: true,
          offers: [
            offerImage('nahdi', 'https://cdn.nahdi.com/panadol.jpg'),
            offerImage('whites', 'https://cdn.whites.com/panadol.jpg')
          ]
        }
      ]
    };
    assert.equal(familyHeroImage(f), 'https://cdn.nahdi.com/panadol.jpg');
    assert.equal(catalogFamilyTitle(f, 'ar'), 'بنادول إكسترا');
  });

  it('returns explicit family imageUrl if present', () => {
    const f: CatalogFamily = {
      familyKey: 'f2',
      brand: 'Adol',
      label: 'أدول',
      dosageForm: null,
      strength: null,
      imageUrl: 'https://cdn.custom.com/adol.jpg',
      groupCode: 'G-ADOL01',
      packs: []
    };
    assert.equal(familyHeroImage(f), 'https://cdn.custom.com/adol.jpg');
  });
});
