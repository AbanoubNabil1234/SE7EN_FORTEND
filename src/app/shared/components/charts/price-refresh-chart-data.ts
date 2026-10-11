import type { PriceRefreshMetrics } from '../../../core/domain/models/dashboard.model';

export type PriceRefreshChartMode = 'run' | 'catalog';

export function priceRefreshChartItems(data: Partial<PriceRefreshMetrics> | undefined, mode: PriceRefreshChartMode) {
  const total = Math.max(0, (mode === 'run' ? data?.runTotal : data?.catalogTotal) ?? 0);
  const entries = mode === 'run'
    ? [
        { key: 'succeeded', count: data?.runSucceeded, color: '#10B981' },
        { key: 'failed', count: data?.runFailed, color: '#E11D48' },
        { key: 'availabilityOnly', count: data?.runAvailabilityOnly, color: '#3B82F6' },
        { key: 'skipped', count: data?.runSkipped, color: '#F59E0B' },
        { key: 'pending', count: data?.runPending, color: '#64748B' }
      ]
    : [
        { key: 'fresh', count: data?.freshPrices24h, color: '#10B981' },
        { key: 'stale', count: data?.stalePrices, color: '#F59E0B' },
        { key: 'missing', count: data?.missingPrices, color: '#64748B' }
      ];
  let offset = 0;
  const circumference = 2 * Math.PI * 38;
  return entries.map(entry => {
    const count = Math.max(0, entry.count ?? 0);
    const percent = total > 0 ? Math.min(100, count / total * 100) : 0;
    const length = percent / 100 * circumference;
    const slice = {
      ...entry, count, percent,
      labelKey: `dashboard.priceRefresh.${entry.key}`,
      dashArray: `${length} ${circumference - length}`,
      dashOffset: -offset
    };
    offset += length;
    return slice;
  });
}
