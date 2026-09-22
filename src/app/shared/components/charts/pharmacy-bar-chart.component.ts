import { Component, computed, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { PharmacyOpsRow } from '../../../core/domain/models/dashboard.model';

@Component({
  selector: 'app-pharmacy-bar-chart',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div class="relative w-full space-y-4 rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-xs transition-opacity duration-150 dark:border-neutral-800 dark:bg-[#14171C]">
      <!-- Header -->
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-balance text-base font-black text-[#181A1D] dark:text-white">
              مقارنة الصيدليات ونسبة التطابق الحقيقي
            </h3>
            <span class="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              تطابق تنافسي (2+ صيدليات)
            </span>
          </div>
          <p class="text-pretty text-xs font-medium text-[#8A735C] dark:text-neutral-400">
            النسبة الحقيقية للمنتجات التي لها منافس مسجل في صيدلية أخرى مقارنة بإجمالي المنتجات
          </p>
        </div>

        <!-- Legend -->
        <div class="flex flex-wrap items-center gap-3 text-[11px] font-semibold">
          <span class="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
            <span class="size-2 rounded-full bg-emerald-600"></span>
            تطابق تنافسي
          </span>
          <span class="inline-flex items-center gap-1.5 text-[#C27938]">
            <span class="size-2 rounded-full bg-[#C27938]/40"></span>
            داخل الكتالوج
          </span>
          <span class="inline-flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
            <i class="pi pi-barcode text-[10px]" aria-hidden="true"></i>
            صحة الباركود
          </span>
        </div>
      </div>

      <!-- Pharmacy Rows List -->
      <div class="space-y-2.5 pt-1">
        @if (pharmacies().length === 0) {
          <div class="py-8 text-center text-sm font-medium text-[#8A735C]">
            لا توجد بيانات صيدليات متصلة
          </div>
        } @else {
          @for (pharmacy of computedItems(); track pharmacy.pharmacyId) {
            <div class="space-y-2 rounded-xl border border-neutral-100 bg-[#FBF8F4] p-3 transition-colors hover:border-[#E8D5BE] dark:border-neutral-800/80 dark:bg-neutral-800/40">
              <!-- Pharmacy Info & Stat Pills -->
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span
                    class="size-2 rounded-full shrink-0"
                    [ngClass]="pharmacy.isEnabled ? 'bg-emerald-500' : 'bg-neutral-400 dark:bg-neutral-600'"
                    [title]="pharmacy.isEnabled ? 'نشطة ومفعلة' : 'معطلة'"
                  ></span>
                  <span class="truncate text-xs font-black text-[#181A1D] dark:text-white">
                    {{ pharmacy.name }}
                  </span>
                  <span class="rounded bg-neutral-200/80 px-1.5 py-0.5 text-[10px] font-bold uppercase text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                    {{ pharmacy.code }}
                  </span>
                </div>

                <div class="flex flex-wrap items-center gap-2 text-xs font-bold shrink-0">
                  <!-- Barcode Score -->
                  <span
                    class="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold tabular-nums"
                    [ngClass]="
                      pharmacy.barcodeRate >= 90
                        ? 'bg-neutral-200/80 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200'
                        : pharmacy.barcodeRate >= 70
                          ? 'bg-amber-500/10 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                          : 'bg-rose-500/10 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                    "
                    [title]="'نسبة توفر الباركود'"
                  >
                    <i class="pi pi-barcode text-[9px]" aria-hidden="true"></i>
                    {{ pharmacy.barcodeRate | number: '1.0-1' }}%
                  </span>

                  <!-- In Catalog count -->
                  <span class="text-[11px] font-medium text-[#8A735C] dark:text-neutral-400">
                    كتالوج: <strong class="tabular-nums font-bold text-[#181A1D] dark:text-neutral-200">{{ pharmacy.catalogTotal | number }}</strong>
                    <span class="text-[10px] tabular-nums"> / {{ pharmacy.productCount | number }}</span>
                  </span>

                  <!-- True Cross-Match Rate Primary Pill -->
                  <span
                    class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-black tabular-nums"
                    [ngClass]="
                      pharmacy.trueCrossMatchRate >= 60
                        ? 'bg-emerald-500/15 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                        : pharmacy.trueCrossMatchRate >= 30
                          ? 'bg-amber-500/15 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                          : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                    "
                  >
                    <i class="pi pi-check text-[9px]" aria-hidden="true"></i>
                    {{ pharmacy.trueCrossMatchRate | number: '1.0-1' }}%
                    <span class="text-[10px] font-semibold opacity-80">({{ pharmacy.crossMatchedTotal | number }})</span>
                  </span>
                </div>
              </div>

              <!-- Dual-Layer Progress Track -->
              <div class="relative h-2.5 w-full overflow-hidden rounded-full bg-neutral-200/80 dark:bg-neutral-700/60">
                <!-- In-Catalog Base Track -->
                <div
                  class="absolute start-0 top-0 h-full rounded-full bg-[#C27938]/30"
                  [style.width.%]="pharmacy.catalogWidth"
                ></div>
                <!-- True Cross-Match Solid Fill -->
                <div
                  class="absolute start-0 top-0 h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
                  [style.width.%]="pharmacy.crossMatchWidth"
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
