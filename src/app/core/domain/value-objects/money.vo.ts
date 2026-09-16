/**
 * Money Value Object (Domain-Driven Design).
 * Encapsulates amount, currency, immutability, and financial operations.
 */
export class Money {
  readonly amount: number;
  readonly currency: string;

  constructor(amount: number, currency: string = 'EGP') {
    if (amount < 0) {
      throw new Error('Money amount cannot be negative');
    }
    this.amount = amount;
    this.currency = currency;
  }

  format(): string {
    return `${this.amount.toFixed(2)} ${this.currency}`;
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot add currencies: ${this.currency} and ${other.currency}`);
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot subtract currencies: ${this.currency} and ${other.currency}`);
    }
    const diff = this.amount - other.amount;
    return new Money(Math.max(0, diff), this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}
