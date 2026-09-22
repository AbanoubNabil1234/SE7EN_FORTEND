import { Component, computed, input, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { CategoryStatRow } from '../../../core/domain/models/dashboard.model';

const COLORS = [
  '#C27938',
  '#10B981',
  '#3B82F6',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#64748B'
];

@Component({
  selector: 'app-category-donut-chart',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div class="relative w-full rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      <div class="border-b border-slate-100 pb-4 dark:border-neutral-800">
        <h3 class="text-balance text-base font-black text-slate-900 dark:text-white">
          توزيع الفئات الكبرى
        </h3>
        <p class="text-pretty text-xs font-medium text-slate-500 dark:text-neutral-400">
          نسبة المنتجات المسعرة بحسب التصنيف التجاري
        </p>
      </div>

      <div class="flex flex-col items-center gap-6 pt-4 sm:flex-row sm:items-center">
        <!-- SVG Donut Chart -->
        <div class="relative flex size-40 shrink-0 items-center justify-center">
          @if (categories().length === 0) {
            <div class="text-center text-xs font-medium text-slate-400">
              لا توجد تصنيفات
            </div>
          } @else {
            <svg viewBox="0 0 100 100" class="size-full -rotate-90">
              @for (slice of computedSlices(); track slice.index) {
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  [attr.stroke]="slice.color"
                  stroke-width="10"
                  [attr.stroke-dasharray]="slice.dashArray"
                  [attr.stroke-dashoffset]="slice.dashOffset"
                  class="cursor-pointer transition-opacity duration-150 hover:opacity-80"
                  (mouseenter)="hoveredIndex.set(slice.index)"
                  (mouseleave)="hoveredIndex.set(null)"
                />
              }
            </svg>

            <!-- Center Donut Label -->
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
              @if (activeItem(); as active) {
                <span class="text-[11px] font-bold text-slate-500 dark:text-neutral-400 line-clamp-1 max-w-[80px]">
                  {{ active.categoryName }}
                </span>
                <span class="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                  {{ active.percentage | number: '1.0-1' }}%
                </span>
              } @else {
                <span class="text-[10px] font-semibold text-slate-400">التصنيفات</span>
                <span class="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                  {{ categories().length }}
                </span>
              }
            </div>
          }
        </div>

        <!-- Legend List -->
        <div class="w-full space-y-1.5">
          @for (item of computedItems(); track item.index) {
            <div
              class="flex items-center justify-between gap-2 rounded-lg p-1.5 transition-colors cursor-pointer"
              [ngClass]="hoveredIndex() === item.index ? 'bg-slate-100 dark:bg-neutral-800' : 'hover:bg-slate-50 dark:hover:bg-neutral-800/40'"
              (mouseenter)="hoveredIndex.set(item.index)"
              (mouseleave)="hoveredIndex.set(null)"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="size-2 rounded-full shrink-0" [style.background-color]="item.color"></span>
                <span class="truncate text-xs font-bold text-slate-800 dark:text-neutral-200">
                  {{ item.categoryName }}
                </span>
              </div>
              <div class="flex items-center gap-2 text-xs font-semibold tabular-nums shrink-0">
                <span class="text-slate-400">{{ item.productCount | number }}</span>
                <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-700 dark:bg-neutral-800 dark:text-neutral-200">
                  {{ item.percentage | number: '1.0-1' }}%
                </span>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class CategoryDonutChartComponent {
  readonly categories = input<CategoryStatRow[]>([]);
  readonly hoveredIndex = signal<number | null>(null);

  readonly computedItems = computed(() => {
    return this.categories().map((c, i) => ({
      ...c,
      index: i,
      color: COLORS[i % COLORS.length]
    }));
  });

  readonly activeItem = computed(() => {
    const idx = this.hoveredIndex();
    if (idx === null) return null;
    return this.computedItems()[idx] ?? null;
  });

  readonly computedSlices = computed(() => {
    const items = this.computedItems();
    if (items.length === 0) return [];

    const circumference = 2 * Math.PI * 38;
    let accumulatedPercent = 0;

    return items.map((item) => {
      const fraction = item.percentage / 100;
      const strokeLength = fraction * circumference;
      const dashArray = `${strokeLength} ${circumference - strokeLength}`;
      const dashOffset = -accumulatedPercent * circumference;

      accumulatedPercent += fraction;

      return {
        ...item,
        dashArray,
        dashOffset
      };
    });
  });
}
