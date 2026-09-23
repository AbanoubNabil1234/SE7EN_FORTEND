import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';
import {
  clampDiscountPercent,
  DEFAULT_MIN_DISCOUNT,
  DISCOUNT_STEP,
  MAX_DISCOUNT,
  MIN_DISCOUNT
} from '../../core/domain/best-deals';
import { BestDeal, BestDealsSettings } from '../../core/domain/models/best-deal.model';
import { PHARMACY_BRANDS, pharmacyDisplayName, pharmacyLogo } from '../../core/domain/pharmacy-brands';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { BestDealsRepository } from '../../core/domain/repositories/best-deals.repository';
import { ListBestDealsUseCase } from '../../core/use-cases/deals/list-best-deals.use-case';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ProxyImgPipe } from '../../shared/pipes/proxy-img.pipe';
import { API_ENDPOINTS } from '../../core/infrastructure/http/api-endpoints.constants';

const PAGE_SIZE = 24;

interface SimpleCategory {
  id: string;
  name: string;
}

@Component({
  selector: 'app-best-deals',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, CurrencyPipe, DecimalPipe, ProxyImgPipe],
  template: `
    <section class="w-full space-y-4 px-4 py-4 sm:px-5 sm:py-5" [attr.dir]="locale.isRtl() ? 'rtl' : 'ltr'">
      <!-- 1. Header & Admin Management Banner -->
      <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm">
        <div class="h-1.5 bg-[#C27938]"></div>
        <div class="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div class="min-w-0">
            <div class="inline-flex items-center gap-2 rounded-full bg-[#F8EEE2] px-3 py-1 text-[11px] font-bold text-[#C27938]">
              <span class="size-1.5 rounded-full bg-[#C27938]"></span>
              {{ 'bestDeals.badge' | t }}
            </div>
            <h1 class="mt-3 text-balance text-2xl font-extrabold text-[#181A1D] sm:text-3xl">
              {{ 'bestDeals.title' | t }}
            </h1>
            <p class="mt-1.5 max-w-2xl text-pretty text-sm font-medium text-[#8A735C]">
              {{ 'bestDeals.subtitle' | t }}
            </p>
          </div>

          <!-- Top Action Buttons: Refresh Cache -->
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              (click)="refreshCacheNow()"
              [disabled]="refreshingCache()"
              class="inline-flex items-center gap-2 rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-4 py-2.5 text-xs font-bold text-[#181A1D] shadow-xs transition hover:bg-[#F3EDE5] disabled:opacity-50"
            >
              <i class="pi pi-refresh text-xs text-[#C27938]" [ngClass]="refreshingCache() ? 'pi-spin' : ''"></i>
              <span>{{ (refreshingCache() ? 'bestDeals.refreshingCache' : 'bestDeals.refreshCache') | t }}</span>
            </button>
          </div>
        </div>

        <!-- System-wide Default Minimum Discount Configuration Bar -->
        <div class="border-t border-[#EDE0D0] bg-[#FCF9F5] p-4 sm:px-6">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex items-center gap-3">
              <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#C27938]/15 text-[#C27938]">
                <i class="pi pi-sliders-h text-sm"></i>
              </span>
              <div>
                <div class="text-xs font-bold text-[#181A1D] sm:text-sm">
                  {{ 'bestDeals.systemDefaultMinDiscount' | t }}
                </div>
                <div class="text-[11px] text-[#8A735C]">
                  {{ locale.locale() === 'ar' ? 'يحدد نسبة الخصم المعتمدة افتراضياً في تطبيق الموبايل وزوار الموقع' : 'Controls the default discount threshold for the mobile app and website visitors' }}
                </div>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <div class="flex items-center gap-2 rounded-xl border border-[#E8D5BE] bg-white px-3 py-1.5 shadow-xs">
                <span class="text-xs font-bold text-[#8A735C]">%</span>
                <input
                  type="number"
                  min="0"
                  max="80"
                  step="5"
                  [(ngModel)]="systemMinDiscount"
                  class="w-16 text-center text-sm font-extrabold text-[#C27938] outline-none"
                />
              </div>

              <button
                type="button"
                (click)="saveSystemDefault()"
                [disabled]="savingSettings()"
                class="inline-flex items-center gap-2 rounded-xl bg-[#C27938] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#A8682F] disabled:opacity-50"
              >
                <i class="pi text-xs" [ngClass]="savingSettings() ? 'pi-spin pi-spinner' : 'pi-check'"></i>
                <span>{{ (savingSettings() ? 'bestDeals.savingSettings' : 'bestDeals.saveSystemDefault') | t }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- KPI Metrics Ribbon -->
        <div class="grid grid-cols-2 divide-x divide-y divide-[#EDE0D0] border-t border-[#EDE0D0] bg-white rtl:divide-x-reverse sm:grid-cols-4 sm:divide-y-0">
          <div class="p-3.5 text-center sm:p-4">
            <div class="text-[11px] font-bold text-[#8A735C]">{{ 'bestDeals.totalEligible' | t }}</div>
            <div class="mt-1 text-lg font-extrabold tabular-nums text-[#181A1D] sm:text-xl">{{ total() }}</div>
          </div>
          <div class="p-3.5 text-center sm:p-4">
            <div class="text-[11px] font-bold text-[#8A735C]">{{ 'bestDeals.showing' | t }}</div>
            <div class="mt-1 text-lg font-extrabold tabular-nums text-[#C27938] sm:text-xl">{{ deals().length }}</div>
          </div>
          <div class="p-3.5 text-center sm:p-4">
            <div class="text-[11px] font-bold text-[#8A735C]">{{ 'bestDeals.pinnedCount' | t }}</div>
            <div class="mt-1 text-lg font-extrabold tabular-nums text-emerald-700 sm:text-xl">
              {{ settings()?.totalPinned || 0 }}
            </div>
          </div>
          <div class="p-3.5 text-center sm:p-4">
            <div class="text-[11px] font-bold text-[#8A735C]">{{ 'bestDeals.excludedCount' | t }}</div>
            <div class="mt-1 text-lg font-extrabold tabular-nums text-rose-700 sm:text-xl">
              {{ settings()?.totalExcluded || 0 }}
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Advanced Multi-Filter Toolbar -->
      <div class="rounded-2xl border border-[#E8D5BE] bg-white p-4 shadow-sm sm:p-5 space-y-4">
        <!-- Search and Sort Row -->
        <div class="grid gap-3 sm:grid-cols-12">
          <!-- Search Box (8 cols) -->
          <div class="relative sm:col-span-7 lg:col-span-8">
            <i class="pi pi-search absolute top-1/2 -translate-y-1/2 text-xs text-[#8A735C] ltr:left-3 rtl:right-3"></i>
            <input
              type="text"
              [ngModel]="searchQuery()"
              (ngModelChange)="onSearchChange($event)"
              [placeholder]="'bestDeals.searchPlaceholder' | t"
              class="h-10 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] text-xs outline-none transition focus:border-[#C27938] focus:bg-white sm:text-sm ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3"
            />
            @if (searchQuery()) {
              <button
                type="button"
                (click)="clearSearch()"
                class="absolute top-1/2 -translate-y-1/2 text-[#8A735C] hover:text-[#181A1D] ltr:right-3 rtl:left-3"
              >
                <i class="pi pi-times text-xs"></i>
              </button>
            }
          </div>

          <!-- Sort Select (4 cols) -->
          <div class="sm:col-span-5 lg:col-span-4">
            <select
              [ngModel]="sortBy()"
              (ngModelChange)="onSortChange($event)"
              class="h-10 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-xs font-bold text-[#181A1D] outline-none transition focus:border-[#C27938] focus:bg-white sm:text-sm"
            >
              <option value="discount_desc">{{ 'bestDeals.sortDiscountDesc' | t }}</option>
              <option value="price_asc">{{ 'bestDeals.sortPriceAsc' | t }}</option>
              <option value="price_desc">{{ 'bestDeals.sortPriceDesc' | t }}</option>
              <option value="savings_desc">{{ 'bestDeals.sortSavingsDesc' | t }}</option>
            </select>
          </div>
        </div>

        <!-- Pharmacy Pills Row -->
        <div class="space-y-1.5">
          <span class="text-[11px] font-bold text-[#A68B6D]">{{ 'bestDeals.filterPharmacy' | t }}</span>
          <div class="flex flex-wrap gap-1.5">
            <button
              type="button"
              (click)="onPharmacySelect('all')"
              class="rounded-xl px-3 py-1.5 text-xs font-bold transition"
              [ngClass]="selectedPharmacy() === 'all' ? 'bg-[#181A1D] text-white shadow-xs' : 'bg-[#F3EDE5] text-[#5C4D3E] hover:bg-[#E8D5BE]'"
            >
              {{ 'bestDeals.allPharmacies' | t }}
            </button>
            @for (pharmacy of pharmacyList; track pharmacy.code) {
              <button
                type="button"
                (click)="onPharmacySelect(pharmacy.code)"
                class="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition"
                [ngClass]="selectedPharmacy() === pharmacy.code ? 'bg-[#C27938] text-white shadow-xs' : 'bg-[#FBF8F4] text-[#6B5A48] border border-[#E8D5BE] hover:bg-[#F3EDE5]'"
              >
                <img [src]="pharmacy.logo" [alt]="pharmacy.code" class="size-4 rounded object-contain" />
                <span>{{ locale.locale() === 'ar' ? pharmacy.nameAr : pharmacy.nameEn }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Category Dropdown & Min Discount Slider Grid -->
        <div class="grid gap-4 border-t border-[#EDE0D0] pt-4 sm:grid-cols-12">
          <!-- Category Select (5 cols) -->
          <div class="space-y-1.5 sm:col-span-5">
            <span class="text-[11px] font-bold text-[#A68B6D]">{{ 'bestDeals.filterCategory' | t }}</span>
            <select
              [ngModel]="selectedCategoryId()"
              (ngModelChange)="onCategoryChange($event)"
              class="h-10 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-xs font-bold text-[#181A1D] outline-none transition focus:border-[#C27938] focus:bg-white sm:text-sm"
            >
              <option value="all">{{ 'bestDeals.allCategories' | t }}</option>
              @for (cat of categories(); track cat.id) {
                <option [value]="cat.id">{{ cat.name }}</option>
              }
            </select>
          </div>

          <!-- Min Discount Slider & Quick Presets (7 cols) -->
          <div class="space-y-2 sm:col-span-7">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-[#A68B6D]">{{ 'bestDeals.minDiscount' | t }}</span>
              <div class="flex items-center gap-1.5">
                <span class="text-sm font-extrabold tabular-nums text-[#C27938]">
                  {{ minDiscount() | number: '1.0-0' }}%
                </span>
                <!-- Quick Preset Chips -->
                <div class="ms-2 flex gap-1">
                  @for (preset of [0, 10, 20, 30, 50]; track preset) {
                    <button
                      type="button"
                      (click)="setQuickDiscount(preset)"
                      class="rounded-lg px-2 py-0.5 text-[10px] font-bold transition"
                      [ngClass]="minDiscount() === preset ? 'bg-[#C27938] text-white' : 'bg-[#F3EDE5] text-[#8A735C] hover:bg-[#E8D5BE]'"
                    >
                      {{ preset === 0 ? ('bestDeals.allPharmacies' | t) : (preset + '%+') }}
                    </button>
                  }
                </div>
              </div>
            </div>

            <input
              type="range"
              class="w-full accent-[#C27938]"
              [min]="minBound"
              [max]="maxBound"
              [step]="step"
              [ngModel]="minDiscount()"
              (ngModelChange)="onDiscountInput($event)"
            />
            <div class="flex justify-between text-[11px] font-semibold tabular-nums text-[#A68B6D]">
              <span>{{ minBound }}%</span>
              <span>{{ maxBound }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Deals Grid State Handling -->
      @if (loading() && deals().length === 0) {
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 animate-pulse" aria-hidden="true">
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
          <button
            type="button"
            class="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#181A1D] px-5 text-sm font-bold text-white hover:bg-black"
            (click)="resetAllFilters()"
          >
            {{ 'bestDeals.showAll' | t }}
          </button>
        </div>
      } @else {
        <!-- Deals Grid -->
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          @for (deal of deals(); track deal.pharmacyProductId) {
            <article
              class="group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md"
              [ngClass]="deal.isPinned ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-[#E8D5BE]'"
            >
              <!-- Card Top Image & Badges -->
              <div class="relative aspect-[4/3] bg-[#FBF8F4]">
                @if (deal.imageUrl) {
                  <img [src]="deal.imageUrl | proxyImg" [alt]="displayName(deal)" class="size-full object-contain p-4" loading="lazy" />
                } @else {
                  <div class="flex size-full items-center justify-center text-[#C27938]/40">
                    <i class="pi pi-image text-3xl" aria-hidden="true"></i>
                  </div>
                }

                <!-- Discount Badge -->
                <span class="absolute start-3 top-3 rounded-lg bg-[#181A1D] px-2.5 py-1 text-xs font-extrabold tabular-nums text-white shadow-xs">
                  -{{ deal.discountPercent | number: '1.0-0' }}%
                </span>

                <!-- Pinned Badge if Pinned -->
                @if (deal.isPinned) {
                  <span class="absolute end-3 top-3 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white shadow-xs">
                    <i class="pi pi-bookmark-fill text-[9px]"></i>
                    <span>{{ 'bestDeals.pinnedBadge' | t }}</span>
                  </span>
                }

                <!-- Price Intelligence Tag: Store Offer vs Comparison Win -->
                <div class="absolute bottom-2 start-2 end-2 flex flex-wrap gap-1">
                  @if (deal.isPeerComparison) {
                    <span class="rounded-md bg-blue-900/80 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-xs">
                      {{ 'bestDeals.peerDiscount' | t }}
                    </span>
                  } @else {
                    <span class="rounded-md bg-[#C27938]/90 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-xs">
                      {{ 'bestDeals.storeDiscount' | t }}
                    </span>
                  }
                  @if (deal.savings > 0) {
                    <span class="rounded-md bg-emerald-700/85 px-2 py-0.5 text-[9px] font-extrabold text-white backdrop-blur-xs">
                      {{ 'bestDeals.savings' | t }} {{ deal.savings | currency: 'SAR':'symbol':'1.2-2' }}
                    </span>
                  }
                </div>
              </div>

              <!-- Card Content -->
              <div class="space-y-2 p-4">
                <div class="flex items-center gap-2">
                  @if (logoFor(deal); as logo) {
                    <img [src]="logo" [alt]="" class="size-5 rounded object-contain" />
                  }
                  <div class="truncate text-[11px] font-bold text-[#C27938]">
                    {{ pharmacyName(deal) }}
                  </div>
                </div>

                <div class="text-[11px] font-bold text-[#A68B6D]">
                  {{ deal.brand || ('bestDeals.unknownBrand' | t) }}
                </div>

                <h2
                  class="line-clamp-2 text-sm font-bold leading-snug text-[#181A1D] hover:text-[#C27938] cursor-pointer"
                  (click)="openDeal(deal)"
                >
                  {{ displayName(deal) }}
                </h2>

                <div class="flex items-end justify-between pt-1">
                  <div>
                    <div class="text-[10px] font-medium text-[#A68B6D]">{{ 'bestDeals.price' | t }}</div>
                    <div class="text-base font-extrabold tabular-nums text-[#181A1D]">
                      {{ deal.price | currency: 'SAR':'symbol':'1.2-2' }}
                    </div>
                    @if (deal.oldPrice) {
                      <div class="text-xs font-medium tabular-nums text-[#A68B6D] line-through">
                        {{ deal.oldPrice | currency: 'SAR':'symbol':'1.2-2' }}
                      </div>
                    }
                  </div>
                </div>

                <!-- Admin Action Toolbar on Card -->
                <div class="flex items-center justify-between border-t border-[#EDE0D0] pt-2 mt-2">
                  <!-- Pin/Unpin Button -->
                  <button
                    type="button"
                    (click)="togglePin(deal)"
                    class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition"
                    [ngClass]="deal.isPinned ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-[#FBF8F4] text-[#6B5A48] border border-[#E8D5BE] hover:bg-[#F3EDE5]'"
                  >
                    <i class="pi" [ngClass]="deal.isPinned ? 'pi-bookmark-fill' : 'pi-bookmark'"></i>
                    <span>{{ (deal.isPinned ? 'bestDeals.unpinAction' : 'bestDeals.pinAction') | t }}</span>
                  </button>

                  <div class="flex items-center gap-1">
                    <!-- Inspect Product Details -->
                    <button
                      type="button"
                      (click)="openDeal(deal)"
                      class="inline-flex size-7 items-center justify-center rounded-lg bg-[#F8EEE2] text-[#C27938] hover:bg-[#F3EDE5]"
                      [title]="'bestDeals.title' | t"
                    >
                      <i class="pi pi-external-link text-xs"></i>
                    </button>

                    <!-- Exclude Deal Button -->
                    <button
                      type="button"
                      (click)="toggleExclude(deal)"
                      class="inline-flex size-7 items-center justify-center rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100"
                      [title]="'bestDeals.excludeAction' | t"
                    >
                      <i class="pi pi-eye-slash text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          }
        </div>

        <!-- Load More Pagination Button -->
        @if (hasMore()) {
          <div class="flex justify-center pt-3 pb-6">
            <button
              type="button"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#181A1D] px-6 text-sm font-bold text-white shadow-sm hover:bg-black disabled:opacity-60"
              [disabled]="loading()"
              (click)="loadMore()"
            >
              @if (loading()) {
                <i class="pi pi-spin pi-spinner text-sm"></i>
                <span>{{ 'bestDeals.loading' | t }}</span>
              } @else {
                <span>{{ 'bestDeals.loadMore' | t }}</span>
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
  private readonly dealsRepo = inject(BestDealsRepository);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly notifications = inject(NotificationService);
  readonly locale = inject(LocaleService);

  readonly minBound = MIN_DISCOUNT;
  readonly maxBound = MAX_DISCOUNT;
  readonly step = DISCOUNT_STEP;
  readonly skeletonSlots = [1, 2, 3, 4, 5, 6, 7, 8];
  readonly pharmacyList = PHARMACY_BRANDS;

  // State Signals
  readonly minDiscount = signal(DEFAULT_MIN_DISCOUNT);
  readonly searchQuery = signal('');
  readonly selectedPharmacy = signal('all');
  readonly selectedCategoryId = signal('all');
  readonly sortBy = signal('discount_desc');
  readonly deals = signal<BestDeal[]>([]);
  readonly settings = signal<BestDealsSettings | null>(null);
  readonly categories = signal<SimpleCategory[]>([]);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly refreshingCache = signal(false);
  readonly savingSettings = signal(false);

  systemMinDiscount = DEFAULT_MIN_DISCOUNT;

  private fetchTimer: ReturnType<typeof setTimeout> | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private requestSeq = 0;

  readonly hasMore = computed(() => this.deals().length < this.total());

  ngOnInit(): void {
    this.loadSettings();
    this.loadCategories();
    this.fetch(1, false);
  }

  loadSettings(): void {
    this.dealsRepo.getSettings().subscribe({
      next: (res) => {
        this.settings.set(res);
        if (res.defaultMinDiscount > 0) {
          this.systemMinDiscount = res.defaultMinDiscount;
        }
      },
      error: () => {}
    });
  }

  loadCategories(): void {
    this.http.get<unknown[]>(API_ENDPOINTS.CUSTOMER_CATEGORIES).subscribe({
      next: (list) => {
        if (!Array.isArray(list)) return;
        const normalized = list.map((item: any) => ({
          id: String(item.id ?? item.Id ?? item.categoryId ?? ''),
          name: String(item.name ?? item.Name ?? item.title ?? '')
        })).filter(c => c.id && c.name);
        this.categories.set(normalized);
      },
      error: () => {}
    });
  }

  saveSystemDefault(): void {
    this.savingSettings.set(true);
    this.dealsRepo.updateSettings({ defaultMinDiscount: this.systemMinDiscount })
      .pipe(finalize(() => this.savingSettings.set(false)))
      .subscribe({
        next: (res) => {
          this.settings.set(res);
          this.notifications.showSuccess(
            this.locale.locale() === 'ar' ? 'تم حفظ نسبة الخصم الافتراضية للنظام بنجاح' : 'Default discount saved successfully'
          );
        },
        error: () => {
          this.notifications.showError(
            this.locale.locale() === 'ar' ? 'تعذر حفظ الإعدادات' : 'Failed to save settings'
          );
        }
      });
  }

  refreshCacheNow(): void {
    this.refreshingCache.set(true);
    this.dealsRepo.refreshCache()
      .pipe(finalize(() => this.refreshingCache.set(false)))
      .subscribe({
        next: () => {
          this.notifications.showSuccess(
            this.locale.locale() === 'ar' ? 'تم تحديث كاش الصفقات فوراً' : 'Deals cache refreshed successfully'
          );
          this.fetch(1, false);
        },
        error: () => {
          this.notifications.showError(
            this.locale.locale() === 'ar' ? 'تعذر تحديث الكاش' : 'Failed to refresh cache'
          );
        }
      });
  }

  togglePin(deal: BestDeal): void {
    this.dealsRepo.togglePin(deal.pharmacyProductId).subscribe({
      next: (res) => {
        this.settings.set(res);
        const isPinnedNow = res.pinnedIds.includes(deal.pharmacyProductId);
        this.deals.update(current =>
          current.map(d => d.pharmacyProductId === deal.pharmacyProductId ? { ...d, isPinned: isPinnedNow } : d)
        );
        this.notifications.showSuccess(
          isPinnedNow
            ? (this.locale.locale() === 'ar' ? 'تم تثبيت الصفقة في البداية' : 'Deal pinned to top')
            : (this.locale.locale() === 'ar' ? 'تم إلغاء تثبيت الصفقة' : 'Deal unpinned')
        );
      },
      error: () => {
        this.notifications.showError(
          this.locale.locale() === 'ar' ? 'تعذر تعديل التثبيت' : 'Failed to update pin'
        );
      }
    });
  }

  toggleExclude(deal: BestDeal): void {
    this.dealsRepo.toggleExclude(deal.pharmacyProductId).subscribe({
      next: (res) => {
        this.settings.set(res);
        this.deals.update(current => current.filter(d => d.pharmacyProductId !== deal.pharmacyProductId));
        this.total.update(t => Math.max(0, t - 1));
        this.notifications.showWarn(
          this.locale.locale() === 'ar' ? 'تم استبعاد الصفقة من قائمة العروض' : 'Deal excluded from offers'
        );
      },
      error: () => {
        this.notifications.showError(
          this.locale.locale() === 'ar' ? 'تعذر استبعاد الصفقة' : 'Failed to exclude deal'
        );
      }
    });
  }

  onDiscountInput(raw: string | number): void {
    const next = clampDiscountPercent(Number(raw));
    if (next === this.minDiscount()) return;
    this.minDiscount.set(next);
    if (this.fetchTimer) clearTimeout(this.fetchTimer);
    this.fetchTimer = setTimeout(() => {
      this.page.set(1);
      this.fetch(1, false);
    }, 150);
  }

  setQuickDiscount(value: number): void {
    this.minDiscount.set(value);
    this.page.set(1);
    this.fetch(1, false);
  }

  onSearchChange(term: string): void {
    this.searchQuery.set(term);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.fetch(1, false);
    }, 300);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.page.set(1);
    this.fetch(1, false);
  }

  onPharmacySelect(code: string): void {
    this.selectedPharmacy.set(code);
    this.page.set(1);
    this.fetch(1, false);
  }

  onCategoryChange(catId: string): void {
    this.selectedCategoryId.set(catId);
    this.page.set(1);
    this.fetch(1, false);
  }

  onSortChange(sortBy: string): void {
    this.sortBy.set(sortBy);
    this.page.set(1);
    this.fetch(1, false);
  }

  resetAllFilters(): void {
    this.minDiscount.set(0);
    this.searchQuery.set('');
    this.selectedPharmacy.set('all');
    this.selectedCategoryId.set('all');
    this.sortBy.set('discount_desc');
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
        search: this.searchQuery() || undefined,
        pharmacyCode: this.selectedPharmacy() !== 'all' ? this.selectedPharmacy() : undefined,
        categoryId: this.selectedCategoryId() !== 'all' ? this.selectedCategoryId() : undefined,
        sortBy: this.sortBy(),
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
