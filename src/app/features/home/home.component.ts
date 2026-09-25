import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductFacade } from '../products/facades/product.facade';
import { ProductCardComponent } from '../products/components/product-card/product-card.component';
import { ComparisonModalComponent } from '../products/components/comparison-modal/comparison-modal.component';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent, ComparisonModalComponent, ButtonComponent],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  readonly facade = inject(ProductFacade);

  ngOnInit(): void {
    this.facade.loadProducts();
  }
}
