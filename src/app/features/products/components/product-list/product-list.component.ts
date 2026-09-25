import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductFacade } from '../../facades/product.facade';
import { ProductCardComponent } from '../product-card/product-card.component';
import { ProductFilterComponent } from '../product-filter/product-filter.component';
import { ComparisonModalComponent } from '../comparison-modal/comparison-modal.component';

/**
 * Smart (Container) Component:
 * Injects ProductFacade, consumes reactive signals, and passes state down to presentational components.
 */
@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, ProductFilterComponent, ComparisonModalComponent],
  templateUrl: './product-list.component.html'
})
export class ProductListComponent implements OnInit {
  readonly facade = inject(ProductFacade);

  ngOnInit(): void {
    this.facade.loadProducts();
  }
}
