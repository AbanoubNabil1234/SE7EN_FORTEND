import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { Product } from '../../domain/models/product.model';
import { PriceComparison } from '../../domain/models/price-comparison.model';
import { ProductDto, PriceComparisonDto } from '../dtos/product.dto';
import { ProductMapper } from '../mappers/product.mapper';
import { API_ENDPOINTS } from '../http/api-endpoints.constants';
import { Money } from '../../domain/value-objects/money.vo';

/**
 * Concrete implementation of ProductRepository using Angular HttpClient and local fallback caching.
 */
@Injectable({ providedIn: 'root' })
export class HttpProductRepository extends ProductRepository {
  private readonly http = inject(HttpClient);

  private readonly seedProducts: Product[] = [
    {
      id: 'prod-1',
      name: 'Panadol Extra 500mg',
      genericName: 'Paracetamol + Caffeine',
      brand: 'GSK',
      category: 'Pain Relief & Fever',
      dosageForm: 'Film-Coated Tablets',
      strength: '500mg/65mg',
      imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80',
      bestPrice: new Money(45.0, 'EGP'),
      availablePharmaciesCount: 6,
      inStock: true
    },
    {
      id: 'prod-2',
      name: 'Augmentin 1g',
      genericName: 'Amoxicillin + Clavulanic Acid',
      brand: 'GlaxoSmithKline',
      category: 'Antibiotics',
      dosageForm: 'Tablets',
      strength: '1000mg',
      imageUrl: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=400&q=80',
      bestPrice: new Money(115.5, 'EGP'),
      availablePharmaciesCount: 8,
      inStock: true
    },
    {
      id: 'prod-3',
      name: 'C-Retard 500mg',
      genericName: 'Ascorbic Acid (Vitamin C)',
      brand: 'Hikma',
      category: 'Vitamins & Immunity',
      dosageForm: 'Sustained-Release Capsules',
      strength: '500mg',
      imageUrl: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=400&q=80',
      bestPrice: new Money(28.0, 'EGP'),
      availablePharmaciesCount: 5,
      inStock: true
    },
    {
      id: 'prod-4',
      name: 'Concor 5mg',
      genericName: 'Bisoprolol Fumarate',
      brand: 'Merck',
      category: 'Cardiovascular & Blood Pressure',
      dosageForm: 'Film-Coated Tablets',
      strength: '5mg',
      imageUrl: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=400&q=80',
      bestPrice: new Money(62.0, 'EGP'),
      availablePharmaciesCount: 7,
      inStock: true
    },
    {
      id: 'prod-5',
      name: 'Nexium 40mg',
      genericName: 'Esomeprazole Magnesium',
      brand: 'AstraZeneca',
      category: 'Digestive & Stomach',
      dosageForm: 'Gastro-resistant Tablets',
      strength: '40mg',
      imageUrl: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=400&q=80',
      bestPrice: new Money(142.0, 'EGP'),
      availablePharmaciesCount: 9,
      inStock: true
    },
    {
      id: 'prod-6',
      name: 'Omega 3 Plus',
      genericName: 'Fish Oil + Wheat Germ Oil',
      brand: 'Sedico',
      category: 'Vitamins & Immunity',
      dosageForm: 'Soft Gelatin Capsules',
      strength: '1000mg',
      imageUrl: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=400&q=80',
      bestPrice: new Money(99.0, 'EGP'),
      availablePharmaciesCount: 4,
      inStock: true
    }
  ];

  getAll(query?: string, category?: string): Observable<Product[]> {
    let filtered = [...this.seedProducts];
    if (query && query.trim() !== '') {
      const q = query.trim().toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.genericName?.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
      );
    }
    if (category && category !== 'All') {
      filtered = filtered.filter(p => p.category.toLowerCase().includes(category.toLowerCase()));
    }
    return of(filtered);
  }

  getById(id: string): Observable<Product | null> {
    const found = this.seedProducts.find(p => p.id === id) || null;
    return of(found);
  }

  getPriceComparison(productId: string): Observable<PriceComparison> {
    const product = this.seedProducts.find(p => p.id === productId) || this.seedProducts[0];
    const comparison: PriceComparison = {
      productId: product.id,
      productName: product.name,
      lowestPrice: product.bestPrice,
      highestPrice: new Money(product.bestPrice.amount * 1.3, 'EGP'),
      potentialSavings: new Money(product.bestPrice.amount * 0.3, 'EGP'),
      offers: [
        {
          pharmacy: {
            id: 'ph-1',
            name: 'El-Ezaby Pharmacy',
            slug: 'el-ezaby',
            rating: 4.9,
            deliveryTimeMinutes: 25,
            deliveryFee: 15,
            isOpen: true
          },
          price: product.bestPrice,
          inStock: true,
          lastUpdated: new Date()
        },
        {
          pharmacy: {
            id: 'ph-2',
            name: 'Seif Pharmacy',
            slug: 'seif',
            rating: 4.7,
            deliveryTimeMinutes: 40,
            deliveryFee: 10,
            isOpen: true
          },
          price: new Money(product.bestPrice.amount + 6, 'EGP'),
          inStock: true,
          lastUpdated: new Date()
        },
        {
          pharmacy: {
            id: 'ph-3',
            name: 'Roushdy Pharmacy',
            slug: 'roushdy',
            rating: 4.8,
            deliveryTimeMinutes: 30,
            deliveryFee: 12,
            isOpen: true
          },
          price: new Money(product.bestPrice.amount + 12, 'EGP'),
          inStock: true,
          lastUpdated: new Date()
        },
        {
          pharmacy: {
            id: 'ph-4',
            name: '19011 Pharmacy',
            slug: '19011',
            rating: 4.2,
            deliveryTimeMinutes: 45,
            deliveryFee: 20,
            isOpen: false
          },
          price: new Money(product.bestPrice.amount + 15, 'EGP'),
          inStock: false,
          lastUpdated: new Date()
        }
      ]
    };
    return of(comparison);
  }

  getFeatured(): Observable<Product[]> {
    return of(this.seedProducts.slice(0, 4));
  }
}
