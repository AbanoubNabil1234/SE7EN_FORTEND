import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminNotificationItem, BroadcastNotificationPayload } from '../../core/domain/models/notification.model';
import { NotificationRepository } from '../../core/domain/repositories/notification.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly notificationRepo = inject(NotificationRepository);
  private readonly i18n = inject(I18nService);
  private readonly toast = inject(NotificationService);
  readonly locale = inject(LocaleService);

  readonly items = signal<AdminNotificationItem[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly totalCount = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(15);
  readonly query = signal('');
  readonly selectedType = signal('all');
  readonly modalOpen = signal(false);

  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  readonly broadcastForm = this.fb.nonNullable.group({
    titleAr: ['', Validators.required],
    titleEn: ['', Validators.required],
    bodyAr: ['', Validators.required],
    bodyEn: ['', Validators.required],
    type: ['system', Validators.required],
    deepLink: [''],
    imageUrl: [''],
    sendPush: [true]
  });

  readonly stats = computed(() => {
    const list = this.items();
    return {
      total: this.totalCount(),
      coupons: list.filter((n) => n.type === 'coupon').length,
      magazines: list.filter((n) => n.type === 'magazine').length,
      billboards: list.filter((n) => n.type === 'billboard').length,
      system: list.filter((n) => n.type === 'system').length
    };
  });

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading.set(true);
    this.notificationRepo
      .listAdmin({
        q: this.query(),
        type: this.selectedType(),
        page: this.page(),
        pageSize: this.pageSize()
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.totalCount.set(res.totalCount);
        },
        error: () => {
          this.toast.showError(this.i18n.t('common.networkError'));
        }
      });
  }

  onSearch(value: string): void {
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.query.set(value.trim());
      this.page.set(1);
      this.loadNotifications();
    }, 300);
  }

  onTypeChange(type: string): void {
    this.selectedType.set(type);
    this.page.set(1);
    this.loadNotifications();
  }

  openBroadcastModal(): void {
    this.broadcastForm.reset({
      titleAr: '',
      titleEn: '',
      bodyAr: '',
      bodyEn: '',
      type: 'system',
      deepLink: '',
      imageUrl: '',
      sendPush: true
    });
    this.modalOpen.set(true);
  }

  closeBroadcastModal(): void {
    if (this.saving()) return;
    this.modalOpen.set(false);
  }

  submitBroadcast(): void {
    if (this.broadcastForm.invalid || this.saving()) {
      this.broadcastForm.markAllAsTouched();
      return;
    }

    const val = this.broadcastForm.getRawValue();
    const payload: BroadcastNotificationPayload = {
      titleAr: val.titleAr.trim(),
      titleEn: val.titleEn.trim(),
      bodyAr: val.bodyAr.trim(),
      bodyEn: val.bodyEn.trim(),
      type: val.type,
      deepLink: val.deepLink.trim() || null,
      imageUrl: val.imageUrl.trim() || null,
      sendPush: val.sendPush
    };

    this.saving.set(true);
    this.notificationRepo
      .broadcast(payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.showSuccess(this.i18n.t('notifications.sendSuccess'));
          this.modalOpen.set(false);
          this.loadNotifications();
        },
        error: () => {
          this.toast.showError(this.i18n.t('common.networkError'));
        }
      });
  }

  getTypeBadgeClass(type: string): string {
    switch (type.toLowerCase()) {
      case 'coupon':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'magazine':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'billboard':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'price_drop':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    }
  }

  getTypeLabelKey(type: string): string {
    switch (type.toLowerCase()) {
      case 'coupon':
        return 'notifications.typeCoupon';
      case 'magazine':
        return 'notifications.typeMagazine';
      case 'billboard':
        return 'notifications.typeBillboard';
      case 'price_drop':
        return 'notifications.typePriceDrop';
      default:
        return 'notifications.typeSystem';
    }
  }

  formatDate(utcDate: string): string {
    try {
      const date = new Date(utcDate);
      return new Intl.DateTimeFormat(this.locale.locale() === 'ar' ? 'ar-SA' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);
    } catch {
      return utcDate;
    }
  }
}
