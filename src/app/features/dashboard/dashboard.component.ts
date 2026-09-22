import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { CatalogBrowseRepository } from '../../core/domain/repositories/catalog-browse.repository';
import { DashboardRepository } from '../../core/domain/repositories/dashboard.repository';
import { CategoryNode } from '../../core/domain/models/category.model';
import { CatalogFamily, catalogFamilyTitle, familyMatchType, isConfirmedMatch } from '../../core/domain/models/catalog-family.model';
import { OpsDashboardSnapshot } from '../../core/domain/models/dashboard.model';
import { I18nService } from '../../core/i18n/i18n.service';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { CategoryMegaMenuComponent } from '../../shared/components/category-mega-menu/category-mega-menu.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { KpiCardComponent } from '../../shared/components/charts/kpi-card.component';
import { TrendChartComponent } from '../../shared/components/charts/trend-chart.component';
import { PharmacyBarChartComponent } from '../../shared/components/charts/pharmacy-bar-chart.component';
import { CategoryDonutChartComponent } from '../../shared/components/charts/category-donut-chart.component';
import { CouponStatsComponent } from '../../shared/components/charts/coupon-stats.component';
import { OverlapDepthChartComponent } from '../../shared/components/charts/overlap-depth-chart.component';
import { MatchingBreakdownChartComponent } from '../../shared/components/charts/matching-breakdown-chart.component';
import { MarketSpreadWidgetComponent } from '../../shared/components/charts/market-spread-widget.component';

const PAGE_SIZE = 24;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    CurrencyPipe,
    DecimalPipe,
    CategoryMegaMenuComponent,
    KpiCardComponent,
    TrendChartComponent,
    PharmacyBarChartComponent,
    CategoryDonutChartComponent,
    CouponStatsComponent,
    OverlapDepthChartComponent,
    MatchingBreakdownChartComponent,
    MarketSpreadWidgetComponent
  ],
  template: `
    <section class="w-full space-y-6 px-4 py-4 sm:px-6 sm:py-6" [attr.dir]="locale.isRtl() ? 'rtl' : 'ltr'">
      <!-- Executive Header Banner -->
      <div class="relative overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-[#14171C] sm:p-8">
        <div class="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2.5">
              <span class="inline-flex items-center gap-2 rounded-full bg-[#C27938]/10 px-3 py-1 text-xs font-bold text-[#C27938] dark:bg-[#C27938]/20">
                <span class="relative flex size-2">
                  <span class="absolute inline-flex size-full animate-ping rounded-full bg-[#C27938] opacity-75"></span>
                  <span class="relative inline-flex size-2 rounded-full bg-[#C27938]"></span>
                </span>
                {{ 'dashboard.eyebrow' | t }}
              </span>

              @if (snapshot(); as snap) {
                <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-extrabold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <i class="pi pi-check-circle text-xs" aria-hidden="true"></i>
                  النظام المباشر نشط
                </span>
              }
            </div>

            <h1 class="text-balance text-3xl font-black text-[#181A1D] dark:text-white sm:text-4xl">
              {{ 'dashboard.title' | t }}
            </h1>
            <p class="max-w-2xl text-pretty text-sm font-medium text-[#8A735C] dark:text-neutral-400">
              {{ 'dashboard.subtitle' | t }}
            </p>
          </div>

          <!-- Controls & View Switcher Tabs -->
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E8D5BE] bg-white px-4 text-xs font-bold text-[#181A1D] shadow-xs hover:border-[#C27938] hover:bg-[#FBF8F4] active:scale-95 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-800 dark:text-white"
              aria-label="تحديث الإحصائيات الفوري"
              [disabled]="snapshotLoading()"
              (click)="loadStats(true)"
            >
              <i class="pi pi-refresh text-xs" [ngClass]="{ 'animate-spin': snapshotLoading() }" aria-hidden="true"></i>
              <span>{{ 'dashboard.refreshStats' | t }}</span>
            </button>

            <div class="inline-flex rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] p-1.5 dark:border-neutral-800 dark:bg-neutral-900">
              <button
                type="button"
                class="rounded-lg px-4 py-2 text-xs font-extrabold transition-opacity duration-150"
                [ngClass]="
                  activeTab() === 'analytics'
                    ? 'bg-[#181A1D] text-white shadow-xs dark:bg-white dark:text-black'
                    : 'text-[#8A735C] hover:text-[#181A1D] dark:text-neutral-400 dark:hover:text-white'
                "
                (click)="activeTab.set('analytics')"
              >
                {{ 'dashboard.tabOverview' | t }}
              </button>
              <button
                type="button"
                class="rounded-lg px-4 py-2 text-xs font-extrabold transition-opacity duration-150"
                [ngClass]="
                  activeTab() === 'catalog'
                    ? 'bg-[#181A1D] text-white shadow-xs dark:bg-white dark:text-black'
                    : 'text-[#8A735C] hover:text-[#181A1D] dark:text-neutral-400 dark:hover:text-white'
                "
                (click)="openCatalogTab()"
              >
                {{ 'dashboard.tabBrowse' | t }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 1: EXECUTIVE ANALYTICS & REAL CHARTS -->
      @if (activeTab() === 'analytics') {
        @if (snapshotLoading() && !snapshot()) {
          <!-- Dashboard Skeletons -->
          <div class="space-y-6 animate-pulse">
            <!-- 4 KPI Cards Skeletons -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              @for (kpi of [1, 2, 3, 4]; track kpi) {
                <div class="rounded-3xl border border-[#E8D5BE] bg-white p-5 space-y-3 dark:border-neutral-800 dark:bg-neutral-900 shadow-sm">
                  <div class="flex items-center justify-between">
                    <div class="size-10 rounded-2xl bg-[#F8EEE2] dark:bg-neutral-800"></div>
                    <div class="h-5 w-16 rounded-full bg-[#F3E7D8] dark:bg-neutral-800"></div>
                  </div>
                  <div class="space-y-2 pt-1">
                    <div class="h-4 w-28 rounded bg-[#F3E7D8] dark:bg-neutral-800"></div>
                    <div class="h-8 w-24 rounded-lg bg-[#E8D5BE] dark:bg-neutral-700"></div>
                    <div class="h-3.5 w-32 rounded bg-[#F3E7D8]/70 dark:bg-neutral-800/70"></div>
                  </div>
                </div>
              }
            </div>

            <!-- 2 Analytics Chart Skeletons -->
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div class="rounded-3xl border border-[#E8D5BE] bg-white p-6 space-y-5 dark:border-neutral-800 dark:bg-neutral-900 shadow-sm">
                <div class="flex items-center justify-between">
                  <div class="h-5 w-44 rounded bg-[#E8D5BE] dark:bg-neutral-700"></div>
                  <div class="h-4 w-20 rounded bg-[#F3E7D8] dark:bg-neutral-800"></div>
                </div>
                <div class="h-64 rounded-2xl bg-[#FBF8F4] dark:bg-neutral-800/50 p-4 flex items-end justify-between gap-3">
                  <div class="w-full h-1/3 rounded-t-lg bg-[#E8D5BE]/60"></div>
                  <div class="w-full h-2/3 rounded-t-lg bg-[#E8D5BE]"></div>
                  <div class="w-full h-1/2 rounded-t-lg bg-[#E8D5BE]/70"></div>
                  <div class="w-full h-4/5 rounded-t-lg bg-[#C27938]/60"></div>
                  <div class="w-full h-3/5 rounded-t-lg bg-[#E8D5BE]/80"></div>
                  <div class="w-full h-2/5 rounded-t-lg bg-[#E8D5BE]/50"></div>
                </div>
              </div>

              <div class="rounded-3xl border border-[#E8D5BE] bg-white p-6 space-y-5 dark:border-neutral-800 dark:bg-neutral-900 shadow-sm">
                <div class="flex items-center justify-between">
                  <div class="h-5 w-48 rounded bg-[#E8D5BE] dark:bg-neutral-700"></div>
                  <div class="h-4 w-20 rounded bg-[#F3E7D8] dark:bg-neutral-800"></div>
                </div>
                <div class="h-64 rounded-2xl bg-[#FBF8F4] dark:bg-neutral-800/50 p-6 flex items-center justify-center">
                  <div class="size-48 rounded-full border-8 border-[#E8D5BE] border-t-[#C27938]/70"></div>
                </div>
              </div>
            </div>
          </div>
        } @else if (snapshotError()) {
          <div class="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
            تعذر تحميل بيانات التحليلات الحية من السيرفر. تأكد من تشغيل الباك إند (.NET API).
          </div>
        } @else if (snapshot(); as snap) {
          <!-- Core Catalog KPI Cards Grid -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <app-kpi-card
              [title]="'dashboard.totalProducts' | t"
              [value]="snap.totalPharmacyProducts"
              subtitle="منتجات مسعّرة ومسحوبة"
              badge="نشط"
              icon="pi-database"
              accentColor="bg-[#C27938]"
              iconBgClass="bg-[#F8EEE2] dark:bg-neutral-800"
              iconColorClass="text-[#C27938]"
            />

            <app-kpi-card
              title="منتجات المقارنة (2+ صيدليات)"
              [value]="snap.mastersWithTwoPlusPharmacies"
              [subtitle]="'إجمالي الكتالوج: ' + (snap.masterProducts | number)"
              badge="تنافس سوقي"
              icon="pi-sitemap"
              accentColor="bg-emerald-500"
              iconBgClass="bg-emerald-100 dark:bg-emerald-950"
              iconColorClass="text-emerald-600"
            />

            <app-kpi-card
              [title]="'dashboard.syncHealth' | t"
              [value]="snap.scrapingSuccessPercent24h"
              [isPercent]="true"
              subtitle="معدل نجاح العمليات 24س"
              [badge]="snap.pricesUpdated24h + ' سعر محدّث'"
              icon="pi-bolt"
              accentColor="bg-amber-500"
              iconBgClass="bg-amber-100 dark:bg-amber-950"
              iconColorClass="text-amber-600"
            />

            <app-kpi-card
              [title]="'dashboard.barcodeCoverage' | t"
              [value]="snap.barcodeCoveragePercent"
              [isPercent]="true"
              subtitle="تغطية الباركود GTIN"
              [badge]="(snap.identityMatchPercent | number: '1.0-1') + '% هوية'"
              icon="pi-barcode"
              accentColor="bg-blue-500"
              iconBgClass="bg-blue-100 dark:bg-blue-950"
              iconColorClass="text-blue-600"
            />
          </div>

          <!-- Market Spread & Savings Disparity Widget -->
          <app-market-spread-widget [data]="snap.priceSpread" />

          <!-- Main Pharmacy & Market Overlap Depth Grid -->
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <app-pharmacy-bar-chart
              [pharmacies]="snap.pharmacies"
            />

            <app-overlap-depth-chart
              [data]="snap.overlapDepth ?? []"
            />
          </div>

          <!-- AI Model & Matching Breakdown Full Width Chart -->
          <app-matching-breakdown-chart
            [data]="snap.matchingBreakdown"
          />

          <!-- Main Interactive Charts Grid: Trends & Categories -->
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div class="lg:col-span-2">
              <app-trend-chart
                [data]="snap.activityTrends"
                [title]="'dashboard.activityTrends' | t"
                subtitle="نشاط المزامنة اليومية وتحديثات الأسعار للأسبوع الحالي"
              />
            </div>
            <div>
              <app-category-donut-chart
                [categories]="snap.topCategories"
              />
            </div>
          </div>

          <!-- User, Marketing & Coupons KPI Cards Grid -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <app-kpi-card
              [title]="'dashboard.totalUsers' | t"
              [value]="snap.totalUsers"
              [subtitle]="'المستخدمون النشطون: ' + (snap.activeUsers | number)"
              badge="حسابات مسجلة"
              icon="pi-users"
              accentColor="bg-indigo-500"
              iconBgClass="bg-indigo-100 dark:bg-indigo-950"
              iconColorClass="text-indigo-600"
            />

            <app-kpi-card
              [title]="'dashboard.totalCoupons' | t"
              [value]="snap.totalCoupons"
              [subtitle]="'نشط حالياً: ' + snap.activeCoupons"
              badge="خصومات الصيدليات"
              icon="pi-ticket"
              accentColor="bg-purple-500"
              iconBgClass="bg-purple-100 dark:bg-purple-950"
              iconColorClass="text-purple-600"
            />

            <app-kpi-card
              [title]="'dashboard.totalCouponRedemptions' | t"
              [value]="snap.totalCouponRedemptions"
              subtitle="استخدامات ونسخ الأكواد"
              badge="تفاعل قوي"
              icon="pi-shopping-bag"
              accentColor="bg-[#C27938]"
              iconBgClass="bg-[#F8EEE2] dark:bg-neutral-800"
              iconColorClass="text-[#C27938]"
            />

            <app-kpi-card
              [title]="'dashboard.totalBillboards' | t"
              [value]="snap.totalBillboards"
              [subtitle]="'المجلات والعروض: ' + snap.totalMagazines"
              [badge]="snap.activeBillboards + ' بنر نشط'"
              icon="pi-images"
              accentColor="bg-teal-500"
              iconBgClass="bg-teal-100 dark:bg-teal-950"
              iconColorClass="text-teal-600"
            />
          </div>

          <!-- Coupons Section -->
          <div>
            <app-coupon-stats
              [coupons]="snap.topCoupons"
              [totalRedemptions]="snap.totalCouponRedemptions"
            />
          </div>

          <!-- Real-Time System Alert & Health Bar -->
          <div class="rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-center gap-3">
                <div class="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950">
                  <i class="pi pi-shield text-lg" aria-hidden="true"></i>
                </div>
                <div>
                  <h3 class="text-sm font-extrabold text-[#181A1D] dark:text-white">
                    {{ 'dashboard.systemStatus' | t }}
                  </h3>
                  <p class="text-xs font-medium text-[#8A735C] dark:text-neutral-400">
                    مراقبة تنبيهات وحوادث النظام الحية
                  </p>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-4 text-xs font-bold">
                <div class="flex items-center gap-2 rounded-xl bg-[#FBF8F4] px-3.5 py-2 dark:bg-neutral-800">
                  <i class="pi pi-bell text-amber-500" aria-hidden="true"></i>
                  <span class="text-[#8A735C] dark:text-neutral-400">التنبيهات:</span>
                  <span class="text-[#181A1D] dark:text-white font-black">{{ snap.openAlerts }}</span>
                </div>

                <div class="flex items-center gap-2 rounded-xl bg-[#FBF8F4] px-3.5 py-2 dark:bg-neutral-800">
                  <i class="pi pi-exclamation-triangle text-rose-500" aria-hidden="true"></i>
                  <span class="text-[#8A735C] dark:text-neutral-400">حرجة:</span>
                  <span class="text-rose-600 font-black">{{ snap.criticalAlerts }}</span>
                </div>

                <div class="flex items-center gap-2 rounded-xl bg-[#FBF8F4] px-3.5 py-2 dark:bg-neutral-800">
                  <i class="pi pi-tag text-[#C27938]" aria-hidden="true"></i>
                  <span class="text-[#8A735C] dark:text-neutral-400">أسعار غريبة:</span>
                  <span class="text-[#C27938] font-black">{{ snap.suspiciousPrices }}</span>
                </div>

                @if (snap.lastSuccessfulSyncUtc) {
                  <div class="text-[11px] font-semibold text-[#8A735C] dark:text-neutral-400">
                    {{ 'dashboard.lastSyncAt' | t }}:
                    <span class="text-[#181A1D] dark:text-white font-bold">{{ snap.lastSuccessfulSyncUtc | date: 'shortTime' }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        }
      }

      <!-- TAB 2: CATALOG EXPLORER (The existing mega-menu catalog browser) -->
      @if (activeTab() === 'catalog') {
        <div class="space-y-4">
          <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div class="h-1.5 bg-[#C27938]"></div>
            <div class="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
              <div class="min-w-0">
                <div class="inline-flex items-center gap-2 rounded-full bg-[#F8EEE2] px-3 py-1 text-[11px] font-bold text-[#C27938] dark:bg-neutral-800">
                  <span class="size-1.5 rounded-full bg-[#C27938]"></span>
                  {{ 'dashboard.sourceNahdi' | t }}
                </div>
                <h2 class="mt-3 text-balance text-2xl font-extrabold text-[#181A1D] dark:text-white sm:text-3xl">
                  {{ 'dashboard.title' | t }}
                </h2>
                <p class="mt-1.5 max-w-2xl text-pretty text-sm font-medium text-[#8A735C] dark:text-neutral-400">
                  {{ 'dashboard.subtitleBrowse' | t }}
                </p>
              </div>
              <div class="shrink-0 text-sm font-semibold tabular-nums text-[#8A735C] dark:text-neutral-400">
                @if (activeSlug()) {
                  {{ 'dashboard.showing' | t }}:
                  <span class="text-[#181A1D] dark:text-white">{{ families().length }}</span>
                  /
                  <span class="text-[#181A1D] dark:text-white">{{ total() }}</span>
                }
              </div>
            </div>

            <div class="space-y-3 border-t border-[#EDE0D0] p-4 dark:border-neutral-800 sm:p-5">
              @if (categoriesLoading()) {
                <div class="rounded-2xl border border-[#E8D5BE] bg-[#FBF8F4] px-6 py-12 text-center text-sm font-medium text-[#8A735C] dark:border-neutral-800 dark:bg-neutral-950">
                  {{ 'dashboard.loadingCategories' | t }}
                </div>
              } @else if (roots().length) {
                <app-category-mega-menu
                  [roots]="roots()"
                  [selectedPrimarySlug]="primarySlug()"
                  [selectedSubSlug]="subSlug()"
                  (primarySelected)="onPrimaryChange($event.slug)"
                  (childSelected)="onChildPick($event)"
                  (allSelected)="onPrimaryChange($event.slug)"
                />
              }

              <label class="block space-y-1.5">
                <span class="text-[11px] font-bold text-[#A68B6D] dark:text-neutral-400">{{ 'dashboard.search' | t }}</span>
                <div class="relative">
                  <i
                    class="pi pi-search pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[#A68B6D]"
                    aria-hidden="true"
                  ></i>
                  <input
                    type="search"
                    class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] pe-3 ps-10 text-sm font-medium text-[#181A1D] outline-none placeholder:text-[#A68B6D] focus:border-[#C27938] focus:bg-white dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                    [placeholder]="'dashboard.searchPlaceholder' | t"
                    [ngModel]="query()"
                    (ngModelChange)="onQueryChange($event)"
                    [disabled]="!activeSlug()"
                  />
                </div>
              </label>
            </div>
          </div>

          @if (categoriesError()) {
            <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {{ 'dashboard.categoriesError' | t }}
            </div>
          }

          @if (!activeSlug()) {
            <div class="rounded-2xl border border-dashed border-[#E8D5BE] bg-white px-6 py-16 text-center dark:border-neutral-800 dark:bg-neutral-900">
              <div class="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#F8EEE2] text-[#C27938] dark:bg-neutral-800">
                <i class="pi pi-sitemap text-lg" aria-hidden="true"></i>
              </div>
              <p class="mt-4 text-base font-bold text-[#181A1D] dark:text-white">{{ 'dashboard.pickCategory' | t }}</p>
              <p class="mt-1 text-sm text-[#8A735C] dark:text-neutral-400">{{ 'dashboard.pickCategoryHint' | t }}</p>
            </div>
          } @else if (productsLoading() && families().length === 0) {
            <div class="rounded-2xl border border-[#E8D5BE] bg-white px-6 py-16 text-center text-sm font-medium text-[#8A735C] dark:border-neutral-800 dark:bg-neutral-900">
              {{ 'dashboard.loadingProducts' | t }}
            </div>
          } @else if (productsError()) {
            <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {{ 'dashboard.productsError' | t }}
            </div>
          } @else if (families().length === 0) {
            <div class="rounded-2xl border border-dashed border-[#E8D5BE] bg-white px-6 py-16 text-center dark:border-neutral-800 dark:bg-neutral-900">
              <p class="text-base font-bold text-[#181A1D] dark:text-white">{{ 'dashboard.emptyProducts' | t }}</p>
              <p class="mt-1 text-sm text-[#8A735C] dark:text-neutral-400">{{ 'dashboard.emptyProductsHint' | t }}</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              @for (family of families(); track family.familyKey) {
                <article class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <div class="relative aspect-[4/3] bg-[#FBF8F4] dark:bg-neutral-950">
                    @if (cardImage(family); as img) {
                      <img [src]="img" [alt]="familyTitle(family)" class="size-full object-contain p-4" loading="lazy" />
                    } @else {
                      <div class="flex size-full items-center justify-center text-[#C27938]/40">
                        <i class="pi pi-image text-3xl" aria-hidden="true"></i>
                      </div>
                    }
                    @if (cardSavings(family); as savings) {
                      <span
                        class="absolute start-3 top-3 rounded-lg bg-[#181A1D] px-2 py-1 text-[11px] font-bold text-white dark:bg-white dark:text-black"
                      >
                        -{{ savings | number: '1.0-0' }}%
                      </span>
                    }
                    @if (isConfirmedFamily(family)) {
                      <span
                        class="absolute end-3 top-3 rounded-lg bg-[#1B7A45] px-2 py-1 text-[11px] font-bold text-white"
                      >
                        {{ 'dashboard.matchConfirmed' | t }}
                      </span>
                    }
                  </div>
                  <div class="space-y-2 p-4">
                    <div class="text-[11px] font-bold uppercase tracking-wide text-[#C27938]">
                      {{ family.brand || ('dashboard.unknownBrand' | t) }}
                    </div>
                    <h3 class="line-clamp-2 text-sm font-bold leading-snug text-[#181A1D] dark:text-white">
                      {{ familyTitle(family) }}
                    </h3>
                    <div class="flex items-end justify-between gap-2">
                      <div>
                        <div class="text-[11px] font-medium text-[#A68B6D] dark:text-neutral-400">{{ 'dashboard.lowestPrice' | t }}</div>
                        <div class="text-lg font-extrabold tabular-nums text-[#181A1D] dark:text-white">
                          {{ cardPrice(family) | currency: 'SAR':'symbol':'1.2-2' }}
                        </div>
                      </div>
                      <div class="text-end text-[11px] font-semibold text-[#8A735C] dark:text-neutral-400">
                        {{ cardPharmacyCount(family) }}
                        {{ 'dashboard.pharmacies' | t }}
                      </div>
                    </div>
                  </div>
                </article>
              }
            </div>

            @if (hasMore()) {
              <div class="flex justify-center pt-2">
                <button
                  type="button"
                  class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#181A1D] px-5 text-sm font-bold text-white hover:bg-black disabled:opacity-60 dark:bg-white dark:text-black"
                  [disabled]="productsLoading()"
                  (click)="loadMore()"
                >
                  @if (productsLoading()) {
                    {{ 'dashboard.loadingProducts' | t }}
                  } @else {
                    {{ 'dashboard.loadMore' | t }}
                  }
                </button>
              </div>
            }
          }
        </div>
      }
    </section>
  `
})
export class DashboardComponent implements OnInit {
  private readonly catalog = inject(CatalogBrowseRepository);
  private readonly dashboardRepo = inject(DashboardRepository);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  readonly locale = inject(LocaleService);

  readonly activeTab = signal<'analytics' | 'catalog'>('analytics');

  // Executive Dashboard Analytics Signals
  readonly snapshot = signal<OpsDashboardSnapshot | null>(null);
  readonly snapshotLoading = signal(false);
  readonly snapshotError = signal(false);

  // Catalog Browser Signals
  readonly roots = signal<CategoryNode[]>([]);
  readonly primarySlug = signal('');
  readonly subSlug = signal('');
  readonly query = signal('');
  readonly families = signal<CatalogFamily[]>([]);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly categoriesLoading = signal(false);
  readonly productsLoading = signal(false);
  readonly categoriesError = signal(false);
  readonly productsError = signal(false);

  private queryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly activeSlug = computed(() => this.subSlug() || this.primarySlug());
  readonly hasMore = computed(() => this.families().length < this.total());

  ngOnInit(): void {
    this.loadStats();
  }

  openCatalogTab(): void {
    this.activeTab.set('catalog');
    if (this.roots().length === 0 && !this.categoriesLoading()) {
      this.loadCategories();
    }
  }

  loadStats(forceRefresh = false): void {
    this.snapshotLoading.set(true);
    this.snapshotError.set(false);
    const req$ = forceRefresh
      ? this.dashboardRepo.refreshSnapshot()
      : this.dashboardRepo.getSnapshot();

    req$
      .pipe(finalize(() => this.snapshotLoading.set(false)))
      .subscribe({
        next: (data) => {
          this.snapshot.set(data);
          this.prefetchProductsFirstPage();
          if (forceRefresh) {
            this.notifications.showSuccess('تم تحديث إحصائيات النظام وإعادة الحساب بنجاح');
          }
        },
        error: () => {
          this.snapshotError.set(true);
          this.notifications.showError('تعذر تحميل بيانات لوحة التحكم الحية');
        }
      });
  }

  onPrimaryChange(slug: string): void {
    this.primarySlug.set(slug);
    this.subSlug.set('');
    this.query.set('');
    this.resetProducts();
    if (slug) {
      this.fetchProducts(1, false);
    }
  }

  onSubChange(slug: string): void {
    this.subSlug.set(slug);
    this.resetProducts();
    if (this.primarySlug()) {
      this.fetchProducts(1, false);
    }
  }

  onChildPick(node: CategoryNode): void {
    const parent = this.roots().find((root) => root.children?.some((child) => child.id === node.id));
    if (parent) this.primarySlug.set(parent.slug);
    this.onSubChange(node.slug);
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    if (this.queryTimer) clearTimeout(this.queryTimer);
    this.queryTimer = setTimeout(() => {
      if (!this.activeSlug()) return;
      this.resetProducts();
      this.fetchProducts(1, false);
    }, 120);
  }

  loadMore(): void {
    if (!this.hasMore() || this.productsLoading()) return;
    this.fetchProducts(this.page() + 1, true);
  }

  familyTitle(family: CatalogFamily): string {
    return catalogFamilyTitle(family, this.locale.locale());
  }

  cardImage(family: CatalogFamily): string | null {
    if (family.imageUrl) return family.imageUrl;
    return family.packs.flatMap((p) => p.offers.map((o) => o.imageUrl)).find((u): u is string => !!u) ?? null;
  }

  cardPrice(family: CatalogFamily): number {
    const pack = family.packs[0];
    if (!pack) return 0;
    return pack.lowestPrice || pack.offers[0]?.price || 0;
  }

  cardPharmacyCount(family: CatalogFamily): number {
    const pack = family.packs[0];
    if (!pack) return 0;
    return pack.pharmacyCount || pack.offers.length || 0;
  }

  isConfirmedFamily(family: CatalogFamily): boolean {
    return isConfirmedMatch(familyMatchType(family));
  }

  cardSavings(family: CatalogFamily): number | null {
    const value = family.packs[0]?.savingsPercent;
    return value != null && value > 0 ? value : null;
  }

  private prefetchProductsFirstPage(): void {
    this.catalog
      .listFamilies({ page: 1, pageSize: PAGE_SIZE, sort: 'nameAsc' })
      .subscribe({ next: () => undefined, error: () => undefined });
  }

  private loadCategories(): void {
    this.categoriesLoading.set(true);
    this.categoriesError.set(false);
    this.catalog
      .getCategoryStructure()
      .pipe(finalize(() => this.categoriesLoading.set(false)))
      .subscribe({
        next: (nodes) => this.roots.set(nodes.filter((n) => !n.parentId)),
        error: () => {
          this.categoriesError.set(true);
          this.notifications.showError(
            this.i18n.t('dashboard.categoriesError'),
            this.i18n.t('dashboard.sourceNahdi')
          );
        }
      });
  }

  private resetProducts(): void {
    this.families.set([]);
    this.page.set(1);
    this.total.set(0);
    this.productsError.set(false);
  }

  private fetchProducts(page: number, append: boolean): void {
    const slug = this.activeSlug();
    if (!slug) return;

    this.productsLoading.set(true);
    this.productsError.set(false);
    this.catalog
      .listFamilies({
        categorySlug: slug,
        query: this.query(),
        page,
        pageSize: PAGE_SIZE
      })
      .pipe(finalize(() => this.productsLoading.set(false)))
      .subscribe({
        next: (result) => {
          this.page.set(result.page);
          this.total.set(result.total);
          this.families.update((current) => (append ? [...current, ...result.data] : result.data));
        },
        error: () => {
          this.productsError.set(true);
          if (!append) this.families.set([]);
        }
      });
  }
}
