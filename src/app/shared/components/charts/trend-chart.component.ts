import { TranslatePipe } from '../../pipes/translate.pipe';
import { Component, computed, input, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { DashboardTrendPoint } from '../../../core/domain/models/dashboard.model';

@Component({
  selector: 'app-trend-chart',
  standalone: true,
  imports: [CommonModule, DecimalPipe, TranslatePipe],
  host: {
    class: 'block w-full'
  },
  templateUrl: './trend-chart.component.html'
})
export class TrendChartComponent {
  readonly data = input<DashboardTrendPoint[]>([]);
  readonly title = input('');
  readonly subtitle = input('');

  readonly activePoint = signal<DashboardTrendPoint | null>(null);

  readonly computedPoints = computed(() => {
    const list = this.data();
    if (list.length === 0) return [];

    const maxPrice = Math.max(...list.map((d) => d.priceUpdates), 100);
    const startX = 60;
    const endX = 660;
    const widthStep = list.length > 1 ? (endX - startX) / (list.length - 1) : 0;

    return list.map((item, index) => {
      const x = startX + index * widthStep;
      const normalizedPrice = item.priceUpdates / maxPrice;
      const y = 160 - normalizedPrice * 130;

      const normalizedSuccess = Math.min(Math.max(item.successRate, 0), 100) / 100;
      const successY = 160 - normalizedSuccess * 130;

      return {
        index,
        x,
        y,
        successY,
        label: item.dateLabel,
        raw: item
      };
    });
  });

  readonly linePath = computed(() => {
    const pts = this.computedPoints();
    if (pts.length === 0) return '';
    return pts.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
  });

  readonly areaPath = computed(() => {
    const pts = this.computedPoints();
    if (pts.length === 0) return '';
    const line = this.linePath();
    const lastX = pts[pts.length - 1].x;
    const firstX = pts[0].x;
    return `${line} L ${lastX} 160 L ${firstX} 160 Z`;
  });

  readonly successLinePath = computed(() => {
    const pts = this.computedPoints();
    if (pts.length === 0) return '';
    return pts.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.successY}`, '');
  });
}
