import { Component, computed, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatchingModelBreakdown } from '../../../core/domain/models/dashboard.model';

@Component({
  selector: 'app-matching-breakdown-chart',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterModule],
  template: `
    <div class="relative w-full space-y-4 rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-xs transition-opacity duration-150 dark:border-neutral-800 dark:bg-[#14171C]">
      <!-- Header -->
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-balance text-base font-black text-[#181A1D] dark:text-white">
              تفصيل أساليب التطابق والذكاء الاصطناعي
            </h3>
            <span class="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              {{ confirmedTotal() | number }} تطابق مؤكد
            </span>
          </div>
          <p class="text-pretty text-xs font-medium text-[#8A735C] dark:text-neutral-400">
            توزيع المنتجات بحسب طريقة الربط (باركود دولي، ذكاء اصطناعي آلي، طابور المراجعة، منتجات مفردة)
          </p>
        </div>

        <a
          routerLink="/matches"
          class="inline-flex items-center gap-1.5 rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3.5 py-1.5 text-xs font-bold text-[#181A1D] transition-colors hover:border-[#C27938] hover:bg-[#F8EEE2] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
        >
          <i class="pi pi-external-link text-[10px]" aria-hidden="true"></i>
          <span>فتح طابور المراجعة</span>
        </a>
      </div>

      <!-- Segmented Bar -->
      <div class="space-y-2">
        <div class="flex h-3 w-full overflow-hidden rounded-full bg-neutral-200/80 dark:bg-neutral-700/60">
          <!-- Exact Barcode Confirmed -->
          <div
            class="h-full bg-emerald-600 dark:bg-emerald-500"
            [style.width.%]="exactPercent()"
            [title]="'باركود مؤكد: ' + (data()?.exactBarcodeConfirmed | number)"
          ></div>
          <!-- AI Model V4 Auto -->
          <div
            class="h-full bg-teal-600 dark:bg-teal-500"
            [style.width.%]="aiAutoPercent()"
            [title]="'ذكاء اصطناعي آلي: ' + (data()?.aiModelAutoMatched | number)"
          ></div>
          <!-- AI Review Queue -->
          <div
            class="h-full bg-amber-500"
            [style.width.%]="reviewPercent()"
            [title]="'طابور مراجعة الموديل: ' + reviewTotal()"
          ></div>
          <!-- Single Catalog Products -->
          <div
            class="h-full bg-neutral-300 dark:bg-neutral-600"
            [style.width.%]="singlePercent()"
            [title]="'كتالوج مفرد (بدون منافس): ' + (data()?.singleCatalogProducts | number)"
          ></div>
        </div>

        <!-- Legend Items -->
        <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-[#8A735C] dark:text-neutral-400">
          <span class="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
            <span class="size-2 rounded-full bg-emerald-600"></span>
            باركود مؤكد (<strong class="tabular-nums">{{ exactPercent() | number: '1.0-1' }}%</strong>)
          </span>
          <span class="inline-flex items-center gap-1.5 text-teal-700 dark:text-teal-400">
            <span class="size-2 rounded-full bg-teal-600"></span>
            ذكاء اصطناعي آلي (<strong class="tabular-nums">{{ aiAutoPercent() | number: '1.0-1' }}%</strong>)
          </span>
          <span class="inline-flex items-center gap-1.5 text-amber-800 dark:text-amber-400">
            <span class="size-2 rounded-full bg-amber-500"></span>
            طابور مراجعة الذكاء (<strong class="tabular-nums">{{ reviewPercent() | number: '1.0-1' }}%</strong>)
          </span>
          <span class="inline-flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
            <span class="size-2 rounded-full bg-neutral-400"></span>
            كتالوج مفرد (<strong class="tabular-nums">{{ singlePercent() | number: '1.0-1' }}%</strong>)
          </span>
        </div>
      </div>

      <!-- Detail Segment Cards -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-1">
        <!-- Card 1: Exact Barcode Confirmed -->
        <div class="rounded-xl border border-emerald-500/20 bg-emerald-50/30 p-3.5 space-y-1 dark:border-emerald-950 dark:bg-emerald-950/20">
          <div class="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <span>باركود قطعي (Exact/GTIN)</span>
            <i class="pi pi-check-circle text-xs" aria-hidden="true"></i>
          </div>
          <div class="text-xl font-black tabular-nums text-emerald-950 dark:text-emerald-100">
            {{ (data()?.exactBarcodeConfirmed ?? 0) | number }}
          </div>
          <div class="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
            مطابقة قطعية 100% بدون شك
          </div>
        </div>

        <!-- Card 2: AI Model V4 Auto -->
        <div class="rounded-xl border border-teal-500/20 bg-teal-50/30 p-3.5 space-y-1 dark:border-teal-950 dark:bg-teal-950/20">
          <div class="flex items-center justify-between text-xs font-bold text-teal-800 dark:text-teal-300">
            <span>ذكاء اصطناعي آلي (Auto V4)</span>
            <i class="pi pi-bolt text-xs" aria-hidden="true"></i>
          </div>
          <div class="text-xl font-black tabular-nums text-teal-950 dark:text-teal-100">
            {{ (data()?.aiModelAutoMatched ?? 0) | number }}
          </div>
          <div class="text-[11px] font-medium text-teal-700 dark:text-teal-400">
            تطابق فائق الدقة معتمد تلقائياً
          </div>
        </div>

        <!-- Card 3: AI Review Queue by Confidence -->
        <div class="rounded-xl border border-amber-500/20 bg-amber-50/30 p-3.5 space-y-1 dark:border-amber-950 dark:bg-amber-950/20">
          <div class="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
            <span>طابور مراجعة الذكاء</span>
            <i class="pi pi-clock text-xs" aria-hidden="true"></i>
          </div>
          <div class="text-xl font-black tabular-nums text-amber-950 dark:text-amber-100">
            {{ reviewTotal() | number }}
          </div>
          <div class="flex items-center gap-1.5 text-[10px] font-bold tabular-nums text-amber-800 dark:text-amber-400">
            <span class="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-800 dark:text-emerald-300">
              {{ (data()?.reviewPendingHighConf ?? 0) | number }} عالي
            </span>
            <span class="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-800 dark:text-amber-300">
              {{ (data()?.reviewPendingMidConf ?? 0) | number }} متوسط
            </span>
            <span class="rounded bg-rose-500/15 px-1.5 py-0.5 text-rose-800 dark:text-rose-300">
              {{ (data()?.reviewPendingLowConf ?? 0) | number }} تدقيق
            </span>
          </div>
        </div>

        <!-- Card 4: Single/Solo Catalog Products -->
        <div class="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-3.5 space-y-1 dark:border-neutral-800 dark:bg-neutral-800/30">
          <div class="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-300">
            <span>منتجات كتالوج مفردة</span>
            <i class="pi pi-box text-xs" aria-hidden="true"></i>
          </div>
          <div class="text-xl font-black tabular-nums text-neutral-800 dark:text-neutral-200">
            {{ (data()?.singleCatalogProducts ?? 0) | number }}
          </div>
          <div class="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
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
