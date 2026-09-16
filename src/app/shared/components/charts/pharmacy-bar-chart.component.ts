import { Component, computed, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { PharmacyOpsRow } from '../../../core/domain/models/dashboard.model';

@Component({
  selector: 'app-pharmacy-bar-chart',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div class="relative w-full space-y-4 rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-bold text-[#181A1D] dark:text-white">
            مقارنة الصيدليات المتصلة
          </h3>
          <p class="text-xs font-medium text-[#8A735C] dark:text-neutral-400">
            توزيع الكتالوج ونسب المطابقة حسب كل صيدلية
          </p>
        </div>
        <span class="rounded-full bg-[#F8EEE2] px-3 py-1 text-xs font-bold text-[#C27938] dark:bg-neutral-800">
          {{ pharmacies().length }} صيدليات
        </span>
      </div>

      <div class="space-y-3.5 pt-1">
        @if (pharmacies().length === 0) {
          <div class="py-8 text-center text-sm font-medium text-[#8A735C]">
            لا توجد بيانات صيدليات متصلة
          </div>
        } @else {
          @for (pharmacy of computedItems(); track pharmacy.pharmacyId) {
            <div class="space-y-1.5 rounded-xl border border-neutral-100 bg-[#FBF8F4] p-3 transition-colors hover:border-[#E8D5BE] dark:border-neutral-800/80 dark:bg-neutral-800/40">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span
                    class="size-2.5 rounded-full shrink-0"
                    [ngClass]="pharmacy.isEnabled ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-neutral-300 dark:bg-neutral-600'"
                  ></span>
                  <span class="truncate text-xs font-extrabold text-[#181A1D] dark:text-white">
                    {{ pharmacy.name }}
                  </span>
                  <span class="rounded-md bg-neutral-200/70 px-1.5 py-0.5 text-[10px] font-bold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 uppercase">
                    {{ pharmacy.code }}
                  </span>
                </div>

                <div class="flex items-center gap-3 text-xs font-bold shrink-0">
                  <span class="text-[#8A735C] dark:text-neutral-400">
                    <strong class="text-[#181A1D] dark:text-white">{{ pharmacy.productCount | number }}</strong> منتج
                  </span>
                  <span class="rounded-lg bg-[#C27938]/10 px-2 py-0.5 text-[11px] font-extrabold text-[#C27938]">
                    {{ pharmacy.matchRate | number: '1.0-1' }}% مطابقة
                  </span>
                </div>
              </div>

              <!-- Double Layered Bar -->
              <div class="relative h-3.5 w-full overflow-hidden rounded-full bg-neutral-200/80 dark:bg-neutral-700">
                <!-- Total Products Base Bar -->
                <div
                  class="absolute start-0 top-0 h-full rounded-full bg-[#C27938]/30 transition-all duration-700"
                  [style.width.%]="pharmacy.totalWidth"
                ></div>
                <!-- Matched Count Foreground Bar -->
                <div
                  class="absolute start-0 top-0 h-full rounded-full bg-gradient-to-r from-[#C27938] to-[#F59E0B] transition-all duration-700"
                  [style.width.%]="pharmacy.matchedWidth"
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

    const maxCount = Math.max(...list.map((p) => p.productCount), 1);

    return list.map((p) => {
      const matchRate = p.productCount > 0 ? (p.matchedCount / p.productCount) * 100 : 0;
      const totalWidth = (p.productCount / maxCount) * 100;
      const matchedWidth = (p.matchedCount / maxCount) * 100;

      return {
        ...p,
        matchRate,
        totalWidth,
        matchedWidth
      };
    });
  });
}
