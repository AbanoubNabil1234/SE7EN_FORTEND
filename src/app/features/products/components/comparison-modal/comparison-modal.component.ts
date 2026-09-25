import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PriceComparison } from '../../../../core/domain/models/price-comparison.model';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';

@Component({
  selector: 'app-comparison-modal',
  standalone: true,
  imports: [CommonModule, CurrencyFormatPipe, ButtonComponent, BadgeComponent],
  templateUrl: './comparison-modal.component.html'
})
export class ComparisonModalComponent {
  comparison = input<PriceComparison | null>(null);
  close = output<void>();
}
