import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { PriceRefreshRepository } from '../../domain/repositories/price-refresh.repository';
import {
  PriceRefreshItemsPage,
  PriceRefreshItemsQuery,
  PriceRefreshItemRow,
  PriceRefreshPharmacyRow,
  PriceRefreshRetryResult,
  PriceRefreshRunsPage,
  PriceRefreshRunsQuery,
  PriceRefreshRunRow,
  PriceRefreshRunStatusReport,
  PriceRefreshSchedule
} from '../../domain/models/price-refresh.model';
import { API_ENDPOINTS } from '../http/api-endpoints.constants';

@Injectable({ providedIn: 'root' })
export class HttpPriceRefreshRepository extends PriceRefreshRepository {
  private readonly http = inject(HttpClient);

  getRuns(query: PriceRefreshRunsQuery): Observable<PriceRefreshRunsPage> {
    let params = this.pagingParams(query.page, query.pageSize);
    if (query.pharmacyId) params = params.set('pharmacyId', query.pharmacyId);
    if (query.status) params = params.set('status', query.status);
    if (query.fromUtc) params = params.set('fromUtc', query.fromUtc);
    if (query.toUtc) params = params.set('toUtc', query.toUtc);
    return this.http
      .get<Record<string, unknown>>(API_ENDPOINTS.ADMIN_PRICE_REFRESH_RUNS, { params })
      .pipe(map((raw) => this.normalizeRunsPage(raw)));
  }

  getSchedule(): Observable<PriceRefreshSchedule> {
    return this.http
      .get<Record<string, unknown>>(API_ENDPOINTS.ADMIN_PRICE_REFRESH_SCHEDULE)
      .pipe(
        map((raw) => ({
          enabled: raw['enabled'] === true,
          localTime: String(raw['localTime'] ?? ''),
          timeZoneId: String(raw['timeZoneId'] ?? ''),
          nextRunAtUtc: this.optionalText(raw['nextRunAtUtc'])
        }))
      );
  }

  getRunStatus(runId: string): Observable<PriceRefreshRunStatusReport> {
    return this.http
      .get<Record<string, unknown>>(API_ENDPOINTS.ADMIN_PRICE_REFRESH_RUN_STATUS(runId))
      .pipe(map((raw) => this.normalizeStatusReport(raw)));
  }

  getItems(runId: string, query: PriceRefreshItemsQuery): Observable<PriceRefreshItemsPage> {
    let params = this.pagingParams(query.page, query.pageSize);
    if (query.pharmacyId) params = params.set('pharmacyId', query.pharmacyId);
    if (query.status) params = params.set('status', query.status);
    if (query.search?.trim()) params = params.set('q', query.search.trim());
    return this.http
      .get<Record<string, unknown>>(API_ENDPOINTS.ADMIN_PRICE_REFRESH_RUN_ITEMS(runId), { params })
      .pipe(map((raw) => this.normalizeItemsPage(raw)));
  }

  retryFailed(
    runId: string,
    pharmacyId: string,
    itemIds: string[] | null,
    idempotencyKey: string
  ): Observable<PriceRefreshRetryResult> {
    const body: Record<string, unknown> = {
      pharmacyId,
      idempotencyKey
    };
    // itemIds === null means "all eligible failures of this pharmacy"; an empty array
    // is a server-side 400 by contract, so it is never sent.
    if (itemIds !== null) body['itemIds'] = itemIds;
    return this.http
      .post<Record<string, unknown>>(API_ENDPOINTS.ADMIN_PRICE_REFRESH_RETRY_FAILED(runId), body)
      .pipe(
        map((raw) => ({
          runId: String(raw['runId'] ?? raw['RunId'] ?? ''),
          parentRunId: String(raw['parentRunId'] ?? raw['ParentRunId'] ?? ''),
          selectedCount: Number(raw['selectedCount'] ?? raw['SelectedCount'] ?? 0),
          queuedCount: Number(raw['queuedCount'] ?? raw['QueuedCount'] ?? 0),
          skippedCount: Number(raw['skippedCount'] ?? raw['SkippedCount'] ?? 0),
          alreadyExisting: (raw['alreadyExisting'] ?? raw['AlreadyExisting']) === true
        }))
      );
  }

  private pagingParams(page: number, pageSize: number): HttpParams {
    return new HttpParams().set('page', String(page)).set('pageSize', String(pageSize));
  }

  private normalizeRunsPage(raw: Record<string, unknown>): PriceRefreshRunsPage {
    const itemsRaw = raw['items'] ?? raw['Items'] ?? [];
    return {
      items: (Array.isArray(itemsRaw) ? itemsRaw : []).map((row) => this.normalizeRunRow(row as Record<string, unknown>)),
      page: Number(raw['page'] ?? raw['Page'] ?? 1),
      pageSize: Number(raw['pageSize'] ?? raw['PageSize'] ?? 25),
      totalCount: Number(raw['totalCount'] ?? raw['TotalCount'] ?? 0)
    };
  }

  private normalizeRunRow(raw: Record<string, unknown>): PriceRefreshRunRow {
    return {
      runId: String(raw['runId'] ?? raw['RunId'] ?? ''),
      parentRunId: this.optionalText(raw['parentRunId'] ?? raw['ParentRunId']),
      triggerType: String(raw['triggerType'] ?? raw['TriggerType'] ?? ''),
      createdAtUtc: String(raw['createdAtUtc'] ?? raw['CreatedAtUtc'] ?? ''),
      finishedAtUtc: this.optionalText(raw['finishedAtUtc'] ?? raw['FinishedAtUtc']),
      status: String(raw['status'] ?? raw['Status'] ?? ''),
      totalTargets: Number(raw['totalTargets'] ?? raw['TotalTargets'] ?? 0),
      successCount: Number(raw['successCount'] ?? raw['SuccessCount'] ?? 0),
      updatedCount: Number(raw['updatedCount'] ?? raw['UpdatedCount'] ?? 0),
      unchangedCount: Number(raw['unchangedCount'] ?? raw['UnchangedCount'] ?? 0),
      failedCount: Number(raw['failedCount'] ?? raw['FailedCount'] ?? 0),
      skippedCount: Number(raw['skippedCount'] ?? raw['SkippedCount'] ?? 0),
      availabilityOnlyCount: Number(raw['availabilityOnlyCount'] ?? raw['AvailabilityOnlyCount'] ?? 0),
      pendingWorkCount: Number(raw['pendingWorkCount'] ?? raw['PendingWorkCount'] ?? 0)
    };
  }

  private normalizeStatusReport(raw: Record<string, unknown>): PriceRefreshRunStatusReport {
    const pharmaciesRaw = raw['pharmacies'] ?? raw['Pharmacies'] ?? [];
    return {
      runId: String(raw['runId'] ?? raw['RunId'] ?? ''),
      status: String(raw['status'] ?? raw['Status'] ?? ''),
      createdAtUtc: String(raw['createdAtUtc'] ?? raw['CreatedAtUtc'] ?? ''),
      finishedAtUtc: this.optionalText(raw['finishedAtUtc'] ?? raw['FinishedAtUtc']),
      includeSyncDisabled: (raw['includeSyncDisabled'] ?? raw['IncludeSyncDisabled']) === true,
      totalTargets: Number(raw['totalTargets'] ?? raw['TotalTargets'] ?? 0),
      freshCount: Number(raw['freshCount'] ?? raw['FreshCount'] ?? 0),
      freshnessPercent: Number(raw['freshnessPercent'] ?? raw['FreshnessPercent'] ?? 0),
      pharmacies: (Array.isArray(pharmaciesRaw) ? pharmaciesRaw : []).map(
        (row) => this.normalizePharmacyRow(row as Record<string, unknown>)
      )
    };
  }

  private normalizePharmacyRow(raw: Record<string, unknown>): PriceRefreshPharmacyRow {
    return {
      code: String(raw['code'] ?? raw['Code'] ?? ''),
      total: Number(raw['total'] ?? raw['Total'] ?? 0),
      updated: Number(raw['updated'] ?? raw['Updated'] ?? 0),
      unchanged: Number(raw['unchanged'] ?? raw['Unchanged'] ?? 0),
      availabilityOnly: Number(raw['availabilityOnly'] ?? raw['AvailabilityOnly'] ?? 0),
      notFound: Number(raw['notFound'] ?? raw['NotFound'] ?? 0),
      blocked: Number(raw['blocked'] ?? raw['Blocked'] ?? 0),
      identityConflict: Number(raw['identityConflict'] ?? raw['IdentityConflict'] ?? 0),
      invalidPrice: Number(raw['invalidPrice'] ?? raw['InvalidPrice'] ?? 0),
      missingLocator: Number(raw['missingLocator'] ?? raw['MissingLocator'] ?? 0),
      failedFinal: Number(raw['failedFinal'] ?? raw['FailedFinal'] ?? 0),
      targetChanged: Number(raw['targetChanged'] ?? raw['TargetChanged'] ?? 0),
      pending: Number(raw['pending'] ?? raw['Pending'] ?? 0),
      retryScheduled: Number(raw['retryScheduled'] ?? raw['RetryScheduled'] ?? 0),
      inProgress: Number(raw['inProgress'] ?? raw['InProgress'] ?? 0),
      freshnessPercent: Number(raw['freshnessPercent'] ?? raw['FreshnessPercent'] ?? 0),
      pharmacyId: this.optionalText(raw['pharmacyId'] ?? raw['PharmacyId']),
      pharmacyName: String(raw['pharmacyName'] ?? raw['PharmacyName'] ?? ''),
      pharmacyNameArabic: String(raw['pharmacyNameArabic'] ?? raw['PharmacyNameArabic'] ?? ''),
      successCount: Number(raw['successCount'] ?? raw['SuccessCount'] ?? 0),
      failedCount: Number(raw['failedCount'] ?? raw['FailedCount'] ?? 0),
      skippedCount: Number(raw['skippedCount'] ?? raw['SkippedCount'] ?? 0),
      pendingWorkCount: Number(raw['pendingWorkCount'] ?? raw['PendingWorkCount'] ?? 0)
    };
  }

  private normalizeItemsPage(raw: Record<string, unknown>): PriceRefreshItemsPage {
    const itemsRaw = raw['items'] ?? raw['Items'] ?? [];
    return {
      items: (Array.isArray(itemsRaw) ? itemsRaw : []).map((row) => this.normalizeItemRow(row as Record<string, unknown>)),
      page: Number(raw['page'] ?? raw['Page'] ?? 1),
      pageSize: Number(raw['pageSize'] ?? raw['PageSize'] ?? 50),
      totalCount: Number(raw['totalCount'] ?? raw['TotalCount'] ?? 0)
    };
  }

  private normalizeItemRow(raw: Record<string, unknown>): PriceRefreshItemRow {
    return {
      itemId: String(raw['itemId'] ?? raw['ItemId'] ?? ''),
      pharmacyProductId: String(raw['pharmacyProductId'] ?? raw['PharmacyProductId'] ?? ''),
      productName: String(raw['productName'] ?? raw['ProductName'] ?? ''),
      pharmacyId: String(raw['pharmacyId'] ?? raw['PharmacyId'] ?? ''),
      pharmacyCode: String(raw['pharmacyCode'] ?? raw['PharmacyCode'] ?? ''),
      pharmacyName: String(raw['pharmacyName'] ?? raw['PharmacyName'] ?? ''),
      pharmacyNameArabic: String(raw['pharmacyNameArabic'] ?? raw['PharmacyNameArabic'] ?? ''),
      status: String(raw['status'] ?? raw['Status'] ?? ''),
      reasonCode: this.optionalText(raw['reasonCode'] ?? raw['ReasonCode']),
      attempts: Number(raw['attempts'] ?? raw['Attempts'] ?? 0),
      lastObservedAtUtc: this.optionalText(raw['lastObservedAtUtc'] ?? raw['LastObservedAtUtc']),
      canRetry: (raw['canRetry'] ?? raw['CanRetry']) === true,
      retryBlockedReasonCode: this.optionalText(raw['retryBlockedReasonCode'] ?? raw['RetryBlockedReasonCode'])
    };
  }

  private optionalText(value: unknown): string | null {
    if (value == null) return null;
    const text = String(value).trim();
    return text.length > 0 ? text : null;
  }
}
