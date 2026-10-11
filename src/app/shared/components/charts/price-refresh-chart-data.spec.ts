import assert from 'node:assert/strict';
import { test } from 'node:test';
import { priceRefreshChartItems } from './price-refresh-chart-data.ts';

test('catalog freshness uses every catalog entry, including missing prices', () => {
  const items = priceRefreshChartItems({ catalogTotal: 1000, freshPrices24h: 100, stalePrices: 850, missingPrices: 50 }, 'catalog');
  assert.deepEqual(items.map(item => item.percent), [10, 85, 5]);
});

test('latest cycle retains skipped and pending entries in the denominator', () => {
  const items = priceRefreshChartItems({ runTotal: 100, runSucceeded: 40, runFailed: 10, runSkipped: 20, runPending: 30 }, 'run');
  assert.deepEqual(items.map(item => item.percent), [40, 10, 0, 20, 30]);
});

test('availability-only updates remain separate from price confirmations and skipped items', () => {
  const items = priceRefreshChartItems({ runTotal: 100, runSucceeded: 50, runFailed: 10, runAvailabilityOnly: 20, runSkipped: 5, runPending: 15 }, 'run');
  assert.deepEqual(items.map(item => item.count), [50, 10, 20, 5, 15]);
  assert.deepEqual(items.map(item => item.percent), [50, 10, 20, 5, 15]);
  assert.equal(items.reduce((sum, item) => sum + item.percent, 0), 100);
});

test('empty or missing metrics yield finite zero percentages', () => {
  for (const mode of ['run', 'catalog'] as const) {
    assert.ok(priceRefreshChartItems(undefined, mode).every(item => item.count === 0 && item.percent === 0));
    assert.ok(priceRefreshChartItems({ runTotal: 0, catalogTotal: 0, runSucceeded: 2, freshPrices24h: 2 }, mode).every(item => item.percent === 0));
  }
});
