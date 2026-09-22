import { Component, computed, inject, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { CatalogBrowseRepository, CatalogFamilySort } from '../../core/domain/repositories/catalog-browse.repository';
import { CategoryNode } from '../../core/domain/models/category.model';
import {
  CatalogFamily,
  catalogFamilyTitle,
  familyMatchType,
  isConfirmedMatch
} from '../../core/domain/models/catalog-family.model';
import { filterCategoryTree } from '../../core/domain/category-display';
import { LocaleService } from '../../core/services/locale.service';

interface CategoryVisual {
  icon: string;
  gradient: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}

const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  'medicines-treatments': {
    icon: 'pi pi-heart-fill',
    gradient: 'from-emerald-500/10 via-teal-500/5 to-transparent text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-500/30'
  },
  'vitamins-supplements': {
    icon: 'pi pi-bolt',
    gradient: 'from-amber-500/10 via-orange-500/5 to-transparent text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
    badgeText: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-500/30'
  },
  'skin-care': {
    icon: 'pi pi-sparkles',
    gradient: 'from-rose-500/10 via-pink-500/5 to-transparent text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/60',
    badgeText: 'text-rose-700 dark:text-rose-300',
    borderColor: 'border-rose-500/30'
  },
  'hair-care': {
    icon: 'pi pi-star-fill',
    gradient: 'from-purple-500/10 via-indigo-500/5 to-transparent text-purple-600 dark:text-purple-400',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/60',
    badgeText: 'text-purple-700 dark:text-purple-300',
    borderColor: 'border-purple-500/30'
  },
  'personal-care': {
    icon: 'pi pi-user',
    gradient: 'from-sky-500/10 via-cyan-500/5 to-transparent text-sky-600 dark:text-sky-400',
    badgeBg: 'bg-sky-50 dark:bg-sky-950/60',
    badgeText: 'text-sky-700 dark:text-sky-300',
    borderColor: 'border-sky-500/30'
  },
  'mother-baby': {
    icon: 'pi pi-heart',
    gradient: 'from-indigo-500/10 via-blue-500/5 to-transparent text-indigo-600 dark:text-indigo-400',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    borderColor: 'border-indigo-500/30'
  },
  'medical-supplies': {
    icon: 'pi pi-shield',
    gradient: 'from-blue-500/10 via-cyan-500/5 to-transparent text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/60',
    badgeText: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-500/30'
  },
  'beauty-cosmetics': {
    icon: 'pi pi-palette',
    gradient: 'from-fuchsia-500/10 via-pink-500/5 to-transparent text-fuchsia-600 dark:text-fuchsia-400',
    badgeBg: 'bg-fuchsia-50 dark:bg-fuchsia-950/60',
    badgeText: 'text-fuchsia-700 dark:text-fuchsia-300',
    borderColor: 'border-fuchsia-500/30'
  },
  'health-food': {
    icon: 'pi pi-apple',
    gradient: 'from-lime-500/10 via-emerald-500/5 to-transparent text-lime-600 dark:text-lime-400',
    badgeBg: 'bg-lime-50 dark:bg-lime-950/60',
    badgeText: 'text-lime-700 dark:text-lime-300',
    borderColor: 'border-lime-500/30'
  },
  'other': {
    icon: 'pi pi-th-large',
    gradient: 'from-slate-500/10 via-zinc-500/5 to-transparent text-slate-600 dark:text-slate-400',
    badgeBg: 'bg-slate-50 dark:bg-slate-900',
    badgeText: 'text-slate-700 dark:text-slate-300',
    borderColor: 'border-slate-500/30'
  }
};

const DEFAULT_VISUAL: CategoryVisual = {
  icon: 'pi pi-box',
  gradient: 'from-[#C27938]/10 via-[#F8EEE2]/30 to-transparent text-[#C27938]',
  badgeBg: 'bg-[#F8EEE2] dark:bg-neutral-800',
  badgeText: 'text-[#C27938]',
  borderColor: 'border-[#E8D5BE]'
};

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe],
  template: `
    <section class="w-full space-y-5 px-3 py-4 sm:px-5 sm:py-6" [attr.dir]="locale.isRtl() ? 'rtl' : 'ltr'">
      
      <!-- Top Hero Header Bar -->
      <div class="relative overflow-hidden rounded-3xl border border-[#E8D5BE]/80 bg-white/90 p-5 shadow-xs backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/90 sm:p-7">
        <div class="absolute -end-24 -top-24 size-96 rounded-full bg-gradient-to-br from-[#C27938]/10 via-[#F8EEE2]/30 to-transparent blur-3xl pointer-events-none"></div>
        <div class="h-1 bg-gradient-to-r from-[#C27938] via-amber-400 to-[#C27938] absolute top-0 inset-x-0"></div>

        <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between relative z-10">
          <div class="space-y-2">
            <div class="inline-flex items-center gap-2 rounded-full bg-[#F8EEE2] px-3.5 py-1 text-xs font-bold text-[#C27938] dark:bg-neutral-800">
              <span class="size-2 rounded-full bg-[#C27938] animate-pulse"></span>
              كتالوج الصيدليات الموحد (8 صيدليات مباشرة)
            </div>
            <h1 class="text-2xl font-black text-[#181A1D] dark:text-white sm:text-3xl tracking-tight">
              تصفح الأقسام والمنتجات
            </h1>
            <p class="max-w-2xl text-xs sm:text-sm font-medium text-[#8A735C] dark:text-neutral-400">
              استكشف أكثر من 133,000 منتج مصنف عبر 10 أقسام طبية وتجميلية قياسية، مع مقارنة حية ومباشرة للأسعار والتوفير.
            </p>
          </div>

          <!-- Quick Metrics Badges & Mobile Drawer Button -->
          <div class="flex flex-wrap items-center gap-2.5">
            <div class="flex items-center gap-2 rounded-2xl border border-[#EDE0D0] bg-[#FBF8F4] px-3.5 py-2 text-xs font-bold text-[#181A1D] dark:border-neutral-800 dark:bg-neutral-950 dark:text-white">
              <i class="pi pi-sitemap text-[#C27938]"></i>
              <span>10 أقسام رئيسية</span>
            </div>

            <div class="flex items-center gap-2 rounded-2xl border border-[#EDE0D0] bg-[#FBF8F4] px-3.5 py-2 text-xs font-bold text-[#181A1D] dark:border-neutral-800 dark:bg-neutral-950 dark:text-white">
              <i class="pi pi-tags text-emerald-600"></i>
              <span>49 فئة فرعية</span>
            </div>

            <!-- Mobile Category Drawer Toggle Button -->
            <button
              type="button"
              class="lg:hidden flex items-center gap-2 rounded-2xl bg-[#C27938] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#A6652B] transition-colors"
              (click)="mobileSidebarOpen.set(true)"
            >
              <i class="pi pi-bars"></i>
              <span>قائمة الأقسام</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Main Layout: Sidebar (Categories) + Main Content (Products) -->
      <div class="flex flex-col lg:flex-row items-start gap-5">

        <!-- ==================== SIDEBAR (Categories Tree) ==================== -->
        <aside class="hidden lg:block w-80 shrink-0 sticky top-4 space-y-4">
          <div class="overflow-hidden rounded-3xl border border-[#E8D5BE]/80 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
            
            <!-- Sidebar Header & Search -->
            <div class="p-4 border-b border-[#EDE0D0]/80 dark:border-neutral-800 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-extrabold uppercase tracking-wider text-[#A68B6D] dark:text-neutral-400">
                  شجرة الأقسام الرئيسية
                </span>
                <span class="text-[11px] font-bold rounded-full bg-[#F8EEE2] px-2 py-0.5 text-[#C27938] dark:bg-neutral-800">
                  {{ roots().length }} أقسام
                </span>
              </div>

              <!-- Filter within categories -->
              <div class="relative">
                <i class="pi pi-filter pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-xs text-[#A68B6D]"></i>
                <input
                  type="text"
                  class="h-9 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] pe-3 ps-8 text-xs font-medium text-[#181A1D] outline-none placeholder:text-[#A68B6D] focus:border-[#C27938] focus:bg-white dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                  placeholder="ابحث داخل الأقسام..."
                  [ngModel]="categoryFilterQuery()"
                  (ngModelChange)="categoryFilterQuery.set($event)"
                />
              </div>
            </div>

            <!-- Categories Tree List -->
            <div class="p-2 max-h-[calc(100vh-280px)] overflow-y-auto space-y-1 divide-y divide-[#EDE0D0]/40 dark:divide-neutral-800/40">
              @if (categoriesLoading()) {
                @for (i of [1,2,3,4,5,6]; track i) {
                  <div class="p-3 animate-pulse flex items-center gap-3">
                    <div class="size-9 rounded-xl bg-[#F8EEE2] dark:bg-neutral-800"></div>
                    <div class="flex-1 space-y-1.5">
                      <div class="h-3.5 w-24 rounded bg-[#E8D5BE]/60 dark:bg-neutral-800"></div>
                      <div class="h-2.5 w-16 rounded bg-[#F8EEE2] dark:bg-neutral-800"></div>
                    </div>
                  </div>
                }
              } @else {
                @for (root of filteredRoots(); track root.id) {
                  <div class="pt-1 first:pt-0">
                    <!-- Root Department Row -->
                    <div
                      class="group relative flex items-center justify-between rounded-2xl p-2.5 cursor-pointer transition-all duration-200"
                      [class.bg-[#F8EEE2]]="selectedPrimarySlug() === root.slug && !selectedSubSlug()"
                      [class.dark:bg-neutral-800]="selectedPrimarySlug() === root.slug && !selectedSubSlug()"
                      [class.border]="selectedPrimarySlug() === root.slug && !selectedSubSlug()"
                      [class.border-[#C27938]/30]="selectedPrimarySlug() === root.slug && !selectedSubSlug()"
                      [class.hover:bg-[#FBF8F4]]="selectedPrimarySlug() !== root.slug"
                      [class.dark:hover:bg-neutral-800/60]="selectedPrimarySlug() !== root.slug"
                      (click)="onSelectRoot(root)"
                    >
                      <div class="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-xs transition-transform group-hover:scale-105"
                          [ngClass]="getVisual(root.slug).gradient"
                        >
                          <i [class]="getVisual(root.slug).icon" class="text-sm"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                          <div class="truncate text-xs font-bold text-[#181A1D] dark:text-white">
                            {{ locale.isRtl() ? root.name : (root.nameEn || root.name) }}
                          </div>
                          @if (root.nameEn && locale.isRtl()) {
                            <div class="truncate text-[10px] font-medium text-[#8A735C] dark:text-neutral-400">
                              {{ root.nameEn }}
                            </div>
                          }
                        </div>
                      </div>

                      <div class="flex items-center gap-1.5 shrink-0 ms-2">
                        <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-slate-600 dark:bg-neutral-800 dark:text-neutral-300">
                          {{ root.productCount | number }}
                        </span>

                        @if (root.children && root.children.length > 0) {
                          <button
                            type="button"
                            class="p-1 text-[#A68B6D] hover:text-[#C27938] transition-colors"
                            (click)="toggleAccordion(root.slug, $event)"
                            aria-label="Toggle subcategories"
                          >
                            <i
                              class="pi text-xs transition-transform duration-200"
                              [class.pi-chevron-down]="isExpanded(root.slug)"
                              [class.pi-chevron-left]="!isExpanded(root.slug) && locale.isRtl()"
                              [class.pi-chevron-right]="!isExpanded(root.slug) && !locale.isRtl()"
                            ></i>
                          </button>
                        }
                      </div>
                    </div>

                    <!-- Subcategories Accordion List -->
                    @if (root.children && root.children.length > 0 && isExpanded(root.slug)) {
                      <div class="my-1 ms-4 space-y-0.5 border-s-2 border-[#E8D5BE]/60 pe-1 ps-2.5 dark:border-neutral-800 animate-fadeIn">
                        <!-- 'All in Department' Option -->
                        <div
                          class="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition-colors"
                          [class.bg-[#C27938]]="selectedPrimarySlug() === root.slug && !selectedSubSlug()"
                          [class.text-white]="selectedPrimarySlug() === root.slug && !selectedSubSlug()"
                          [class.text-[#8A735C]]="selectedPrimarySlug() !== root.slug || selectedSubSlug()"
                          [class.dark:text-neutral-400]="selectedPrimarySlug() !== root.slug || selectedSubSlug()"
                          [class.hover:bg-[#F8EEE2]]="selectedPrimarySlug() !== root.slug || selectedSubSlug()"
                          [class.dark:hover:bg-neutral-800]="selectedPrimarySlug() !== root.slug || selectedSubSlug()"
                          (click)="onSelectAllInRoot(root)"
                        >
                          <span>كل {{ locale.isRtl() ? root.name : (root.nameEn || root.name) }}</span>
                          <span class="text-[10px] opacity-80 tabular-nums">({{ root.productCount | number }})</span>
                        </div>

                        <!-- Specific Subcategories -->
                        @for (sub of root.children; track sub.id) {
                          <div
                            class="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-colors"
                            [class.bg-[#C27938]]="selectedSubSlug() === sub.slug"
                            [class.text-white]="selectedSubSlug() === sub.slug"
                            [class.font-bold]="selectedSubSlug() === sub.slug"
                            [class.text-[#181A1D]]="selectedSubSlug() !== sub.slug"
                            [class.dark:text-neutral-300]="selectedSubSlug() !== sub.slug"
                            [class.hover:bg-[#F8EEE2]]="selectedSubSlug() !== sub.slug"
                            [class.dark:hover:bg-neutral-800]="selectedSubSlug() !== sub.slug"
                            (click)="onSelectSub(root, sub)"
                          >
                            <span class="truncate">{{ locale.isRtl() ? sub.name : (sub.nameEn || sub.name) }}</span>
                            <span
                              class="text-[10px] tabular-nums shrink-0 ms-2"
                              [class.text-white]="selectedSubSlug() === sub.slug"
                              [class.text-[#8A735C]]="selectedSubSlug() !== sub.slug"
                            >
                              {{ sub.productCount | number }}
                            </span>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              }
            </div>
          </div>
        </aside>

        <!-- ==================== MAIN CONTENT (Products Browser) ==================== -->
        <main class="flex-1 min-w-0 space-y-4 w-full">

          <!-- Active Category Header Card & Subcategory Chips -->
          @if (currentPrimaryNode(); as primary) {
            <div class="overflow-hidden rounded-3xl border border-[#E8D5BE]/80 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
              
              <!-- Category Details & Breadcrumbs -->
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#EDE0D0]/80 pb-4 dark:border-neutral-800">
                <div class="flex items-center gap-3.5">
                  <div
                    class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm"
                    [ngClass]="getVisual(primary.slug).gradient"
                  >
                    <i [class]="getVisual(primary.slug).icon" class="text-xl"></i>
                  </div>
                  <div>
                    <!-- Breadcrumbs -->
                    <div class="flex items-center gap-1.5 text-[11px] font-semibold text-[#8A735C] dark:text-neutral-400 mb-0.5">
                      <span>الأقسام</span>
                      <i class="pi pi-angle-left text-[10px]" *ngIf="locale.isRtl()"></i>
                      <i class="pi pi-angle-right text-[10px]" *ngIf="!locale.isRtl()"></i>
                      <span class="text-[#C27938] font-bold">{{ locale.isRtl() ? primary.name : (primary.nameEn || primary.name) }}</span>
                      @if (currentSubNode(); as sub) {
                        <i class="pi pi-angle-left text-[10px]" *ngIf="locale.isRtl()"></i>
                        <i class="pi pi-angle-right text-[10px]" *ngIf="!locale.isRtl()"></i>
                        <span class="text-[#181A1D] dark:text-white font-black">{{ locale.isRtl() ? sub.name : (sub.nameEn || sub.name) }}</span>
                      }
                    </div>

                    <h2 class="text-xl font-black text-[#181A1D] dark:text-white sm:text-2xl">
                      {{ activeCategoryTitle() }}
                    </h2>
                  </div>
                </div>

                <!-- Total Count Badge -->
                <div class="flex items-center gap-2 self-start sm:self-auto rounded-2xl bg-[#F8EEE2] px-4 py-2 text-xs font-extrabold text-[#C27938] dark:bg-neutral-800">
                  <i class="pi pi-box"></i>
                  <span>{{ total() | number }} منتج مسعر متوفر</span>
                </div>
              </div>

              <!-- Horizontal Subcategory Chips Carousel -->
              @if (primary.children && primary.children.length > 0) {
                <div class="pt-4 space-y-2">
                  <span class="text-[11px] font-bold text-[#A68B6D] dark:text-neutral-400 block">
                    الفئات الفرعية المتاحة:
                  </span>
                  <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <!-- 'All' Chip -->
                    <button
                      type="button"
                      class="shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all"
                      [class.bg-[#C27938]]="!selectedSubSlug()"
                      [class.text-white]="!selectedSubSlug()"
                      [class.shadow-sm]="!selectedSubSlug()"
                      [class.bg-[#FBF8F4]]="selectedSubSlug()"
                      [class.text-[#8A735C]]="selectedSubSlug()"
                      [class.border]="selectedSubSlug()"
                      [class.border-[#E8D5BE]]="selectedSubSlug()"
                      [class.hover:bg-[#F8EEE2]]="selectedSubSlug()"
                      [class.dark:bg-neutral-800]="selectedSubSlug()"
                      (click)="onSelectAllInRoot(primary)"
                    >
                      عرض الكل ({{ primary.productCount | number }})
                    </button>

                    <!-- Subcategory Chips -->
                    @for (sub of primary.children; track sub.id) {
                      <button
                        type="button"
                        class="shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all"
                        [class.bg-[#C27938]]="selectedSubSlug() === sub.slug"
                        [class.text-white]="selectedSubSlug() === sub.slug"
                        [class.font-bold]="selectedSubSlug() === sub.slug"
                        [class.shadow-sm]="selectedSubSlug() === sub.slug"
                        [class.bg-[#FBF8F4]]="selectedSubSlug() !== sub.slug"
                        [class.text-[#181A1D]]="selectedSubSlug() !== sub.slug"
                        [class.border]="selectedSubSlug() !== sub.slug"
                        [class.border-[#E8D5BE]]="selectedSubSlug() !== sub.slug"
                        [class.hover:bg-[#F8EEE2]]="selectedSubSlug() !== sub.slug"
                        [class.dark:bg-neutral-800]="selectedSubSlug() !== sub.slug"
                        [class.dark:text-neutral-200]="selectedSubSlug() !== sub.slug"
                        (click)="onSelectSub(primary, sub)"
                      >
                        <span>{{ locale.isRtl() ? sub.name : (sub.nameEn || sub.name) }}</span>
                        <span
                          class="rounded-full px-1.5 py-0.2 text-[10px] font-bold"
                          [class.bg-white/20]="selectedSubSlug() === sub.slug"
                          [class.text-white]="selectedSubSlug() === sub.slug"
                          [class.bg-black/5]="selectedSubSlug() !== sub.slug"
                          [class.text-[#8A735C]]="selectedSubSlug() !== sub.slug"
                        >
                          {{ sub.productCount | number }}
                        </span>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- Toolbar: Search within Category, Sorting, View Toggle -->
          <div class="flex flex-col gap-3 rounded-2xl border border-[#E8D5BE]/80 bg-white p-3.5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 sm:flex-row sm:items-center sm:justify-between">
            
            <!-- Instant Search inside Category -->
            <div class="relative flex-1 max-w-md">
              <i class="pi pi-search pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-sm text-[#A68B6D]"></i>
              <input
                type="search"
                class="h-10 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] pe-3 ps-9 text-xs font-medium text-[#181A1D] outline-none placeholder:text-[#A68B6D] focus:border-[#C27938] focus:bg-white dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                [placeholder]="'ابحث في ' + activeCategoryTitle() + '...'"
                [ngModel]="productSearchQuery()"
                (ngModelChange)="onSearchInput($event)"
              />
            </div>

            <!-- Sort & View Controls -->
            <div class="flex items-center gap-2 self-end sm:self-auto">
              <!-- Sort Select -->
              <div class="flex items-center gap-1.5 text-xs font-semibold text-[#8A735C] dark:text-neutral-400">
                <i class="pi pi-sort-alt"></i>
                <select
                  class="h-10 rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-xs font-bold text-[#181A1D] outline-none focus:border-[#C27938] dark:border-neutral-800 dark:bg-neutral-950 dark:text-white cursor-pointer"
                  [ngModel]="selectedSort()"
                  (ngModelChange)="onSortChange($event)"
                >
                  <option value="nameAsc">الاسم (أ - ي)</option>
                  <option value="nameDesc">الاسم (ي - أ)</option>
                </select>
              </div>

              <!-- View Mode Toggle (Grid / List) -->
              <div class="flex items-center rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] p-0.5 dark:border-neutral-800 dark:bg-neutral-950">
                <button
                  type="button"
                  class="flex size-9 items-center justify-center rounded-lg text-xs transition-colors"
                  [class.bg-white]="viewMode() === 'grid'"
                  [class.text-[#C27938]]="viewMode() === 'grid'"
                  [class.shadow-xs]="viewMode() === 'grid'"
                  [class.text-[#8A735C]]="viewMode() !== 'grid'"
                  (click)="viewMode.set('grid')"
                  aria-label="Grid view"
                >
                  <i class="pi pi-th-large"></i>
                </button>
                <button
                  type="button"
                  class="flex size-9 items-center justify-center rounded-lg text-xs transition-colors"
                  [class.bg-white]="viewMode() === 'list'"
                  [class.text-[#C27938]]="viewMode() === 'list'"
                  [class.shadow-xs]="viewMode() === 'list'"
                  [class.text-[#8A735C]]="viewMode() !== 'list'"
                  (click)="viewMode.set('list')"
                  aria-label="List view"
                >
                  <i class="pi pi-list"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- ==================== PRODUCTS LIST / GRID ==================== -->
          @if (productsLoading() && products().length === 0) {
            <!-- Shimmer Skeletons -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 animate-pulse">
              @for (i of [1,2,3,4,5,6,7,8]; track i) {
                <div class="rounded-3xl border border-[#E8D5BE]/60 bg-white p-4 space-y-3 dark:border-neutral-800 dark:bg-neutral-900">
                  <div class="aspect-[4/3] rounded-2xl bg-[#F8EEE2]/60 dark:bg-neutral-800"></div>
                  <div class="space-y-2">
                    <div class="h-3 w-16 rounded bg-[#E8D5BE]/60 dark:bg-neutral-800"></div>
                    <div class="h-4 w-3/4 rounded bg-[#E8D5BE] dark:bg-neutral-800"></div>
                    <div class="h-6 w-24 rounded bg-[#F8EEE2] dark:bg-neutral-800"></div>
                  </div>
                </div>
              }
            </div>
          } @else if (productsError()) {
            <!-- Error State -->
            <div class="rounded-3xl border border-rose-200 bg-rose-50/80 p-8 text-center dark:border-rose-900/50 dark:bg-rose-950/40">
              <i class="pi pi-exclamation-triangle text-3xl text-rose-500 mb-2"></i>
              <h3 class="text-base font-bold text-rose-900 dark:text-rose-200">تعذر تحميل منتجات هذا القسم</h3>
              <p class="text-xs text-rose-700 dark:text-rose-300 mt-1">يرجى المحاولة مرة أخرى أو اختيار قسم آخر</p>
              <button
                type="button"
                class="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors"
                (click)="reloadProducts()"
              >
                إعادة المحاولة
              </button>
            </div>
          } @else if (products().length === 0) {
            <!-- Empty State -->
            <div class="rounded-3xl border border-dashed border-[#E8D5BE] bg-white p-12 text-center dark:border-neutral-800 dark:bg-neutral-900">
              <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#F8EEE2] text-[#C27938] dark:bg-neutral-800">
                <i class="pi pi-search text-2xl"></i>
              </div>
              <h3 class="mt-4 text-base font-bold text-[#181A1D] dark:text-white">لم يتم العثور على منتجات مطابقة</h3>
              <p class="mt-1 text-xs text-[#8A735C] dark:text-neutral-400">
                @if (productSearchQuery()) {
                  لا توجد منتجات تطابق كلمة البحث "{{ productSearchQuery() }}" في هذا القسم.
                } @else {
                  لا توجد منتجات مسعرة حالياً في هذا القسم.
                }
              </p>
              @if (productSearchQuery()) {
                <button
                  type="button"
                  class="mt-4 rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-4 py-2 text-xs font-bold text-[#181A1D] hover:bg-[#F8EEE2] transition-colors"
                  (click)="clearSearch()"
                >
                  مسح البحث
                </button>
              }
            </div>
          } @else {
            
            <!-- GRID VIEW -->
            @if (viewMode() === 'grid') {
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                @for (family of products(); track family.familyKey) {
                  <article
                    class="group relative flex flex-col overflow-hidden rounded-3xl border border-[#E8D5BE]/80 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-[#C27938]/60 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <!-- Product Image & Badges -->
                    <div class="relative aspect-[4/3] w-full overflow-hidden bg-[#FBF8F4] dark:bg-neutral-950/80 p-4 flex items-center justify-center">
                      @if (cardImage(family); as img) {
                        <img
                          [src]="img"
                          [alt]="familyTitle(family)"
                          class="size-full object-contain transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      } @else {
                        <div class="flex size-full items-center justify-center text-[#C27938]/40">
                          <i class="pi pi-image text-3xl"></i>
                        </div>
                      }

                      <!-- Savings Badge -->
                      @if (cardSavings(family); as savings) {
                        <span class="absolute start-3 top-3 rounded-xl bg-rose-600 px-2.5 py-1 text-[11px] font-black text-white shadow-xs">
                          -{{ savings | number: '1.0-0' }}% وفر
                        </span>
                      }

                      <!-- Match Status Badge -->
                      @if (isConfirmedFamily(family)) {
                        <span class="absolute end-3 top-3 flex items-center gap-1 rounded-xl bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                          <i class="pi pi-check text-[9px]"></i>
                          تطابق مؤكد
                        </span>
                      }
                    </div>

                    <!-- Card Body -->
                    <div class="flex flex-1 flex-col p-4 space-y-2.5">
                      
                      <!-- Brand & Dosage Form -->
                      <div class="flex items-center justify-between gap-2">
                        <span class="truncate text-[11px] font-extrabold uppercase tracking-wide text-[#C27938]">
                          {{ family.brand || 'منتج صيدلاني' }}
                        </span>
                        @if (family.dosageForm) {
                          <span class="shrink-0 rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-neutral-800 dark:text-neutral-300">
                            {{ family.dosageForm }}
                          </span>
                        }
                      </div>

                      <!-- Product Title -->
                      <a
                        [routerLink]="['/products/detail']"
                        [queryParams]="{ key: family.familyKey }"
                        class="line-clamp-2 text-xs font-bold leading-snug text-[#181A1D] hover:text-[#C27938] transition-colors dark:text-white cursor-pointer"
                        [title]="familyTitle(family)"
                      >
                        {{ familyTitle(family) }}
                      </a>

                      <!-- Strength / Size details if present -->
                      @if (family.strength) {
                        <div class="text-[11px] font-medium text-[#8A735C] dark:text-neutral-400">
                          {{ family.strength }}
                        </div>
                      }

                      <!-- Price & Availability Section -->
                      <div class="mt-auto pt-3 border-t border-[#EDE0D0]/80 dark:border-neutral-800 flex items-end justify-between">
                        <div>
                          <span class="text-[10px] font-semibold text-[#8A735C] dark:text-neutral-400 block">
                            أقل سعر متوفر
                          </span>
                          <span class="text-base font-black text-[#181A1D] dark:text-white tabular-nums">
                            {{ cardPrice(family) | currency: 'SAR':'symbol':'1.2-2' }}
                          </span>
                        </div>

                        <!-- Pharmacy Count Pill -->
                        <div class="text-end">
                          <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <span class="size-1.5 rounded-full bg-emerald-500"></span>
                            {{ cardPharmacyCount(family) }} صيدليات
                          </span>
                        </div>
                      </div>

                      <!-- Action: Compare Prices -->
                      <a
                        [routerLink]="['/products/detail']"
                        [queryParams]="{ key: family.familyKey }"
                        class="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-[#181A1D] py-2 text-xs font-bold text-white transition-colors hover:bg-[#C27938] dark:bg-white dark:text-black dark:hover:bg-[#C27938] dark:hover:text-white"
                      >
                        <i class="pi pi-sliders-h text-xs"></i>
                        <span>مقارنة الأسعار</span>
                      </a>
                    </div>
                  </article>
                }
              </div>
            }

            <!-- LIST VIEW -->
            @if (viewMode() === 'list') {
              <div class="space-y-3">
                @for (family of products(); track family.familyKey) {
                  <article
                    class="group flex flex-col sm:flex-row items-center gap-4 rounded-3xl border border-[#E8D5BE]/80 bg-white p-3.5 shadow-xs transition-all duration-200 hover:border-[#C27938]/60 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <!-- Product Thumbnail -->
                    <div class="relative size-24 shrink-0 rounded-2xl bg-[#FBF8F4] dark:bg-neutral-950 p-2 flex items-center justify-center">
                      @if (cardImage(family); as img) {
                        <img [src]="img" [alt]="familyTitle(family)" class="size-full object-contain" loading="lazy" />
                      } @else {
                        <i class="pi pi-image text-2xl text-[#C27938]/40"></i>
                      }
                      @if (cardSavings(family); as savings) {
                        <span class="absolute -start-1.5 -top-1.5 rounded-lg bg-rose-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                          -{{ savings | number: '1.0-0' }}%
                        </span>
                      }
                    </div>

                    <!-- Product Info -->
                    <div class="flex-1 min-w-0 space-y-1 text-center sm:text-start">
                      <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <span class="text-[11px] font-extrabold uppercase text-[#C27938]">
                          {{ family.brand || 'منتج صيدلاني' }}
                        </span>
                        @if (family.dosageForm) {
                          <span class="rounded-md bg-slate-100 px-2 py-0.2 text-[10px] font-medium text-slate-600 dark:bg-neutral-800 dark:text-neutral-300">
                            {{ family.dosageForm }}
                          </span>
                        }
                      </div>

                      <a
                        [routerLink]="['/products/detail']"
                        [queryParams]="{ key: family.familyKey }"
                        class="text-sm font-bold text-[#181A1D] hover:text-[#C27938] transition-colors dark:text-white truncate block cursor-pointer"
                        [title]="familyTitle(family)"
                      >
                        {{ familyTitle(family) }}
                      </a>

                      <div class="text-[11px] text-[#8A735C] dark:text-neutral-400">
                        {{ family.strength || 'معياري' }}
                      </div>
                    </div>

                    <!-- Price & Pharmacy Stats -->
                    <div class="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0 pe-2">
                      <div class="text-start sm:text-end">
                        <span class="text-[10px] font-semibold text-[#8A735C] block">أقل سعر</span>
                        <span class="text-base font-black text-[#181A1D] dark:text-white tabular-nums">
                          {{ cardPrice(family) | currency: 'SAR':'symbol':'1.2-2' }}
                        </span>
                      </div>
                      <span class="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {{ cardPharmacyCount(family) }} صيدليات
                      </span>
                    </div>

                    <!-- Action Button -->
                    <a
                      [routerLink]="['/products/detail']"
                      [queryParams]="{ key: family.familyKey }"
                      class="shrink-0 flex items-center justify-center gap-2 rounded-2xl bg-[#181A1D] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#C27938] transition-colors dark:bg-white dark:text-black dark:hover:bg-[#C27938] dark:hover:text-white"
                    >
                      <span>مقارنة الأسعار</span>
                      <i class="pi pi-arrow-left text-xs" *ngIf="locale.isRtl()"></i>
                      <i class="pi pi-arrow-right text-xs" *ngIf="!locale.isRtl()"></i>
                    </a>
                  </article>
                }
              </div>
            }

            <!-- Load More Pagination -->
            @if (hasMore()) {
              <div class="flex flex-col items-center justify-center gap-2 pt-6">
                <button
                  type="button"
                  class="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#181A1D] px-8 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#C27938] hover:shadow-md transition-all disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-[#C27938] dark:hover:text-white"
                  [disabled]="productsLoading()"
                  (click)="loadMore()"
                >
                  @if (productsLoading()) {
                    <i class="pi pi-spin pi-spinner text-xs"></i>
                    <span>جاري التحميل...</span>
                  } @else {
                    <i class="pi pi-refresh text-xs"></i>
                    <span>تحميل المزيد من المنتجات</span>
                  }
                </button>

                <span class="text-[11px] font-semibold text-[#8A735C] dark:text-neutral-400 tabular-nums">
                  عرض {{ products().length | number }} من أصل {{ total() | number }} منتج
                </span>
              </div>
            }
          }
        </main>
      </div>

      <!-- ==================== MOBILE CATEGORIES DRAWER (Off-canvas) ==================== -->
      @if (mobileSidebarOpen()) {
        <div class="fixed inset-0 z-50 flex lg:hidden">
          <!-- Backdrop -->
          <div
            class="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn"
            (click)="mobileSidebarOpen.set(false)"
          ></div>

          <!-- Drawer Content -->
          <div
            class="relative z-10 flex w-full max-w-xs flex-col bg-white shadow-2xl dark:bg-neutral-900 animate-slideInEnd"
            [class.ms-auto]="!locale.isRtl()"
            [class.me-auto]="locale.isRtl()"
          >
            <!-- Drawer Header -->
            <div class="flex items-center justify-between border-b border-[#EDE0D0] p-4 dark:border-neutral-800">
              <div class="flex items-center gap-2 font-black text-[#181A1D] dark:text-white">
                <i class="pi pi-sitemap text-[#C27938]"></i>
                <span>الأقسام الرئيسية</span>
              </div>
              <button
                type="button"
                class="rounded-xl p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                (click)="mobileSidebarOpen.set(false)"
              >
                <i class="pi pi-times text-sm"></i>
              </button>
            </div>

            <!-- Drawer Body -->
            <div class="flex-1 overflow-y-auto p-3 space-y-1 divide-y divide-[#EDE0D0]/40 dark:divide-neutral-800/40">
              @for (root of roots(); track root.id) {
                <div class="pt-1 first:pt-0">
                  <div
                    class="flex items-center justify-between rounded-xl p-2.5 cursor-pointer"
                    [class.bg-[#F8EEE2]]="selectedPrimarySlug() === root.slug"
                    [class.dark:bg-neutral-800]="selectedPrimarySlug() === root.slug"
                    (click)="onSelectRoot(root); mobileSidebarOpen.set(false)"
                  >
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div class="flex size-8 shrink-0 items-center justify-center rounded-lg" [ngClass]="getVisual(root.slug).gradient">
                        <i [class]="getVisual(root.slug).icon" class="text-xs"></i>
                      </div>
                      <span class="truncate text-xs font-bold text-[#181A1D] dark:text-white">
                        {{ locale.isRtl() ? root.name : (root.nameEn || root.name) }}
                      </span>
                    </div>
                    <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-neutral-800 dark:text-neutral-300">
                      {{ root.productCount | number }}
                    </span>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

    </section>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideInEnd {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.2s ease-out forwards;
    }
    .animate-slideInEnd {
      animation: slideInEnd 0.25s ease-out forwards;
    }
    .scrollbar-none::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-none {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `]
})
export class CategoriesComponent implements OnInit, OnDestroy {
  private readonly catalog = inject(CatalogBrowseRepository);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly locale = inject(LocaleService);

  // Categories Tree State
  readonly roots = signal<CategoryNode[]>([]);
  readonly categoriesLoading = signal<boolean>(false);
  readonly categoriesError = signal<boolean>(false);
  readonly categoryFilterQuery = signal<string>('');
  readonly expandedSlugs = signal<Set<string>>(new Set<string>());

  // Selected Category State
  readonly selectedPrimarySlug = signal<string>('');
  readonly selectedSubSlug = signal<string>('');

  // Products State
  readonly products = signal<CatalogFamily[]>([]);
  readonly productsLoading = signal<boolean>(false);
  readonly productsError = signal<boolean>(false);
  readonly page = signal<number>(1);
  readonly pageSize = signal<number>(24);
  readonly total = signal<number>(0);
  readonly productSearchQuery = signal<string>('');
  readonly selectedSort = signal<CatalogFamilySort>('nameAsc');
  readonly viewMode = signal<'grid' | 'list'>('grid');
  readonly mobileSidebarOpen = signal<boolean>(false);

  private readonly searchSubject = new Subject<string>();
  private searchSub?: Subscription;
  private routeSub?: Subscription;

  // Computed Values
  readonly activeSlug = computed(() => this.selectedSubSlug() || this.selectedPrimarySlug());

  readonly filteredRoots = computed(() => {
    const q = this.categoryFilterQuery().trim().toLowerCase();
    if (!q) return this.roots();
    return filterCategoryTree(this.roots(), q);
  });

  readonly currentPrimaryNode = computed(() => {
    const slug = this.selectedPrimarySlug();
    if (!slug) return this.roots()[0] ?? null;
    return this.roots().find((r) => r.slug === slug) ?? this.roots()[0] ?? null;
  });

  readonly currentSubNode = computed(() => {
    const primary = this.currentPrimaryNode();
    const subSlug = this.selectedSubSlug();
    if (!primary || !subSlug || !primary.children) return null;
    return primary.children.find((c) => c.slug === subSlug) ?? null;
  });

  readonly activeCategoryTitle = computed(() => {
    const sub = this.currentSubNode();
    if (sub) return this.locale.isRtl() ? sub.name : (sub.nameEn || sub.name);
    const prim = this.currentPrimaryNode();
    if (prim) return this.locale.isRtl() ? prim.name : (prim.nameEn || prim.name);
    return this.locale.isRtl() ? 'كل الأقسام' : 'All Categories';
  });

  readonly hasMore = computed(() => this.products().length < this.total());

  ngOnInit(): void {
    // Setup debounced product search
    this.searchSub = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((query) => {
        this.productSearchQuery.set(query);
        this.resetAndFetchProducts();
      });

    // Load Categories Tree first
    this.loadCategoryTree();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  getVisual(slug: string): CategoryVisual {
    return CATEGORY_VISUALS[slug] || DEFAULT_VISUAL;
  }

  isExpanded(slug: string): boolean {
    return this.expandedSlugs().has(slug);
  }

  toggleAccordion(slug: string, event: MouseEvent): void {
    event.stopPropagation();
    this.expandedSlugs.update((current) => {
      const next = new Set(current);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  onSelectRoot(root: CategoryNode): void {
    this.selectedPrimarySlug.set(root.slug);
    this.selectedSubSlug.set('');
    this.expandedSlugs.update((current) => new Set(current).add(root.slug));
    this.updateUrl();
    this.resetAndFetchProducts();
  }

  onSelectAllInRoot(root: CategoryNode): void {
    this.selectedPrimarySlug.set(root.slug);
    this.selectedSubSlug.set('');
    this.updateUrl();
    this.resetAndFetchProducts();
  }

  onSelectSub(root: CategoryNode, sub: CategoryNode): void {
    this.selectedPrimarySlug.set(root.slug);
    this.selectedSubSlug.set(sub.slug);
    this.expandedSlugs.update((current) => new Set(current).add(root.slug));
    this.updateUrl();
    this.resetAndFetchProducts();
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.productSearchQuery.set('');
    this.resetAndFetchProducts();
  }

  onSortChange(sort: CatalogFamilySort): void {
    this.selectedSort.set(sort);
    this.resetAndFetchProducts();
  }

  loadMore(): void {
    if (!this.hasMore() || this.productsLoading()) return;
    this.fetchProducts(this.page() + 1, true);
  }

  reloadProducts(): void {
    this.resetAndFetchProducts();
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

  private loadCategoryTree(): void {
    this.categoriesLoading.set(true);
    this.categoriesError.set(false);

    this.catalog
      .getCategoryTree()
      .pipe(finalize(() => this.categoriesLoading.set(false)))
      .subscribe({
        next: (nodes) => {
          this.roots.set(nodes);
          this.handleInitialRoute(nodes);
        },
        error: () => {
          this.catalog.getCategoryStructure().subscribe({
            next: (nodes) => {
              this.roots.set(nodes.filter((n) => !n.parentId));
              this.handleInitialRoute(nodes);
            },
            error: () => this.categoriesError.set(true)
          });
        }
      });
  }

  private handleInitialRoute(nodes: CategoryNode[]): void {
    this.routeSub = this.route.queryParams.subscribe((params) => {
      const catSlug = params['categorySlug'] || params['slug'] || (nodes[0]?.slug ?? 'medicines-treatments');
      const subSlug = params['subSlug'] || '';

      this.selectedPrimarySlug.set(catSlug);
      this.selectedSubSlug.set(subSlug);
      this.expandedSlugs.update((current) => new Set(current).add(catSlug));

      this.resetAndFetchProducts();
    });
  }

  private updateUrl(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        categorySlug: this.selectedPrimarySlug(),
        subSlug: this.selectedSubSlug() || null
      },
      queryParamsHandling: 'merge'
    });
  }

  private resetAndFetchProducts(): void {
    this.page.set(1);
    this.products.set([]);
    this.fetchProducts(1, false);
  }

  private fetchProducts(page: number, append: boolean): void {
    const slug = this.activeSlug();
    if (!slug) return;

    this.productsLoading.set(true);
    this.productsError.set(false);

    this.catalog
      .listFamilies({
        categorySlug: slug,
        query: this.productSearchQuery(),
        sort: this.selectedSort(),
        page,
        pageSize: this.pageSize()
      })
      .pipe(finalize(() => this.productsLoading.set(false)))
      .subscribe({
        next: (result) => {
          this.page.set(result.page);
          this.total.set(result.total);
          this.products.update((curr) => (append ? [...curr, ...result.data] : result.data));
        },
        error: () => {
          this.productsError.set(true);
          if (!append) this.products.set([]);
        }
      });
  }
}
