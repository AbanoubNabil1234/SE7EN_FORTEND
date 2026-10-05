import { Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Subscription, interval, finalize } from 'rxjs';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { PermissionService } from '../../core/services/permission.service';
import { PriceRefreshRepository } from '../../core/domain/repositories/price-refresh.repository';
import {
  PriceRefreshItemRow,
  PriceRefreshItemsPage,
  PriceRefreshItemRow as ItemRow,
  PriceRefreshRunsPage,
  PriceRefreshRunRow,
  PriceRefreshRunStatusReport,
  PriceRefreshSchedule
} from '../../core/domain/models/price-refresh.model';
import {
  RetryActionsState,
  emptyRetryActionsState,
  failRetryAction,
  isRetryBusy,
  newIdempotencyKey,
  retryActionKeyForItem,
  retryActionKeyForPharmacy,
  retryKeyFor,
  startRetryAction,
  succeedRetryAction
} from './price-refresh-logs.state';

const RUNS_PAGE_SIZE = 25;
const ITEMS_PAGE_SIZE = 50;
const ACTIVE_POLL_MS = 15_000;

/** Non-terminal run statuses that keep the live poll alive. */
const OPEN_RUN_STATUSES = new Set(['Pending', 'Running', 'Paused']);

@Component({
  selector: 'app-price-refresh-logs',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './price-refresh-logs.component.html',
  styleUrl: './price-refresh-logs.component.css'
})
export class PriceRefreshLogsComponent implements OnInit, OnDestroy {
  readonly isEmbedded = input<boolean>(false);

  private readonly priceRefresh = inject(PriceRefreshRepository);
  private readonly i18n = inject(I18nService);
  readonly locale = inject(LocaleService);
  private readonly notifications = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly permissionService = inject(PermissionService);
  private readonly datePipe = new DatePipe('en-US');

  // ── Schedule panel ──────────────────────────────────────────────────────────
  readonly schedule = signal<PriceRefreshSchedule | null>(null);
  readonly scheduleLoading = signal(true);
  readonly scheduleError = signal(false);

  // ── Runs list ───────────────────────────────────────────────────────────────
  readonly runs = signal<PriceRefreshRunsPage | null>(null);
  readonly runsLoading = signal(false);
  readonly runsError = signal(false);
  readonly runsPage = signal(1);
  readonly runsStatusFilter = signal('');
  readonly runsFromFilter = signal('');
  readonly runsToFilter = signal('');

  // ── Selected run detail ─────────────────────────────────────────────────────
  readonly selectedRun = signal<PriceRefreshRunRow | null>(null);
  readonly runReport = signal<PriceRefreshRunStatusReport | null>(null);
  readonly runReportLoading = signal(false);
  readonly runReportError = signal(false);

  // ── Items table of the selected run ─────────────────────────────────────────
  readonly items = signal<PriceRefreshItemsPage | null>(null);
  readonly itemsLoading = signal(false);
  readonly itemsError = signal(false);
  readonly itemsPage = signal(1);
  readonly itemsPharmacyFilter = signal('');
  readonly itemsStatusFilter = signal('');
  readonly itemsSearch = signal('');

  // ── Retry action state (pure transitions, unit-tested) ──────────────────────
  readonly retryActions = signal<RetryActionsState>(emptyRetryActionsState());

  private readonly pollSubscription = signal<Subscription | null>(null);

  readonly canRetry = computed(() => this.permissionService.hasPermission('products.manage'));

  readonly totalPages = computed(() => {
    const runs = this.runs();
    if (!runs || runs.pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(runs.totalCount / runs.pageSize));
  });

  readonly itemsTotalPages = computed(() => {
    const items = this.items();
    if (!items || items.pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(items.totalCount / items.pageSize));
  });

  readonly isPolling = computed(() => this.pollSubscription() !== null);

  readonly totalRunsCount = computed(() => this.runs()?.totalCount ?? 0);

  readonly completedRunsCount = computed(() => {
    const list = this.runs()?.items ?? [];
    return list.filter((r) => r.status === 'Completed').length;
  });

  readonly issuesRunsCount = computed(() => {
    const list = this.runs()?.items ?? [];
    return list.filter((r) => r.status === 'CompletedWithIssues').length;
  });

  readonly failedRunsCount = computed(() => {
    const list = this.runs()?.items ?? [];
    return list.filter((r) => r.status === 'Failed' || r.status === 'Cancelled').length;
  });

  readonly runStatuses: string[] = [
    'Pending', 'Running', 'Completed', 'CompletedWithIssues', 'Cancelled', 'Failed'
  ];
  readonly itemStatuses: string[] = [
    'Pending', 'InProgress', 'RetryScheduled', 'Updated', 'Unchanged',
    'UnavailableConfirmed', 'NotFound', 'Blocked', 'FailedFinal',
    'InvalidPrice', 'IdentityConflict', 'MissingLocator', 'TargetChanged'
  ];

  resetFilters(): void {
    this.runsStatusFilter.set('');
    this.runsFromFilter.set('');
    this.runsToFilter.set('');
    this.onRunsFilterChanged();
  }

  resetItemsFilters(): void {
    this.itemsPharmacyFilter.set('');
    this.itemsStatusFilter.set('');
    this.itemsSearch.set('');
    this.onItemsFilterChanged();
  }

  async copyRunId(runId: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(runId);
      this.notifications.showSuccess(this.i18n.t('priceRefreshLogs.runIdCopied'));
    } catch {
      // fallback if clipboard API not available
    }
  }

  getSuccessPercent(success: number, total: number): number {
    if (!total || total <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((success / total) * 100)));
  }

  ngOnInit(): void {
    this.loadSchedule();
    this.loadRuns();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  loadSchedule(): void {
    this.scheduleLoading.set(true);
    this.scheduleError.set(false);
    this.priceRefresh.getSchedule().subscribe({
      next: (schedule) => {
        this.schedule.set(schedule);
        this.scheduleLoading.set(false);
      },
      error: () => {
        this.scheduleError.set(true);
        this.scheduleLoading.set(false);
      }
    });
  }

  loadRuns(): void {
    this.runsLoading.set(true);
    this.runsError.set(false);
    this.priceRefresh
      .getRuns({
        page: this.runsPage(),
        pageSize: RUNS_PAGE_SIZE,
        status: this.runsStatusFilter() || undefined,
        fromUtc: this.toIsoOrNull(this.runsFromFilter(), false),
        toUtc: this.toIsoOrNull(this.runsToFilter(), true)
      })
      .subscribe({
        next: (page) => {
          this.runs.set(page);
          this.runsLoading.set(false);
        },
        error: () => {
          this.runsError.set(true);
          this.runsLoading.set(false);
        }
      });
  }

  onRunsFilterChanged(): void {
    this.runsPage.set(1);
    this.loadRuns();
  }

  goToRunsPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.runsPage()) return;
    this.runsPage.set(page);
    this.loadRuns();
  }

  selectRun(run: PriceRefreshRunRow): void {
    if (this.selectedRun()?.runId === run.runId) return;
    this.stopPolling();
    this.selectedRun.set(run);
    this.runReport.set(null);
    this.items.set(null);
    this.itemsPage.set(1);
    this.itemsPharmacyFilter.set('');
    this.itemsStatusFilter.set('');
    this.itemsSearch.set('');
    this.loadRunReport(run.runId);
    this.loadItems();
    this.startPollingIfOpen(run.status, run.runId);
  }

  closeRunDetails(): void {
    this.stopPolling();
    this.selectedRun.set(null);
    this.runReport.set(null);
    this.items.set(null);
  }

  loadRunReport(runId: string): void {
    this.runReportLoading.set(true);
    this.runReportError.set(false);
    this.priceRefresh.getRunStatus(runId).subscribe({
      next: (report) => {
        this.runReport.set(report);
        this.runReportLoading.set(false);
      },
      error: () => {
        this.runReportError.set(true);
        this.runReportLoading.set(false);
      }
    });
  }

  loadItems(): void {
    const run = this.selectedRun();
    if (!run) return;
    this.itemsLoading.set(true);
    this.itemsError.set(false);
    this.priceRefresh
      .getItems(run.runId, {
        page: this.itemsPage(),
        pageSize: ITEMS_PAGE_SIZE,
        pharmacyId: this.itemsPharmacyFilter() || undefined,
        status: this.itemsStatusFilter() || undefined,
        search: this.itemsSearch() || undefined
      })
      .subscribe({
        next: (page) => {
          this.items.set(page);
          this.itemsLoading.set(false);
        },
        error: () => {
          this.itemsError.set(true);
          this.itemsLoading.set(false);
        }
      });
  }

  onItemsFilterChanged(): void {
    this.itemsPage.set(1);
    this.loadItems();
  }

  goToItemsPage(page: number): void {
    if (page < 1 || page > this.itemsTotalPages() || page === this.itemsPage()) return;
    this.itemsPage.set(page);
    this.loadItems();
  }

  // ── Polling: active run only, cancelled on leave / selection change ─────────

  private startPollingIfOpen(status: string, runId: string): void {
    if (!OPEN_RUN_STATUSES.has(status)) return;
    const sub = interval(ACTIVE_POLL_MS).subscribe(() => {
      const current = this.selectedRun();
      if (!current || current.runId !== runId) {
        this.stopPolling();
        return;
      }
      this.priceRefresh.getRunStatus(runId).subscribe({
        next: (report) => {
          this.runReport.set(report);
          // Non-overlapping reload of items only when the visible page is stale.
          if (OPEN_RUN_STATUSES.has(report.status)) {
            this.loadItems();
          } else {
            this.selectedRun.update((run) => (run ? { ...run, status: report.status } : run));
            this.stopPolling();
          }
        },
        error: () => {
          // Transient poll failure: keep the page usable, try again next tick.
        }
      });
    });
    this.pollSubscription.set(sub);
  }

  private stopPolling(): void {
    this.pollSubscription()?.unsubscribe();
    this.pollSubscription.set(null);
  }

  // ── Retry actions ───────────────────────────────────────────────────────────

  busyFor(actionKey: string): boolean {
    return isRetryBusy(this.retryActions(), actionKey);
  }

  async retrySingleItem(item: ItemRow): Promise<void> {
    const run = this.selectedRun();
    if (!run || !this.canRetry() || !item.canRetry) return;
    const actionKey = retryActionKeyForItem(item.itemId);
    if (this.busyFor(actionKey)) return;

    const confirmed = await this.confirmDialog.confirm({
      title: this.i18n.t('priceRefreshLogs.retrySingleTitle'),
      message: this.i18n.t('priceRefreshLogs.retrySingleConfirm')
        .replace('{product}', item.productName || item.pharmacyCode)
        .replace('{count}', '1'),
      type: 'info'
    });
    if (!confirmed) return;

    this.launchRetry(actionKey, run.runId, item.pharmacyId, [item.itemId]);
  }

  async retryPharmacyFailures(pharmacyId: string, pharmacyLabel: string, failedCount: number): Promise<void> {
    const run = this.selectedRun();
    if (!run || !this.canRetry() || !pharmacyId) return;
    const actionKey = retryActionKeyForPharmacy(pharmacyId);
    if (this.busyFor(actionKey)) return;

    const confirmed = await this.confirmDialog.confirm({
      title: this.i18n.t('priceRefreshLogs.retryPharmacyTitle'),
      message: this.i18n.t('priceRefreshLogs.retryPharmacyConfirm')
        .replace('{pharmacy}', pharmacyLabel)
        .replace('{count}', String(failedCount)),
      type: 'warning'
    });
    if (!confirmed) return;

    this.launchRetry(actionKey, run.runId, pharmacyId, null);
  }

  private launchRetry(actionKey: string, runId: string, pharmacyId: string, itemIds: string[] | null): void {
    this.retryActions.update((state) => startRetryAction(state, actionKey, newIdempotencyKey()));
    const key = retryKeyFor(this.retryActions(), actionKey);
    this.priceRefresh
      .retryFailed(runId, pharmacyId, itemIds, key)
      .pipe(finalize(() => {
        // busy is cleared by succeed/fail below; finalize only guarantees cleanup
        // if neither branch ran (e.g. destroyed mid-flight).
      }))
      .subscribe({
        next: (result) => {
          this.retryActions.update((state) => succeedRetryAction(state, actionKey));
          // The message means "scheduled", never "prices already updated".
          this.notifications.showSuccess(
            this.i18n.t('priceRefreshLogs.retryScheduledMsg')
              .replace('{count}', String(result.queuedCount))
              .replace('{skipped}', String(result.skippedCount)),
            this.i18n.t('priceRefreshLogs.title')
          );
          this.selectChildRun(result.runId);
        },
        error: (error: { status?: number; error?: { code?: string } }) => {
          this.retryActions.update((state) => failRetryAction(state, actionKey));
          this.notifications.showError(this.messageForRetryError(error), this.i18n.t('priceRefreshLogs.title'));
        }
      });
  }

  private messageForRetryError(error: { status?: number; error?: { code?: string } }): string {
    const code = error?.error?.code;
    switch (code) {
      case 'no_retryable_targets':
        return this.i18n.t('priceRefreshLogs.errorNoRetryable');
      case 'retry_already_active':
        return this.i18n.t('priceRefreshLogs.errorAlreadyActive');
      case 'empty_item_ids':
      case 'items_not_in_parent':
      case 'missing_pharmacy':
        return this.i18n.t('priceRefreshLogs.errorInvalidRequest');
      case 'idempotency_conflict':
        return this.i18n.t('priceRefreshLogs.errorIdempotencyConflict');
      default:
        // 403/404/500/network: translated generic failure, never the raw error text.
        return this.i18n.t('priceRefreshLogs.errorRetryFailed');
    }
  }

  /** After scheduling, open the child run so its progress is visible. */
  private selectChildRun(childRunId: string): void {
    this.stopPolling();
    const parent = this.selectedRun();
    const child: PriceRefreshRunRow = {
      runId: childRunId,
      parentRunId: parent?.runId ?? null,
      triggerType: 'Retry',
      createdAtUtc: new Date().toISOString(),
      finishedAtUtc: null,
      status: 'Pending',
      totalTargets: 0,
      successCount: 0,
      updatedCount: 0,
      unchangedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      availabilityOnlyCount: 0,
      pendingWorkCount: 0
    };
    this.selectedRun.set(child);
    this.runReport.set(null);
    this.items.set(null);
    this.itemsPage.set(1);
    this.loadRunReport(childRunId);
    this.loadItems();
    this.startPollingIfOpen('Pending', childRunId);
    this.loadRuns();
  }

  // ── Display helpers ─────────────────────────────────────────────────────────

  pharmacyLabel(pharmacyId: string | null, code: string, name: string, nameArabic: string): string {
    if (this.locale.isRtl()) {
      return nameArabic || name || code || pharmacyId || '';
    }
    return name || nameArabic || code || pharmacyId || '';
  }

  formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return '—';
    const formatted = this.datePipe.transform(parsed, 'yyyy-MM-dd HH:mm', this.locale.locale() === 'ar' ? 'Africa/Cairo' : 'UTC');
    return formatted ?? '—';
  }

  statusKey(status: string): string {
    return `priceRefreshLogs.status.${status}`;
  }

  reasonKey(reasonCode: string | null): string {
    return reasonCode ? `priceRefreshLogs.reason.${reasonCode}` : 'priceRefreshLogs.reason.none';
  }

  retryBlockedKey(reasonCode: string | null): string {
    return reasonCode ? `priceRefreshLogs.reason.${reasonCode}` : 'priceRefreshLogs.reason.none';
  }

  triggerKey(triggerType: string): string {
    return `priceRefreshLogs.trigger.${triggerType}`;
  }

  private toIsoOrNull(dateInput: string, endOfDay: boolean): string | undefined {
    if (!dateInput) return undefined;
    const parsed = new Date(dateInput);
    if (Number.isNaN(parsed.getTime())) return undefined;
    if (endOfDay) parsed.setHours(23, 59, 59, 999);
    return parsed.toISOString();
  }
}
