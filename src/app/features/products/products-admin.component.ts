import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Subscription, finalize, skip } from 'rxjs';
import { CatalogBrowseRepository, CatalogFamilySort } from '../../core/domain/repositories/catalog-browse.repository';
import {
  CatalogFamily,
  CatalogOffer,
  CatalogPack,
  catalogFamilyTitle,
  catalogListingKey,
  catalogOfferTitle,
  catalogPackTitle,
  flattenFamilyPacks,
  familyHeroImage,
  isAiMatch,
  isCatalogSearchReady,
  matchStatus,
  offerListingTitle
} from '../../core/domain/models/catalog-family.model';
import { CategoryNode } from '../../core/domain/models/category.model';
import { categoryDisplayName } from '../../core/domain/category-display';
import {
  displayPackSize as formatPackSize,
  packChipLabel as formatPackChipLabel,
  packSizeDir as formatPackSizeDir
} from '../../core/domain/pack-size-display';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import {
  pharmacyDisplayName,
  pharmacyLogo as resolvePharmacyLogo
} from '../../core/domain/pharmacy-brands';
import { I18nService } from '../../core/i18n/i18n.service';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { QuickAddProductModalComponent } from './components/quick-add-product-modal/quick-add-product-modal.component';
import { MatchReviewComponent } from '../match-review/match-review.component';
import { MatchReviewRepository } from '../../core/domain/repositories/match-review.repository';
import { AiMatchReviewModalComponent } from './components/ai-match-review-modal/ai-match-review-modal.component';
import { ProductImageModalComponent } from './components/product-image-modal/product-image-modal.component';

/** Server-side page size — do not load the full catalog into the browser. */
const CATALOG_PAGE_SIZE = 24;
const SEARCH_PAGE_SIZE = 24;

interface CategoryOption {
  slug: string;
  name: string;
}

@Component({
  selector: 'app-products-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TranslatePipe,
    CurrencyPipe,
    DecimalPipe,
    QuickAddProductModalComponent,
    MatchReviewComponent,
    AiMatchReviewModalComponent,
    ProductImageModalComponent
  ],
  template: `
    <section class="w-full space-y-4 px-4 py-4 sm:px-5 sm:py-5" [attr.dir]="locale.isRtl() ? 'rtl' : 'ltr'">
      <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm">
        <div class="h-1.5 bg-[#C27938]"></div>
        <div class="flex flex-col gap-4 p-5 sm:p-6">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div class="min-w-0">
              <div class="inline-flex items-center gap-2 rounded-full bg-[#F8EEE2] px-3 py-1 text-[11px] font-bold text-[#C27938]">
                <span class="size-1.5 rounded-full bg-[#C27938]"></span>
                {{ 'productsAdmin.badge' | t }}
              </div>
              <h1 class="mt-3 text-balance text-3xl font-extrabold text-[#181A1D] sm:text-4xl">
                {{ 'productsAdmin.title' | t }}
              </h1>
              <p class="mt-1.5 max-w-2xl text-pretty text-sm font-medium text-[#8A735C]">
                {{ 'productsAdmin.subtitleAll' | t }}
              </p>
            </div>
            <a
              routerLink="/categories"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E8D5BE] bg-white px-4 text-sm font-bold text-[#181A1D] hover:bg-[#FBF8F4]"
            >
              <i class="pi pi-sitemap text-sm"></i>
              {{ 'productsAdmin.toCategories' | t }}
            </a>
          </div>

          <!-- Tabs Switcher -->
          <div class="flex items-center justify-between gap-2 border-t border-[#EDE0D0] pt-4 flex-wrap">
            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="switchTab('catalog')"
                [class]="activeTab() === 'catalog' 
                  ? 'bg-[#181A1D] text-white shadow-sm' 
                  : 'border border-[#E8D5BE] bg-white text-[#8A735C] hover:bg-[#FBF8F4] hover:text-[#181A1D]'"
                class="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-all cursor-pointer"
              >
                <i class="pi pi-th-large text-xs"></i>
                <span>{{ 'productsAdmin.tabCatalog' | t }}</span>
              </button>

              <button
                type="button"
                (click)="switchTab('model-review')"
                [class]="activeTab() === 'model-review' 
                  ? 'bg-[#C27938] text-white shadow-sm' 
                  : 'border border-[#E8D5BE] bg-white text-[#8A735C] hover:bg-[#FBF8F4] hover:text-[#181A1D]'"
                class="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-all cursor-pointer"
              >
                <i class="pi pi-sparkles text-xs"></i>
                <span>{{ 'productsAdmin.tabModelReview' | t }}</span>
                <span 
                  [class]="activeTab() === 'model-review' ? 'bg-white/20 text-white' : 'bg-[#F8EEE2] text-[#C27938]'"
                  class="rounded-full px-2.5 py-0.5 text-xs font-extrabold tabular-nums transition-colors"
                >
                  {{ modelReviewCount() > 0 ? (modelReviewCount() | number) : '2,731' }}
                </span>
              </button>
            </div>
          </div>

          @if (activeTab() === 'catalog') {
            <div class="grid gap-3 border-t border-[#EDE0D0] pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <label class="block space-y-1.5 sm:col-span-2 lg:col-span-1">
                <span class="text-[11px] font-bold text-[#A68B6D]">{{ 'productsAdmin.search' | t }}</span>
              <input
                type="search"
                class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-sm font-medium text-[#181A1D] outline-none focus:border-[#C27938] focus:bg-white"
                [ngModel]="query()"
                (ngModelChange)="onQueryChange($event)"
                [placeholder]="'productsAdmin.searchPlaceholder' | t"
                autocomplete="off"
                [attr.aria-busy]="searching()"
              />
            </label>

            <label class="block space-y-1.5">
              <span class="text-[11px] font-bold text-[#A68B6D]">{{ 'productsAdmin.filterCategory' | t }}</span>
              <select
                class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-sm font-semibold text-[#181A1D] outline-none focus:border-[#C27938] focus:bg-white"
                [ngModel]="categorySlug()"
                (ngModelChange)="onCategoryChange($event)"
              >
                <option value="">{{ 'productsAdmin.filterAllCategories' | t }}</option>
                @for (cat of categoryOptions(); track cat.slug) {
                  <option [value]="cat.slug">{{ cat.name }}</option>
                }
              </select>
            </label>

            <label class="block space-y-1.5">
              <span class="text-[11px] font-bold text-[#A68B6D]">{{ 'productsAdmin.filterBrand' | t }}</span>
              <select
                class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-sm font-semibold text-[#181A1D] outline-none focus:border-[#C27938] focus:bg-white"
                [ngModel]="brand()"
                (ngModelChange)="onBrandChange($event)"
              >
                <option value="">{{ 'productsAdmin.allBrands' | t }}</option>
                @for (b of brands(); track b) {
                  <option [value]="b">{{ b }}</option>
                }
              </select>
            </label>

            <label class="block space-y-1.5">
              <span class="text-[11px] font-bold text-[#A68B6D]">{{ 'productsAdmin.filterSort' | t }}</span>
              <select
                class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-sm font-semibold text-[#181A1D] outline-none focus:border-[#C27938] focus:bg-white"
                [ngModel]="sort()"
                (ngModelChange)="onSortChange($event)"
              >
                <option value="nameAsc">{{ 'productsAdmin.sortNameAsc' | t }}</option>
                <option value="nameDesc">{{ 'productsAdmin.sortNameDesc' | t }}</option>
              </select>
            </label>
          </div>

          <div class="flex flex-wrap items-center gap-2 text-sm font-semibold tabular-nums text-[#8A735C]">
            <span>
              {{ 'productsAdmin.showing' | t }}:
              <span class="text-[#181A1D]">{{ rangeStart() }}–{{ rangeEnd() }}</span>
              {{ 'productsAdmin.pageOf' | t }}
              <span class="text-[#181A1D]">{{ total() }}</span>
            </span>
            @if (searching()) {
              <span class="text-[#C27938]">{{ 'productsAdmin.searching' | t }}</span>
            } @else if (query().trim() && !searchReady()) {
              <span>{{ 'productsAdmin.searchHint' | t }}</span>
            }
          </div>
          }
        </div>
      </div>

      @if (activeTab() === 'catalog') {
        @if (loading() && families().length === 0) {
        <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm" aria-hidden="true">
          <div
            class="hidden border-b border-[#EDE0D0] bg-[#FBF8F4] px-3 py-2 text-[11px] font-bold text-[#A68B6D] lg:grid lg:grid-cols-[2.75rem_minmax(0,1.35fr)_6.75rem_minmax(10rem,13rem)_5rem_minmax(0,auto)] lg:items-center lg:gap-2"
          >
            <span></span>
            <span>{{ 'productsAdmin.colProduct' | t }}</span>
            <span>{{ 'productsAdmin.groupCode' | t }}</span>
            <span>{{ 'productsAdmin.colBarcode' | t }}</span>
            <span>{{ 'productsAdmin.colPrice' | t }}</span>
            <span>{{ 'productsAdmin.colActions' | t }}</span>
          </div>
          @for (slot of [1, 2, 3, 4, 5, 6, 7, 8]; track slot) {
            <div class="animate-pulse border-t border-[#EDE0D0] px-3 py-2.5">
              <div class="grid grid-cols-1 gap-2 lg:grid-cols-[2.75rem_minmax(0,1.35fr)_6.75rem_minmax(10rem,13rem)_5rem_minmax(0,auto)] lg:items-center lg:gap-2">
                <div class="size-11 rounded-lg bg-[#F3E7D8]"></div>
                <div class="min-w-0 space-y-1.5">
                  <div class="h-3 w-20 rounded bg-[#F0E2D1]"></div>
                  <div class="h-4 w-4/5 rounded bg-[#E8D5BE]"></div>
                  <div class="flex items-center gap-2">
                    <div class="h-3.5 w-16 rounded-full bg-[#F3E7D8]"></div>
                    <div class="h-3.5 w-24 rounded bg-[#F3E7D8]"></div>
                  </div>
                </div>
                <div class="h-6 w-20 rounded-md bg-[#F3E7D8]"></div>
                <div class="h-6 w-28 rounded-md bg-[#F3E7D8]"></div>
                <div class="h-5 w-16 rounded bg-[#E8D5BE]"></div>
                <div class="flex items-center gap-1.5">
                  <div class="h-8 w-16 rounded-lg bg-[#F3E7D8]"></div>
                  <div class="h-8 w-16 rounded-lg bg-[#F3E7D8]"></div>
                </div>
              </div>
            </div>
          }
        </div>
      } @else if (error()) {
        <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {{ 'productsAdmin.error' | t }}
        </div>
      } @else if (families().length === 0) {
        <div class="rounded-2xl border border-dashed border-[#E8D5BE] bg-white px-6 py-16 text-center text-sm font-medium text-[#8A735C]">
          {{ 'productsAdmin.empty' | t }}
        </div>
      } @else {
        <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm transition-opacity duration-200" [class.opacity-70]="searching()" [attr.aria-busy]="searching()">
          @if (searching()) {
            <div class="h-0.5 w-full bg-[#F8EEE2] overflow-hidden">
              <div class="h-full w-full bg-[#C27938] animate-pulse"></div>
            </div>
          }
          <div
            class="hidden border-b border-[#EDE0D0] bg-[#FBF8F4] px-3 py-2 text-[11px] font-bold text-[#A68B6D] lg:grid lg:grid-cols-[2.75rem_minmax(0,1.35fr)_6.75rem_minmax(10rem,13rem)_5rem_minmax(0,auto)] lg:items-center lg:gap-2"
          >
            <span></span>
            <span>{{ 'productsAdmin.colProduct' | t }}</span>
            <span>{{ 'productsAdmin.groupCode' | t }}</span>
            <span>{{ 'productsAdmin.colBarcode' | t }}</span>
            <span>{{ 'productsAdmin.colPrice' | t }}</span>
            <span>{{ 'productsAdmin.colActions' | t }}</span>
          </div>
          @for (family of families(); track listingKey(family)) {
            <article class="border-t border-[#EDE0D0] even:bg-[#FBF8F4]/60 hover:bg-[#F8EEE2]/50">
              <div class="grid grid-cols-1 gap-2 px-3 py-1.5 lg:grid-cols-[2.75rem_minmax(0,1.35fr)_6.75rem_minmax(10rem,13rem)_5rem_minmax(0,auto)] lg:items-center lg:gap-2">
                <div
                  class="group/img relative size-11 shrink-0 overflow-hidden rounded-lg bg-[#FBF8F4] border border-[#EDE0D0]/60 cursor-pointer shadow-xs transition hover:border-[#C27938]"
                  (click)="openImageModal(family)"
                  title="انقر لتغيير صورة المنتج"
                >
                  @if (cardImage(family); as img) {
                    <img [src]="img" [alt]="familyTitle(family)" class="size-full object-contain p-1" loading="lazy" />
                  } @else {
                    <div class="flex size-full items-center justify-center text-[#C27938]/40">
                      <i class="pi pi-image text-sm" aria-hidden="true"></i>
                    </div>
                  }
                  <div class="absolute inset-0 hidden group-hover/img:flex items-center justify-center bg-black/50 text-white text-[10px] transition">
                    <i class="pi pi-pencil"></i>
                  </div>
                </div>

                <div class="min-w-0">
                  <div class="text-[11px] font-bold text-[#C27938]">
                    {{ family.brand || ('productsAdmin.unknownBrand' | t) }}
                  </div>
                  <h2 class="line-clamp-2 text-pretty text-sm font-extrabold leading-snug text-[#181A1D]">
                    {{ familyTitle(family) }}
                  </h2>
                  <div class="mt-1 flex flex-wrap items-center gap-1.5">
                    <span [class]="matchBadgeClass(family)">{{ matchLabelKey(family) | t }}</span>
                    @if (hasAiMatch(family)) {
                      <button
                        type="button"
                        (click)="openAiReviewModal()"
                        class="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-[11px] font-bold text-violet-700 hover:bg-violet-100 hover:border-violet-300 transition-colors shadow-xs cursor-pointer"
                        [title]="'productsAdmin.aiMatchTooltip' | t"
                      >
                        <i class="pi pi-sparkles text-[11px] text-violet-500" aria-hidden="true"></i>
                        <span>{{ 'productsAdmin.aiMatchBadge' | t }}</span>
                      </button>
                    }
                    <span class="text-[11px] font-semibold tabular-nums text-[#8A735C]">
                      {{ cardPharmacyCount(family) }} {{ 'productsAdmin.pharmacies' | t }}
                    </span>
                    @if (!priceSyncOn(family)) {
                      <span class="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                        {{ 'productsAdmin.priceSyncPaused' | t }}
                      </span>
                    }
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-1">
                  <code class="inline-block rounded-md bg-[#181A1D] px-1.5 py-1 font-mono text-[11px] font-bold text-white">
                    {{ family.groupCode || '—' }}
                  </code>
                  @if (family.groupCode) {
                    <button
                      type="button"
                      class="inline-flex size-8 items-center justify-center rounded-lg border border-[#E8D5BE] text-[#181A1D] hover:bg-[#FBF8F4]"
                      (click)="copyCode(family.groupCode!)"
                      [attr.aria-label]="'productsAdmin.copyCode' | t"
                      [title]="'productsAdmin.copyCode' | t"
                    >
                      <i class="pi pi-copy text-xs" aria-hidden="true"></i>
                    </button>
                    <button
                      type="button"
                      class="inline-flex size-8 items-center justify-center rounded-lg border border-[#E8D5BE] text-[#C27938] hover:bg-[#F8EEE2]"
                      (click)="openMergeModal(family)"
                      [attr.aria-label]="'productsAdmin.mergeGroup' | t"
                      [title]="'productsAdmin.mergeGroup' | t"
                    >
                      <i class="pi pi-link text-xs" aria-hidden="true"></i>
                    </button>
                  }
                </div>

                <div>
                  @if (canEditBarcode(family)) {
                    <div class="space-y-1">
                      <div class="flex items-center gap-1">
                        <input
                          type="text"
                          dir="ltr"
                          inputmode="numeric"
                          class="min-h-9 w-full min-w-0 rounded-lg border bg-[#FBF8F4] px-2 font-mono text-xs font-bold tabular-nums text-[#181A1D] outline-none focus:border-[#C27938] focus:bg-white"
                          [ngClass]="barcodeError(family) ? 'border-rose-400' : 'border-[#E8D5BE]'"
                          [ngModel]="barcodeValue(family)"
                          (ngModelChange)="setBarcodeDraft(family, $event)"
                          [placeholder]="'productsAdmin.internationalCode' | t"
                          [attr.aria-label]="'productsAdmin.internationalCode' | t"
                          [attr.aria-invalid]="!!barcodeError(family)"
                          [attr.aria-describedby]="barcodeError(family) ? barcodeErrorId(family) : null"
                        />
                        <button
                          type="button"
                          class="inline-flex min-h-9 shrink-0 items-center rounded-lg bg-[#181A1D] px-2.5 text-[11px] font-bold text-white hover:bg-black disabled:opacity-50"
                          [disabled]="barcodeBusyId() === cardMasterId(family)"
                          (click)="saveBarcode(family)"
                        >
                          {{ 'productsAdmin.saveBarcode' | t }}
                        </button>
                      </div>
                      @if (barcodeError(family); as err) {
                        <p
                          class="text-xs font-medium text-rose-700"
                          [id]="barcodeErrorId(family)"
                          aria-live="polite"
                        >{{ err }}</p>
                      }
                    </div>
                  } @else {
                    <span class="font-mono text-xs font-bold tabular-nums text-[#181A1D]" dir="ltr">
                      {{ cardBarcode(family) || '—' }}
                    </span>
                  }
                </div>

                <div class="tabular-nums">
                  <div class="text-sm font-extrabold text-[#181A1D]">
                    {{ cardPrice(family) | currency: 'SAR':'symbol':'1.2-2' }}
                  </div>
                  @if (cardSavings(family); as savings) {
                    <div class="text-[11px] font-bold text-[#8A735C]">
                      {{ 'productsAdmin.savePercent' | t }}
                      {{ savings | number: '1.0-1' }}٪
                    </div>
                  }
                </div>

                <div class="flex flex-wrap items-center gap-1 lg:flex-nowrap">
                  <button
                    type="button"
                    class="inline-flex min-h-8 items-center whitespace-nowrap rounded-lg bg-[#C27938] px-2 text-[11px] font-bold text-white hover:bg-[#a8662e]"
                    [attr.aria-expanded]="offersOpen(family)"
                    [attr.aria-controls]="offersPanelId(family)"
                    (click)="toggleExpand(listingKey(family))"
                  >
                    {{
                      offersOpen(family)
                        ? ('productsAdmin.hideOffers' | t)
                        : ('productsAdmin.showOffers' | t)
                    }}
                  </button>
                  <button
                    type="button"
                    class="inline-flex min-h-8 items-center whitespace-nowrap rounded-lg bg-[#181A1D] px-2 text-[11px] font-bold text-white hover:bg-black"
                    (click)="openDetail(family)"
                  >
                    {{ 'productsAdmin.details' | t }}
                  </button>
                  <button
                    type="button"
                    class="inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-[#EDE0D0] bg-[#FBF8F4] px-2 text-[11px] font-bold text-[#8A735C] hover:text-[#C27938] hover:border-[#C27938] hover:bg-white transition"
                    (click)="openImageModal(family)"
                    title="تغيير صورة المنتج"
                  >
                    <i class="pi pi-image text-xs"></i>
                    <span>الصورة</span>
                  </button>
                  <button
                    type="button"
                    role="switch"
                    [attr.aria-checked]="priceSyncOn(family)"
                    class="inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2 text-[11px] font-bold"
                    [ngClass]="
                      priceSyncOn(family)
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-rose-200 bg-rose-50 text-rose-800'
                    "
                    [disabled]="!cardMasterId(family) || (cardMasterId(family) || '').startsWith('live:') || priceSyncBusyId() === cardMasterId(family)"
                    (click)="togglePriceSync(family)"
                  >
                    <span
                      class="size-2 rounded-full"
                      [class]="priceSyncOn(family) ? 'bg-emerald-500' : 'bg-rose-500'"
                    ></span>
                    {{
                      (priceSyncOn(family) ? 'productsAdmin.priceSyncOn' : 'productsAdmin.priceSyncOff') | t
                    }}
                  </button>
                </div>
              </div>

              @if (offersOpen(family)) {
                <div [id]="offersPanelId(family)" class="border-t border-[#EDE0D0] bg-[#FBF8F4] p-4 sm:p-5">
                  @if (family.packs.length > 1) {
                    <div class="mb-3">
                      <div class="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#A68B6D]">
                        {{ 'productsAdmin.sizesLabel' | t }}
                      </div>
                      <div
                        class="flex flex-wrap gap-2"
                        role="listbox"
                        [attr.aria-label]="'productsAdmin.sizesLabel' | t"
                      >
                        @for (pack of family.packs; track pack.masterId) {
                          <button
                            type="button"
                            role="option"
                            [attr.aria-selected]="selectedPackId(family) === pack.masterId"
                            class="inline-flex min-h-10 items-center justify-center rounded-lg border px-3.5 text-sm font-bold tabular-nums"
                            [ngClass]="
                              selectedPackId(family) === pack.masterId
                                ? 'border-[#C27938] bg-[#C27938] text-white'
                                : 'border-[#E8D5BE] bg-white text-[#181A1D] hover:bg-[#FBF8F4]'
                            "
                            [attr.dir]="packSizeDir(pack.packSize)"
                            (click)="selectPack(family.familyKey, pack.masterId)"
                          >
                            {{ packChipLabel(pack) }}
                          </button>
                        }
                      </div>
                    </div>
                  }

                  <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <h3 class="text-xs font-bold uppercase tracking-wide text-[#A68B6D]">
                        {{ 'productsAdmin.offers' | t }}
                      </h3>
                      <button
                        type="button"
                        class="inline-flex min-h-7 items-center gap-1 rounded-lg border border-[#C27938]/30 bg-[#F8EEE2] px-2 py-0.5 text-xs font-bold text-[#C27938] hover:bg-[#C27938] hover:text-white transition-colors"
                        (click)="openQuickAdd(family)"
                      >
                        <i class="pi pi-plus text-[10px]" aria-hidden="true"></i>
                        <span>{{ 'quickAdd.addOffer' | t }}</span>
                      </button>
                      @if (family.groupCode) {
                        <button
                          type="button"
                          class="inline-flex min-h-7 items-center gap-1 rounded-lg border border-[#C27938]/30 bg-[#F8EEE2] px-2 py-0.5 text-xs font-bold text-[#C27938] hover:bg-[#C27938] hover:text-white transition-colors"
                          (click)="openMergeModal(family)"
                        >
                          <i class="pi pi-link text-[10px]" aria-hidden="true"></i>
                          <span>{{ 'productsAdmin.mergeGroup' | t }}</span>
                        </button>
                      }
                    </div>
                    @if (selectedPack(family); as pack) {
                      <div class="text-xs font-bold tabular-nums text-[#181A1D]">
                        {{ pack.lowestPrice | currency: 'SAR':'symbol':'1.2-2' }}
                        @if (pack.highestPrice > pack.lowestPrice) {
                          <span class="font-semibold text-[#8A735C]">
                            – {{ pack.highestPrice | currency: 'SAR':'symbol':'1.2-2' }}
                          </span>
                        }
                      </div>
                    }
                  </div>

                  @if (selectedPack(family)?.requiresPackReview) {
                    <p class="mb-2 text-sm font-semibold text-amber-800">{{ 'productsAdmin.packReview' | t }}</p>
                  }
                  <div class="space-y-2">
                    @for (offer of selectedOffers(family); track offer.pharmacyCode + (offer.pharmacyProductId || offer.productUrl)) {
                      <div
                        class="flex flex-col gap-3 rounded-xl border border-[#E8D5BE] bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div class="flex min-w-0 flex-1 items-center gap-3">
                          @if (pharmacyLogo(offer.pharmacyCode); as logo) {
                            <img
                              [src]="logo"
                              [alt]="pharmacyLabel(offer)"
                              class="size-10 shrink-0 rounded-lg border border-[#E8D5BE] bg-white object-contain p-1"
                            />
                          } @else {
                            <span
                              class="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#F8EEE2] text-[#C27938]"
                            >
                              <i class="pi pi-shop text-sm"></i>
                            </span>
                          }
                          <div class="min-w-0 flex-1">
                            <div class="text-sm font-bold text-[#181A1D]">
                              {{ pharmacyLabel(offer) }}
                            </div>
                            @if (listingTitle(offer); as listing) {
                              <div class="mt-0.5 text-pretty text-sm font-semibold text-[#4A4038]">
                                {{ listing }}
                              </div>
                            }
                            <div class="mt-0.5 text-sm font-extrabold tabular-nums text-[#181A1D]">
                              {{ offer.price | currency: (offer.currency || 'SAR'):'symbol':'1.2-2' }}
                            </div>
                            <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium text-[#8A735C]">
                              <span>{{ offer.availability || ('productsAdmin.inStock' | t) }}</span>
                              <span aria-hidden="true">·</span>
                              <span [attr.dir]="packSizeDir(offer.packSize)" class="tabular-nums font-semibold text-[#4A4038]">
                                {{ displayPackSize(offer.packSize) || ('productsAdmin.unknownOfferPack' | t) }}
                              </span>
                              @if (offer.barcode || selectedPack(family)?.barcode; as code) {
                                <span aria-hidden="true">·</span>
                                <button
                                  type="button"
                                  class="inline-flex items-center gap-1 rounded bg-[#F8EEE2] px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#181A1D] hover:bg-[#EDE0D0]"
                                  [title]="'productsAdmin.copyBarcode' | t"
                                  (click)="copyCode(code)"
                                >
                                  <i class="pi pi-barcode text-[11px] text-[#C27938]" aria-hidden="true"></i>
                                  <span dir="ltr">{{ code }}</span>
                                  <i class="pi pi-copy text-[9px] text-[#A68B6D]" aria-hidden="true"></i>
                                </button>
                              }
                              @if (isAiMatch(offer)) {
                                <span aria-hidden="true">·</span>
                                <span
                                  class="inline-flex items-center gap-1 rounded bg-violet-50 border border-violet-200 px-1.5 py-0.5 text-[11px] font-bold text-violet-700 shadow-xs"
                                  [title]="'productsAdmin.aiMatchTooltip' | t"
                                >
                                  <i class="pi pi-sparkles text-[11px] text-violet-500" aria-hidden="true"></i>
                                  <span>{{ 'productsAdmin.aiMatchBadge' | t }}</span>
                                </span>
                              }
                            </div>
                          </div>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                          @if (offer.productUrl) {
                            <a
                              [href]="offer.productUrl"
                              target="_blank"
                              rel="noopener"
                              class="inline-flex min-h-9 items-center rounded-lg border border-[#E8D5BE] px-3 text-[11px] font-bold text-[#181A1D] hover:bg-[#FBF8F4]"
                            >
                              {{ 'productsAdmin.openOffer' | t }}
                            </a>
                          }
                          @if (offer.pharmacyProductId) {
                            <div class="flex items-center gap-1">
                              <input
                                class="min-h-9 w-28 rounded-lg border border-[#E8D5BE] bg-[#FBF8F4] px-2 font-mono text-xs font-bold uppercase outline-none focus:border-[#C27938]"
                                [placeholder]="'productsAdmin.pasteCode' | t"
                                [ngModel]="linkDrafts()[offer.pharmacyProductId!] || ''"
                                (ngModelChange)="setDraft(offer.pharmacyProductId!, $event)"
                              />
                              <button
                                type="button"
                                class="inline-flex min-h-9 items-center rounded-lg bg-[#181A1D] px-3 text-[11px] font-bold text-white hover:bg-black disabled:opacity-50"
                                [disabled]="linkingId() === offer.pharmacyProductId || unlinkingId() === offer.pharmacyProductId"
                                (click)="linkOffer(offer, family)"
                              >
                                {{ 'productsAdmin.link' | t }}
                              </button>
                            </div>
                            <button
                              type="button"
                              class="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/70 px-2.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-300 disabled:opacity-50 transition-colors shadow-2xs"
                              [disabled]="unlinkingId() === offer.pharmacyProductId || linkingId() === offer.pharmacyProductId"
                              [title]="'productsAdmin.unlink' | t"
                              (click)="unlinkOffer(offer, family)"
                            >
                              @if (unlinkingId() === offer.pharmacyProductId) {
                                <i class="pi pi-spin pi-spinner text-xs"></i>
                              } @else {
                                <i class="pi pi-unlink text-xs"></i>
                              }
                              <span>{{ 'productsAdmin.unlink' | t }}</span>
                            </button>
                          }
                        </div>
                      </div>
                    } @empty {
                      <div class="rounded-xl border border-dashed border-[#E8D5BE] bg-white px-4 py-8 text-center text-sm text-[#8A735C]">
                        {{ 'productsAdmin.empty' | t }}
                      </div>
                    }
                    </div>
                </div>
              }
            </article>
          }
        </div>

        @if (totalPages() > 1) {
          <div class="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              class="inline-flex min-h-10 items-center rounded-xl border border-[#E8D5BE] bg-white px-3 text-xs font-bold text-[#181A1D] hover:bg-[#FBF8F4] disabled:opacity-40"
              [disabled]="page() <= 1 || loading()"
              (click)="goToPage(page() - 1)"
            >
              {{ 'productsAdmin.pagePrev' | t }}
            </button>
            @for (p of pageButtons(); track p) {
              @if (p === '…') {
                <span class="px-1 text-sm font-bold text-[#A68B6D]">…</span>
              } @else {
                <button
                  type="button"
                  class="inline-flex size-10 items-center justify-center rounded-xl text-xs font-bold tabular-nums"
                  [ngClass]="
                    page() === p
                      ? 'bg-[#181A1D] text-white'
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
              class="inline-flex min-h-10 items-center rounded-xl border border-[#E8D5BE] bg-white px-3 text-xs font-bold text-[#181A1D] hover:bg-[#FBF8F4] disabled:opacity-40"
              [disabled]="page() >= totalPages() || loading()"
              (click)="goToPage(page() + 1)"
            >
              {{ 'productsAdmin.pageNext' | t }}
            </button>
          </div>
        }
      }
      } @else {
        <app-match-review [isEmbedded]="true" [initialMode]="'auto_98_99'"></app-match-review>
      }
    </section>

    <app-quick-add-product-modal
      [family]="quickAddFamily()"
      [isOpen]="isQuickAddOpen()"
      (close)="closeQuickAdd()"
      (productAdded)="onQuickProductAdded()"
      (familyMerged)="onFamilyMerged()"
    />

    <app-ai-match-review-modal
      [isOpen]="isAiReviewModalOpen()"
      [initialMatchId]="selectedAiMatchId()"
      (close)="closeAiReviewModal()"
      (matchResolved)="onAiMatchResolved($event)"
    />

    <app-product-image-modal
      [isOpen]="isImageModalOpen()"
      [family]="imageTargetFamily()"
      (close)="closeImageModal()"
      (imageChanged)="onImageChanged($event)"
    />
  `
})
export class ProductsAdminComponent implements OnInit, OnDestroy {
  private readonly catalog = inject(CatalogBrowseRepository);
  private readonly matchReviews = inject(MatchReviewRepository);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  readonly locale = inject(LocaleService);

  readonly activeTab = signal<'catalog' | 'model-review'>('catalog');
  readonly modelReviewCount = signal<number>(3712);
  readonly autoCatalogMatchCount = signal<number>(2312);

  readonly isAiReviewModalOpen = signal<boolean>(false);
  readonly selectedAiMatchId = signal<string | null>(null);

  readonly isImageModalOpen = signal<boolean>(false);
  readonly imageTargetFamily = signal<CatalogFamily | null>(null);

  readonly families = signal<CatalogFamily[]>([]);
  readonly brands = signal<string[]>([]);
  readonly categoryNodes = signal<CategoryNode[]>([]);
  readonly query = signal('');
  readonly categorySlug = signal('');
  readonly brand = signal('');
  readonly sort = signal<CatalogFamilySort>('nameAsc');
  readonly page = signal(1);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly selectedPackIds = signal<Record<string, string>>({});
  readonly linkDrafts = signal<Record<string, string>>({});
  readonly linkingId = signal<string | null>(null);
  readonly unlinkingId = signal<string | null>(null);
  readonly openOfferKeys = signal<ReadonlySet<string>>(new Set());
  readonly priceSyncBusyId = signal<string | null>(null);
  readonly barcodeDrafts = signal<Record<string, string>>({});
  readonly barcodeErrors = signal<Record<string, string>>({});
  readonly barcodeBusyId = signal<string | null>(null);
  readonly searching = signal(false);
  readonly listPageSize = signal(CATALOG_PAGE_SIZE);

  readonly quickAddFamily = signal<CatalogFamily | null>(null);
  readonly isQuickAddOpen = signal<boolean>(false);

  private queryTimer: ReturnType<typeof setTimeout> | null = null;
  private fetchSub: Subscription | null = null;

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.listPageSize()))
  );
  readonly rangeStart = computed(() =>
    this.total() === 0 ? 0 : (this.page() - 1) * this.listPageSize() + 1
  );
  readonly rangeEnd = computed(() =>
    Math.min(this.page() * this.listPageSize(), this.total())
  );
  readonly pageButtons = computed(() => this.buildPageButtons(this.page(), this.totalPages()));
  readonly categoryOptions = computed(() => this.flattenCategories(this.categoryNodes()));
  readonly searchReady = computed(() => isCatalogSearchReady(this.query()));

  ngOnInit(): void {
    const tabParam = this.route.snapshot.queryParamMap.get('tab')?.trim();
    if (tabParam === 'model-review') {
      this.activeTab.set('model-review');
    }

    this.matchReviews.listQueue({ take: 1 }).subscribe({
      next: (res) => this.modelReviewCount.set(res.queueDepth),
      error: () => {}
    });

    this.matchReviews.listQueue({ take: 1, mode: 'auto_98_99' }).subscribe({
      next: (res) => this.autoCatalogMatchCount.set(res.queueDepth),
      error: () => {}
    });

    const slug = this.route.snapshot.queryParamMap.get('categorySlug')?.trim() ?? '';
    if (slug) this.categorySlug.set(slug);
    this.reload();
    this.route.queryParamMap.pipe(skip(1)).subscribe((params) => {
      const t = params.get('tab')?.trim();
      if (t === 'model-review' || t === 'catalog') {
        this.activeTab.set(t);
      }
      const next = params.get('categorySlug')?.trim() ?? '';
      if (next === this.categorySlug()) return;
      this.categorySlug.set(next);
      this.reload();
    });
  }

  switchTab(tab: 'catalog' | 'model-review'): void {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  ngOnDestroy(): void {
    if (this.queryTimer) clearTimeout(this.queryTimer);
    this.fetchSub?.unsubscribe();
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    if (this.queryTimer) clearTimeout(this.queryTimer);
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      this.reload();
      return;
    }
    this.queryTimer = setTimeout(() => {
      if (!isCatalogSearchReady(this.query())) return;
      this.reload();
    }, 120);
  }

  onCategoryChange(value: string): void {
    this.categorySlug.set(value);
    this.reload();
  }

  onBrandChange(value: string): void {
    this.brand.set(value);
    this.reload();
  }

  onSortChange(value: string): void {
    this.sort.set(value === 'nameDesc' ? 'nameDesc' : 'nameAsc');
    this.reload();
  }

  goToPage(page: number): void {
    const target = Math.min(Math.max(1, page), this.totalPages());
    if (target === this.page() || this.loading() || this.searching()) return;
    this.fetch(target);
  }

  listingKey(family: CatalogFamily): string {
    return catalogListingKey(family);
  }

  toggleExpand(key: string): void {
    this.openOfferKeys.update((cur) => {
      const next = new Set(cur);
      if (next.has(key)) {
        next.delete(key);
        return next;
      }
      const family = this.families().find((f) => this.listingKey(f) === key);
      if (family) this.ensurePackSelection(family);
      next.add(key);
      return next;
    });
  }

  offersOpen(family: CatalogFamily): boolean {
    return this.openOfferKeys().has(this.listingKey(family));
  }

  selectPack(familyKey: string, masterId: string): void {
    this.selectedPackIds.update((m) => ({ ...m, [familyKey]: masterId }));
  }

  selectedPackId(family: CatalogFamily): string | null {
    const id = this.selectedPackIds()[family.familyKey];
    if (id && family.packs.some((p) => p.masterId === id)) return id;
    return family.packs[0]?.masterId ?? null;
  }

  selectedPack(family: CatalogFamily): CatalogPack | null {
    const id = this.selectedPackId(family);
    if (!id) return null;
    return family.packs.find((p) => p.masterId === id) ?? family.packs[0] ?? null;
  }

  readonly isAiMatch = isAiMatch;

  hasAiMatch(family: CatalogFamily): boolean {
    return family.packs.some((p) => p.offers.some((o) => isAiMatch(o)));
  }

  familyTitle(family: CatalogFamily): string {
    return catalogFamilyTitle(family, this.locale.locale());
  }

  selectedOffers(family: CatalogFamily): CatalogOffer[] {
    return [...(this.selectedPack(family)?.offers ?? [])].sort((a, b) => a.price - b.price);
  }

  packChipLabel(pack: CatalogPack): string {
    const title = catalogPackTitle(pack, this.locale.locale());
    return formatPackChipLabel(pack.packSize, title || pack.label, { locale: this.locale.locale() });
  }

  displayPackSize(packSize: string | null | undefined): string {
    return formatPackSize(packSize, this.locale.locale());
  }

  packSizeDir(packSize: string | null | undefined): 'ltr' | null {
    return formatPackSizeDir(this.displayPackSize(packSize));
  }

  openDetail(family: CatalogFamily): void {
    void this.router.navigate(['/products/detail'], {
      queryParams: { key: family.familyKey }
    });
  }

  setDraft(id: string, value: string): void {
    this.linkDrafts.update((m) => ({ ...m, [id]: value }));
  }

  linkOffer(offer: CatalogOffer, family?: CatalogFamily): void {
    const id = offer.pharmacyProductId;
    if (!id) return;
    const code = (this.linkDrafts()[id] || '').trim();
    if (!code) {
      this.notifications.showError(this.i18n.t('productsAdmin.codeRequired'), this.i18n.t('productsAdmin.link'));
      return;
    }
    this.linkingId.set(id);
    this.catalog
      .linkByGroupCode(id, code)
      .pipe(finalize(() => this.linkingId.set(null)))
      .subscribe({
        next: (res) => {
          this.removeOfferLocally(id);
          this.notifications.showSuccess(this.i18n.t('productsAdmin.linkedOk'), res.code);
          if (family?.familyKey) {
            this.refreshFamilyInPlace(family.familyKey);
          } else {
            this.reloadKeepingSelection();
          }
        },
        error: () => {
          this.notifications.showError(
            this.i18n.t('productsAdmin.linkedFail'),
            this.i18n.t('productsAdmin.link')
          );
        }
      });
  }

  async unlinkOffer(offer: CatalogOffer, family?: CatalogFamily): Promise<void> {
    const id = offer.pharmacyProductId;
    if (!id) return;
    const confirmed = await this.confirmDialog.confirm({
      title: this.i18n.t('productsAdmin.unlink'),
      message: this.i18n.t('productsAdmin.unlinkConfirm'),
      type: 'danger',
      confirmText: this.i18n.t('productsAdmin.unlink'),
    });
    if (!confirmed) return;

    this.unlinkingId.set(id);
    this.catalog
      .unlinkOffer(id)
      .pipe(finalize(() => this.unlinkingId.set(null)))
      .subscribe({
        next: () => {
          this.removeOfferLocally(id);
          this.notifications.showSuccess(
            this.i18n.t('productsAdmin.unlinkedOk'),
            this.pharmacyLabel(offer)
          );
          if (family?.familyKey) {
            this.refreshFamilyInPlace(family.familyKey);
          } else {
            this.reloadKeepingSelection();
          }
        },
        error: () => {
          this.notifications.showError(
            this.i18n.t('productsAdmin.unlinkedFail'),
            this.i18n.t('productsAdmin.unlink')
          );
        }
      });
  }

  private removeOfferLocally(pharmacyProductId: string): void {
    this.families.update((current) =>
      current.map((fam) => ({
        ...fam,
        packs: fam.packs.map((pack) => {
          const remainingOffers = pack.offers.filter((o) => o.pharmacyProductId !== pharmacyProductId);
          const lowest = remainingOffers.length > 0 ? Math.min(...remainingOffers.map((o) => o.price)) : 0;
          const highest = remainingOffers.length > 0 ? Math.max(...remainingOffers.map((o) => o.price)) : 0;
          return {
            ...pack,
            offers: remainingOffers,
            pharmacyCount: remainingOffers.length,
            lowestPrice: lowest > 0 ? lowest : pack.lowestPrice,
            highestPrice: highest > 0 ? highest : pack.highestPrice
          };
        })
      }))
    );
  }

  private refreshFamilyInPlace(familyKey: string): void {
    if (!familyKey) return;
    this.catalog.getFamilyByKey(familyKey).subscribe({
      next: (freshFamily) => {
        this.families.update((current) =>
          current.map((f) => (f.familyKey === freshFamily.familyKey ? freshFamily : f))
        );
      },
      error: () => {
        this.reloadKeepingSelection();
      }
    });
  }

  openQuickAdd(family: CatalogFamily): void {
    this.quickAddFamily.set(family);
    this.isQuickAddOpen.set(true);
  }

  closeQuickAdd(): void {
    this.isQuickAddOpen.set(false);
    this.quickAddFamily.set(null);
  }

  onQuickProductAdded(): void {
    const fam = this.quickAddFamily();
    this.closeQuickAdd();
    if (fam?.familyKey) {
      this.openOfferKeys.update((keys) => new Set([...keys, fam.familyKey]));
      this.refreshFamilyInPlace(fam.familyKey);
    } else {
      this.reloadKeepingSelection();
    }
  }

  openMergeModal(family: CatalogFamily): void {
    this.openQuickAdd(family);
  }

  onFamilyMerged(): void {
    this.closeQuickAdd();
    this.reloadKeepingSelection();
  }

  openAiReviewModal(matchId?: string | null): void {
    this.selectedAiMatchId.set(matchId ?? null);
    this.isAiReviewModalOpen.set(true);
  }

  closeAiReviewModal(): void {
    this.isAiReviewModalOpen.set(false);
    this.selectedAiMatchId.set(null);
  }

  onAiMatchResolved(event: { matchId: string; action: 'accept' | 'reject' }): void {
    this.modelReviewCount.update((c) => Math.max(0, c - 1));
    if (event.action === 'accept') {
      this.reloadKeepingSelection();
    }
  }

  openImageModal(family: CatalogFamily): void {
    this.imageTargetFamily.set(family);
    this.isImageModalOpen.set(true);
  }

  closeImageModal(): void {
    this.isImageModalOpen.set(false);
    this.imageTargetFamily.set(null);
  }

  onImageChanged(event: { masterId: string; imageUrl: string | null }): void {
    const target = this.imageTargetFamily();
    if (target) {
      this.families.update((fams) =>
        fams.map((f) => {
          if (f.familyKey === target.familyKey) {
            return {
              ...f,
              imageUrl: event.imageUrl ?? null
            };
          }
          return f;
        })
      );
    }
  }

  pharmacyLogo(code: string | null | undefined): string | null {
    return resolvePharmacyLogo(code);
  }

  cardImage(family: CatalogFamily): string | null {
    return familyHeroImage(family);
  }

  cardPrice(family: CatalogFamily): number {
    const pack = this.offersOpen(family) ? this.selectedPack(family) : family.packs[0];
    return pack?.lowestPrice || pack?.offers[0]?.price || 0;
  }

  cardPharmacyCount(family: CatalogFamily): number {
    const pack = this.offersOpen(family) ? this.selectedPack(family) : family.packs[0];
    return pack?.pharmacyCount || pack?.offers.length || 0;
  }

  cardSavings(family: CatalogFamily): number | null {
    const pack = this.offersOpen(family) ? this.selectedPack(family) : family.packs[0];
    const value = pack?.savingsPercent;
    return value != null && value > 0 ? value : null;
  }

  cardBarcode(family: CatalogFamily): string | null {
    const pack = this.offersOpen(family) ? this.selectedPack(family) : family.packs[0];
    const code = pack?.barcode == null ? '' : String(pack.barcode).trim();
    return code || null;
  }

  cardMasterId(family: CatalogFamily): string | null {
    const pack = this.offersOpen(family) ? this.selectedPack(family) : family.packs[0];
    const id = pack?.masterId?.trim();
    return id || null;
  }

  listingTitle(offer: CatalogOffer): string {
    return offerListingTitle(offer, this.locale.locale());
  }

  offersPanelId(family: CatalogFamily): string {
    return `offers-${this.listingKey(family)}`;
  }

  canEditBarcode(family: CatalogFamily): boolean {
    const id = this.cardMasterId(family);
    return !!id && !id.startsWith('live:');
  }

  barcodeValue(family: CatalogFamily): string {
    const id = this.cardMasterId(family);
    if (!id) return '';
    const drafts = this.barcodeDrafts();
    if (Object.prototype.hasOwnProperty.call(drafts, id)) return drafts[id] ?? '';
    return this.cardBarcode(family) ?? '';
  }

  setBarcodeDraft(family: CatalogFamily, value: string): void {
    const id = this.cardMasterId(family);
    if (!id) return;
    this.barcodeDrafts.update((m) => ({ ...m, [id]: value }));
    this.barcodeErrors.update((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
  }

  barcodeError(family: CatalogFamily): string | null {
    const id = this.cardMasterId(family);
    if (!id) return null;
    return this.barcodeErrors()[id] ?? null;
  }

  barcodeErrorId(family: CatalogFamily): string {
    return `barcode-err-${this.cardMasterId(family) ?? 'none'}`;
  }

  saveBarcode(family: CatalogFamily): void {
    const id = this.cardMasterId(family);
    if (!id || id.startsWith('live:') || this.barcodeBusyId() === id) return;
    const value = this.barcodeValue(family).trim();
    if (!value) {
      this.barcodeErrors.update((m) => ({ ...m, [id]: this.i18n.t('productsAdmin.barcodeInvalid') }));
      return;
    }
    this.barcodeBusyId.set(id);
    this.catalog
      .setMasterBarcode(id, value)
      .pipe(finalize(() => this.barcodeBusyId.set(null)))
      .subscribe({
        next: (res) => {
          this.families.update((list) =>
            list.map((row) => ({
              ...row,
              packs: row.packs.map((pack) =>
                pack.masterId === res.id ? { ...pack, barcode: res.barcode } : pack
              )
            }))
          );
          this.barcodeDrafts.update((m) => {
            const next = { ...m };
            delete next[id];
            return next;
          });
          this.barcodeErrors.update((m) => {
            const next = { ...m };
            delete next[id];
            return next;
          });
          this.notifications.showSuccess(this.i18n.t('productsAdmin.barcodeSaved'), res.barcode);
        },
        error: () => {
          this.barcodeErrors.update((m) => ({ ...m, [id]: this.i18n.t('productsAdmin.barcodeInvalid') }));
        }
      });
  }

  priceSyncOn(family: CatalogFamily): boolean {
    const pack = this.offersOpen(family) ? this.selectedPack(family) : family.packs[0];
    return pack?.priceSyncEnabled !== false;
  }

  copyCode(code: string): void {
    void navigator.clipboard.writeText(code).then(() => {
      this.notifications.showSuccess(this.i18n.t('productsAdmin.copied'), code);
    });
  }

  togglePriceSync(family: CatalogFamily): void {
    const id = this.cardMasterId(family);
    if (!id || id.startsWith('live:') || this.priceSyncBusyId() === id) return;

    const next = !this.priceSyncOn(family);
    this.priceSyncBusyId.set(id);
    this.catalog
      .setPriceSyncEnabled(id, next)
      .pipe(finalize(() => this.priceSyncBusyId.set(null)))
      .subscribe({
        next: (res) => {
          this.families.update((list) =>
            list.map((row) => ({
              ...row,
              packs: row.packs.map((pack) =>
                pack.masterId === res.id ? { ...pack, priceSyncEnabled: res.enabled } : pack
              )
            }))
          );
          this.notifications.showSuccess(
            this.i18n.t(res.enabled ? 'productsAdmin.priceSyncOnMsg' : 'productsAdmin.priceSyncOffMsg'),
            this.i18n.t('productsAdmin.priceSyncLabel')
          );
        }
      });
  }

  matchLabelKey(family: CatalogFamily): string {
    switch (matchStatus(family)) {
      case 'Exact':
        return 'productsAdmin.matchConfirmed';
      case 'Comparable':
        return 'productsAdmin.matchComparable';
      case 'Single':
        return 'productsAdmin.matchSingle';
      default:
        return 'productsAdmin.matchPending';
    }
  }

  matchBadgeClass(family: CatalogFamily): string {
    switch (matchStatus(family)) {
      case 'Exact':
        return 'rounded-full bg-[#E8F5EE] px-2 py-0.5 text-[11px] font-bold text-[#1B7A45]';
      case 'Pending':
        return 'rounded-full bg-[#F8EEE2] px-2 py-0.5 text-[11px] font-bold text-[#C27938]';
      default:
        return 'rounded-full bg-[#FBF8F4] px-2 py-0.5 text-[11px] font-bold text-[#8A735C]';
    }
  }

  pharmacyLabel(offer: CatalogOffer): string {
    return pharmacyDisplayName(offer.pharmacyCode, offer.pharmacyName, this.locale.locale());
  }

  private ensurePackSelection(family: CatalogFamily): void {
    const current = this.selectedPackIds()[family.familyKey];
    if (current && family.packs.some((p) => p.masterId === current)) return;
    const first = family.packs[0]?.masterId;
    if (first) {
      this.selectedPackIds.update((m) => ({ ...m, [family.familyKey]: first }));
    }
  }

  private filtersRequested = false;

  private ensureFilterOptions(): void {
    if (this.filtersRequested) return;
    this.filtersRequested = true;
    this.loadFilterOptions();
  }

  private loadFilterOptions(): void {
    this.catalog.getCategoryStructure().subscribe({
      next: (nodes) => this.categoryNodes.set(nodes),
      error: () => this.categoryNodes.set([])
    });
    this.catalog.listFamilyBrands().subscribe({
      next: (rows) => this.brands.set(rows),
      error: () => this.brands.set([])
    });
  }

  private flattenCategories(nodes: CategoryNode[]): CategoryOption[] {
    const out: CategoryOption[] = [];
    const walk = (list: CategoryNode[], prefix = '') => {
      for (const n of list) {
        const label = categoryDisplayName(n, this.locale.locale());
        const name = prefix ? `${prefix} / ${label}` : label;
        if (n.slug) out.push({ slug: n.slug, name });
        if (n.children?.length) walk(n.children, name);
      }
    };
    walk(nodes);
    return out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }

  private buildPageButtons(current: number, total: number): Array<number | '…'> {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = new Set<number>([1, total, current, current - 1, current + 1, 2, total - 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
    const result: Array<number | '…'> = [];
    let prev = 0;
    for (const p of sorted) {
      if (prev && p - prev > 1) result.push('…');
      result.push(p);
      prev = p;
    }
    return result;
  }

  private reloadKeepingSelection(): void {
    const openKeys = this.openOfferKeys();
    const packs = this.selectedPackIds();
    this.error.set(false);
    this.fetch(this.page(), () => {
      this.selectedPackIds.set(packs);
      this.openOfferKeys.set(openKeys);
    });
  }

  private reload(): void {
    this.error.set(false);
    this.openOfferKeys.set(new Set());
    this.fetch(1);
  }

  private fetch(page: number, after?: () => void): void {
    this.fetchSub?.unsubscribe();
    const hasRows = this.families().length > 0;
    this.loading.set(!hasRows);
    this.searching.set(hasRows);
    const q = this.query().trim();
    const categorySlug = this.categorySlug().trim();
    const brand = this.brand().trim();
    const sort = this.sort();
    const targetPage = Math.max(1, page);
    const pageSize = q ? SEARCH_PAGE_SIZE : CATALOG_PAGE_SIZE;

    this.fetchSub = this.catalog
      .listFamilies({
        query: q || undefined,
        categorySlug: categorySlug || undefined,
        brand: brand || undefined,
        sort,
        page: targetPage,
        pageSize
      })
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.searching.set(false);
        })
      )
      .subscribe({
        next: (result) => {
          const cards = flattenFamilyPacks(result.data);
          this.page.set(result.page || targetPage);
          this.listPageSize.set(result.pageSize || pageSize);
          this.total.set(result.total);
          this.families.set(cards);
          after?.();
          this.ensureFilterOptions();
        },
        error: () => {
          this.error.set(true);
          this.families.set([]);
          this.total.set(0);
          this.ensureFilterOptions();
        }
      });
  }
}
