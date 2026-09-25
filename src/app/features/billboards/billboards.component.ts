import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Observable, switchMap } from 'rxjs';
import { Billboard } from '../../core/domain/models/billboard.model';
import { BillboardRepository } from '../../core/domain/repositories/billboard.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-billboards',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './billboards.component.html'
})
export class BillboardsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly billboards = inject(BillboardRepository);
  private readonly i18n = inject(I18nService);
  readonly locale = inject(LocaleService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly query = signal('');
  readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly modalOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly items = signal<Billboard[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal(false);
  readonly previewUrl = signal<string | null>(null);
  readonly pickedFile = signal<File | null>(null);
  readonly existingImageUrl = signal<string | null>(null);

  private queryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly form = this.fb.group({
    title: this.fb.nonNullable.control('', Validators.required),
    description: this.fb.nonNullable.control('', Validators.required),
    startDate: this.fb.nonNullable.control('', Validators.required),
    durationDays: this.fb.nonNullable.control(7, [Validators.required, Validators.min(1)]),
    imageLabelAr: this.fb.nonNullable.control(''),
    imageLabelEn: this.fb.nonNullable.control(''),
    percentage: this.fb.control<number | null>(null),
    fixedDiscount: this.fb.control<number | null>(null),
    linkUrl: this.fb.nonNullable.control('')
  });

  readonly activeCount = computed(() => this.items().filter((i) => i.status === 'active').length);
  readonly inactiveCount = computed(() => this.items().filter((i) => i.status !== 'active').length);

  readonly statusTabs = computed(() => {
    this.locale.locale();
    return [
      { value: 'all' as const, label: this.i18n.t('common.all') },
      { value: 'active' as const, label: this.i18n.t('common.active') },
      { value: 'inactive' as const, label: this.i18n.t('common.inactive') }
    ];
  });

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.items().filter((item) => {
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.imageLabelAr.includes(q) ||
        item.imageLabelEn.toLowerCase().includes(q)
      );
    });
  });

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.revokePreview());
    this.reload();
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    if (this.queryTimer) clearTimeout(this.queryTimer);
    this.queryTimer = setTimeout(() => this.reload(), 350);
  }

  onStatusChange(value: 'all' | 'active' | 'inactive'): void {
    this.statusFilter.set(value);
    this.reload();
  }

  openModal(): void {
    this.editingId.set(null);
    this.form.reset({
      title: '',
      description: '',
      startDate: '',
      durationDays: 7,
      imageLabelAr: '',
      imageLabelEn: '',
      percentage: null,
      fixedDiscount: null,
      linkUrl: ''
    });
    this.clearImageState();
    this.modalOpen.set(true);
  }

  editItem(item: Billboard): void {
    this.editingId.set(item.id);
    this.form.setValue({
      title: item.title,
      description: item.subtitle,
      startDate: item.startDate,
      durationDays: item.durationDays,
      imageLabelAr: item.imageLabelAr,
      imageLabelEn: item.imageLabelEn,
      percentage: item.percentage,
      fixedDiscount: item.fixedDiscount,
      linkUrl: item.linkUrl ?? ''
    });
    this.clearImageState();
    this.existingImageUrl.set(item.imageUrl);
    this.previewUrl.set(item.imageUrl);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.clearImageState();
  }

  onImagePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (file.type && !allowed.includes(file.type)) {
      this.notifications.showError(this.i18n.t('billboards.imageTypeError'), this.i18n.t('billboards.fieldImage'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.notifications.showError(this.i18n.t('billboards.imageTooLarge'), this.i18n.t('billboards.fieldImage'));
      return;
    }

    this.revokePreview();
    this.pickedFile.set(file);
    this.previewUrl.set(URL.createObjectURL(file));
  }

  askRemove(id: string): void {
    this.pendingDeleteId.set(id);
  }

  confirmRemove(): void {
    const id = this.pendingDeleteId();
    if (!id) return;
    this.saving.set(true);
    this.billboards
      .delete(id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.pendingDeleteId.set(null);
          this.notifications.showSuccess(this.i18n.t('billboards.deleted'), this.i18n.t('billboards.title'));
          this.reload();
        },
        error: () => {
          this.notifications.showError(this.i18n.t('billboards.error'), this.i18n.t('common.delete'));
        }
      });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const editingId = this.editingId();
    const file = this.pickedFile();
    this.saving.set(true);

    const persist = (imageUrl: string | null): Observable<Billboard> => {
      const payload = {
        title: value.title,
        subtitle: value.description,
        startDate: value.startDate,
        durationDays: value.durationDays,
        imageUrl,
        imageLabelAr: value.imageLabelAr.trim() || null,
        imageLabelEn: value.imageLabelEn.trim() || null,
        percentage: this.normalizeDiscountInput(value.percentage),
        fixedDiscount: this.normalizeDiscountInput(value.fixedDiscount),
        linkUrl: value.linkUrl.trim() || null
      };
      return editingId ? this.billboards.update(editingId, payload) : this.billboards.create(payload);
    };

    const req$ = file
      ? this.billboards.uploadImage(file).pipe(switchMap((url) => persist(url)))
      : persist(this.existingImageUrl());

    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.notifications.showSuccess(this.i18n.t('billboards.saved'), this.i18n.t('billboards.modalTitle'));
        this.closeModal();
        this.reload();
      },
      error: () => {
        this.notifications.showError(this.i18n.t('billboards.error'), this.i18n.t('common.save'));
      }
    });
  }

  discountLabel(item: Billboard): string | null {
    if (item.percentage != null && item.percentage > 0) {
      return `${item.percentage}${this.i18n.t('billboards.discountPercentSuffix')}`;
    }
    if (item.fixedDiscount != null && item.fixedDiscount > 0) {
      return `${item.fixedDiscount} ${this.i18n.t('billboards.discountCurrency')}`;
    }
    return null;
  }

  private normalizeDiscountInput(value: number | null | undefined): number | null {
    if (value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private reload(): void {
    this.loading.set(true);
    this.error.set(false);
    this.billboards
      .listAdmin({ query: this.query(), status: this.statusFilter() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (rows) => this.items.set(rows),
        error: () => {
          this.error.set(true);
          this.items.set([]);
        }
      });
  }

  private clearImageState(): void {
    this.revokePreview();
    this.pickedFile.set(null);
    this.previewUrl.set(null);
    this.existingImageUrl.set(null);
  }

  private revokePreview(): void {
    const url = this.previewUrl();
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}
