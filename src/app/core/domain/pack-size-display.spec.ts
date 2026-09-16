import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractPackSizeToken,
  packChipLabel,
  displayPackSize
} from './pack-size-display.ts';

describe('extractPackSizeToken', () => {
  it('pulls count from a full product title', () => {
    assert.equal(extractPackSizeToken('بانادول إكسترا 24 قرص'), '24 قرص');
  });

  it('prefers count over strength in medicine titles', () => {
    assert.equal(extractPackSizeToken('باندول إكسترا 500ملغ - 24 قرص'), '24 قرص');
  });

  it('extracts volume from mixed titles', () => {
    assert.equal(extractPackSizeToken('CeraVe Hydrating Cleanser 473ml'), '473ml');
  });

  it('returns stage sizes for diapers', () => {
    assert.equal(extractPackSizeToken('بامبرز مقاس 3'), 'مقاس 3');
  });
});

describe('packChipLabel', () => {
  it('uses packSize when present', () => {
    assert.equal(packChipLabel('100 ml', 'بانادول إكسترا'), '100 مل');
  });

  it('extracts from label when packSize is empty', () => {
    assert.equal(packChipLabel('', 'سيتافيل لوشن مرطب 236 مل'), '236 مل');
  });

  it('never falls back to product name', () => {
    assert.equal(packChipLabel('', 'سيتافيل لوشن مرطب للوجه والجسم'), 'عبوة');
  });

  it('returns generic fallback when no size is found', () => {
    assert.equal(packChipLabel(null, 'Vitamin C Serum'), 'عبوة');
  });
});

describe('displayPackSize', () => {
  it('localizes ml in Arabic', () => {
    assert.equal(displayPackSize('100 ml', 'ar'), '100 مل');
  });
});
