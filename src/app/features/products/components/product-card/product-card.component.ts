import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../../core/domain/models/product.model';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';

/**
 * Presentational (Dumb) Component:
 * Uses Angular inputs & outputs, with zero knowledge of HTTP or business services.
 */
@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, CardComponent, BadgeComponent, ButtonComponent, CurrencyFormatPipe],
  template: `
    <app-card [hoverable]="true">
      <div class="relative flex flex-col h-full">
        <!-- Top Status & Category -->
        <div class="flex items-center justify-between mb-3">
          <app-badge [variant]="product().inStock ? 'brand' : 'danger'">
            {{ product().inStock ? 'In Stock' : 'Out of Stock' }}
          </app-badge>
          <span class="text-xs text-carbon-500 font-bold">{{ product().category }}</span>
        </div>

        <!-- Product Image Container -->
        <div class="w-full h-44 rounded-xl bg-brand-50/50 dark:bg-carbon-950 overflow-hidden mb-4 flex items-center justify-center relative group border border-brand-200/40 dark:border-carbon-800">
          <img
            [src]="product().imageUrl"
            [alt]="product().name"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div class="absolute bottom-2 right-2 bg-carbon-900/85 backdrop-blur-md text-brand-300 px-2.5 py-1 rounded-lg text-xs font-black border border-brand-500/30">
            {{ product().availablePharmaciesCount }} Pharmacies
          </div>
        </div>

        <!-- Title & Chemical / Dosage details -->
        <div class="flex-1 flex flex-col">
          <span class="text-xs text-brand-600 dark:text-brand-400 font-extrabold uppercase tracking-wider">{{ product().brand }}</span>
          <h4 class="font-extrabold text-base text-carbon-900 dark:text-white line-clamp-1 mt-0.5">{{ product().name }}</h4>
          @if (product().genericName) {
            <p class="text-xs text-carbon-500 dark:text-carbon-400 line-clamp-1 mb-2">{{ product().genericName }}</p>
          }
          <div class="text-xs text-carbon-400 dark:text-carbon-500 mb-4 font-medium">{{ product().dosageForm }} • {{ product().strength || 'Standard' }}</div>

          <!-- Price & Action -->
          <div class="mt-auto pt-3 border-t border-brand-100/60 dark:border-carbon-800 flex items-center justify-between">
            <div>
              <span class="text-[10px] text-carbon-400 dark:text-carbon-500 uppercase font-bold block">Best Price</span>
              <span class="text-lg font-black text-brand-600 dark:text-brand-400">
                {{ product().bestPrice | currencyFormat }}
              </span>
            </div>
            <app-button variant="primary" size="sm" (clicked)="compareClicked.emit(product())">
              <i class="pi pi-sliders-h mr-1.5"></i> Compare
            </app-button>
          </div>
        </div>
      </div>
    </app-card>
  `
})
export class ProductCardComponent {
  product = input.required<Product>();
  compareClicked = output<Product>();
}
