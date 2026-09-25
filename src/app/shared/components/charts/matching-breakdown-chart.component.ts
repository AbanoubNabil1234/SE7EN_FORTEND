import { TranslatePipe } from '../../pipes/translate.pipe';
import { Component, computed, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatchingModelBreakdown } from '../../../core/domain/models/dashboard.model';

@Component({
  selector: 'app-matching-breakdown-chart',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterModule, TranslatePipe],
  host: {
    class: 'block w-full'
  },
  templateUrl: './matching-breakdown-chart.component.html'
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
