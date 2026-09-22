import { Component, computed, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MultiPharmacyDepthPoint } from '../../../core/domain/models/dashboard.model';

@Component({
  selector: 'app-overlap-depth-chart',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div class="relative w-full rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      <!-- Header -->
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-neutral-800">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-balance text-base font-black text-slate-900 dark:text-white">
              عمق تغطية وتنافس السوق
            </h3>
            <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-extrabold tabular-nums text-slate-700 dark:bg-neutral-800 dark:text-neutral-300">
              {{ totalMultiProducts() | number }} منتج متنافس
            </span>
          </div>
          <p class="text-pretty text-xs font-medium text-slate-500 dark:text-neutral-400">
            توزيع المنتجات المتطابقة بحسب عدد الصيدليات المتنافسة عليها في نفس الوقت
          </p>
        </div>

        <!-- 8-Pharmacy Golden Highlight Badge -->
        <div class="flex items-center">
          <span class="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-black tabular-nums text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <i class="pi pi-star-fill text-amber-500 text-[10px]" aria-hidden="true"></i>
            {{ fullCoverageCount() | number }} منتج متاح بجميع الـ 8 صيدليات
          </span>
        </div>
      </div>

      <!-- Clean Distribution Rows -->
      <div class="space-y-3 pt-3">
        @for (item of computedItems(); track item.pharmacyCount) {
          <div class="group rounded-xl p-2 transition-colors hover:bg-slate-50/70 dark:hover:bg-neutral-800/40">
            <div class="flex items-center justify-between gap-3 text-xs mb-1.5">
              <!-- Label (Right in RTL) -->
              <div class="flex items-center gap-2 min-w-0">
                <span
                  class="flex size-5 shrink-0 items-center justify-center rounded-md text-[11px] font-black tabular-nums"
                  [ngClass]="item.badgeClass"
                >
                  {{ item.pharmacyCount }}
                </span>
                <span class="font-bold text-slate-800 dark:text-neutral-200 truncate">
                  {{ item.label }}
                </span>
              </div>

              <!-- Product Count & Percent (Left in RTL) -->
              <div class="flex items-center gap-2 tabular-nums shrink-0">
                <span class="font-black text-slate-900 dark:text-white">
                  {{ item.masterProductCount | number }}
                </span>
                <span class="text-[11px] text-slate-400">منتج</span>
                <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-600 dark:bg-neutral-800 dark:text-neutral-300">
                  {{ item.percentage | number: '1.1-1' }}%
                </span>
              </div>
            </div>

            <!-- Slim Progress Track -->
            <div class="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
              <div
                class="absolute start-0 top-0 h-full rounded-full transition-all duration-300"
                [ngClass]="item.barColor"
                [style.width.%]="item.relativeWidth"
              ></div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class OverlapDepthChartComponent {
  readonly data = input<MultiPharmacyDepthPoint[]>([]);

  readonly totalMultiProducts = computed(() => {
    const list = this.data();
    return list.reduce((sum, item) => sum + item.masterProductCount, 0);
  });

  readonly fullCoverageCount = computed(() => {
    const item = this.data().find((p) => p.pharmacyCount === 8);
    return item?.masterProductCount ?? 0;
  });

  readonly computedItems = computed(() => {
    const list = this.data();
    if (list.length === 0) return [];

    const maxCount = Math.max(...list.map((p) => p.masterProductCount), 1);

    return list.map((item) => {
      const isFull = item.pharmacyCount === 8;
      const isHigh = item.pharmacyCount >= 5;

      const label =
        item.pharmacyCount === 2
          ? 'صيدليتان (تنافس ثنائي)'
          : item.pharmacyCount === 8
            ? '8 صيدليات (تغطية السوق بالكامل)'
            : `${item.pharmacyCount} صيدليات متنافسة`;

      const badgeClass = isFull
        ? 'bg-amber-500 text-white'
        : isHigh
          ? 'bg-emerald-500 text-white'
          : 'bg-slate-200 text-slate-700 dark:bg-neutral-700 dark:text-neutral-300';

      const barColor = isFull
        ? 'bg-amber-500'
        : isHigh
          ? 'bg-emerald-500'
          : 'bg-[#C27938]';

      const relativeWidth = Math.max(3, Math.min(100, (item.masterProductCount / maxCount) * 100));

      return {
        ...item,
        label,
        badgeClass,
        barColor,
        relativeWidth
      };
    });
  });
}
