import { TranslatePipe } from '../../pipes/translate.pipe';
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
  imports: [CommonModule, DecimalPipe, TranslatePipe],
  host: {
    class: 'block w-full'
  },
  templateUrl: './category-donut-chart.component.html'
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
