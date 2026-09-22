import { Component, computed, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MultiPharmacyDepthPoint } from '../../../core/domain/models/dashboard.model';

@Component({
  selector: 'app-overlap-depth-chart',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div class="relative w-full space-y-4 rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-xs transition-opacity duration-150 dark:border-neutral-800 dark:bg-[#14171C]">
      <!-- Header -->
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-balance text-base font-black text-[#181A1D] dark:text-white">
              عمق تغطية السوق (تطابق من 2 إلى 8 صيدليات)
            </h3>
            <span class="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              {{ totalMultiProducts() | number }} منتج منافس
            </span>
          </div>
          <p class="text-pretty text-xs font-medium text-[#8A735C] dark:text-neutral-400">
            توزيع المنتجات المشتركة بحسب عدد الصيدليات المتنافسة عليها في نفس الوقت
          </p>
        </div>

        <!-- Highlight Badge for 8 Pharmacies (Full Market) -->
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-bold tabular-nums text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <i class="pi pi-star-fill text-amber-500 text-[9px]" aria-hidden="true"></i>
            {{ fullCoverageCount() | number }} منتج متاح بجميع الـ 8 صيدليات
          </span>
        </div>
      </div>

      <!-- Histogram Bars -->
      <div class="space-y-2.5 pt-1">
        @for (item of computedItems(); track item.pharmacyCount) {
          <div class="space-y-1.5 rounded-xl border border-neutral-100 bg-[#FBF8F4] p-3 transition-colors hover:border-[#E8D5BE] dark:border-neutral-800/80 dark:bg-neutral-800/40">
            <div class="flex items-center justify-between gap-2 text-xs font-bold">
              <div class="flex items-center gap-2">
                <span
                  class="flex size-5 items-center justify-center rounded text-[11px] font-black tabular-nums"
                  [ngClass]="item.badgeClass"
                >
                  {{ item.pharmacyCount }}
                </span>
                <span class="font-extrabold text-[#181A1D] dark:text-white">
                  {{ item.label }}
                </span>
              </div>

              <div class="flex items-center gap-3 tabular-nums">
                <span class="text-xs font-black text-[#181A1D] dark:text-white">
                  {{ item.masterProductCount | number }}
                  <span class="text-[11px] font-medium text-[#8A735C] dark:text-neutral-400">منتج</span>
                </span>
                <span class="min-w-10 text-end text-[11px] font-bold text-[#8A735C] dark:text-neutral-300">
                  {{ item.percentage | number: '1.1-1' }}%
                </span>
              </div>
            </div>

            <!-- Bar Track -->
            <div class="relative h-2 w-full overflow-hidden rounded-full bg-neutral-200/80 dark:bg-neutral-700/60">
              <div
                class="absolute start-0 top-0 h-full rounded-full"
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
          ? 'متوفر في صيدليتين (مقارنة ثنائية)'
          : item.pharmacyCount === 8
            ? 'متوفر في جميع الـ 8 صيدليات (تغطية كاملة)'
            : `متوفر في ${item.pharmacyCount} صيدليات`;

      const badgeClass = isFull
        ? 'bg-amber-500 text-white'
        : isHigh
          ? 'bg-emerald-500/15 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
          : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300';

      const barColor = isFull
        ? 'bg-amber-500'
        : isHigh
          ? 'bg-emerald-600 dark:bg-emerald-500'
          : 'bg-[#C27938]/80';

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
