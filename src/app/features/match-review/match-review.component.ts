import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <section class="w-full space-y-4" [class.px-4]="!isEmbedded()" [class.py-4]="!isEmbedded()" [class.sm:px-5]="!isEmbedded()" [class.sm:py-5]="!isEmbedded()" [attr.dir]="locale.isRtl() ? 'rtl' : 'ltr'">
      @if (!isEmbedded()) {
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
              <div class="mt-1 text-2xl font-extrabold tabular-nums">{{ groupCount() }}/8</div>
            </div>
          </div>
        </div>
      } @else {
        <!-- Compact header metrics for embedded tab inside /products -->
        <div class="grid grid-cols-3 gap-3 rounded-2xl border border-[#E8D5BE] bg-white p-3 shadow-sm">
          <div class="rounded-xl bg-[#FBF8F4] px-4 py-3 text-center border border-[#EDE0D0]">
            <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'matchReview.queue' | t }}</div>
            <div class="mt-1 text-2xl font-extrabold text-[#181A1D] tabular-nums">{{ queueDepth() }}</div>
          </div>
          <div class="rounded-xl bg-[#FBF8F4] px-4 py-3 text-center border border-[#EDE0D0]">
            <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'matchReview.selected' | t }}</div>
            <div class="mt-1 text-2xl font-extrabold text-[#181A1D] tabular-nums">{{ selectedIds().size }}</div>
          </div>
          <div class="rounded-xl bg-[#FBF8F4] px-4 py-3 text-center border border-[#EDE0D0]">
            <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'matchReview.group' | t }}</div>
            <div class="mt-1 text-2xl font-extrabold text-[#C27938] tabular-nums">{{ groupCount() }}/8</div>
          </div>
        </div>
      }

      <!-- Filters & Search Toolbar -->
      <div class="flex flex-col gap-3 rounded-2xl border border-[#E8D5BE] bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <!-- Search bar -->
        <div class="relative min-w-48 flex-1">
          <i class="pi pi-search absolute top-1/2 -translate-y-1/2 start-3 text-xs text-[#A68B6D] pointer-events-none"></i>
          <input
            type="search"
            class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] ps-9 pe-3 text-sm font-medium text-[#181A1D] outline-none focus:border-[#C27938] focus:bg-white"
            [value]="searchFilter()"
            (input)="searchFilter.set($any($event.target).value)"
            (keydown.enter)="onFilterChange()"
            [attr.placeholder]="'matchReview.searchPlaceholder' | t"
          />
        </div>

        <select
          class="min-h-11 rounded-xl border border-[#E8D5BE] bg-white px-3 text-sm"
          [value]="pharmacyFilter()"
          (change)="pharmacyFilter.set($any($event.target).value); onFilterChange()"
        >
          <option value="">{{ 'matchReview.allPharmacies' | t }}</option>
          @for (p of pharmacies; track p.code) {
            <option [value]="p.code">{{ locale.locale() === 'ar' ? p.nameAr : p.nameEn }}</option>
          }
        </select>
        <input
          class="min-h-11 min-w-36 rounded-xl border border-[#E8D5BE] px-3 text-sm"
          [value]="reasonFilter()"
          (change)="reasonFilter.set($any($event.target).value); onFilterChange()"
          [attr.placeholder]="'matchReview.reason' | t"
        />
        <input
          type="number"
          step="0.01"
          min="0"
          max="1"
          class="min-h-11 w-24 rounded-xl border border-[#E8D5BE] px-3 text-sm"
          [value]="minScore()"
          (change)="minScore.set($any($event.target).value); onFilterChange()"
          [attr.placeholder]="'matchReview.minScore' | t"
        />
        <div class="flex flex-wrap gap-2">
          <button type="button" class="min-h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 text-sm font-bold text-white transition-colors cursor-pointer" (click)="bulk('accept')">
            <i class="pi pi-check me-1"></i>
            {{ 'matchReview.bulkAccept' | t }}
          </button>
          <button type="button" class="min-h-11 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 text-sm font-bold transition-colors cursor-pointer" (click)="bulk('reject')">
            <i class="pi pi-times me-1"></i>
            {{ 'matchReview.bulkReject' | t }}
          </button>
        </div>
      </div>

      <!-- Pagination & Count Bar -->
      <div class="flex flex-wrap items-center justify-between gap-3 px-1 text-xs font-semibold tabular-nums text-[#8A735C]">
        <div class="flex items-center gap-1.5">
          <span>
            {{ 'matchReview.showing' | t }}:
            <span class="font-bold text-[#181A1D]">{{ rangeStart() }}–{{ rangeEnd() }}</span>
            {{ 'matchReview.pageOf' | t }}
            <span class="font-bold text-[#181A1D]">{{ queueDepth() }}</span>
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span>{{ 'matchReview.perPage' | t }}:</span>
          <select
            class="rounded-lg border border-[#E8D5BE] bg-white px-2.5 py-1 text-xs font-bold text-[#181A1D] outline-none cursor-pointer"
            [value]="pageSize()"
            (change)="setPageSize(+$any($event.target).value)"
          >
            <option [value]="15">15</option>
            <option [value]="25">25</option>
            <option [value]="50">50</option>
            <option [value]="100">100</option>
          </select>
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
                      class="cursor-pointer border-t border-[#EDE0D0] hover:bg-[#FBF8F4] transition-colors"
                      [class.bg-review-selected]="selected()?.matchId === row.matchId"
                      (click)="open(row)"
                    >
                      <td class="px-3 py-3">
                        <input type="checkbox" [checked]="selectedIds().has(row.matchId)" (click)="$event.stopPropagation(); toggle(row.matchId)" />
                      </td>
                      <td class="px-3 py-3">
                        <div class="font-semibold text-[#181A1D]">{{ row.name }}</div>
                        <div class="text-xs text-[#8A735C] mt-0.5">{{ row.pharmacyName }} · {{ row.matchMethod }}</div>
                      </td>
                      <td class="px-3 py-3 tabular-nums">
                        <span
                          class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"
                          [class.bg-emerald-50]="row.confidence >= 0.9"
                          [class.text-emerald-700]="row.confidence >= 0.9"
                          [class.bg-amber-50]="row.confidence >= 0.8 && row.confidence < 0.9"
                          [class.text-amber-700]="row.confidence >= 0.8 && row.confidence < 0.9"
                          [class.bg-sky-50]="row.confidence < 0.8"
                          [class.text-sky-700]="row.confidence < 0.8"
                        >
                          <i class="pi pi-sparkles text-[10px]"></i>
                          {{ (row.confidence * 100) | number: '1.1-1' }}%
                        </span>
                      </td>
                      <td class="px-3 py-3 text-xs text-[#8A735C]">{{ row.decisionReason || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }
            @if (totalPages() > 1) {
              <div class="flex flex-wrap items-center justify-center gap-1.5 border-t border-[#EDE0D0] bg-[#FBF8F4] p-3">
                <button
                  type="button"
                  class="inline-flex min-h-9 items-center gap-1 rounded-xl border border-[#E8D5BE] bg-white px-3 text-xs font-bold text-[#181A1D] hover:bg-[#FBF8F4] disabled:opacity-40 transition-colors cursor-pointer"
                  [disabled]="page() <= 1 || loading()"
                  (click)="goToPage(page() - 1)"
                >
                  <i class="pi pi-chevron-right text-[10px]" [class.rotate-180]="!locale.isRtl()"></i>
                  {{ 'matchReview.pagePrev' | t }}
                </button>
                @for (p of pageButtons(); track p) {
                  @if (p === '…') {
                    <span class="px-1 text-xs font-bold text-[#A68B6D]">…</span>
                  } @else {
                    <button
                      type="button"
                      class="inline-flex size-9 items-center justify-center rounded-xl text-xs font-bold tabular-nums transition-colors cursor-pointer"
                      [ngClass]="
                        page() === p
                          ? 'bg-[#181A1D] text-white shadow-xs'
                          : 'border border-[#E8D5BE] bg-white text-[#181A1D] hover:bg-[#FBF8F4]'
                      "
                      [disabled]="loading()"
                      (click)="goToPage(+$any(p))"
                    >
                      {{ p }}
                    </button>
                  }
                }
                <button
                  type="button"
                  class="inline-flex min-h-9 items-center gap-1 rounded-xl border border-[#E8D5BE] bg-white px-3 text-xs font-bold text-[#181A1D] hover:bg-[#FBF8F4] disabled:opacity-40 transition-colors cursor-pointer"
                  [disabled]="page() >= totalPages() || loading()"
                  (click)="goToPage(page() + 1)"
                >
                  {{ 'matchReview.pageNext' | t }}
                  <i class="pi pi-chevron-left text-[10px]" [class.rotate-180]="!locale.isRtl()"></i>
                </button>
              </div>
            }
          </div>

          <aside class="rounded-2xl border border-[#E8D5BE] bg-white p-4 space-y-4">
            @if (detail(); as d) {
              <div>
                <h2 class="text-xs font-bold text-[#A68B6D] uppercase tracking-wider">{{ 'matchReview.listing' | t }}</h2>
                <ng-container *ngTemplateOutlet="cardTpl; context: { $implicit: d.listing }"></ng-container>
              </div>

              @if (d.candidate) {
                <div>
                  <h2 class="text-xs font-bold text-[#C27938] uppercase tracking-wider">{{ 'matchReview.candidate' | t }}</h2>
                  <ng-container *ngTemplateOutlet="cardTpl; context: { $implicit: d.candidate }"></ng-container>
                </div>
              }

              @if (d.groupMembers.length > 0) {
                <div>
                  <h2 class="text-xs font-bold text-[#A68B6D] uppercase tracking-wider">{{ 'matchReview.group' | t }} ({{ groupCount() }})</h2>
                  <div class="mt-1.5 space-y-1.5 max-h-36 overflow-y-auto">
                    @for (member of d.groupMembers; track member.pharmacyProductId) {
                      <div class="rounded-lg bg-[#FBF8F4] px-2.5 py-1.5 text-xs text-[#8A735C] border border-[#EDE0D0] flex items-center justify-between">
                        <span class="font-medium text-[#181A1D] truncate">{{ member.name }}</span>
                        <span class="text-[10px] font-bold text-[#A68B6D] shrink-0 ms-2">{{ member.pharmacyCode }}</span>
                      </div>
                    }
                  </div>
                </div>
              }

              <div class="pt-2 border-t border-[#EDE0D0] flex flex-col gap-2">
                <input
                  class="min-h-11 rounded-xl border border-[#E8D5BE] px-3 text-sm font-mono"
                  [value]="forceMasterId()"
                  (input)="forceMasterId.set($any($event.target).value)"
                  [attr.placeholder]="'matchReview.masterId' | t"
                />
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="min-h-11 flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-bold text-white shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    (click)="accept(d.queueItem)"
                  >
                    <i class="pi pi-check text-xs"></i>
                    {{ 'matchReview.acceptMatch' | t }}
                  </button>
                  <button
                    type="button"
                    class="min-h-11 flex-1 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    (click)="reject(d.queueItem)"
                  >
                    <i class="pi pi-times text-xs"></i>
                    {{ 'matchReview.rejectMatch' | t }}
                  </button>
                </div>
                <button
                  type="button"
                  class="min-h-11 rounded-xl border border-[#E8D5BE] text-sm font-bold text-[#8A735C] hover:text-[#181A1D] hover:bg-[#FBF8F4] transition-colors"
                  (click)="forceMatch(d.queueItem)"
                >
                  {{ 'matchReview.forceMatch' | t }}
                </button>
              </div>
            } @else {
              <p class="text-sm text-[#8A735C] py-8 text-center">{{ 'matchReview.empty' | t }}</p>
            }
          </aside>
        </div>
      }
    </section>

    <ng-template #cardTpl let-card>
      <article class="mt-2 rounded-xl border border-[#EDE0D0] p-3 bg-white shadow-xs">
        @if (card.imageUrl) {
          <img [src]="card.imageUrl" [alt]="card.name" class="mb-2 h-24 w-full rounded-lg object-contain bg-[#FBF8F4] p-1 border border-[#EDE0D0]" />
        }
        <div class="font-semibold text-sm text-[#181A1D] leading-snug">{{ card.name }}</div>
        @if (card.englishName) {
          <div class="text-xs text-[#8A735C] mt-0.5">{{ card.englishName }}</div>
        }
        <div class="mt-2 flex flex-wrap gap-1.5 text-xs text-[#8A735C]">
          <span class="rounded bg-[#F8EEE2] px-2 py-0.5 font-bold text-[#C27938]">{{ card.pharmacyName }}</span>
          @if (card.barcode || card.gtinNorm) {
            <span class="rounded bg-[#FBF8F4] px-2 py-0.5 border border-[#EDE0D0] font-mono text-[11px]">{{ card.gtinNorm || card.barcode }}</span>
          }
          @if (card.brandName) {
            <span class="rounded bg-[#FBF8F4] px-2 py-0.5 border border-[#EDE0D0]">{{ card.brandName }}</span>
          }
        </div>
        @if (card.price != null) {
          <div class="mt-2 text-base font-extrabold text-[#181A1D] tabular-nums">{{ card.price | number: '1.2-2' }} <span class="text-xs font-medium text-[#8A735C]">SAR</span></div>
        }
      </article>
    </ng-template>
  `,
  styles: `
    .bg-review-selected { background: #F8EEE2; }
  `
})
export class MatchReviewComponent implements OnInit {
  readonly isEmbedded = input<boolean>(false);
  readonly locale = inject(LocaleService);
  private readonly i18n = inject(I18nService);
  private readonly repo = inject(MatchReviewRepository);
  private readonly notify = inject(NotificationService);
  readonly pharmacies = PHARMACY_BRANDS;

  readonly items = signal<MatchReviewQueueItem[]>([]);
  readonly queueDepth = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(25);
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
  readonly rangeStart = computed(() =>
    this.queueDepth() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1
  );
  readonly rangeEnd = computed(() =>
    Math.min(this.page() * this.pageSize(), this.queueDepth())
  );
  readonly pageButtons = computed(() => this.buildPageButtons(this.page(), this.totalPages()));

  ngOnInit(): void {
    this.reload();
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
        minAgeHours: this.minAgeHours() ? Number(this.minAgeHours()) : null
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => {
          this.items.set(page.items);
          this.queueDepth.set(page.queueDepth);
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
