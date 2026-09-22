import { Component, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MarketPriceSpreadMetrics } from '../../../core/domain/models/dashboard.model';

@Component({
  selector: 'app-market-spread-widget',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div class="relative overflow-hidden rounded-2xl border border-[#E8D5BE] bg-gradient-to-br from-white via-[#FBF8F4] to-[#F5ECE1] p-5 shadow-sm transition-all hover:shadow-md dark:border-neutral-800 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950">
      <div class="absolute -end-10 -bottom-10 size-40 rounded-full bg-emerald-500/10 blur-2xl"></div>

      <div class="relative space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <i class="pi pi-percentage text-base" aria-hidden="true"></i>
            </div>
            <div>
              <h3 class="text-sm font-black text-[#181A1D] dark:text-white">
                مؤشر وفر وتفاوت الأسعار في السوق
              </h3>
              <p class="text-[11px] font-medium text-[#8A735C] dark:text-neutral-400">
                فرق الأسعار بين أرخص وأغلى صيدلية لنفس المنتج
              </p>
            </div>
          </div>

          <span class="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            توفير حقيقي
          </span>
        </div>

        <!-- Metric Numbers Grid -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <!-- Average Difference -->
          <div class="rounded-xl border border-neutral-100 bg-white/80 p-3 shadow-2xs dark:border-neutral-800 dark:bg-neutral-800/60">
            <span class="text-[11px] font-bold text-[#8A735C] dark:text-neutral-400">متوسط الفرق للقطعة</span>
            <div class="flex items-baseline gap-1 pt-0.5">
              <span class="text-xl font-black text-emerald-700 dark:text-emerald-300">
                {{ (data()?.avgPriceDiff ?? 0) | number: '1.2-2' }}
              </span>
              <span class="text-[10px] font-bold text-[#8A735C]">ر.س</span>
            </div>
            <span class="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">وفر مباشر للمستهلك</span>
          </div>

          <!-- Compared Products -->
          <div class="rounded-xl border border-neutral-100 bg-white/80 p-3 shadow-2xs dark:border-neutral-800 dark:bg-neutral-800/60">
            <span class="text-[11px] font-bold text-[#8A735C] dark:text-neutral-400">منتجات خاضعة للمقارنة</span>
            <div class="flex items-baseline gap-1 pt-0.5">
              <span class="text-xl font-black text-[#181A1D] dark:text-white">
                {{ (data()?.comparedProductsCount ?? 0) | number }}
              </span>
              <span class="text-[10px] font-bold text-[#8A735C]">منتج</span>
            </div>
            <span class="text-[10px] font-medium text-[#8A735C]">في صيدليتين أو أكثر</span>
          </div>

          <!-- Market Spread % -->
          <div class="rounded-xl border border-neutral-100 bg-white/80 p-3 shadow-2xs dark:border-neutral-800 dark:bg-neutral-800/60">
            <span class="text-[11px] font-bold text-[#8A735C] dark:text-neutral-400">متوسط تشتت الأسعار</span>
            <div class="flex items-baseline gap-1 pt-0.5">
              <span class="text-xl font-black text-amber-600 dark:text-amber-400">
                {{ (data()?.avgSpreadPercent ?? 0) | number: '1.0-1' }}%
              </span>
            </div>
            <span class="text-[10px] font-medium text-amber-700/80 dark:text-amber-400/80">تفاوت تنافسي حاد</span>
          </div>

          <!-- Max Difference -->
          <div class="rounded-xl border border-neutral-100 bg-white/80 p-3 shadow-2xs dark:border-neutral-800 dark:bg-neutral-800/60">
            <span class="text-[11px] font-bold text-[#8A735C] dark:text-neutral-400">أكبر فرق مسجل</span>
            <div class="flex items-baseline gap-1 pt-0.5">
              <span class="text-xl font-black text-purple-700 dark:text-purple-300">
                {{ (data()?.maxPriceDiff ?? 0) | number: '1.0-0' }}
              </span>
              <span class="text-[10px] font-bold text-[#8A735C]">ر.س</span>
            </div>
            <span class="text-[10px] font-medium text-purple-600 dark:text-purple-400">أجهزة ومستحضرات عالية</span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class MarketSpreadWidgetComponent {
  readonly data = input<MarketPriceSpreadMetrics | undefined>(undefined);
}
