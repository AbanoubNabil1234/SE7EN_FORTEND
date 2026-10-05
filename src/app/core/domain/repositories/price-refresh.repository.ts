import { Observable } from 'rxjs';
import {
  PriceRefreshItemsPage,
  PriceRefreshItemsQuery,
  PriceRefreshRetryResult,
  PriceRefreshRunsPage,
  PriceRefreshRunsQuery,
  PriceRefreshRunStatusReport,
  PriceRefreshSchedule
} from '../models/price-refresh.model';

/**
 * Admin access to the price refresh records/logs and retry scheduling
 * (plan 2026-10-05 §3, §4, §6). Reads require products.view; retry requires
 * products.manage — the server enforces both.
 */
export abstract class PriceRefreshRepository {
  /** Paginated daily-cycle runs with per-run counter buckets. */
  abstract getRuns(query: PriceRefreshRunsQuery): Observable<PriceRefreshRunsPage>;

  /** Effective daily schedule (config + actual Hangfire registration). */
  abstract getSchedule(): Observable<PriceRefreshSchedule>;

  /** Full status report of one run incl. per-pharmacy names and counters. */
  abstract getRunStatus(runId: string): Observable<PriceRefreshRunStatusReport>;

  /** Paginated ledger rows of one run with pharmacy names and reason codes. */
  abstract getItems(runId: string, query: PriceRefreshItemsQuery): Observable<PriceRefreshItemsPage>;

  /**
   * Schedules a retry child run for the failed targets of ONE pharmacy. An
   * idempotencyKey keeps double clicks and network retries on one request.
   */
  abstract retryFailed(
    runId: string,
    pharmacyId: string,
    itemIds: string[] | null,
    idempotencyKey: string
  ): Observable<PriceRefreshRetryResult>;
}
