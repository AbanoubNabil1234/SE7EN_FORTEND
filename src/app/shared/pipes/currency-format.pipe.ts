import { Pipe, PipeTransform } from '@angular/core';
import { Money } from '../../core/domain/value-objects/money.vo';

@Pipe({
  name: 'currencyFormat',
  standalone: true
})
export class CurrencyFormatPipe implements PipeTransform {
  transform(value: Money | number | null | undefined, currency: string = 'EGP'): string {
    if (value === null || value === undefined) return `0.00 ${currency}`;
    if (value instanceof Money) {
      return value.format();
    }
    return `${Number(value).toFixed(2)} ${currency}`;
  }
}
