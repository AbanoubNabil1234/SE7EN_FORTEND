import { Component, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MarketPriceSpreadMetrics } from '../../../core/domain/models/dashboard.model';

@Component({
  selector: 'app-market-spread-widget',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div class="relative overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-xs transition-opacity duration-150 dark:border-neutral-800 dark:bg-[#14171C]">
      <div class="space-y-4">
        <!-- Header -->
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-2.5">
            <div class="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <i class="pi pi-percentage text-base" aria-hidden="true"></i>
            </div>
            <div>
              <h3 class="text-balance text-sm font-black text-[#181A1D] dark:text-white">
                مؤشر وفر وتفاوت الأسعار في السوق
              </h3>
              <p class="text-pretty text-xs font-medium text-[#8A735C] dark:text-neutral-400">
                فرق الأسعار بين أرخص وأغلى صيدلية لنفس المنتج في السوق السعودي
              </p>
            </div>
          </div>

          <span class="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            توفير وتنافس حقيقي
          </span>
        </div>

        <!-- Metric Numbers Grid -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <!-- Average Difference -->
          <div class="rounded-xl border border-neutral-100 bg-[#FBF8F4] p-3.5 dark:border-neutral-800 dark:bg-neutral-800/40">
            <span class="text-[11px] font-bold text-[#8A735C] dark:text-neutral-400">متوسط الفرق للقطعة</span>
            <div class="flex items-baseline gap-1 pt-1">
              <span class="text-2xl font-black tabular-nums text-emerald-700 dark:text-emerald-300">
                {{ (data()?.avgPriceDiff ?? 0) | number: '1.2-2' }}
              </span>
              <span class="text-[10px] font-bold text-[#8A735C]">ر.س</span>
            </div>
            <span class="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">وفر مباشر للمستهلك</span>
          </div>

          <!-- Compared Products -->
          <div class="rounded-xl border border-neutral-100 bg-[#FBF8F4] p-3.5 dark:border-neutral-800 dark:bg-neutral-800/40">
            <span class="text-[11px] font-bold text-[#8A735C] dark:text-neutral-400">منتجات خاضعة للمقارنة</span>
            <div class="flex items-baseline gap-1 pt-1">
              <span class="text-2xl font-black tabular-nums text-[#181A1D] dark:text-white">
                {{ (data()?.comparedProductsCount ?? 0) | number }}
              </span>
              <span class="text-[10px] font-bold text-[#8A735C]">منتج</span>
            </div>
            <span class="text-[10px] font-medium text-[#8A735C]">في صيدليتين أو أكثر</span>
          </div>

          <!-- Market Spread % -->
          <div class="rounded-xl border border-neutral-100 bg-[#FBF8F4] p-3.5 dark:border-neutral-800 dark:bg-neutral-800/40">
            <span class="text-[11px] font-bold text-[#8A735C] dark:text-neutral-400">متوسط تشتت الأسعار</span>
            <div class="flex items-baseline gap-1 pt-1">
              <span class="text-2xl font-black tabular-nums text-amber-700 dark:text-amber-400">
                {{ (data()?.avgSpreadPercent ?? 0) | number: '1.0-1' }}%
              </span>
            </div>
            <span class="text-[10px] font-medium text-amber-700/90 dark:text-amber-400/90">تفاوت تنافسي حاد</span>
          </div>

          <!-- Max Difference -->
          <div class="rounded-xl border border-neutral-100 bg-[#FBF8F4] p-3.5 dark:border-neutral-800 dark:bg-neutral-800/40">
            <span class="text-[11px] font-bold text-[#8A735C] dark:text-neutral-400">أكبر فرق مسجل</span>
            <div class="flex items-baseline gap-1 pt-1">
              <span class="text-2xl font-black tabular-nums text-[#181A1D] dark:text-white">
                {{ (data()?.maxPriceDiff ?? 0) | number: '1.0-0' }}
              </span>
              <span class="text-[10px] font-bold text-[#8A735C]">ر.س</span>
            </div>
            <span class="text-[10px] font-medium text-[#8A735C]">أجهزة ومستحضرات عالية</span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class MarketSpreadWidgetComponent {
  readonly data = input<MarketPriceSpreadMetrics | undefined>(undefined);
}
