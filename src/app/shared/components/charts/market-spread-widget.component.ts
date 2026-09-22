import { Component, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MarketPriceSpreadMetrics } from '../../../core/domain/models/dashboard.model';

@Component({
  selector: 'app-market-spread-widget',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  host: {
    class: 'block w-full'
  },
  template: `
    <div class="relative w-full rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-5">
      <!-- Header -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-slate-100 dark:border-neutral-800">
        <div class="flex items-center gap-3">
          <div class="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <i class="pi pi-bolt text-sm" aria-hidden="true"></i>
          </div>
          <div>
            <h3 class="text-balance text-base font-black text-slate-900 dark:text-white">
              مؤشر وفر وتفاوت الأسعار التنافسي
            </h3>
            <p class="text-pretty text-xs font-medium text-slate-500 dark:text-neutral-400">
              تحليل الفروقات السعرية بين أرخص وأغلى صيدلية لنفس المنتجات المطابقة
            </p>
          </div>
        </div>

        <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 self-start sm:self-auto">
          <span class="size-1.5 rounded-full bg-emerald-500"></span>
          وفر ملموس للمستهلك
        </span>
      </div>

      <!-- Unified 4-Metric Grid with Subtle Dividers -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-100 dark:divide-neutral-800">
        <!-- Metric 1: Average Savings per unit -->
        <div class="pt-3 md:pt-0 md:px-4 space-y-1.5">
          <span class="text-xs font-bold text-slate-500 dark:text-neutral-400">متوسط وفر القطعة</span>
          <div class="flex items-baseline gap-1">
            <span class="text-2xl lg:text-3xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
              {{ (data()?.avgPriceDiff ?? 0) | number: '1.2-2' }}
            </span>
            <span class="text-xs font-bold text-slate-400">ر.س</span>
          </div>
          <div class="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            فارق بين أرخص وأغلى صيدلية
          </div>
        </div>

        <!-- Metric 2: Compared Products -->
        <div class="pt-3 md:pt-0 md:px-4 space-y-1.5">
          <span class="text-xs font-bold text-slate-500 dark:text-neutral-400">منتجات خاضعة للمقارنة</span>
          <div class="flex items-baseline gap-1">
            <span class="text-2xl lg:text-3xl font-black tabular-nums text-slate-900 dark:text-white">
              {{ (data()?.comparedProductsCount ?? 0) | number }}
            </span>
            <span class="text-xs font-bold text-slate-400">منتج</span>
          </div>
          <div class="text-xs font-medium text-slate-400">
            متوفر في صيدليتين فأكثر
          </div>
        </div>

        <!-- Metric 3: Average Spread % -->
        <div class="pt-3 md:pt-0 md:px-4 space-y-1.5">
          <span class="text-xs font-bold text-slate-500 dark:text-neutral-400">متوسط تشتت الأسعار</span>
          <div class="flex items-baseline gap-1">
            <span class="text-2xl lg:text-3xl font-black tabular-nums text-amber-600 dark:text-amber-400">
              {{ (data()?.avgSpreadPercent ?? 0) | number: '1.0-1' }}%
            </span>
          </div>
          <div class="text-xs font-medium text-amber-700/80 dark:text-amber-400/80">
            تفاوت أسعار بين المنافسين
          </div>
        </div>

        <!-- Metric 4: Max Price Gap -->
        <div class="pt-3 md:pt-0 md:px-4 space-y-1.5">
          <span class="text-xs font-bold text-slate-500 dark:text-neutral-400">أعلى فرق سعري مسجل</span>
          <div class="flex items-baseline gap-1">
            <span class="text-2xl lg:text-3xl font-black tabular-nums text-slate-900 dark:text-white">
              {{ (data()?.maxPriceDiff ?? 0) | number: '1.0-0' }}
            </span>
            <span class="text-xs font-bold text-slate-400">ر.س</span>
          </div>
          <div class="text-xs font-medium text-slate-400">
            في الأجهزة والمستحضرات الكبرى
          </div>
        </div>
      </div>
    </div>
  `
})
export class MarketSpreadWidgetComponent {
  readonly data = input<MarketPriceSpreadMetrics | undefined>(undefined);
}
