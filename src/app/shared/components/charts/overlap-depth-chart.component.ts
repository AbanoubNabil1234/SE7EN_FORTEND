import { TranslatePipe } from '../../pipes/translate.pipe';
import { Component, computed, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MultiPharmacyDepthPoint } from '../../../core/domain/models/dashboard.model';

@Component({
  selector: 'app-overlap-depth-chart',
  standalone: true,
  imports: [CommonModule, DecimalPipe, TranslatePipe],
  host: {
    class: 'block w-full'
  },
  templateUrl: './overlap-depth-chart.component.html'
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

    return list.map((item) => {
      const isFull = item.pharmacyCount === 8;
      const isHigh = item.pharmacyCount >= 5;

      const label =
        item.pharmacyCount === 2
          ? '2'
          : item.pharmacyCount === 8
            ? '8'
            : `${item.pharmacyCount}`;

      const badgeClass = isFull
        ? 'bg-amber-500 text-white'
        : isHigh
          ? 'bg-emerald-500 text-white'
          : 'bg-slate-200 text-slate-700 dark:bg-neutral-700 dark:text-neutral-300';

      const barColor = isFull
        ? 'bg-amber-500'
        : isHigh
          ? 'bg-emerald-500'
          : 'bg-[#C27938]';

      const relativeWidth = Math.max(3, Math.min(100, (item.masterProductCount / maxCount) * 100));

      return {
        ...item,
        label,
        badgeClass,
        barColor,
        relativeWidth
      };
    });
  });
}
