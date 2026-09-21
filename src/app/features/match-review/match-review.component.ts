import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { MatchReviewRepository } from '../../core/domain/repositories/match-review.repository';
import {
  canAccept,
  distinctPharmacyCount,
  MatchReviewActionResult,
  MatchReviewDetail,
  MatchReviewQueueItem
} from '../../core/domain/models/match-review.model';
import { PHARMACY_BRANDS } from '../../core/domain/pharmacy-brands';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-match-review',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <section class="w-full space-y-4 px-4 py-4 sm:px-5 sm:py-5" [attr.dir]="locale.isRtl() ? 'rtl' : 'ltr'">
      <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm">
        <div class="h-1.5 bg-[#C27938]"></div>
        <div class="p-5 sm:p-6">
          <div class="inline-flex items-center gap-2 rounded-full bg-[#F8EEE2] px-3 py-1 text-[11px] font-bold text-[#C27938]">
            {{ 'matchReview.badge' | t }}
          </div>
          <h1 class="mt-3 text-3xl font-extrabold text-[#181A1D]">{{ 'matchReview.title' | t }}</h1>
          <p class="mt-1.5 max-w-2xl text-sm font-medium text-[#8A735C]">{{ 'matchReview.subtitle' | t }}</p>
        </div>
        <div class="grid grid-cols-3 border-t border-[#EDE0D0]">
          <div class="border-e border-[#EDE0D0] px-5 py-3.5">
            <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'matchReview.queue' | t }}</div>
            <div class="mt-1 text-2xl font-extrabold tabular-nums">{{ queueDepth() }}</div>
          </div>
          <div class="border-e border-[#EDE0D0] px-5 py-3.5">
            <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'matchReview.selected' | t }}</div>
            <div class="mt-1 text-2xl font-extrabold tabular-nums">{{ selectedIds().size }}</div>
          </div>
          <div class="px-5 py-3.5">
            <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'matchReview.group' | t }}</div>
            <div class="mt-1 text-2xl font-extrabold tabular-nums">{{ groupCount() }}/7</div>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-3 rounded-2xl border border-[#E8D5BE] bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <select
          class="min-h-11 rounded-xl border border-[#E8D5BE] bg-white px-3 text-sm"
          [value]="pharmacyFilter()"
          (change)="pharmacyFilter.set($any($event.target).value); reload()"
        >
          <option value="">{{ 'matchReview.allPharmacies' | t }}</option>
          @for (p of pharmacies; track p.code) {
            <option [value]="p.code">{{ locale.locale() === 'ar' ? p.nameAr : p.nameEn }}</option>
          }
        </select>
        <input
          class="min-h-11 min-w-40 rounded-xl border border-[#E8D5BE] px-3 text-sm"
          [value]="methodFilter()"
          (change)="methodFilter.set($any($event.target).value); reload()"
          [attr.placeholder]="'matchReview.method' | t"
        />
        <input
          class="min-h-11 min-w-40 rounded-xl border border-[#E8D5BE] px-3 text-sm"
          [value]="reasonFilter()"
          (change)="reasonFilter.set($any($event.target).value); reload()"
          [attr.placeholder]="'matchReview.reason' | t"
        />
        <input
          type="number"
          step="0.01"
          min="0"
          max="1"
          class="min-h-11 w-28 rounded-xl border border-[#E8D5BE] px-3 text-sm"
          [value]="minScore()"
          (change)="minScore.set($any($event.target).value); reload()"
          [attr.placeholder]="'matchReview.minScore' | t"
        />
        <input
          type="number"
          class="min-h-11 w-28 rounded-xl border border-[#E8D5BE] px-3 text-sm"
          [value]="minAgeHours()"
          (change)="minAgeHours.set($any($event.target).value); reload()"
          [attr.placeholder]="'matchReview.ageHours' | t"
        />
        <div class="flex flex-wrap gap-2">
          <button type="button" class="min-h-11 rounded-xl bg-[#181A1D] px-4 text-sm font-bold text-white" (click)="bulk('accept')">
            {{ 'matchReview.bulkAccept' | t }}
          </button>
          <button type="button" class="min-h-11 rounded-xl border border-[#E8D5BE] px-4 text-sm font-bold" (click)="bulk('reject')">
            {{ 'matchReview.bulkReject' | t }}
          </button>
        </div>
      </div>

      @if (loading()) {
        <!-- Match Review Split Skeleton -->
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] animate-pulse">
          <!-- Left Table Skeleton -->
          <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white">
            <div class="border-b border-[#EDE0D0] bg-[#FBF8F4] px-4 py-3 flex items-center justify-between">
              <div class="h-4 w-28 rounded bg-[#E8D5BE]"></div>
              <div class="h-4 w-20 rounded bg-[#F3E7D8]"></div>
            </div>
            <div class="divide-y divide-[#F2E8DC] p-4 space-y-3">
              @for (row of [1, 2, 3, 4, 5]; track row) {
                <div class="flex items-center justify-between gap-3 pt-3 first:pt-0">
                  <div class="flex items-center gap-3">
                    <div class="size-8 rounded-lg bg-[#F3E7D8]"></div>
                    <div class="space-y-1.5">
                      <div class="h-4 w-40 rounded bg-[#E8D5BE]"></div>
                      <div class="h-3 w-24 rounded bg-[#F3E7D8]"></div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="h-5 w-14 rounded-full bg-[#F8EEE2]"></div>
                    <div class="h-4 w-16 rounded bg-[#F3E7D8]"></div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Right Detail Card Skeleton -->
          <div class="space-y-4 rounded-2xl border border-[#E8D5BE] bg-white p-5">
            <div class="h-5 w-32 rounded bg-[#E8D5BE]"></div>
            <div class="flex items-center gap-3">
              <div class="size-20 rounded-xl bg-[#F8EEE2] border border-[#EDE0D0]"></div>
              <div class="space-y-2 flex-1">
                <div class="h-4 w-3/4 rounded bg-[#E8D5BE]"></div>
                <div class="h-3.5 w-1/2 rounded bg-[#F3E7D8]"></div>
                <div class="h-5 w-20 rounded-full bg-[#F8EEE2]"></div>
              </div>
            </div>
            <div class="space-y-2 pt-3 border-t border-[#EDE0D0]">
              <div class="h-4 w-24 rounded bg-[#F3E7D8]"></div>
              <div class="h-10 w-full rounded-xl bg-[#F8EEE2]"></div>
            </div>
            <div class="flex gap-2 pt-2">
              <div class="h-9 flex-1 rounded-xl bg-[#E8D5BE]/70"></div>
              <div class="h-9 flex-1 rounded-xl bg-[#181A1D]/30"></div>
            </div>
          </div>
        </div>
      } @else if (error()) {
        <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{{ 'matchReview.error' | t }}</div>
      } @else {
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white">
            @if (items().length === 0) {
              <div class="px-6 py-16 text-center text-sm text-[#8A735C]">{{ 'matchReview.empty' | t }}</div>
            } @else {
              <table class="min-w-full text-sm">
                <thead class="bg-[#FBF8F4] text-[11px] font-bold text-[#A68B6D]">
                  <tr>
                    <th class="px-3 py-3"></th>
                    <th class="px-3 py-3 text-start">{{ 'matchReview.listing' | t }}</th>
                    <th class="px-3 py-3 text-start">{{ 'matchReview.score' | t }}</th>
                    <th class="px-3 py-3 text-start">{{ 'matchReview.reason' | t }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of items(); track row.matchId) {
                    <tr
                      class="cursor-pointer border-t border-[#EDE0D0] hover:bg-[#FBF8F4]"
                      [class.bg-review-selected]="selected()?.matchId === row.matchId"
                      (click)="open(row)"
                    >
                      <td class="px-3 py-3">
                        <input type="checkbox" [checked]="selectedIds().has(row.matchId)" (click)="$event.stopPropagation(); toggle(row.matchId)" />
                      </td>
                      <td class="px-3 py-3">
                        <div class="font-semibold text-[#181A1D]">{{ row.name }}</div>
                        <div class="text-xs text-[#8A735C]">{{ row.pharmacyName }} · {{ row.matchMethod }}</div>
                      </td>
                      <td class="px-3 py-3 tabular-nums">{{ (row.bestScore ?? row.confidence) | number: '1.3-3' }}</td>
                      <td class="px-3 py-3 text-xs">{{ row.decisionReason || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>

          <aside class="rounded-2xl border border-[#E8D5BE] bg-white p-4">
            @if (detail(); as d) {
              <h2 class="text-sm font-bold">{{ 'matchReview.listing' | t }}</h2>
              <ng-container *ngTemplateOutlet="cardTpl; context: { $implicit: d.listing }"></ng-container>
              @if (d.candidate) {
                <h2 class="mt-4 text-sm font-bold">{{ 'matchReview.candidate' | t }}</h2>
                <ng-container *ngTemplateOutlet="cardTpl; context: { $implicit: d.candidate }"></ng-container>
              }
              <h2 class="mt-4 text-sm font-bold">{{ 'matchReview.group' | t }} ({{ groupCount() }})</h2>
              @for (member of d.groupMembers; track member.pharmacyProductId) {
                <div class="mt-2 text-xs text-[#8A735C]">{{ member.pharmacyCode }} · {{ member.name }}</div>
              }
              <div class="mt-4 flex flex-col gap-2">
                <input
                  class="min-h-11 rounded-xl border border-[#E8D5BE] px-3 text-sm"
                  [value]="forceMasterId()"
                  (input)="forceMasterId.set($any($event.target).value)"
                  [attr.placeholder]="'matchReview.masterId' | t"
                />
                <div class="flex gap-2">
                  <button type="button" class="min-h-11 flex-1 rounded-xl bg-[#181A1D] text-sm font-bold text-white" (click)="accept(d.queueItem)">
                    {{ 'matchReview.accept' | t }}
                  </button>
                  <button type="button" class="min-h-11 flex-1 rounded-xl border border-[#E8D5BE] text-sm font-bold" (click)="reject(d.queueItem)">
                    {{ 'matchReview.reject' | t }}
                  </button>
                </div>
                <button type="button" class="min-h-11 rounded-xl border border-[#E8D5BE] text-sm font-bold" (click)="forceMatch(d.queueItem)">
                  {{ 'matchReview.forceMatch' | t }}
                </button>
              </div>
            } @else {
              <p class="text-sm text-[#8A735C]">{{ 'matchReview.empty' | t }}</p>
            }
          </aside>
        </div>
      }
    </section>

    <ng-template #cardTpl let-card>
      <article class="mt-2 rounded-xl border border-[#EDE0D0] p-3">
        @if (card.imageUrl) {
          <img [src]="card.imageUrl" [alt]="card.name" class="mb-2 h-24 w-full rounded-lg object-contain" />
        }
        <div class="font-semibold">{{ card.name }}</div>
        <div class="text-xs text-[#8A735C]">{{ card.englishName }}</div>
        <div class="mt-1 text-xs">{{ card.pharmacyName }} · GTIN {{ card.gtinNorm || card.barcode || '—' }}</div>
        <div class="text-xs">{{ card.brandName }} · {{ card.strength }} · {{ card.packSize }} · {{ card.dosageForm }}</div>
        @if (card.price != null) {
          <div class="mt-1 text-sm font-bold tabular-nums">{{ card.price | number: '1.2-2' }} SAR</div>
        }
      </article>
    </ng-template>
  `,
  styles: `
    .bg-review-selected { background: #F8EEE2; }
  `
})
export class MatchReviewComponent implements OnInit {
  readonly locale = inject(LocaleService);
  private readonly i18n = inject(I18nService);
  private readonly repo = inject(MatchReviewRepository);
  private readonly notify = inject(NotificationService);
  readonly pharmacies = PHARMACY_BRANDS;

  readonly items = signal<MatchReviewQueueItem[]>([]);
  readonly queueDepth = signal(0);
  readonly loading = signal(false);
  readonly error = signal(false);
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

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(false);
    this.repo
      .listQueue({
        take: 50,
        pharmacyCode: this.pharmacyFilter() || null,
        method: this.methodFilter() || null,
        reason: this.reasonFilter() || null,
        minScore: this.minScore() ? Number(this.minScore()) : null,
        minAgeHours: this.minAgeHours() ? Number(this.minAgeHours()) : null
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => {
          this.items.set(page.items);
          this.queueDepth.set(page.queueDepth);
          if (page.items[0]) this.open(page.items[0]);
        },
        error: () => this.error.set(true)
      });
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

  accept(row: MatchReviewQueueItem): void {
    if (!canAccept(row) && !row.proposedMasterProductId) {
      this.notify.showError(this.i18n.t('matchReview.needsMaster'));
      return;
    }
    if (!window.confirm(this.i18n.t('matchReview.confirmAccept'))) return;
    this.repo.accept(row.matchId, row.proposedMasterProductId).subscribe({
      next: (result) => this.afterAction(result),
      error: () => this.notify.showError(this.i18n.t('matchReview.stale'))
    });
  }

  reject(row: MatchReviewQueueItem): void {
    if (!window.confirm(this.i18n.t('matchReview.confirmReject'))) return;
    this.repo.reject(row.matchId).subscribe({
      next: (result) => this.afterAction(result),
      error: () => this.notify.showError(this.i18n.t('matchReview.stale'))
    });
  }

  forceMatch(row: MatchReviewQueueItem): void {
    const masterId = this.forceMasterId().trim() || row.proposedMasterProductId;
    if (!masterId) {
      this.notify.showError(this.i18n.t('matchReview.needsMaster'));
      return;
    }
    if (!window.confirm(this.i18n.t('matchReview.confirmForce'))) return;
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
  }
}
