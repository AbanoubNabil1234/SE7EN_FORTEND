import { Product } from '../../domain/models/product.model';
import { PriceComparison, PharmacyOffer } from '../../domain/models/price-comparison.model';
import { Money } from '../../domain/value-objects/money.vo';
import { ProductDto, PriceComparisonDto, PharmacyOfferDto } from '../dtos/product.dto';

/**
 * Adapter / Mapper Pattern:
 * Transforms external DTOs from HTTP APIs into rich, pure Domain Models.
 */
export class ProductMapper {
  static toDomain(dto: ProductDto): Product {
    return {
      id: dto.id,
      name: dto.name,
      genericName: dto.generic_name,
      brand: dto.brand,
      category: dto.category,
      dosageForm: dto.dosage_form,
      strength: dto.strength,
      imageUrl: dto.image_url,
      bestPrice: new Money(dto.best_price, dto.currency || 'EGP'),
      availablePharmaciesCount: dto.available_pharmacies_count,
      inStock: dto.in_stock
    };
  }

  static toComparisonDomain(dto: PriceComparisonDto): PriceComparison {
    const currency = dto.currency || 'EGP';
    return {
      productId: dto.product_id,
      productName: dto.product_name,
      lowestPrice: new Money(dto.lowest_price, currency),
      highestPrice: new Money(dto.highest_price, currency),
      potentialSavings: new Money(dto.potential_savings, currency),
      offers: dto.offers.map(offer => ProductMapper.toOfferDomain(offer, currency))
    };
  }

  private static toOfferDomain(dto: PharmacyOfferDto, currency: string): PharmacyOffer {
    return {
      pharmacy: {
        id: dto.pharmacy_id,
        name: dto.pharmacy_name,
        slug: dto.pharmacy_slug,
        logoUrl: dto.pharmacy_logo,
        rating: dto.rating,
        deliveryTimeMinutes: dto.delivery_time_minutes,
        deliveryFee: dto.delivery_fee,
        isOpen: true
      },
      price: new Money(dto.price, dto.currency || currency),
      discountPercentage: dto.discount_percentage,
      inStock: dto.in_stock,
      productUrl: dto.product_url,
      lastUpdated: new Date(dto.last_updated)
    };
  }
}
