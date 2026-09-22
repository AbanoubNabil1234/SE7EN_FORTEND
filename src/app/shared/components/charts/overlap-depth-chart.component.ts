import { Component, computed, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MultiPharmacyDepthPoint } from '../../../core/domain/models/dashboard.model';

@Component({
  selector: 'app-overlap-depth-chart',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div class="relative w-full space-y-5 rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      <!-- Header -->
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-base font-black text-[#181A1D] dark:text-white">
              عمق تغطية السوق (تطابق من 2 إلى 8 صيدليات)
            </h3>
            <span class="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-black text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              {{ totalMultiProducts() | number }} منتج منافس
            </span>
          </div>
          <p class="text-xs font-medium text-[#8A735C] dark:text-neutral-400">
            توزيع المنتجات المشتركة بحسب عدد الصيدليات المتنافسة عليها في نفس الوقت
          </p>
        </div>

        <!-- Highlight Badge for 8 Pharmacies (Full Market) -->
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-3 py-1.5 text-xs font-black text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            <i class="pi pi-star-fill text-amber-500 text-[10px]" aria-hidden="true"></i>
            {{ fullCoverageCount() | number }} منتج متاح بكل الـ 8 صيدليات
          </span>
        </div>
      </div>

      <!-- Histogram Bars -->
      <div class="space-y-3 pt-1">
        @for (item of computedItems(); track item.pharmacyCount) {
          <div class="group space-y-1.5 rounded-xl border border-neutral-100 bg-[#FBF8F4] p-3 transition-all hover:border-[#E8D5BE] hover:shadow-xs dark:border-neutral-800/80 dark:bg-neutral-800/40">
            <div class="flex items-center justify-between gap-2 text-xs font-bold">
              <div class="flex items-center gap-2.5">
                <span
                  class="flex size-6 items-center justify-center rounded-lg text-xs font-black"
                  [ngClass]="item.badgeClass"
                >
                  {{ item.pharmacyCount }}
                </span>
                <span class="font-extrabold text-[#181A1D] dark:text-white">
                  {{ item.label }}
                </span>
              </div>

              <div class="flex items-center gap-3">
                <span class="text-xs font-black text-[#181A1D] dark:text-white">
                  {{ item.masterProductCount | number }}
                  <span class="text-[11px] font-medium text-[#8A735C] dark:text-neutral-400">منتج</span>
                </span>
                <span
                  class="min-w-12 text-end text-[11px] font-black"
                  [ngClass]="item.textClass"
                >
                  {{ item.percentage | number: '1.1-1' }}%
                </span>
              </div>
            </div>

            <!-- Bar Track -->
            <div class="relative h-2.5 w-full overflow-hidden rounded-full bg-neutral-200/80 dark:bg-neutral-700/60">
              <div
                class="absolute start-0 top-0 h-full rounded-full transition-all duration-700 group-hover:brightness-110"
                [ngClass]="item.barGradient"
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

    const colorConfigs: Record<
      number,
      { label: string; badgeClass: string; textClass: string; barGradient: string }
    > = {
      2: {
        label: 'متوفر في صيدليتين (مقارنة ثنائية)',
        badgeClass: 'bg-blue-500/10 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
        textClass: 'text-blue-600 dark:text-blue-400',
        barGradient: 'bg-gradient-to-r from-blue-500 to-cyan-500'
      },
      3: {
        label: 'متوفر في 3 صيدليات',
        badgeClass: 'bg-teal-500/10 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400',
        textClass: 'text-teal-600 dark:text-teal-400',
        barGradient: 'bg-gradient-to-r from-teal-500 to-emerald-500'
      },
      4: {
        label: 'متوفر في 4 صيدليات',
        badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
        textClass: 'text-emerald-600 dark:text-emerald-400',
        barGradient: 'bg-gradient-to-r from-emerald-500 to-green-500'
      },
      5: {
        label: 'متوفر في 5 صيدليات',
        badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400',
        textClass: 'text-indigo-600 dark:text-indigo-400',
        barGradient: 'bg-gradient-to-r from-indigo-500 to-purple-500'
      },
      6: {
        label: 'متوفر في 6 صيدليات (تغطية واسعة)',
        badgeClass: 'bg-purple-500/10 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400',
        textClass: 'text-purple-600 dark:text-purple-400',
        barGradient: 'bg-gradient-to-r from-purple-500 to-pink-500'
      },
      7: {
        label: 'متوفر في 7 صيدليات (شبه مكتمل)',
        badgeClass: 'bg-rose-500/10 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
        textClass: 'text-rose-600 dark:text-rose-400',
        barGradient: 'bg-gradient-to-r from-rose-500 to-amber-500'
      },
      8: {
        label: 'متوفر في جميع الـ 8 صيدليات (تغطية كاملة للسوق)',
        badgeClass: 'bg-amber-500 text-white shadow-sm shadow-amber-500/50',
        textClass: 'text-amber-600 dark:text-amber-400 font-black',
        barGradient: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600'
      }
    };

    return list.map((item) => {
      const config = colorConfigs[item.pharmacyCount] || {
        label: `متوفر في ${item.pharmacyCount} صيدليات`,
        badgeClass: 'bg-neutral-200 text-neutral-700',
        textClass: 'text-neutral-700',
        barGradient: 'bg-[#C27938]'
      };

      const relativeWidth = Math.max(4, Math.min(100, (item.masterProductCount / maxCount) * 100));

      return {
        ...item,
        ...config,
        relativeWidth
      };
    });
  });
}
