import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canAccept, distinctPharmacyCount } from './match-review.model.ts';
import type { MatchReviewListingCard, MatchReviewQueueItem } from './match-review.model.ts';

function item(partial: Partial<MatchReviewQueueItem> = {}): MatchReviewQueueItem {
  return {
    matchId: 'm1',
    pharmacyProductId: 'p1',
    proposedMasterProductId: 'master-1',
    pharmacyCode: 'nahdi',
    pharmacyName: 'Nahdi',
    name: 'Panadol',
    englishName: 'Panadol',
    imageUrl: '',
    barcode: '628',
    matchMethod: 'MODEL_V3',
    decisionReason: 'REVIEW_LOW_MARGIN',
    confidence: 0.99,
    bestScore: 0.99,
    margin: 0.02,
    matchedAtUtc: '2026-09-12T00:00:00Z',
    isCurrent: true,
    ...partial
  };
}

function card(code: string): MatchReviewListingCard {
  return {
    pharmacyProductId: code,
    pharmacyCode: code,
    pharmacyName: code,
    name: 'Panadol',
    englishName: 'Panadol',
    brandName: 'panadol',
    imageUrl: '',
    barcode: '',
    gtinNorm: '',
    strength: '',
    dosageForm: '',
    packSize: '',
    price: 10,
    masterProductId: 'm'
  };
}

describe('match-review model', () => {
  it('counts distinct pharmacies not raw listings', () => {
    assert.equal(distinctPharmacyCount([card('nahdi'), card('nahdi'), card('aldawaa')]), 2);
  });

  it('accepts only current rows with a proposed master', () => {
    assert.equal(canAccept(item()), true);
    assert.equal(canAccept(item({ isCurrent: false })), false);
    assert.equal(canAccept(item({ proposedMasterProductId: null })), false);
  });
});
