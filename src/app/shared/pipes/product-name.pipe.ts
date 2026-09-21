import { Pipe, PipeTransform, inject } from '@angular/core';
import { LocaleService } from '../../core/services/locale.service';
import {
  CatalogFamily,
  CatalogPack,
  CatalogOffer,
  catalogFamilyTitle,
  catalogPackTitle,
  catalogOfferTitle
} from '../../core/domain/models/catalog-family.model';

@Pipe({ name: 'productName', standalone: true, pure: false })
export class ProductNamePipe implements PipeTransform {
  private readonly locale = inject(LocaleService);

  transform(
    item:
      | CatalogFamily
      | CatalogPack
      | CatalogOffer
      | { name?: string; englishName?: string | null; arabicName?: string | null }
      | null
      | undefined
  ): string {
    const loc = this.locale.locale();
    if (!item) return '';

    if ('familyKey' in item) {
      return catalogFamilyTitle(item as CatalogFamily, loc);
    }
    if ('masterId' in item) {
      return catalogPackTitle(item as CatalogPack, loc);
    }
    if ('pharmacyCode' in item) {
      return catalogOfferTitle(item as CatalogOffer, loc);
    }

    const isEn = loc === 'en';
    if (isEn) {
      return (item.englishName || item.name || item.arabicName || '').trim();
    }
    return (item.arabicName || item.name || item.englishName || '').trim();
  }
}
