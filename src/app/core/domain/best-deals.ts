export const DEFAULT_MIN_DISCOUNT = 20;
export const MIN_DISCOUNT = 0;
export const MAX_DISCOUNT = 80;
export const DISCOUNT_STEP = 5;

export function clampDiscountPercent(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MIN_DISCOUNT;
  const rounded = Math.round(value / DISCOUNT_STEP) * DISCOUNT_STEP;
  return Math.min(MAX_DISCOUNT, Math.max(MIN_DISCOUNT, rounded));
}
