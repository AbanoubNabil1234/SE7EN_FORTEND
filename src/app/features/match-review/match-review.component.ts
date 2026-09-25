import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { MatchReviewRepository } from '../../core/domain/repositories/match-review.repository';
import {
  canAccept,
  distinctPharmacyCount,
  MatchReviewActionResult,
  MatchReviewDetail,
  MatchReviewListingCard,
  MatchReviewQueueItem
} from '../../core/domain/models/match-review.model';
import { PHARMACY_BRANDS } from '../../core/domain/pharmacy-brands';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ProxyImgPipe } from '../../shared/pipes/proxy-img.pipe';

@Component({
  selector: 'app-match-review',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ProxyImgPipe],
  templateUrl: './match-review.component.html',
  styleUrl: './match-review.component.css'
})
export class MatchReviewComponent implements OnInit {
  readonly isEmbedded = input<boolean>(false);
  readonly initialMode = input<'auto_98_99' | 'review'>('auto_98_99');

  readonly locale = inject(LocaleService);
  private readonly i18n = inject(I18nService);
  private readonly repo = inject(MatchReviewRepository);
  private readonly notify = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly route = inject(ActivatedRoute, { optional: true });

  readonly pharmacies = PHARMACY_BRANDS;

  readonly selectedMode = signal<'auto_98_99' | 'review'>('auto_98_99');
  readonly autoMatchesCount = signal<number>(2312);
  readonly reviewQueueCount = signal<number>(3712);

  readonly items = signal<MatchReviewQueueItem[]>([]);
  readonly queueDepth = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalPages = signal(1);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly searchFilter = signal('');
  readonly pharmacyFilter = signal('');
  readonly methodFilter = signal('');
  readonly reasonFilter = signal('');
  readonly minScore = signal('');
  readonly minAgeHours = signal('');
  readonly forceMasterId = signal('');
  readonly selected = signal<MatchReviewQueueItem | null>(null);
  readonly detail = signal<MatchReviewDetail | null>(null);
  readonly selectedIds = signal(new Set<string>());

  readonly groupCount = computed(() => distinctPharmacyCount(this.detail()?.groupMembers ?? []));
  readonly deduplicatedGroup = computed(() => {
    const members = this.detail()?.groupMembers ?? [];
    const seen = new Set<string>();
    const res: MatchReviewListingCard[] = [];
    for (const m of members) {
      const code = (m.pharmacyCode || '').toLowerCase().trim();
      if (!seen.has(code)) {
        seen.add(code);
        res.push(m);
      }
    }
    return res;
  });
  readonly hasPharmacyConflict = computed(() => {
    const d = this.detail();
    if (!d) return false;
    const listingCode = (d.listing.pharmacyCode || '').toLowerCase().trim();
    return (d.groupMembers || []).some(
      (m) =>
        (m.pharmacyCode || '').toLowerCase().trim() === listingCode &&
        m.pharmacyProductId !== d.listing.pharmacyProductId
    );
  });
  readonly rangeStart = computed(() =>
    this.queueDepth() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1
  );
  readonly rangeEnd = computed(() =>
    Math.min(this.page() * this.pageSize(), this.queueDepth())
  );
  readonly pageButtons = computed(() => this.buildPageButtons(this.page(), this.totalPages()));

  ngOnInit(): void {
    const routeMode = this.route?.snapshot?.queryParamMap?.get('mode');
    if (routeMode === 'review' || routeMode === 'auto_98_99') {
      this.selectedMode.set(routeMode);
    } else if (this.initialMode()) {
      this.selectedMode.set(this.initialMode());
    }

    this.reload();
    this.fetchCounts();
  }

  switchMode(mode: 'auto_98_99' | 'review'): void {
    if (this.selectedMode() === mode) return;
    this.selectedMode.set(mode);
    this.page.set(1);
    this.selectedIds.set(new Set());
    this.reload();
  }

  fetchCounts(): void {
    this.repo.listQueue({ take: 1, mode: 'auto_98_99' }).subscribe({
      next: (res) => this.autoMatchesCount.set(res.queueDepth)
    });
    this.repo.listQueue({ take: 1 }).subscribe({
      next: (res) => this.reviewQueueCount.set(res.queueDepth)
    });
  }

  onFilterChange(): void {
    this.page.set(1);
    this.reload();
  }

  goToPage(targetPage: number): void {
    const target = Math.min(Math.max(1, targetPage), this.totalPages());
    if (target === this.page() || this.loading()) return;
    this.page.set(target);
    this.reload();
  }

  setPageSize(size: number): void {
    if (this.pageSize() === size) return;
    this.pageSize.set(size);
    this.page.set(1);
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(false);
    this.repo
      .listQueue({
        page: this.page(),
        take: this.pageSize(),
        pharmacyCode: this.pharmacyFilter() || null,
        method: this.methodFilter() || null,
        reason: this.reasonFilter() || null,
        search: this.searchFilter() || null,
        minScore: this.minScore() ? Number(this.minScore()) : null,
        minAgeHours: this.minAgeHours() ? Number(this.minAgeHours()) : null,
        mode: this.selectedMode()
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => {
          this.items.set(page.items);
          this.queueDepth.set(page.queueDepth);
          if (this.selectedMode() === 'auto_98_99') {
            this.autoMatchesCount.set(page.queueDepth);
          } else {
            this.reviewQueueCount.set(page.queueDepth);
          }
          this.totalPages.set(page.totalPages ?? 1);
          if (page.page) this.page.set(page.page);
          if (page.items[0]) {
            this.open(page.items[0]);
          } else {
            this.selected.set(null);
            this.detail.set(null);
          }
        },
        error: () => this.error.set(true)
      });
  }

  private buildPageButtons(current: number, total: number): (number | string)[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set<number>([1, total, current, current - 1, current + 1, 2, total - 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
    const result: (number | string)[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('…');
      result.push(sorted[i]);
    }
    return result;
  }

  open(row: MatchReviewQueueItem): void {
    this.selected.set(row);
    this.repo.getDetail(row.matchId).subscribe({
      next: (detail) => this.detail.set(detail),
      error: () => this.notify.showError(this.i18n.t('matchReview.error'))
    });
  }

  toggle(id: string): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds.set(next);
  }

  async accept(row: MatchReviewQueueItem): Promise<void> {
    if (this.hasPharmacyConflict()) {
      this.notify.showError(this.i18n.t('matchReview.conflictPharmacy'));
      return;
    }
    if (!canAccept(row) && !row.proposedMasterProductId) {
      this.notify.showError(this.i18n.t('matchReview.needsMaster'));
      return;
    }
    const confirmed = await this.confirmDialog.confirm({
      title: this.i18n.t('matchReview.accept'),
      message: this.i18n.t('matchReview.confirmAccept'),
      type: 'info',
      confirmText: this.i18n.t('matchReview.accept'),
    });
    if (!confirmed) return;
    this.repo.accept(row.matchId, row.proposedMasterProductId).subscribe({
      next: (result) => this.afterAction(result),
      error: () => this.notify.showError(this.i18n.t('matchReview.stale'))
    });
  }

  async reject(row: MatchReviewQueueItem): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: this.i18n.t('matchReview.reject'),
      message: this.i18n.t('matchReview.confirmReject'),
      type: 'danger',
      confirmText: this.i18n.t('matchReview.reject'),
    });
    if (!confirmed) return;
    this.repo.reject(row.matchId).subscribe({
      next: (result) => this.afterAction(result),
      error: () => this.notify.showError(this.i18n.t('matchReview.stale'))
    });
  }

  async unlink(row: MatchReviewQueueItem): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: this.i18n.t('matchReview.unlink'),
      message: this.i18n.t('matchReview.confirmUnlink'),
      type: 'danger',
      confirmText: this.i18n.t('matchReview.unlink'),
    });
    if (!confirmed) return;
    this.repo.reject(row.matchId, 'Unlinked by admin from catalog').subscribe({
      next: (result) => this.afterAction(result),
      error: () => this.notify.showError(this.i18n.t('matchReview.stale'))
    });
  }

  async forceMatch(row: MatchReviewQueueItem): Promise<void> {
    const masterId = this.forceMasterId().trim() || row.proposedMasterProductId;
    if (!masterId) {
      this.notify.showError(this.i18n.t('matchReview.needsMaster'));
      return;
    }
    const confirmed = await this.confirmDialog.confirm({
      title: this.i18n.t('matchReview.forceMatch'),
      message: this.i18n.t('matchReview.confirmForce'),
      type: 'warning',
      confirmText: this.i18n.t('matchReview.forceMatch'),
    });
    if (!confirmed) return;
    this.repo.forceMatch(row.matchId, masterId).subscribe({
      next: (result) => this.afterAction(result),
      error: () => this.notify.showError(this.i18n.t('matchReview.stale'))
    });
  }

  bulk(action: 'accept' | 'reject'): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    const items = this.items()
      .filter((row) => ids.includes(row.matchId))
      .map((row) => ({ matchId: row.matchId, action, masterProductId: row.proposedMasterProductId }));
    this.repo.bulk(items).subscribe({
      next: (results) => {
        const failed = results.filter((r) => !r.ok).length;
        this.notify.showSuccess(`${results.length - failed} ok / ${failed} failed`);
        this.selectedIds.set(new Set());
        this.reload();
        this.fetchCounts();
      },
      error: () => this.notify.showError(this.i18n.t('matchReview.error'))
    });
  }

  async bulkUnlink(): Promise<void> {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    const confirmed = await this.confirmDialog.confirm({
      title: this.i18n.t('matchReview.unlink'),
      message: `${this.i18n.t('matchReview.confirmUnlink')} (${ids.length})`,
      type: 'danger',
      confirmText: this.i18n.t('matchReview.unlink'),
    });
    if (!confirmed) return;
    const items = this.items()
      .filter((row) => ids.includes(row.matchId))
      .map((row) => ({ matchId: row.matchId, action: 'reject' as const }));
    this.repo.bulk(items).subscribe({
      next: (results) => {
        const failed = results.filter((r) => !r.ok).length;
        this.notify.showSuccess(`${results.length - failed} ok / ${failed} failed`);
        this.selectedIds.set(new Set());
        this.reload();
        this.fetchCounts();
      },
      error: () => this.notify.showError(this.i18n.t('matchReview.error'))
    });
  }

  private afterAction(result: MatchReviewActionResult): void {
    if (!result.ok) {
      this.notify.showError(result.message || this.i18n.t('matchReview.stale'));
      return;
    }
    this.notify.showSuccess(result.message);
    this.reload();
    this.fetchCounts();
  }
}
