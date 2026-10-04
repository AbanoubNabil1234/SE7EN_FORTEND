import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { recoverLazyRoute } from './lazy-route-recovery.ts';

function browser() {
  const values = new Map<string, string>();
  const visits: string[] = [];
  return {
    storage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } },
    location: { assign: (url: string) => { visits.push(url); } },
    visits
  };
}

describe('lazy route recovery after deployment', () => {
  it('opens the requested sidebar route with its query and fragment when an old chunk fails', () => {
    const state = browser();
    assert.equal(recoverLazyRoute(new TypeError('Failed to fetch dynamically imported module: https://example.test/chunk-old.js'),
      '/products?categorySlug=vitamins#offers', state.storage, state.location, 1000), true);
    assert.deepEqual(state.visits, ['/products?categorySlug=vitamins#offers']);
  });

  it('recovers the module-loading messages used by different browsers', () => {
    for (const message of ['Importing a module script failed.', 'error loading dynamically imported module', 'Loading chunk 4 failed.', 'Failed to load module script']) {
      const state = browser();
      assert.equal(recoverLazyRoute(new Error(message), '/products', state.storage, state.location, 1000), true);
    }
  });

  it('does not reload repeatedly if the new deployment also has a broken chunk', () => {
    const state = browser();
    const error = new Error('Failed to fetch dynamically imported module');
    assert.equal(recoverLazyRoute(error, '/products', state.storage, state.location, 1000), true);
    assert.equal(recoverLazyRoute(error, '/products', state.storage, state.location, 2000), false);
    assert.deepEqual(state.visits, ['/products']);
    assert.equal(recoverLazyRoute(error, '/products', state.storage, state.location, 62000), true);
  });

  it('leaves application errors and unsafe destinations alone', () => {
    const state = browser();
    assert.equal(recoverLazyRoute(new Error('Product request failed'), '/products', state.storage, state.location), false);
    assert.equal(recoverLazyRoute(new Error('Failed to fetch'), '/products', state.storage, state.location), false);
    assert.equal(recoverLazyRoute(new Error('Failed to fetch dynamically imported module'), '//example.test', state.storage, state.location), false);
    assert.deepEqual(state.visits, []);
  });

  it('avoids a reload loop when browser storage is unavailable', () => {
    const state = browser();
    const storage = { getItem: () => { throw new Error('Storage unavailable'); }, setItem: () => {} };
    assert.equal(recoverLazyRoute(new Error('Failed to fetch dynamically imported module'), '/products', storage, state.location), false);
    assert.deepEqual(state.visits, []);
  });
});
