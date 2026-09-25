import { TranslatePipe } from '../../pipes/translate.pipe';
import { Component, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { CouponStatRow } from '../../../core/domain/models/dashboard.model';

@Component({
  selector: 'app-coupon-stats',
  standalone: true,
  imports: [CommonModule, DecimalPipe, TranslatePipe],
  templateUrl: './coupon-stats.component.html'
})
export class CouponStatsComponent {
  readonly coupons = input<CouponStatRow[]>([]);
  readonly totalRedemptions = input(0);

  usagePercentage(coupon: CouponStatRow): number {
    if (!coupon.maxCopies || coupon.maxCopies <= 0) return 100;
    return Math.min(100, Math.round((coupon.copyCount / coupon.maxCopies) * 100));
  }
}
