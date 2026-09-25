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
import { I18nService } from '../../core/i18n/i18n.service';
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
  templateUrl: './best-deals.component.html'
})
export class BestDealsComponent implements OnInit {
  private readonly listBestDeals = inject(ListBestDealsUseCase);
  private readonly dealsRepo = inject(BestDealsRepository);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  readonly locale = inject(LocaleService);

  readonly minBound = MIN_DISCOUNT;
  readonly maxBound = MAX_DISCOUNT;
  readonly step = DISCOUNT_STEP;
  readonly skeletonSlots = [1, 2, 3, 4, 5, 6, 7, 8];
  readonly pharmacyList = PHARMACY_BRANDS;

  // State Signals
  readonly minDiscount = signal(DEFAULT_MIN_DISCOUNT);
  readonly maxDiscount = signal<number | null>(null);
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

  readonly discountPresets = [
    { labelKey: 'common.all', label: 'All', min: 0, max: null },
    { labelAr: '10% - 20%', labelEn: '10% - 20%', min: 10, max: 20 },
    { labelAr: '20% - 30%', labelEn: '20% - 30%', min: 20, max: 30 },
    { labelAr: '30% - 50%', labelEn: '30% - 50%', min: 30, max: 50 },
    { labelAr: '50%+', labelEn: '50%+', min: 50, max: null }
  ];

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
          this.minDiscount.set(res.defaultMinDiscount);
        }
      },
      error: () => {}
    });
  }

  onSystemMinDiscountInput(val: number | string): void {
    const num = Number(val);
    this.systemMinDiscount = num;
    if (Number.isFinite(num) && num >= 0 && num <= 80) {
      this.minDiscount.set(num);
      this.maxDiscount.set(null);
      if (this.fetchTimer) clearTimeout(this.fetchTimer);
      this.fetchTimer = setTimeout(() => {
        this.page.set(1);
        this.fetch(1, false);
      }, 250);
    }
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
    const val = Number(this.systemMinDiscount);
    if (!Number.isFinite(val) || val < 0 || val > 80) {
      this.notifications.showError(
        this.i18n.t('bestDeals.invalidDiscountError')
      );
      return;
    }

    this.savingSettings.set(true);
    this.dealsRepo.updateSettings({ defaultMinDiscount: val })
      .pipe(finalize(() => this.savingSettings.set(false)))
      .subscribe({
        next: (res) => {
          this.settings.set(res);
          this.systemMinDiscount = res.defaultMinDiscount;
          this.minDiscount.set(res.defaultMinDiscount);
          this.maxDiscount.set(null);
          this.notifications.showSuccess(
            `${this.i18n.t('bestDeals.settingsSaved')} (${res.defaultMinDiscount}%)`
          );
          this.page.set(1);
          this.fetch(1, false);
        },
        error: (err) => {
          const msg = err?.error?.message || err?.message || '';
          this.notifications.showError(
            `${this.i18n.t('bestDeals.saveSettingsError')}${msg ? ': ' + msg : ''}`
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
            this.i18n.t('bestDeals.cacheRefreshed')
          );
          this.fetch(1, false);
        },
        error: () => {
          this.notifications.showError(
            this.i18n.t('bestDeals.refreshCacheError')
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
            ? this.i18n.t('bestDeals.pinSuccess')
            : this.i18n.t('bestDeals.unpinSuccess')
        );
      },
      error: () => {
        this.notifications.showError(
          this.i18n.t('bestDeals.pinError')
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
          this.i18n.t('bestDeals.excludeSuccess')
        );
      },
      error: () => {
        this.notifications.showError(
          this.i18n.t('bestDeals.excludeError')
        );
      }
    });
  }

  onDiscountInput(raw: string | number): void {
    const next = clampDiscountPercent(Number(raw));
    if (next === this.minDiscount() && this.maxDiscount() === null) return;
    this.minDiscount.set(next);
    this.maxDiscount.set(null);
    if (this.fetchTimer) clearTimeout(this.fetchTimer);
    this.fetchTimer = setTimeout(() => {
      this.page.set(1);
      this.fetch(1, false);
    }, 150);
  }

  setDiscountPreset(preset: { min: number; max: number | null }): void {
    this.minDiscount.set(preset.min);
    this.maxDiscount.set(preset.max);
    this.page.set(1);
    this.fetch(1, false);
  }

  isPresetActive(preset: { min: number; max: number | null }): boolean {
    return this.minDiscount() === preset.min && this.maxDiscount() === preset.max;
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
    this.maxDiscount.set(null);
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
        maxDiscount: this.maxDiscount() ?? undefined,
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
