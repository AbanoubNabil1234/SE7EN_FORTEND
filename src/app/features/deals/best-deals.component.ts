import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import {
  clampDiscountPercent,
  DEFAULT_MIN_DISCOUNT,
  DISCOUNT_STEP,
  MAX_DISCOUNT,
  MIN_DISCOUNT
} from '../../core/domain/best-deals';
import { BestDeal } from '../../core/domain/models/best-deal.model';
import { pharmacyDisplayName, pharmacyLogo } from '../../core/domain/pharmacy-brands';
import { LocaleService } from '../../core/services/locale.service';
import { ListBestDealsUseCase } from '../../core/use-cases/deals/list-best-deals.use-case';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

const PAGE_SIZE = 24;

@Component({
  selector: 'app-best-deals',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, CurrencyPipe, DecimalPipe],
  template: `
    <section class="w-full space-y-4 px-4 py-4 sm:px-5 sm:py-5" [attr.dir]="locale.isRtl() ? 'rtl' : 'ltr'">
      <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm">
        <div class="h-1.5 bg-[#C27938]"></div>
        <div class="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div class="min-w-0">
            <div class="inline-flex items-center gap-2 rounded-full bg-[#F8EEE2] px-3 py-1 text-[11px] font-bold text-[#C27938]">
              <span class="size-1.5 rounded-full bg-[#C27938]"></span>
              {{ 'bestDeals.badge' | t }}
            </div>
            <h1 class="mt-3 text-balance text-3xl font-extrabold text-[#181A1D] sm:text-4xl">
              {{ 'bestDeals.title' | t }}
            </h1>
            <p class="mt-1.5 max-w-2xl text-pretty text-sm font-medium text-[#8A735C]">
              {{ 'bestDeals.subtitle' | t }}
            </p>
          </div>
          <div class="shrink-0 text-sm font-semibold tabular-nums text-[#8A735C]">
            {{ 'bestDeals.showing' | t }}:
            <span class="text-[#181A1D]">{{ deals().length }}</span>
            /
            <span class="text-[#181A1D]">{{ total() }}</span>
          </div>
        </div>

        <div class="border-t border-[#EDE0D0] p-4 sm:p-5">
          <label class="block space-y-3">
            <div class="flex items-center justify-between gap-3">
              <span class="text-[11px] font-bold text-[#A68B6D]">{{ 'bestDeals.minDiscount' | t }}</span>
              <span class="text-sm font-extrabold tabular-nums text-[#C27938]">
                {{ minDiscount() | number: '1.0-0' }}%
              </span>
            </div>
            <input
              type="range"
              class="w-full accent-[#C27938]"
              [min]="minBound"
              [max]="maxBound"
              [step]="step"
              [ngModel]="minDiscount()"
              [attr.aria-valuemin]="minBound"
              [attr.aria-valuemax]="maxBound"
              [attr.aria-valuenow]="minDiscount()"
              [attr.aria-label]="'bestDeals.minDiscount' | t"
              (ngModelChange)="onDiscountInput($event)"
            />
            <div class="flex justify-between text-[11px] font-semibold tabular-nums text-[#A68B6D]">
              <span>{{ minBound }}%</span>
              <span>{{ maxBound }}%</span>
            </div>
          </label>
        </div>
      </div>

      @if (loading() && deals().length === 0) {
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-hidden="true">
          @for (slot of skeletonSlots; track slot) {
            <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white">
              <div class="aspect-[4/3] bg-[#FBF8F4]"></div>
              <div class="space-y-2 p-4">
                <div class="h-3 w-20 rounded bg-[#F8EEE2]"></div>
                <div class="h-4 w-3/4 rounded bg-[#F8EEE2]"></div>
                <div class="h-6 w-24 rounded bg-[#F8EEE2]"></div>
              </div>
            </div>
          }
        </div>
      } @else if (error()) {
        <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {{ 'bestDeals.error' | t }}
        </div>
      } @else if (deals().length === 0) {
        <div class="rounded-2xl border border-dashed border-[#E8D5BE] bg-white px-6 py-16 text-center">
          <p class="text-balance text-base font-bold text-[#181A1D]">{{ 'bestDeals.empty' | t }}</p>
          <p class="mt-1 text-pretty text-sm text-[#8A735C]">
            {{ (minDiscount() > 0 ? 'bestDeals.emptyHint' : 'bestDeals.emptyNone') | t }}
          </p>
          @if (minDiscount() > 0) {
            <button
              type="button"
              class="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#181A1D] px-5 text-sm font-bold text-white hover:bg-black"
              (click)="showAllDiscounts()"
            >
              {{ 'bestDeals.showAll' | t }}
            </button>
          }
        </div>
      } @else {
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          @for (deal of deals(); track deal.pharmacyProductId) {
            <article class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm">
              <button
                type="button"
                class="block w-full text-start"
                (click)="openDeal(deal)"
              >
                <div class="relative aspect-[4/3] bg-[#FBF8F4]">
                  @if (deal.imageUrl) {
                    <img [src]="deal.imageUrl" [alt]="displayName(deal)" class="size-full object-contain p-4" loading="lazy" />
                  } @else {
                    <div class="flex size-full items-center justify-center text-[#C27938]/40">
                      <i class="pi pi-image text-3xl" aria-hidden="true"></i>
                    </div>
                  }
                  <span
                    class="absolute start-3 top-3 rounded-lg bg-[#181A1D] px-2 py-1 text-[11px] font-bold tabular-nums text-white"
                  >
                    -{{ deal.discountPercent | number: '1.0-0' }}%
                  </span>
                </div>
                <div class="space-y-2 p-4">
                  <div class="flex items-center gap-2">
                    @if (logoFor(deal); as logo) {
                      <img [src]="logo" [alt]="" class="size-6 rounded object-contain" />
                    }
                    <div class="truncate text-[11px] font-bold text-[#C27938]">
                      {{ pharmacyName(deal) }}
                    </div>
                  </div>
                  <div class="text-[11px] font-bold text-[#A68B6D]">
                    {{ deal.brand || ('bestDeals.unknownBrand' | t) }}
                  </div>
                  <h2 class="line-clamp-2 text-sm font-bold leading-snug text-[#181A1D]">
                    {{ displayName(deal) }}
                  </h2>
                  <div class="flex items-end justify-between gap-2">
                    <div>
                      <div class="text-[11px] font-medium text-[#A68B6D]">{{ 'bestDeals.price' | t }}</div>
                      <div class="text-lg font-extrabold tabular-nums text-[#181A1D]">
                        {{ deal.price | currency: 'SAR':'symbol':'1.2-2' }}
                      </div>
                      @if (deal.oldPrice) {
                        <div class="text-xs font-medium tabular-nums text-[#A68B6D] line-through">
                          {{ deal.oldPrice | currency: 'SAR':'symbol':'1.2-2' }}
                        </div>
                      }
                    </div>
                  </div>
                </div>
              </button>
            </article>
          }
        </div>

        @if (hasMore()) {
          <div class="flex justify-center pt-2">
            <button
              type="button"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#181A1D] px-5 text-sm font-bold text-white hover:bg-black disabled:opacity-60"
              [disabled]="loading()"
              (click)="loadMore()"
            >
              @if (loading()) {
                {{ 'bestDeals.loading' | t }}
              } @else {
                {{ 'bestDeals.loadMore' | t }}
              }
            </button>
          </div>
        }
      }
    </section>
  `
})
export class BestDealsComponent implements OnInit {
  private readonly listBestDeals = inject(ListBestDealsUseCase);
  private readonly router = inject(Router);
  readonly locale = inject(LocaleService);

  readonly minBound = MIN_DISCOUNT;
  readonly maxBound = MAX_DISCOUNT;
  readonly step = DISCOUNT_STEP;
  readonly skeletonSlots = [1, 2, 3, 4, 5, 6, 7, 8];

  readonly minDiscount = signal(DEFAULT_MIN_DISCOUNT);
  readonly deals = signal<BestDeal[]>([]);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal(false);

  private fetchTimer: ReturnType<typeof setTimeout> | null = null;
  private requestSeq = 0;

  readonly hasMore = computed(() => this.deals().length < this.total());

  ngOnInit(): void {
    this.fetch(1, false);
  }

  onDiscountInput(raw: string | number): void {
    const next = clampDiscountPercent(Number(raw));
    if (next === this.minDiscount()) return;
    this.minDiscount.set(next);
    if (this.fetchTimer) clearTimeout(this.fetchTimer);
    this.fetchTimer = setTimeout(() => {
      this.deals.set([]);
      this.page.set(1);
      this.fetch(1, false);
    }, 150);
  }

  showAllDiscounts(): void {
    this.minDiscount.set(0);
    this.deals.set([]);
    this.page.set(1);
    this.fetch(1, false);
  }

  loadMore(): void {
    if (!this.hasMore() || this.loading()) return;
    this.fetch(this.page() + 1, true);
  }

  displayName(deal: BestDeal): string {
    if (this.locale.locale() === 'en' && deal.englishName) return deal.englishName;
    return deal.name;
  }

  pharmacyName(deal: BestDeal): string {
    return pharmacyDisplayName(deal.pharmacyCode, deal.pharmacyName, this.locale.locale());
  }

  logoFor(deal: BestDeal): string | null {
    return pharmacyLogo(deal.pharmacyCode);
  }

  openDeal(deal: BestDeal): void {
    const key = deal.familyKey?.trim();
    if (key) {
      void this.router.navigate(['/products/detail'], { queryParams: { key } });
      return;
    }
    if (deal.productUrl) {
      window.open(deal.productUrl, '_blank', 'noopener');
    }
  }

  private fetch(page: number, append: boolean): void {
    const seq = ++this.requestSeq;
    this.loading.set(true);
    this.error.set(false);
    this.listBestDeals
      .execute({
        minDiscount: this.minDiscount(),
        page,
        pageSize: PAGE_SIZE
      })
      .pipe(finalize(() => {
        if (seq === this.requestSeq) this.loading.set(false);
      }))
      .subscribe({
        next: (result) => {
          if (seq !== this.requestSeq) return;
          this.page.set(result.page);
          this.total.set(result.total);
          this.deals.update((current) => (append ? [...current, ...result.data] : result.data));
        },
        error: () => {
          if (seq !== this.requestSeq) return;
          this.error.set(true);
          if (!append) this.deals.set([]);
        }
      });
  }
}
