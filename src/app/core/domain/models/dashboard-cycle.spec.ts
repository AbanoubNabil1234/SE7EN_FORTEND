import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyDashboardCycle, isDashboardCycle } from './dashboard-cycle.ts';
import type { OpsDashboardSnapshot } from './dashboard.model.ts';
import type { PriceRefreshRunRow } from './price-refresh.model.ts';

const snapshot = {
  totalPharmacyProducts: 203880,
  priceRefresh: { catalogTotal: 203880, freshPrices24h: 193604, latestRunId: 'old', runPending: 4000 }
} as OpsDashboardSnapshot;
const run = {
  runId: 'latest', parentRunId: null, triggerType: 'Manual', status: 'CompletedWithIssues',
  createdAtUtc: '2026-10-21T02:34:11Z', finishedAtUtc: '2026-10-21T05:47:38Z',
  totalTargets: 196542, successCount: 193245, updatedCount: 881, unchangedCount: 192364,
  failedCount: 3297, skippedCount: 0, availabilityOnlyCount: 0, pendingWorkCount: 0
} satisfies PriceRefreshRunRow;

test('latest ledger replaces cached cycle counts without replacing the entire catalog total', () => {
  const result = applyDashboardCycle(snapshot, run);
  assert.equal(result.totalPharmacyProducts, 203880);
  assert.equal(result.priceRefresh?.catalogTotal, 203880);
  assert.equal(result.priceRefresh?.freshPrices24h, 193604);
  assert.equal(result.priceRefresh?.latestRunId, 'latest');
  assert.equal(result.priceRefresh?.runTotal, 196542);
  assert.equal(result.priceRefresh?.runSucceeded, 193245);
  assert.equal(result.priceRefresh?.runChanged, 881);
  assert.equal(result.priceRefresh?.runUnchanged, 192364);
  assert.equal(result.priceRefresh?.runPending, 0);
  assert.equal(result.priceRefresh?.latestRunFinishedAtUtc, run.finishedAtUtc);
  assert.equal(result.priceRefresh?.runSuccessPercent, 98.32);
  assert.equal(snapshot.priceRefresh?.runPending, 4000);
});

test('retry children, paused and cancelled cycles cannot replace the full cycle', () => {
  assert.equal(isDashboardCycle(run), true);
  for (const status of ['Paused', 'Cancelled']) assert.equal(isDashboardCycle({ ...run, status }), false);
  assert.equal(isDashboardCycle({ ...run, parentRunId: 'parent' }), false);
  assert.equal(isDashboardCycle({ ...run, triggerType: 'Retry' }), false);
});

test('no cycle or missing catalog metrics do not fabricate price change counts', () => {
  assert.equal(applyDashboardCycle(snapshot, null), snapshot);
  const missing = { totalPharmacyProducts: 0 } as OpsDashboardSnapshot;
  assert.equal(applyDashboardCycle(missing, run), missing);
  const empty = applyDashboardCycle(snapshot, { ...run, totalTargets: 0, successCount: 0, updatedCount: 0, unchangedCount: 0, failedCount: 0 });
  assert.equal(empty.priceRefresh?.runChanged, 0);
  assert.equal(empty.priceRefresh?.runSuccessPercent, 0);
});
