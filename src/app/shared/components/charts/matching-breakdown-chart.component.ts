import { Component, computed, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatchingModelBreakdown } from '../../../core/domain/models/dashboard.model';

@Component({
  selector: 'app-matching-breakdown-chart',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterModule],
  host: {
    class: 'block w-full'
  },
  template: `
    <div class="relative w-full rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-6">
      <!-- Header -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 dark:border-neutral-800">
        <div class="space-y-1">
          <div class="flex items-center gap-2.5">
            <h3 class="text-balance text-base font-black text-slate-900 dark:text-white">
              محرك المطابقة والذكاء الاصطناعي
            </h3>
            <span class="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              {{ confirmedTotal() | number }} تطابق معتمد
            </span>
          </div>
          <p class="text-pretty text-xs font-medium text-slate-500 dark:text-neutral-400">
            توزيع أساليب الربط بين الباركود الدولي الصريح وخوارزميات الذكاء الاصطناعي
          </p>
        </div>

        <a
          routerLink="/matches"
          class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 self-start sm:self-auto"
        >
          <i class="pi pi-check-square text-xs" aria-hidden="true"></i>
          <span>فتح طابور المراجعة</span>
        </a>
      </div>

      <!-- Segmented Bar & Micro Legend -->
      <div class="space-y-3.5">
        <div class="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
          <!-- Exact Barcode Confirmed -->
          <div
            class="h-full bg-emerald-500"
            [style.width.%]="exactPercent()"
            [title]="'باركود مؤكد: ' + (data()?.exactBarcodeConfirmed | number)"
          ></div>
          <!-- AI Model V4 Auto -->
          <div
            class="h-full bg-teal-500"
            [style.width.%]="aiAutoPercent()"
            [title]="'ذكاء اصطناعي آلي: ' + (data()?.aiModelAutoMatched | number)"
          ></div>
          <!-- AI Review Queue -->
          <div
            class="h-full bg-amber-500"
            [style.width.%]="reviewPercent()"
            [title]="'طابور المراجعة: ' + reviewTotal()"
          ></div>
          <!-- Single Catalog Products -->
          <div
            class="h-full bg-slate-300 dark:bg-neutral-600"
            [style.width.%]="singlePercent()"
            [title]="'كتالوج مفرد: ' + (data()?.singleCatalogProducts | number)"
          ></div>
        </div>

        <!-- Legend Items -->
        <div class="flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-500 dark:text-neutral-400 pt-1">
          <div class="flex items-center gap-2">
            <span class="size-2.5 rounded-full bg-emerald-500"></span>
            <span class="text-slate-700 dark:text-neutral-200 font-bold">باركود مؤكد</span>
            <span class="tabular-nums text-slate-400">({{ exactPercent() | number: '1.0-1' }}%)</span>
          </div>

          <div class="flex items-center gap-2">
            <span class="size-2.5 rounded-full bg-teal-500"></span>
            <span class="text-slate-700 dark:text-neutral-200 font-bold">ذكاء آلي (Auto)</span>
            <span class="tabular-nums text-slate-400">({{ aiAutoPercent() | number: '1.0-1' }}%)</span>
          </div>

          <div class="flex items-center gap-2">
            <span class="size-2.5 rounded-full bg-amber-500"></span>
            <span class="text-slate-700 dark:text-neutral-200 font-bold">طابور المراجعة</span>
            <span class="tabular-nums text-slate-400">({{ reviewPercent() | number: '1.0-1' }}%)</span>
          </div>

          <div class="flex items-center gap-2">
            <span class="size-2.5 rounded-full bg-slate-400"></span>
            <span class="text-slate-700 dark:text-neutral-200 font-bold">كتالوج مفرد</span>
            <span class="tabular-nums text-slate-400">({{ singlePercent() | number: '1.0-1' }}%)</span>
          </div>
        </div>
      </div>

      <!-- 4 Balanced Detail Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Card 1: Exact Barcode Confirmed -->
        <div class="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-2 dark:border-neutral-800 dark:bg-neutral-800/40">
          <div class="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <span>باركود قطعي (GTIN)</span>
            <i class="pi pi-check-circle text-xs" aria-hidden="true"></i>
          </div>
          <div class="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
            {{ (data()?.exactBarcodeConfirmed ?? 0) | number }}
          </div>
          <div class="text-xs font-medium text-slate-500">
            مطابقة قطعية 100% بدون شك
          </div>
        </div>

        <!-- Card 2: AI Model Auto -->
        <div class="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-2 dark:border-neutral-800 dark:bg-neutral-800/40">
          <div class="flex items-center justify-between text-xs font-bold text-teal-700 dark:text-teal-400">
            <span>ذكاء اصطناعي (Auto V4)</span>
            <i class="pi pi-bolt text-xs" aria-hidden="true"></i>
          </div>
          <div class="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
            {{ (data()?.aiModelAutoMatched ?? 0) | number }}
          </div>
          <div class="text-xs font-medium text-slate-500">
            تطابق فائق الدقة معتمد تلقائياً
          </div>
        </div>

        <!-- Card 3: Review Queue -->
        <div class="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-2 dark:border-neutral-800 dark:bg-neutral-800/40">
          <div class="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
            <span>طابور المراجعة</span>
            <i class="pi pi-clock text-xs" aria-hidden="true"></i>
          </div>
          <div class="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
            {{ reviewTotal() | number }}
          </div>
          <div class="flex items-center gap-1.5 text-[10px] font-bold tabular-nums">
            <span class="rounded bg-emerald-100/80 px-1.5 py-0.5 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {{ (data()?.reviewPendingHighConf ?? 0) | number }} عالي
            </span>
            <span class="rounded bg-amber-100/80 px-1.5 py-0.5 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              {{ (data()?.reviewPendingMidConf ?? 0) | number }} متوسط
            </span>
            <span class="rounded bg-rose-100/80 px-1.5 py-0.5 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
              {{ (data()?.reviewPendingLowConf ?? 0) | number }} تدقيق
            </span>
          </div>
        </div>

        <!-- Card 4: Solo Catalog -->
        <div class="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-2 dark:border-neutral-800 dark:bg-neutral-800/40">
          <div class="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-neutral-400">
            <span>كتالوج مفرد</span>
            <i class="pi pi-box text-xs" aria-hidden="true"></i>
          </div>
          <div class="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
            {{ (data()?.singleCatalogProducts ?? 0) | number }}
          </div>
          <div class="text-xs font-medium text-slate-500">
            منتجات مسجلة بدون منافس حالياً
          </div>
        </div>
      </div>
    </div>
  `
})
export class MatchingBreakdownChartComponent {
  readonly data = input<MatchingModelBreakdown | undefined>(undefined);

  readonly confirmedTotal = computed(() => {
    const d = this.data();
    if (!d) return 0;
    return d.exactBarcodeConfirmed + d.aiModelAutoMatched;
  });

  readonly reviewTotal = computed(() => {
    const d = this.data();
    if (!d) return 0;
    return d.reviewPendingHighConf + d.reviewPendingMidConf + d.reviewPendingLowConf;
  });

  readonly totalProducts = computed(() => {
    const d = this.data();
    if (!d) return 1;
    const total =
      d.exactBarcodeConfirmed +
      d.aiModelAutoMatched +
      this.reviewTotal() +
      d.singleCatalogProducts;
    return total > 0 ? total : 1;
  });

  readonly exactPercent = computed(() => {
    const d = this.data();
    return d ? (d.exactBarcodeConfirmed / this.totalProducts()) * 100 : 0;
  });

  readonly aiAutoPercent = computed(() => {
    const d = this.data();
    return d ? (d.aiModelAutoMatched / this.totalProducts()) * 100 : 0;
  });

  readonly reviewPercent = computed(() => {
    return (this.reviewTotal() / this.totalProducts()) * 100;
  });

  readonly singlePercent = computed(() => {
    const d = this.data();
    return d ? (d.singleCatalogProducts / this.totalProducts()) * 100 : 0;
  });
}
