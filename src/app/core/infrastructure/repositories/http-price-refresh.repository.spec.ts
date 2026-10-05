// @ts-nocheck
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { of } from 'rxjs';

const require = createRequire(import.meta.url);
function load(file, dependencies) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true
  }}).outputText;
  const exports = {};
  runInNewContext(output, { exports, require: (name) => dependencies[name] ?? require(name) });
  return exports;
}

class FakeParams {
  constructor() { this.map = new Map(); }
  set(key, value) { this.map.set(key, String(value)); return this; }
}

const ENDPOINTS = {
  ADMIN_PRICE_REFRESH_RUNS: '/admin/price-refresh/runs',
  ADMIN_PRICE_REFRESH_SCHEDULE: '/admin/price-refresh/schedule',
  ADMIN_PRICE_REFRESH_RUN_STATUS: (id) => `/admin/price-refresh/${id}/status`,
  ADMIN_PRICE_REFRESH_RUN_ITEMS: (id) => `/admin/price-refresh/${id}/items`,
  ADMIN_PRICE_REFRESH_RETRY_FAILED: (id) => `/admin/price-refresh/${id}/retry-failed`
};

function loadRepo(httpResponseFactory) {
  const calls = [];
  const http = {
    get: (url, opts) => {
      const params = opts && opts.params ? Object.fromEntries(opts.params.map.entries()) : {};
      calls.push({ kind: 'GET', url, params });
      return httpResponseFactory('GET', url, params);
    },
    post: (url, body) => {
      calls.push({ kind: 'POST', url, body });
      return httpResponseFactory('POST', url, body);
    }
  };
  const loaded = load('./http-price-refresh.repository.ts', {
    '@angular/core': { Injectable: () => (type) => type, inject: () => http },
    '@angular/common/http': { HttpClient: 'http', HttpParams: FakeParams },
    '../../domain/repositories/price-refresh.repository': { PriceRefreshRepository: class {} },
    '../../domain/models/price-refresh.model': {},
    '../http/api-endpoints.constants': { API_ENDPOINTS: ENDPOINTS }
  });
  return { repo: new loaded.HttpPriceRefreshRepository(), calls };
}

it('runs query passes paging and filters as query params', () => {
  const { repo, calls } = loadRepo(() => of({ items: [], page: 9, pageSize: 25, totalCount: 0 }));

  repo.getRuns({
    page: 2, pageSize: 25, status: 'CompletedWithIssues',
    fromUtc: '2026-10-01T00:00:00Z', toUtc: '2026-10-05T00:00:00Z'
  }).subscribe(() => {});

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/admin/price-refresh/runs');
  assert.equal(calls[0].params.page, '2');
  assert.equal(calls[0].params.pageSize, '25');
  assert.equal(calls[0].params.status, 'CompletedWithIssues');
  assert.equal(calls[0].params.fromUtc, '2026-10-01T00:00:00Z');
  assert.equal(calls[0].params.toUtc, '2026-10-05T00:00:00Z');
});

it('normalizes a PascalCase runs payload into the domain model', () => {
  const raw = {
    Items: [{
      RunId: 'r1', ParentRunId: null, TriggerType: 'Retry', CreatedAtUtc: '2026-10-05T21:30:00Z',
      FinishedAtUtc: null, Status: 'CompletedWithIssues', TotalTargets: 10,
      SuccessCount: 5, UpdatedCount: 3, UnchangedCount: 2, FailedCount: 2,
      SkippedCount: 1, AvailabilityOnlyCount: 1, PendingWorkCount: 1
    }],
    Page: 1, PageSize: 25, TotalCount: 1
  };
  const { repo } = loadRepo(() => of(raw));

  let page;
  repo.getRuns({ page: 1, pageSize: 25 }).subscribe((value) => { page = value; });

  assert.equal(page.totalCount, 1);
  const row = page.items[0];
  assert.equal(row.runId, 'r1');
  assert.equal(row.parentRunId, null);
  assert.equal(row.triggerType, 'Retry');
  assert.equal(row.successCount, 5);
  assert.equal(row.failedCount, 2);
  assert.equal(row.skippedCount, 1);
  assert.equal(row.pendingWorkCount, 1);
});

it('schedule normalization keeps enabled flag and null nextRun', () => {
  const { repo } = loadRepo(() => of({ enabled: true, localTime: '00:30', timeZoneId: 'Asia/Riyadh', nextRunAtUtc: '2026-10-06T21:30:00Z' }));

  let schedule;
  repo.getSchedule().subscribe((value) => { schedule = value; });

  assert.equal(schedule.enabled, true);
  assert.equal(schedule.localTime, '00:30');
  assert.equal(schedule.timeZoneId, 'Asia/Riyadh');
  assert.equal(schedule.nextRunAtUtc, '2026-10-06T21:30:00Z');
});

it('items normalization maps reason codes and canRetry flags', () => {
  const raw = {
    Items: [{
      ItemId: 'i1', PharmacyProductId: 'pp1', ProductName: 'بانادول', PharmacyId: 'ph1',
      PharmacyCode: 'nahdi', PharmacyName: 'Nahdi', PharmacyNameArabic: 'النهدي',
      Status: 'FailedFinal', ReasonCode: 'failed-http-5xx', Attempts: 3,
      LastObservedAtUtc: null, CanRetry: true, RetryBlockedReasonCode: null
    }],
    Page: 1, PageSize: 50, TotalCount: 1
  };
  const { repo } = loadRepo(() => of(raw));

  let page;
  repo.getItems('r1', { page: 1, pageSize: 50, pharmacyId: 'ph1' }).subscribe((value) => { page = value; });

  const row = page.items[0];
  assert.equal(row.productName, 'بانادول');
  assert.equal(row.pharmacyNameArabic, 'النهدي');
  assert.equal(row.reasonCode, 'failed-http-5xx');
  assert.equal(row.canRetry, true);
  assert.equal(row.retryBlockedReasonCode, null);
});

it('retryFailed omits itemIds when null and normalizes the result', () => {
  const { repo, calls } = loadRepo(() => of({
    runId: 'child-1', parentRunId: 'p1', selectedCount: 20, queuedCount: 20,
    skippedCount: 2, alreadyExisting: false
  }));

  let result;
  repo.retryFailed('p1', 'ph-1', null, 'idem-1').subscribe((value) => { result = value; });

  assert.equal(calls[0].url, '/admin/price-refresh/p1/retry-failed');
  // Null itemIds must NOT travel (it means "all eligible failures"), while the
  // pharmacy and the idempotency key always do.
  assert.equal(calls[0].body.itemIds, undefined);
  assert.equal(calls[0].body.pharmacyId, 'ph-1');
  assert.equal(calls[0].body.idempotencyKey, 'idem-1');
  assert.equal(result.queuedCount, 20);
  assert.equal(result.skippedCount, 2);
  assert.equal(result.alreadyExisting, false);
});

it('retryFailed sends the explicit item selection when provided', () => {
  const { repo, calls } = loadRepo(() => of({}));

  repo.retryFailed('p1', 'ph-1', ['i-1', 'i-2'], 'idem-2').subscribe(() => {});

  assert.equal(calls[0].body.itemIds.length, 2);
  assert.equal(calls[0].body.itemIds[0], 'i-1');
});
