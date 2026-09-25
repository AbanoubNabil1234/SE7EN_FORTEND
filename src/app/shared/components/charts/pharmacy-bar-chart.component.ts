import { TranslatePipe } from '../../pipes/translate.pipe';
import { Component, computed, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { PharmacyOpsRow } from '../../../core/domain/models/dashboard.model';

@Component({
  selector: 'app-pharmacy-bar-chart',
  standalone: true,
  imports: [CommonModule, DecimalPipe, TranslatePipe],
  host: {
    class: 'block w-full'
  },
  templateUrl: './pharmacy-bar-chart.component.html'
})
export class PharmacyBarChartComponent {
  readonly pharmacies = input<PharmacyOpsRow[]>([]);

  readonly computedItems = computed(() => {
    const list = this.pharmacies();
    if (list.length === 0) return [];

    return list.map((p) => {
      const catalogTotal = p.inCatalogCount ?? p.matchedCount ?? 0;
      const crossMatchedTotal = p.crossMatchedCount ?? 0;
      const totalProducts = p.productCount > 0 ? p.productCount : 1;

      const matchRate = Math.min(100, Math.max(0, (catalogTotal / totalProducts) * 100));
      const crossMatchRate = Math.min(100, Math.max(0, (crossMatchedTotal / totalProducts) * 100));
      const barcodeRate = p.barcodePercent ?? 0;

      const matchWidth = matchRate;
      const crossMatchWidth = crossMatchRate;

      return {
        ...p,
        catalogTotal,
        crossMatchedTotal,
        matchRate,
        crossMatchRate,
        barcodeRate,
        matchWidth,
        crossMatchWidth
      };
    }).sort((a, b) => b.catalogTotal - a.catalogTotal);
  });
}
