import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Coupon, CouponStatus } from '../../core/domain/models/coupon.model';
import { CouponRepository } from '../../core/domain/repositories/coupon.repository';
import { PHARMACY_BRANDS, pharmacyDisplayName } from '../../core/domain/pharmacy-brands';
import { I18nService } from '../../core/i18n/i18n.service';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-coupons',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './coupons.component.html'
})
export class CouponsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly couponsApi = inject(CouponRepository);
  private readonly i18n = inject(I18nService);
  readonly locale = inject(LocaleService);
  private readonly notifications = inject(NotificationService);

  readonly pharmacies = PHARMACY_BRANDS;

  readonly query = signal('');
  readonly pharmacyFilter = signal('all');
  readonly statusFilter = signal<'all' | CouponStatus>('all');
  readonly modalOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly items = signal<Coupon[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal(false);

  private queryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly form = this.fb.nonNullable.group({
    pharmacyCode: ['', Validators.required],
    code: ['', Validators.required],
    titleEn: ['', Validators.required],
    titleAr: ['', Validators.required],
    descriptionEn: [''],
    descriptionAr: [''],
    validFrom: ['', Validators.required],
    validUntil: ['', Validators.required],
    maxCopies: [100, [Validators.required, Validators.min(1)]],
    displayOrder: [0, [Validators.required, Validators.min(0)]],
    isActive: [true]
  });

  readonly liveCount = computed(() => this.items().filter((i) => i.status === 'live').length);
  readonly cappedCount = computed(() => this.items().filter((i) => i.status === 'capped').length);
  readonly inactiveCount = computed(() => this.items().filter((i) => i.status === 'inactive').length);

  readonly statusTabs = computed(() => {
    this.locale.locale();
    return [
      { value: 'all' as const, label: this.i18n.t('common.all') },
      { value: 'live' as const, label: this.i18n.t('coupons.statusLive') },
      { value: 'capped' as const, label: this.i18n.t('coupons.statusCapped') },
      { value: 'scheduled' as const, label: this.i18n.t('coupons.statusScheduled') },
      { value: 'inactive' as const, label: this.i18n.t('coupons.statusInactive') }
    ];
  });

  ngOnInit(): void {
    this.reload();
  }

  pharmacyLabel(code: string): string {
    return pharmacyDisplayName(code, code, this.locale.locale());
  }

  statusLabel(status: CouponStatus): string {
    return this.i18n.t(`coupons.status${status.charAt(0).toUpperCase()}${status.slice(1)}`);
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    if (this.queryTimer) clearTimeout(this.queryTimer);
    this.queryTimer = setTimeout(() => this.reload(), 350);
  }

  onPharmacyChange(value: string): void {
    this.pharmacyFilter.set(value);
    this.reload();
  }

  onStatusChange(value: 'all' | CouponStatus): void {
    this.statusFilter.set(value);
    this.reload();
  }

  openModal(): void {
    this.editingId.set(null);
    this.form.reset({
      pharmacyCode: '',
      code: '',
      titleEn: '',
      titleAr: '',
      descriptionEn: '',
      descriptionAr: '',
      validFrom: '',
      validUntil: '',
      maxCopies: 100,
      displayOrder: 0,
      isActive: true
    });
    this.modalOpen.set(true);
  }

  editItem(item: Coupon): void {
    this.editingId.set(item.id);
    this.form.setValue({
      pharmacyCode: item.pharmacyCode,
      code: item.code,
      titleEn: item.titleEn,
      titleAr: item.titleAr,
      descriptionEn: item.descriptionEn,
      descriptionAr: item.descriptionAr,
      validFrom: item.validFrom,
      validUntil: item.validUntil,
      maxCopies: item.maxCopies,
      displayOrder: item.displayOrder,
      isActive: item.isActive
    });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  askRemove(id: string): void {
    this.pendingDeleteId.set(id);
  }

  confirmRemove(): void {
    const id = this.pendingDeleteId();
    if (!id) return;
    this.saving.set(true);
    this.couponsApi
      .delete(id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.pendingDeleteId.set(null);
          this.notifications.showSuccess(this.i18n.t('coupons.deleted'), this.i18n.t('coupons.title'));
          this.reload();
        },
        error: () => this.notifications.showError(this.i18n.t('coupons.error'), this.i18n.t('common.delete'))
      });
  }

  copyCode(code: string): void {
    void navigator.clipboard.writeText(code).then(
      () => this.notifications.showSuccess(this.i18n.t('coupons.copied'), this.i18n.t('coupons.title')),
      () => this.notifications.showError(this.i18n.t('coupons.error'), this.i18n.t('coupons.copyCode'))
    );
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      pharmacyCode: value.pharmacyCode,
      code: value.code.trim(),
      titleEn: value.titleEn,
      titleAr: value.titleAr,
      descriptionEn: value.descriptionEn,
      descriptionAr: value.descriptionAr,
      validFrom: value.validFrom,
      validUntil: value.validUntil,
      maxCopies: value.maxCopies,
      displayOrder: value.displayOrder,
      isActive: value.isActive
    };

    const editingId = this.editingId();
    this.saving.set(true);
    const req = editingId
      ? this.couponsApi.update(editingId, payload)
      : this.couponsApi.create(payload);

    req.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.notifications.showSuccess(this.i18n.t('coupons.saved'), this.i18n.t('coupons.modalTitle'));
        this.closeModal();
        this.reload();
      },
      error: () => this.notifications.showError(this.i18n.t('coupons.saveError'), this.i18n.t('common.save'))
    });
  }

  private reload(): void {
    this.loading.set(true);
    this.error.set(false);
    this.couponsApi
      .listAdmin({
        query: this.query(),
        status: this.statusFilter(),
        pharmacy: this.pharmacyFilter()
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (rows) => this.items.set(rows),
        error: () => {
          this.error.set(true);
          this.items.set([]);
        }
      });
  }
}
