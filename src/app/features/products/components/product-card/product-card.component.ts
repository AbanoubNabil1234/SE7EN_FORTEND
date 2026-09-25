import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../../core/domain/models/product.model';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { ProductNamePipe } from '../../../../shared/pipes/product-name.pipe';
import { ProxyImgPipe } from '../../../../shared/pipes/proxy-img.pipe';

/**
 * Presentational (Dumb) Component:
 * Uses Angular inputs & outputs, with zero knowledge of HTTP or business services.
 */
@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, CardComponent, BadgeComponent, ButtonComponent, CurrencyFormatPipe, ProductNamePipe, ProxyImgPipe],
  templateUrl: './product-card.component.html'
})
export class ProductCardComponent {
  product = input.required<Product>();
  compareClicked = output<Product>();
}
