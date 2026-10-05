// @ts-nocheck
import { it } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyRetryActionsState,
  startRetryAction,
  failRetryAction,
  succeedRetryAction,
  retryActionKeyForItem,
  retryActionKeyForPharmacy,
  isRetryBusy,
  retryKeyFor,
  newIdempotencyKey
} from './price-refresh-logs.state.ts';

it('keeps busy state per action so a second action never unlocks the first', () => {
  let state = emptyRetryActionsState();
  const itemKey = retryActionKeyForItem('item-1');
  const pharmacyKey = retryActionKeyForPharmacy('ph-1');

  state = startRetryAction(state, itemKey, 'key-1');
  assert.ok(isRetryBusy(state, itemKey));

  // Starting another action does not touch the first.
  state = startRetryAction(state, pharmacyKey, 'key-2');
  assert.ok(isRetryBusy(state, itemKey));
  assert.ok(isRetryBusy(state, pharmacyKey));

  // Failing the pharmacy action leaves the item action busy.
  state = failRetryAction(state, pharmacyKey);
  assert.ok(isRetryBusy(state, itemKey));
  assert.ok(!isRetryBusy(state, pharmacyKey));
});

it('reuses the idempotency key across a failed attempt and drops it after success', () => {
  let state = emptyRetryActionsState();
  const key = retryActionKeyForPharmacy('ph-1');

  state = startRetryAction(state, key, 'idem-1');
  assert.equal(retryKeyFor(state, key), 'idem-1');

  // Network failure: busy released, key KEPT so the retry stays the same request.
  state = failRetryAction(state, key);
  assert.equal(retryKeyFor(state, key), 'idem-1');

  // Re-click reuses the same key instead of minting a new request.
  state = startRetryAction(state, key, 'idem-2');
  assert.equal(retryKeyFor(state, key), 'idem-1');

  // Success: key dropped.
  state = succeedRetryAction(state, key);
  assert.equal(retryKeyFor(state, key), '');
  assert.ok(!isRetryBusy(state, key));
});

it('ignores duplicate start and stale complete transitions', () => {
  let state = emptyRetryActionsState();
  const key = retryActionKeyForItem('i-1');

  state = startRetryAction(state, key, 'k1');
  const reStarted = startRetryAction(state, key, 'k2');
  assert.equal(reStarted, state); // same object: no double-busy, key untouched

  const finished = succeedRetryAction(state, key);
  const stale = succeedRetryAction(finished, key);
  assert.equal(stale, finished);
});

it('mints a non-empty idempotency key', () => {
  const a = newIdempotencyKey();
  const b = newIdempotencyKey();
  assert.ok(a.length > 0);
  assert.notEqual(a, b);
});
