import { Component, computed, input, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { CategoryStatRow } from '../../../core/domain/models/dashboard.model';

const COLORS = [
  '#C27938',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#64748B'
];

@Component({
  selector: 'app-category-donut-chart',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div class="relative w-full space-y-4 rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      <div>
        <h3 class="text-base font-bold text-[#181A1D] dark:text-white">
          توزيع الفئات الرئيسية
        </h3>
        <p class="text-xs font-medium text-[#8A735C] dark:text-neutral-400">
          نسبة المنتجات المسعرة حسب التصنيفات الكبرى
        </p>
      </div>

      <div class="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <!-- SVG Donut Chart -->
        <div class="relative flex size-48 shrink-0 items-center justify-center">
          @if (categories().length === 0) {
            <div class="text-center text-xs font-medium text-[#8A735C]">
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
                  stroke-width="14"
                  [attr.stroke-dasharray]="slice.dashArray"
                  [attr.stroke-dashoffset]="slice.dashOffset"
                  class="cursor-pointer transition-all duration-300 hover:opacity-80 hover:stroke-[16]"
                  (mouseenter)="hoveredIndex.set(slice.index)"
                  (mouseleave)="hoveredIndex.set(null)"
                />
              }
            </svg>

            <!-- Center Donut Label -->
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
              @if (activeItem(); as active) {
                <span class="text-xs font-bold text-[#8A735C] dark:text-neutral-400 line-clamp-1 max-w-[100px]">
                  {{ active.categoryName }}
                </span>
                <span class="text-xl font-extrabold text-[#181A1D] dark:text-white tabular-nums">
                  {{ active.percentage | number: '1.0-1' }}%
                </span>
                <span class="text-[10px] text-[#A68B6D] font-semibold">
                  {{ active.productCount | number }} منتج
                </span>
              } @else {
                <span class="text-xs font-bold text-[#8A735C]">إجمالي الفئات</span>
                <span class="text-lg font-extrabold text-[#181A1D] dark:text-white tabular-nums">
                  {{ categories().length }}
                </span>
              }
            </div>
          }
        </div>

        <!-- Legend List -->
        <div class="w-full space-y-2">
          @for (item of computedItems(); track item.index) {
            <div
              class="flex items-center justify-between gap-2 rounded-lg p-1.5 transition-colors cursor-pointer"
              [ngClass]="hoveredIndex() === item.index ? 'bg-[#F8EEE2] dark:bg-neutral-800' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'"
              (mouseenter)="hoveredIndex.set(item.index)"
              (mouseleave)="hoveredIndex.set(null)"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="size-3 rounded-full shrink-0" [style.background-color]="item.color"></span>
                <span class="truncate text-xs font-bold text-[#181A1D] dark:text-white">
                  {{ item.categoryName }}
                </span>
              </div>
              <div class="flex items-center gap-2 text-xs font-semibold tabular-nums shrink-0">
                <span class="text-[#8A735C] dark:text-neutral-400">{{ item.productCount | number }}</span>
                <span class="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-extrabold text-[#181A1D] dark:bg-neutral-800 dark:text-white">
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
    return this.categories().map((cat, index) => ({
      ...cat,
      index,
      color: COLORS[index % COLORS.length]
    }));
  });

  readonly activeItem = computed(() => {
    const idx = this.hoveredIndex();
    if (idx == null) return null;
    return this.computedItems()[idx] ?? null;
  });

  readonly computedSlices = computed(() => {
    const items = this.computedItems();
    const total = items.reduce((acc, c) => acc + c.percentage, 0) || 100;
    const circumference = 2 * Math.PI * 38; // ~238.76

    let currentOffset = 0;
    return items.map((item) => {
      const sliceLength = (item.percentage / total) * circumference;
      const dashArray = `${sliceLength} ${circumference - sliceLength}`;
      const dashOffset = -currentOffset;
      currentOffset += sliceLength;

      return {
        ...item,
        dashArray,
        dashOffset
      };
    });
  });
}
