import type { OpsDashboardSnapshot } from './dashboard.model';
import type { PriceRefreshRunRow } from './price-refresh.model';

export function isDashboardCycle(run: PriceRefreshRunRow): boolean {
  return !run.parentRunId && run.triggerType !== 'Retry'
    && run.status !== 'Paused' && run.status !== 'Cancelled';
}

export function applyDashboardCycle(snapshot: OpsDashboardSnapshot, run: PriceRefreshRunRow | null): OpsDashboardSnapshot {
  if (!run || !snapshot.priceRefresh) return snapshot;
  const percent = (count: number) => run.totalTargets > 0 ? Math.round(10000 * count / run.totalTargets) / 100 : 0;
  return {
    ...snapshot,
    priceRefresh: {
      ...snapshot.priceRefresh,
      latestRunId: run.runId, latestRunStartedAtUtc: run.createdAtUtc, latestRunFinishedAtUtc: run.finishedAtUtc,
      runTotal: run.totalTargets, runSucceeded: run.successCount,
      runChanged: run.updatedCount, runUnchanged: run.unchangedCount,
      runFailed: run.failedCount, runSkipped: run.skippedCount,
      runAvailabilityOnly: run.availabilityOnlyCount, runPending: run.pendingWorkCount,
      runSuccessPercent: percent(run.successCount), runFailurePercent: percent(run.failedCount)
    }
  };
}
