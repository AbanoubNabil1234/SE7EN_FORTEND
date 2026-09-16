import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldSkipLoadingOverlay } from './loading-overlay.ts';

describe('shouldSkipLoadingOverlay', () => {
  it('skips the heavy admin open endpoints', () => {
    assert.equal(shouldSkipLoadingOverlay('/admin/dashboard'), true);
    assert.equal(shouldSkipLoadingOverlay('/catalog/families?page=1&pageSize=24'), true);
    assert.equal(shouldSkipLoadingOverlay('/catalog/families/brands'), true);
    assert.equal(shouldSkipLoadingOverlay('/categories/structure'), true);
  });

  it('keeps the overlay for family detail and auth', () => {
    assert.equal(shouldSkipLoadingOverlay('/catalog/families/item?familyKey=x'), false);
    assert.equal(shouldSkipLoadingOverlay('/api/v1/auth/me'), false);
  });
});
