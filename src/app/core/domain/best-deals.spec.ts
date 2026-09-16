import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clampDiscountPercent } from './best-deals.ts';

describe('clampDiscountPercent', () => {
  it('returns the default when the value is not a finite number', () => {
    assert.equal(clampDiscountPercent(Number.NaN), 20);
  });

  it('clamps below zero to 0 and above 80 to 80', () => {
    assert.equal(clampDiscountPercent(-10), 0);
    assert.equal(clampDiscountPercent(95), 80);
  });

  it('rounds to the nearest 5 percent step', () => {
    assert.equal(clampDiscountPercent(22), 20);
    assert.equal(clampDiscountPercent(23), 25);
    assert.equal(clampDiscountPercent(20), 20);
  });
});
