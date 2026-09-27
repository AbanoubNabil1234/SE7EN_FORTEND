import { TranslatePipe } from '../../pipes/translate.pipe';
import { Component, computed, inject, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MultiPharmacyDepthPoint } from '../../../core/domain/models/dashboard.model';
import { I18nService } from '../../../core/i18n/i18n.service';

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
  private readonly i18n = inject(I18nService);
  readonly data = input<MultiPharmacyDepthPoint[]>([]);

  readonly totalMultiProducts = computed(() => {
    const list = this.data();
    return list.reduce((sum, item) => sum + item.masterProductCount, 0);
  });

  readonly maxPharmacyCount = computed(() => {
    const list = this.data();
    if (list.length === 0) return 0;
    return Math.max(...list.map((p) => p.pharmacyCount));
  });

  readonly fullCoverageItem = computed(() => {
    const list = this.data();
    const max = this.maxPharmacyCount();
    return list.find((p) => p.pharmacyCount === max) ?? null;
  });

  readonly fullCoverageCount = computed(() => {
    return this.fullCoverageItem()?.masterProductCount ?? 0;
  });

  readonly computedItems = computed(() => {
    const list = this.data();
    if (list.length === 0) return [];

    const maxCount = Math.max(...list.map((p) => p.masterProductCount), 1);
    const maxPharm = this.maxPharmacyCount();

    return list.map((item) => {
      const isFull = item.pharmacyCount === maxPharm;
      const isHigh = item.pharmacyCount >= 5;

      let label = '';
      if (item.pharmacyCount === 2) {
        label = this.i18n.t('charts.marketOverlap.twoPharmacies');
      } else if (isFull) {
        label = `${item.pharmacyCount} ${this.i18n.t('charts.marketOverlap.allPharmacies')}`;
      } else if (item.pharmacyCount === 8) {
        label = this.i18n.t('charts.marketOverlap.eightPharmacies');
      } else {
        label = `${item.pharmacyCount} ${this.i18n.t('charts.marketOverlap.nPharmacies')}`;
      }

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
