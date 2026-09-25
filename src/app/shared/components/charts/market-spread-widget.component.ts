import { TranslatePipe } from '../../pipes/translate.pipe';
import { Component, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MarketPriceSpreadMetrics } from '../../../core/domain/models/dashboard.model';

@Component({
  selector: 'app-market-spread-widget',
  standalone: true,
  imports: [CommonModule, DecimalPipe, TranslatePipe],
  host: {
    class: 'block w-full'
  },
  templateUrl: './market-spread-widget.component.html'
})
export class MarketSpreadWidgetComponent {
  readonly data = input<MarketPriceSpreadMetrics | undefined>(undefined);
}
