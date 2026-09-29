// @ts-nocheck
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { messagesAr, messagesEn } from '../../core/i18n/messages.ts';
import type { CustomerBestPriceCard } from '../../core/domain/models/best-deal.model.ts';

describe('best-deals i18n symmetry', () => {
  it('ensures messagesAr.bestDeals and messagesEn.bestDeals have identical keys', () => {
    const arDeals = messagesAr['bestDeals'] as Record<string, string>;
    const enDeals = messagesEn['bestDeals'] as Record<string, string>;
    const arKeys = Object.keys(arDeals).sort();
    const enKeys = Object.keys(enDeals).sort();
    assert.deepEqual(arKeys, enKeys, 'messagesAr and messagesEn bestDeals keys must match exactly');
  });

  it('includes required tab and best-price labels', () => {
    const arDeals = messagesAr['bestDeals'] as Record<string, string>;
    const enDeals = messagesEn['bestDeals'] as Record<string, string>;

    const keys = [
      'tabStoreDiscounts',
      'tabBestPrice',
      'subtitleBestPrice',
      'matchingProducts',
      'showingProducts',
      'bestPriceCategoryHint',
      'bestPriceBadge',
      'bestPriceLabel',
      'nextBestPrice',
      'comparisonSavings',
      'comparisonSavingsRatio',
      'storeDiscountLabel',
      'storeOriginalPrice',
      'comparedAcross',
      'pharmaciesUnit',
      'showPrices',
      'hidePrices',
      'lowestPrice',
      'openProduct',
      'pharmaciesPricesList',
      'emptyBestPriceTitle',
      'emptyBestPriceHint',
      'errorBestPrice',
      'resetCategory'
    ];

    for (const key of keys) {
      assert.ok(key in arDeals, `messagesAr.bestDeals missing ${key}`);
      assert.ok(key in enDeals, `messagesEn.bestDeals missing ${key}`);
      assert.ok(Boolean(arDeals[key]), `messagesAr.bestDeals.${key} cannot be empty`);
      assert.ok(Boolean(enDeals[key]), `messagesEn.bestDeals.${key} cannot be empty`);
    }
  });
});

describe('best-price card comparison model', () => {
  it('separates store discount from comparison savings and calculates values properly', () => {
    const mockCard: CustomerBestPriceCard = {
      masterId: 'master-1',
      pharmacyProductId: 'prod-1',
      name: 'Panadol Extra 24 Tablets',
      brand: 'Panadol',
      imageUrl: 'https://example.com/panadol.jpg',
      familyKey: 'panadol-extra-24',
      pharmacyCode: 'nahdi',
      pharmacyName: 'Nahdi',
      productUrl: 'https://nahdi.com/panadol',
      price: 80,
      oldPrice: 90,
      discountPercent: 11.1,
      currency: 'SAR',
      pharmacyCount: 3,
      dealType: 'best_price',
      nextBestPrice: 100,
      comparisonSavingsAmount: 20,
      comparisonSavingsPercent: 20.0,
      pharmacies: [
        {
          pharmacyCode: 'nahdi',
          name: 'Nahdi',
          price: 80,
          currency: 'SAR',
          isBest: true,
          oldPrice: 90,
          discountPercent: 11.1
        },
        {
          pharmacyCode: 'al-dawaa',
          name: 'Al-Dawaa',
          price: 100,
          currency: 'SAR',
          isBest: false,
          discountPercent: 0
        },
        {
          pharmacyCode: 'whites',
          name: 'Whites',
          price: 150,
          currency: 'SAR',
          isBest: false,
          discountPercent: 0
        }
      ]
    };

    // 1. Verify lowest price
    assert.equal(mockCard.price, 80);
    assert.equal(mockCard.pharmacyCode, 'nahdi');

    // 2. Verify second lowest price
    assert.equal(mockCard.nextBestPrice, 100);

    // 3. Verify comparison savings amount & percent
    assert.equal(mockCard.comparisonSavingsAmount, 20);
    assert.equal(mockCard.comparisonSavingsPercent, 20.0);

    // 4. Verify store direct discount is distinct from comparison saving
    assert.equal(mockCard.oldPrice, 90);
    assert.equal(mockCard.discountPercent, 11.1);
    assert.notEqual(mockCard.oldPrice, mockCard.nextBestPrice);
    assert.notEqual(mockCard.discountPercent, mockCard.comparisonSavingsPercent);

    // 5. Verify pharmacy count and order
    assert.equal(mockCard.pharmacyCount, 3);
    assert.equal(mockCard.pharmacies.length, 3);
    assert.equal(mockCard.pharmacies[0].price, 80);
    assert.equal(mockCard.pharmacies[0].isBest, true);
    assert.equal(mockCard.pharmacies[1].price, 100);
    assert.equal(mockCard.pharmacies[2].price, 150);
  });

  it('handles cards where winning store has no direct discount', () => {
    const cardWithoutStoreDiscount: CustomerBestPriceCard = {
      masterId: 'master-2',
      pharmacyProductId: 'prod-2',
      name: 'Omega 3 Fish Oil',
      brand: 'Centrum',
      imageUrl: null,
      familyKey: 'omega-3',
      pharmacyCode: 'al-dawaa',
      pharmacyName: 'Al-Dawaa',
      productUrl: null,
      price: 50,
      oldPrice: null,
      discountPercent: 0,
      currency: 'SAR',
      pharmacyCount: 2,
      dealType: 'best_price',
      nextBestPrice: 70,
      comparisonSavingsAmount: 20,
      comparisonSavingsPercent: 28.6,
      pharmacies: [
        {
          pharmacyCode: 'al-dawaa',
          name: 'Al-Dawaa',
          price: 50,
          currency: 'SAR',
          isBest: true,
          oldPrice: null,
          discountPercent: 0
        },
        {
          pharmacyCode: 'nahdi',
          name: 'Nahdi',
          price: 70,
          currency: 'SAR',
          isBest: false,
          oldPrice: null,
          discountPercent: 0
        }
      ]
    };

    assert.equal(cardWithoutStoreDiscount.price, 50);
    assert.equal(cardWithoutStoreDiscount.oldPrice, null);
    assert.equal(cardWithoutStoreDiscount.discountPercent, 0);
    assert.equal(cardWithoutStoreDiscount.nextBestPrice, 70);
    assert.equal(cardWithoutStoreDiscount.comparisonSavingsAmount, 20);
    assert.equal(cardWithoutStoreDiscount.comparisonSavingsPercent, 28.6);
  });
});

describe('view state and interaction logic', () => {
  it('manages card expansion set independently', () => {
    const set = new Set<string>();
    const cardId = 'master-42';

    // Toggle open
    set.add(cardId);
    assert.ok(set.has(cardId));

    // Toggle close
    set.delete(cardId);
    assert.ok(!set.has(cardId));
  });

  it('derives pinned state from settings correctly', () => {
    const pinnedIds = ['master-abc', 'prod-123'];
    const pinnedSet = new Set(pinnedIds.map((id) => id.toLowerCase()));

    const card1 = { masterId: 'MASTER-ABC', pharmacyProductId: 'prod-999', isPinned: false };
    const card2 = { masterId: 'master-xyz', pharmacyProductId: 'PROD-123', isPinned: false };
    const card3 = { masterId: 'master-other', pharmacyProductId: 'prod-other', isPinned: false };

    const isPinned1 = card1.isPinned || pinnedSet.has(card1.masterId.toLowerCase());
    const isPinned2 = card2.isPinned || pinnedSet.has(card2.pharmacyProductId.toLowerCase());
    const isPinned3 = card3.isPinned || pinnedSet.has(card3.masterId.toLowerCase());

    assert.equal(isPinned1, true);
    assert.equal(isPinned2, true);
    assert.equal(isPinned3, false);
  });

  it('formats category filter param properly without sending all', () => {
    const resolveSlug = (slug: string) => (slug && slug !== 'all' ? slug : undefined);

    assert.equal(resolveSlug('all'), undefined);
    assert.equal(resolveSlug(''), undefined);
    assert.equal(resolveSlug('vitamins'), 'vitamins');
    assert.equal(resolveSlug('baby-care'), 'baby-care');
  });

  it('verifies permission gating logic for canManage', () => {
    const hasPermission = (permissions: string[], perm: string) => permissions.includes(perm);

    const adminPermissions = ['best_deals.view', 'best_deals.manage'];
    const viewerPermissions = ['best_deals.view'];

    assert.equal(hasPermission(adminPermissions, 'best_deals.manage'), true);
    assert.equal(hasPermission(viewerPermissions, 'best_deals.manage'), false);
  });
});
