import { Injectable, inject, signal, computed } from '@angular/core';
import { GetProductsUseCase } from '../../../core/use-cases/products/get-products.use-case';
import { GetProductByIdUseCase } from '../../../core/use-cases/products/get-product-by-id.use-case';
import { GetPriceComparisonUseCase } from '../../../core/use-cases/products/get-price-comparison.use-case';
import { Product } from '../../../core/domain/models/product.model';
import { PriceComparison } from '../../../core/domain/models/price-comparison.model';
import { NotificationService } from '../../../core/services/notification.service';

/**
 * Facade Pattern for Product Domain:
 * Provides a clean, unified, reactive API for UI components to interact with Use Cases.
 * Manages view state reactively using Angular Signals.
 */
@Injectable({ providedIn: 'root' })
export class ProductFacade {
  private readonly getProductsUseCase = inject(GetProductsUseCase);
  private readonly getProductByIdUseCase = inject(GetProductByIdUseCase);
  private readonly getPriceComparisonUseCase = inject(GetPriceComparisonUseCase);
  private readonly notificationService = inject(NotificationService);

  // Private reactive state signals
  private readonly _products = signal<Product[]>([]);
  private readonly _selectedProduct = signal<Product | null>(null);
  private readonly _activeComparison = signal<PriceComparison | null>(null);
  private readonly _loading = signal<boolean>(false);
  private readonly _searchQuery = signal<string>('');
  private readonly _selectedCategory = signal<string>('All');

  // Public readonly computed selectors (State access for UI)
  readonly products = this._products.asReadonly();
  readonly selectedProduct = this._selectedProduct.asReadonly();
  readonly activeComparison = this._activeComparison.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly selectedCategory = this._selectedCategory.asReadonly();

  readonly totalProductsCount = computed(() => this._products().length);
  readonly inStockProductsCount = computed(() => this._products().filter(p => p.inStock).length);

  loadProducts(): void {
    this._loading.set(true);
    this.getProductsUseCase.execute({
      query: this._searchQuery(),
      category: this._selectedCategory()
    }).subscribe({
      next: (data) => {
        this._products.set(data);
        this._loading.set(false);
      },
      error: () => {
        this.notificationService.showError('Unable to fetch product listings', 'Products Error');
        this._loading.set(false);
      }
    });
  }

  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
    this.loadProducts();
  }

  setCategory(category: string): void {
    this._selectedCategory.set(category);
    this.loadProducts();
  }

  openPriceComparison(product: Product): void {
    this._selectedProduct.set(product);
    this._loading.set(true);

    this.getPriceComparisonUseCase.execute(product.id).subscribe({
      next: (comparison) => {
        this._activeComparison.set(comparison);
        this._loading.set(false);
        this.notificationService.showInfo(`Loaded price comparison for ${product.name}`, 'Live Pricing');
      },
      error: () => {
        this.notificationService.showError('Failed to calculate live price comparison', 'Comparison Error');
        this._loading.set(false);
      }
    });
  }

  closePriceComparison(): void {
    this._activeComparison.set(null);
    this._selectedProduct.set(null);
  }
}
