/**
 * Price refresh records/logs domain models (plan 2026-10-05 §3-§4).
 * Mirror of the API contracts under /admin/price-refresh.
 */

export interface PriceRefreshRunRow {
  runId: string;
  parentRunId: string | null;
  triggerType: string;
  createdAtUtc: string;
  finishedAtUtc: string | null;
  status: string;
  totalTargets: number;
  successCount: number;
  updatedCount: number;
  unchangedCount: number;
  failedCount: number;
  skippedCount: number;
  availabilityOnlyCount: number;
  pendingWorkCount: number;
}

export interface PriceRefreshRunsPage {
  items: PriceRefreshRunRow[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface PriceRefreshSchedule {
  enabled: boolean;
  localTime: string;
  timeZoneId: string;
  nextRunAtUtc: string | null;
}

export interface PriceRefreshItemRow {
  itemId: string;
  pharmacyProductId: string;
  productName: string;
  pharmacyId: string;
  pharmacyCode: string;
  pharmacyName: string;
  pharmacyNameArabic: string;
  status: string;
  reasonCode: string | null;
  attempts: number;
  lastObservedAtUtc: string | null;
  canRetry: boolean;
  retryBlockedReasonCode: string | null;
}

export interface PriceRefreshItemsPage {
  items: PriceRefreshItemRow[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface PriceRefreshRunsQuery {
  page: number;
  pageSize: number;
  pharmacyId?: string;
  status?: string;
  fromUtc?: string;
  toUtc?: string;
}

export interface PriceRefreshItemsQuery {
  page: number;
  pageSize: number;
  pharmacyId?: string;
  status?: string;
  search?: string;
}

export interface PriceRefreshRetryResult {
  runId: string;
  parentRunId: string;
  selectedCount: number;
  queuedCount: number;
  skippedCount: number;
  alreadyExisting: boolean;
}

/** Per-pharmacy breakdown of one run (from the run status report). */
export interface PriceRefreshPharmacyRow {
  code: string;
  total: number;
  updated: number;
  unchanged: number;
  availabilityOnly: number;
  notFound: number;
  blocked: number;
  identityConflict: number;
  invalidPrice: number;
  missingLocator: number;
  failedFinal: number;
  targetChanged: number;
  pending: number;
  retryScheduled: number;
  inProgress: number;
  freshnessPercent: number;
  pharmacyId: string | null;
  pharmacyName: string;
  pharmacyNameArabic: string;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  pendingWorkCount: number;
}

export interface PriceRefreshRunStatusReport {
  runId: string;
  status: string;
  createdAtUtc: string;
  finishedAtUtc: string | null;
  includeSyncDisabled: boolean;
  totalTargets: number;
  freshCount: number;
  freshnessPercent: number;
  pharmacies: PriceRefreshPharmacyRow[];
}
