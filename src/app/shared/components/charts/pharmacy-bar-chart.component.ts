import { Component, computed, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { PharmacyOpsRow } from '../../../core/domain/models/dashboard.model';

@Component({
  selector: 'app-pharmacy-bar-chart',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div class="relative w-full rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      <!-- Header -->
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-neutral-800">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-balance text-base font-black text-slate-900 dark:text-white">
              أداء ومطابقة الصيدليات التنافسية
            </h3>
            <span class="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              تطابق حقيقي (2+ صيدليات)
            </span>
          </div>
          <p class="text-pretty text-xs font-medium text-slate-500 dark:text-neutral-400">
            النسبة الدقيقة للمنتجات التي تمتلك منافساً مسجلاً في صيدلية أخرى
          </p>
        </div>

        <!-- Micro Legend -->
        <div class="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-neutral-400">
          <div class="flex items-center gap-1.5">
            <span class="size-2 rounded-full bg-emerald-500"></span>
            <span>تطابق منافس</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="size-2 rounded-full bg-slate-300 dark:bg-neutral-600"></span>
            <span>في الكتالوج</span>
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
            <div class="py-3 px-2 transition-colors hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 rounded-xl">
              <div class="grid grid-cols-1 md:grid-cols-12 items-center gap-3">
                <!-- Col 1: Pharmacy Name & Scraped Count (5 cols) -->
                <div class="md:col-span-5 flex items-center gap-2.5 min-w-0">
                  <span
                    class="size-2 rounded-full shrink-0"
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
                      {{ pharmacy.productCount | number }} مسحوب &bull; {{ pharmacy.catalogTotal | number }} بالكتالوج
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

                <!-- Col 3: True Cross Match & Slim Progress Meter (5 cols) -->
                <div class="md:col-span-5 space-y-1">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-[11px] font-extrabold text-slate-700 dark:text-neutral-300">
                      {{ pharmacy.trueCrossMatchRate | number: '1.1-1' }}% مطابقة
                    </span>
                    <span class="text-[10px] font-semibold text-slate-400 dark:text-neutral-400 tabular-nums">
                      {{ pharmacy.crossMatchedTotal | number }} منتج
                    </span>
                  </div>

                  <!-- Slim 4px Dual-Progress Bar -->
                  <div class="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
                    <div
                      class="absolute start-0 top-0 h-full rounded-full bg-slate-300 dark:bg-neutral-700"
                      [style.width.%]="pharmacy.catalogWidth"
                    ></div>
                    <div
                      class="absolute start-0 top-0 h-full rounded-full"
                      [ngClass]="
                        pharmacy.trueCrossMatchRate >= 60
                          ? 'bg-emerald-500'
                          : pharmacy.trueCrossMatchRate >= 30
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
                      "
                      [style.width.%]="pharmacy.crossMatchWidth"
                    ></div>
                  </div>
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
      const crossMatchedTotal = p.crossMatchedCount ?? p.matchedCount ?? 0;
      const catalogTotal = p.inCatalogCount ?? p.matchedCount ?? 0;
      const totalProducts = p.productCount > 0 ? p.productCount : 1;

      const trueCrossMatchRate = p.crossMatchPercent ?? (crossMatchedTotal / totalProducts) * 100;
      const catalogRate = (catalogTotal / totalProducts) * 100;
      const barcodeRate = p.barcodePercent ?? 0;

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
