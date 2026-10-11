import { Component, computed, input } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { PriceRefreshMetrics } from '../../../core/domain/models/dashboard.model';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { priceRefreshChartItems, PriceRefreshChartMode } from './price-refresh-chart-data';

@Component({
  selector: 'app-price-refresh-chart',
  standalone: true,
  imports: [DatePipe, DecimalPipe, TranslatePipe],
  host: { class: 'block w-full' },
  templateUrl: './price-refresh-chart.component.html'
})
export class PriceRefreshChartComponent {
  readonly data = input<PriceRefreshMetrics | undefined>(undefined);
  readonly mode = input<PriceRefreshChartMode>('run');
  readonly items = computed(() => priceRefreshChartItems(this.data(), this.mode()));
  readonly total = computed(() => (this.mode() === 'run' ? this.data()?.runTotal : this.data()?.catalogTotal) ?? 0);
  readonly hasData = computed(() => this.total() > 0 && (this.mode() === 'catalog' || !!this.data()?.latestRunId));
  readonly titleKey = computed(() => `dashboard.priceRefresh.${this.mode()}Title`);
  readonly subtitleKey = computed(() => `dashboard.priceRefresh.${this.mode()}Subtitle`);
}
