import { Component, computed, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { PharmacyOpsRow } from '../../../core/domain/models/dashboard.model';

@Component({
  selector: 'app-pharmacy-bar-chart',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div class="relative w-full space-y-4 rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-base font-black text-[#181A1D] dark:text-white">
              مقارنة الصيدليات ونسبة التطابق الحقيقي
            </h3>
            <span class="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-black text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              تطابق تنافسي (2+ صيدليات)
            </span>
          </div>
          <p class="text-xs font-medium text-[#8A735C] dark:text-neutral-400">
            النسبة الحقيقية للمنتجات التي لها مقارنة أسعار ومنافس فعلي في السوق مقابل إجمالي الكتالوج
          </p>
        </div>

        <!-- Legend Tags -->
        <div class="flex flex-wrap items-center gap-3 text-[11px] font-bold">
          <span class="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span class="size-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"></span>
            تطابق تنافسي
          </span>
          <span class="inline-flex items-center gap-1.5 text-[#C27938]">
            <span class="size-2.5 rounded-full bg-[#C27938]/40"></span>
            داخل الكتالوج
          </span>
          <span class="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <i class="pi pi-barcode text-[10px]" aria-hidden="true"></i>
            صحة الباركود
          </span>
        </div>
      </div>

      <div class="space-y-3 pt-1">
        @if (pharmacies().length === 0) {
          <div class="py-8 text-center text-sm font-medium text-[#8A735C]">
            لا توجد بيانات صيدليات متصلة
          </div>
        } @else {
          @for (pharmacy of computedItems(); track pharmacy.pharmacyId) {
            <div class="group space-y-2 rounded-xl border border-neutral-100 bg-[#FBF8F4] p-3.5 transition-all hover:border-[#E8D5BE] hover:shadow-sm dark:border-neutral-800/80 dark:bg-neutral-800/40">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span
                    class="size-2.5 rounded-full shrink-0"
                    [ngClass]="pharmacy.isEnabled ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-neutral-300 dark:bg-neutral-600'"
                    [title]="pharmacy.isEnabled ? 'صيدلية نشطة' : 'صيدلية معطلة'"
                  ></span>
                  <span class="truncate text-xs font-black text-[#181A1D] dark:text-white">
                    {{ pharmacy.name }}
                  </span>
                  <span class="rounded-md bg-neutral-200/80 px-1.5 py-0.5 text-[10px] font-bold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 uppercase">
                    {{ pharmacy.code }}
                  </span>
                </div>

                <!-- Metrics Indicators -->
                <div class="flex flex-wrap items-center gap-2.5 text-xs font-bold shrink-0">
                  <!-- Barcode Health Badge -->
                  <span
                    class="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold"
                    [ngClass]="
                      pharmacy.barcodeRate >= 90
                        ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                        : pharmacy.barcodeRate >= 70
                          ? 'bg-amber-500/10 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                          : 'bg-rose-500/10 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                    "
                    [title]="'نسبة توفر الباركود في هذه الصيدلية'"
                  >
                    <i class="pi pi-barcode text-[9px]" aria-hidden="true"></i>
                    {{ pharmacy.barcodeRate | number: '1.0-1' }}% باركود
                  </span>

                  <!-- In Catalog secondary count -->
                  <span class="text-[11px] text-[#8A735C] dark:text-neutral-400">
                    كتالوج: <strong class="text-[#181A1D] dark:text-neutral-200">{{ pharmacy.catalogTotal | number }}</strong>
                    <span class="text-[10px] text-[#8A735C]/80">({{ pharmacy.productCount | number }})</span>
                  </span>

                  <!-- True Cross-Match Rate Primary Pill -->
                  <span
                    class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black shadow-xs"
                    [ngClass]="
                      pharmacy.trueCrossMatchRate >= 60
                        ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-500/20'
                        : pharmacy.trueCrossMatchRate >= 30
                          ? 'bg-amber-500/15 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-500/20'
                          : 'bg-neutral-200/80 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-300/40'
                    "
                  >
                    <i class="pi pi-check text-[10px]" aria-hidden="true"></i>
                    {{ pharmacy.trueCrossMatchRate | number: '1.0-1' }}% مطابقة حقيقية
                    <span class="text-[10px] font-bold opacity-80">({{ pharmacy.crossMatchedTotal | number }})</span>
                  </span>
                </div>
              </div>

              <!-- Multi-Layer Visual Progress Track -->
              <div class="relative h-4 w-full overflow-hidden rounded-full bg-neutral-200/80 dark:bg-neutral-700/70">
                <!-- In-Catalog Base Bar -->
                <div
                  class="absolute start-0 top-0 h-full rounded-full bg-[#C27938]/30 transition-all duration-700 group-hover:bg-[#C27938]/40"
                  [style.width.%]="pharmacy.catalogWidth"
                  [title]="'منتجات مضافة للكتالوج: ' + (pharmacy.catalogTotal | number)"
                ></div>
                <!-- True Cross-Match Highlight Bar -->
                <div
                  class="absolute start-0 top-0 h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 shadow-sm transition-all duration-700 group-hover:brightness-105"
                  [style.width.%]="pharmacy.crossMatchWidth"
                  [title]="'منتجات لها منافس مسجل في صيدلية أخرى: ' + (pharmacy.crossMatchedTotal | number)"
                ></div>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `
})
export class PharmacyBarChartComponent {
  readonly pharmacies = input<PharmacyOpsRow[]>([]);

  readonly computedItems = computed(() => {
    const list = this.pharmacies();
    if (list.length === 0) return [];

    const maxTotal = Math.max(...list.map((p) => p.productCount), 1);

    return list.map((p) => {
      const crossMatchedTotal = p.crossMatchedCount ?? p.matchedCount ?? 0;
      const catalogTotal = p.inCatalogCount ?? p.matchedCount ?? 0;
      const totalProducts = p.productCount > 0 ? p.productCount : 1;

      const trueCrossMatchRate = p.crossMatchPercent ?? (crossMatchedTotal / totalProducts) * 100;
      const catalogRate = (catalogTotal / totalProducts) * 100;
      const barcodeRate = p.barcodePercent ?? 0;

      // Width scaled relative to the pharmacy's own total products
      const crossMatchWidth = Math.min(100, Math.max(0, (crossMatchedTotal / totalProducts) * 100));
      const catalogWidth = Math.min(100, Math.max(0, (catalogTotal / totalProducts) * 100));

      return {
        ...p,
        crossMatchedTotal,
        catalogTotal,
        trueCrossMatchRate,
        catalogRate,
        barcodeRate,
        crossMatchWidth,
        catalogWidth
      };
    });
  });
}

