import { Component, computed, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { PharmacyOpsRow } from '../../../core/domain/models/dashboard.model';

@Component({
  selector: 'app-pharmacy-bar-chart',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  host: {
    class: 'block w-full'
  },
  template: `
    <div class="relative w-full rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
      <!-- Header -->
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 dark:border-neutral-800">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-balance text-base font-black text-slate-900 dark:text-white">
              أداء ومطابقة الصيدليات
            </h3>
            <span class="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              الأرقام الحقيقية للكتالوج
            </span>
          </div>
          <p class="text-pretty text-xs font-medium text-slate-500 dark:text-neutral-400">
            إجمالي المنتجات المطابقة في الكتالوج، جودة الباركود، والمقارنة التنافسية
          </p>
        </div>

        <!-- Micro Legend -->
        <div class="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-neutral-400">
          <div class="flex items-center gap-1.5">
            <span class="size-2 rounded-full bg-emerald-500"></span>
            <span>مطابقة الكتالوج</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="size-2 rounded-full bg-amber-500"></span>
            <span>مقارنة تنافسية (2+)</span>
          </div>
        </div>
      </div>

      <!-- Pharmacy Table / Clean Rows -->
      <div class="divide-y divide-slate-100 dark:divide-neutral-800/80">
        @if (pharmacies().length === 0) {
          <div class="py-8 text-center text-sm font-medium text-slate-400">
            لا توجد بيانات صيدليات متصلة
          </div>
        } @else {
          @for (pharmacy of computedItems(); track pharmacy.pharmacyId) {
            <div class="py-3.5 px-2 transition-colors hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 rounded-xl">
              <div class="grid grid-cols-1 md:grid-cols-12 items-center gap-3">
                <!-- Col 1: Pharmacy Name & Scraped Count (4 cols) -->
                <div class="md:col-span-4 flex items-center gap-2.5 min-w-0">
                  <span
                    class="size-2.5 rounded-full shrink-0"
                    [ngClass]="pharmacy.isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-neutral-600'"
                    [title]="pharmacy.isEnabled ? 'نشطة ومفعلة' : 'معطلة'"
                  ></span>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="truncate text-xs font-black text-slate-900 dark:text-white">
                        {{ pharmacy.name }}
                      </span>
                      <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-slate-600 dark:bg-neutral-800 dark:text-neutral-400">
                        {{ pharmacy.code }}
                      </span>
                    </div>
                    <div class="text-[10px] text-slate-400 dark:text-neutral-400 tabular-nums">
                      {{ pharmacy.productCount | number }} منتج مسحوب
                    </div>
                  </div>
                </div>

                <!-- Col 2: Barcode Quality (2 cols) -->
                <div class="md:col-span-2 flex items-center md:justify-center">
                  <span
                    class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold tabular-nums"
                    [ngClass]="
                      pharmacy.barcodeRate >= 90
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : pharmacy.barcodeRate >= 70
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                    "
                    [title]="'جودة توفر الباركود'"
                  >
                    <i class="pi pi-barcode text-[9px]" aria-hidden="true"></i>
                    {{ pharmacy.barcodeRate | number: '1.0-1' }}%
                  </span>
                </div>

                <!-- Col 3: Real In-Catalog Match & Progress Bar (4 cols) -->
                <div class="md:col-span-4 space-y-1.5">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
                      {{ pharmacy.matchRate | number: '1.1-1' }}% مطابقة
                    </span>
                    <span class="text-[10px] font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                      {{ pharmacy.catalogTotal | number }} منتج
                    </span>
                  </div>

                  <!-- Real Matching Progress Bar -->
                  <div class="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
                    <div
                      class="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      [style.width.%]="pharmacy.matchWidth"
                    ></div>
                  </div>
                </div>

                <!-- Col 4: Competitive Multi-Pharmacy Comparison (2 cols) -->
                <div class="md:col-span-2 flex flex-col items-end justify-center text-right">
                  <span class="text-[10px] font-bold text-slate-700 dark:text-neutral-300 tabular-nums">
                    {{ pharmacy.crossMatchedTotal | number }} مقارنة
                  </span>
                  <span class="text-[9px] text-slate-400 font-medium tabular-nums">
                    ({{ pharmacy.crossMatchRate | number: '1.0-0' }}% تنافسي)
                  </span>
                </div>
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

    return list.map((p) => {
      const catalogTotal = p.inCatalogCount ?? p.matchedCount ?? 0;
      const crossMatchedTotal = p.crossMatchedCount ?? 0;
      const totalProducts = p.productCount > 0 ? p.productCount : 1;

      const matchRate = Math.min(100, Math.max(0, (catalogTotal / totalProducts) * 100));
      const crossMatchRate = Math.min(100, Math.max(0, (crossMatchedTotal / totalProducts) * 100));
      const barcodeRate = p.barcodePercent ?? 0;

      const matchWidth = matchRate;
      const crossMatchWidth = crossMatchRate;

      return {
        ...p,
        catalogTotal,
        crossMatchedTotal,
        matchRate,
        crossMatchRate,
        barcodeRate,
        matchWidth,
        crossMatchWidth
      };
    }).sort((a, b) => b.catalogTotal - a.catalogTotal);
  });
}
