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
  template: `
    @if (comparison()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-carbon-950/80 backdrop-blur-md animate-fade-in">
        <div class="bg-white dark:bg-carbon-900 border border-brand-300/40 dark:border-carbon-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <!-- Modal Header -->
          <div class="p-6 border-b border-brand-100 dark:border-carbon-800 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-carbon-950 font-black text-lg shadow-brand">
                7
              </div>
              <div>
                <span class="text-xs font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest">Live Engine Price Comparison</span>
                <h3 class="text-xl font-black text-carbon-900 dark:text-white">{{ comparison()!.productName }}</h3>
              </div>
            </div>
            <button
              (click)="close.emit()"
              class="w-9 h-9 rounded-full bg-brand-50 dark:bg-carbon-800 text-carbon-600 dark:text-carbon-300 hover:text-carbon-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          <!-- Savings Summary Banner -->
          <div class="bg-gradient-to-r from-brand-500/15 via-amber-500/10 to-transparent p-6 border-b border-brand-100 dark:border-carbon-800 flex items-center justify-between">
            <div>
              <span class="text-xs text-carbon-500 dark:text-carbon-400 font-bold uppercase tracking-wider">Potential Savings</span>
              <div class="text-2xl font-black text-brand-600 dark:text-brand-400 mt-0.5">
                {{ comparison()!.potentialSavings | currencyFormat }}
              </div>
            </div>
            <div class="text-right">
              <span class="text-xs text-carbon-500 dark:text-carbon-400 font-bold uppercase tracking-wider">Pharmacy Price Range</span>
              <div class="text-sm font-black text-carbon-800 dark:text-carbon-200 mt-0.5">
                {{ comparison()!.lowestPrice | currencyFormat }} - {{ comparison()!.highestPrice | currencyFormat }}
              </div>
            </div>
          </div>

          <!-- Pharmacy Offers List -->
          <div class="p-6 overflow-y-auto space-y-3 flex-1">
            @for (offer of comparison()!.offers; track offer.pharmacy.id) {
              <div class="p-4 rounded-2xl border border-brand-200/50 dark:border-carbon-800 bg-brand-50/20 dark:bg-carbon-950/50 flex items-center justify-between gap-4 hover:border-brand-500/50 transition-colors">
                <div class="flex items-center gap-3.5">
                  <div class="w-12 h-12 rounded-xl bg-white dark:bg-carbon-800 border border-brand-200 dark:border-carbon-700 flex items-center justify-center font-black text-brand-600 text-lg shadow-sm">
                    {{ offer.pharmacy.name[0] }}
                  </div>
                  <div>
                    <h5 class="font-extrabold text-sm text-carbon-900 dark:text-white">{{ offer.pharmacy.name }}</h5>
                    <div class="flex items-center gap-2 text-xs text-carbon-500 mt-0.5">
                      <span class="flex items-center text-amber-500 font-bold">★ {{ offer.pharmacy.rating }}</span>
                      <span>•</span>
                      <span>{{ offer.pharmacy.deliveryTimeMinutes }} mins</span>
                      <span>•</span>
                      <app-badge [variant]="offer.inStock ? 'success' : 'danger'">
                        {{ offer.inStock ? 'In Stock' : 'Out of Stock' }}
                      </app-badge>
                    </div>
                  </div>
                </div>

                <div class="text-right flex flex-col items-end">
                  <span class="text-lg font-black text-carbon-900 dark:text-white">
                    {{ offer.price | currencyFormat }}
                  </span>
                  <div class="mt-1">
                    <app-button variant="primary" size="sm" [disabled]="!offer.inStock">
                      Order Here
                    </app-button>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class ComparisonModalComponent {
  comparison = input<PriceComparison | null>(null);
  close = output<void>();
}
