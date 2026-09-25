import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { Magazine } from '../../core/domain/models/magazine.model';
import { MagazineRepository } from '../../core/domain/repositories/magazine.repository';
import { PHARMACY_BRANDS, pharmacyDisplayName } from '../../core/domain/pharmacy-brands';
import { I18nService } from '../../core/i18n/i18n.service';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-magazines',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './magazines.component.html'
})
export class MagazinesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly magazinesApi = inject(MagazineRepository);
  private readonly i18n = inject(I18nService);
  readonly locale = inject(LocaleService);
  private readonly notifications = inject(NotificationService);

  readonly pharmacies = PHARMACY_BRANDS;

  readonly query = signal('');
  readonly pharmacyFilter = signal('all');
  readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly modalOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly items = signal<Magazine[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal(false);

  // Upload state
  readonly pickedCoverFile = signal<File | null>(null);
  readonly coverPreviewUrl = signal<string | null>(null);
  readonly pickedPdfFile = signal<File | null>(null);
  readonly pickedPdfName = signal<string | null>(null);
  readonly pickedPdfSize = signal<string | null>(null);

  private queryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly form = this.fb.nonNullable.group({
    pharmacyCode: ['', Validators.required],
    titleEn: ['', Validators.required],
    titleAr: ['', Validators.required],
    descriptionEn: [''],
    descriptionAr: [''],
    validFrom: ['', Validators.required],
    validUntil: ['', Validators.required],
    displayOrder: [0, [Validators.required, Validators.min(0)]],
    coverImageUrl: [''],
    pdfUrl: [''],
    isActive: [true]
  });

  readonly activeCount = computed(() => this.items().filter((i) => i.status === 'active').length);
  readonly inactiveCount = computed(() => this.items().filter((i) => i.status !== 'active').length);

  readonly effectiveCoverPreview = computed(() => {
    return this.coverPreviewUrl() || this.form.controls.coverImageUrl.value.trim() || null;
  });

  readonly statusTabs = computed(() => {
    this.locale.locale();
    return [
      { value: 'all' as const, label: this.i18n.t('common.all') },
      { value: 'active' as const, label: this.i18n.t('common.active') },
      { value: 'inactive' as const, label: this.i18n.t('common.inactive') }
    ];
  });

  ngOnInit(): void {
    this.reload();
  }

  pharmacyLabel(code: string): string {
    return pharmacyDisplayName(code, code, this.locale.locale());
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

  onStatusChange(value: 'all' | 'active' | 'inactive'): void {
    this.statusFilter.set(value);
    this.reload();
  }

  openModal(): void {
    this.editingId.set(null);
    this.form.reset({
      pharmacyCode: '',
      titleEn: '',
      titleAr: '',
      descriptionEn: '',
      descriptionAr: '',
      validFrom: '',
      validUntil: '',
      displayOrder: 0,
      coverImageUrl: '',
      pdfUrl: '',
      isActive: true
    });
    this.clearMediaState();
    this.modalOpen.set(true);
  }

  editItem(item: Magazine): void {
    this.editingId.set(item.id);
    this.form.setValue({
      pharmacyCode: item.pharmacyCode,
      titleEn: item.titleEn,
      titleAr: item.titleAr,
      descriptionEn: item.descriptionEn,
      descriptionAr: item.descriptionAr,
      validFrom: item.validFrom,
      validUntil: item.validUntil,
      displayOrder: item.displayOrder,
      coverImageUrl: item.coverImageUrl ?? '',
      pdfUrl: item.pdfUrl ?? '',
      isActive: item.isActive
    });
    this.clearMediaState();
    if (item.coverImageUrl) {
      this.coverPreviewUrl.set(item.coverImageUrl);
    }
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.clearMediaState();
  }

  onCoverPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (file.type && !allowed.includes(file.type)) {
      this.notifications.showError(this.i18n.t('magazines.imageTypeError'), this.i18n.t('magazines.uploadCover'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.notifications.showError(this.i18n.t('magazines.imageTooLarge'), this.i18n.t('magazines.uploadCover'));
      return;
    }

    this.revokeCoverPreview();
    this.pickedCoverFile.set(file);
    this.coverPreviewUrl.set(URL.createObjectURL(file));
  }

  removeCoverFile(): void {
    this.revokeCoverPreview();
    this.pickedCoverFile.set(null);
    this.coverPreviewUrl.set(null);
    this.form.controls.coverImageUrl.setValue('');
  }

  onCoverUrlInput(): void {
    if (this.pickedCoverFile()) {
      this.revokeCoverPreview();
      this.pickedCoverFile.set(null);
      this.coverPreviewUrl.set(null);
    }
  }

  onPdfPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      this.notifications.showError(this.i18n.t('magazines.pdfTypeError'), this.i18n.t('magazines.uploadPdf'));
      return;
    }
    if (file.size > 35 * 1024 * 1024) {
      this.notifications.showError(this.i18n.t('magazines.pdfTooLarge'), this.i18n.t('magazines.uploadPdf'));
      return;
    }

    this.pickedPdfFile.set(file);
    this.pickedPdfName.set(file.name);
    this.pickedPdfSize.set(this.formatFileSize(file.size));
  }

  removePdfFile(): void {
    this.pickedPdfFile.set(null);
    this.pickedPdfName.set(null);
    this.pickedPdfSize.set(null);
    this.form.controls.pdfUrl.setValue('');
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  private clearMediaState(): void {
    this.revokeCoverPreview();
    this.pickedCoverFile.set(null);
    this.coverPreviewUrl.set(null);
    this.pickedPdfFile.set(null);
    this.pickedPdfName.set(null);
    this.pickedPdfSize.set(null);
  }

  private revokeCoverPreview(): void {
    const prev = this.coverPreviewUrl();
    if (prev && prev.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(prev);
      } catch {
        // ignore
      }
    }
  }

  askRemove(id: string): void {
    this.pendingDeleteId.set(id);
  }

  confirmRemove(): void {
    const id = this.pendingDeleteId();
    if (!id) return;
    this.saving.set(true);
    this.magazinesApi
      .delete(id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.pendingDeleteId.set(null);
          this.notifications.showSuccess(this.i18n.t('magazines.deleted'), this.i18n.t('magazines.title'));
          this.reload();
        },
        error: () => this.notifications.showError(this.i18n.t('magazines.error'), this.i18n.t('common.delete'))
      });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const coverFile = this.pickedCoverFile();
    const pdfFile = this.pickedPdfFile();
    this.saving.set(true);

    const uploadCover$ = coverFile
      ? this.magazinesApi.uploadCover(coverFile).pipe(map((res) => res.url))
      : of(value.coverImageUrl.trim() || null);

    const uploadPdf$ = pdfFile
      ? this.magazinesApi.uploadPdf(pdfFile).pipe(map((res) => res.url))
      : of(value.pdfUrl.trim() || null);

    forkJoin({ coverUrl: uploadCover$, pdfUrl: uploadPdf$ })
      .pipe(
        switchMap(({ coverUrl, pdfUrl }) => {
          const payload = {
            pharmacyCode: value.pharmacyCode,
            titleEn: value.titleEn,
            titleAr: value.titleAr,
            descriptionEn: value.descriptionEn,
            descriptionAr: value.descriptionAr,
            validFrom: value.validFrom,
            validUntil: value.validUntil,
            displayOrder: value.displayOrder,
            coverImageUrl: coverUrl,
            pdfUrl: pdfUrl,
            isActive: value.isActive
          };

          const editingId = this.editingId();
          return editingId
            ? this.magazinesApi.update(editingId, payload)
            : this.magazinesApi.create(payload);
        }),
        finalize(() => this.saving.set(false))
      )
      .subscribe({
        next: () => {
          this.notifications.showSuccess(this.i18n.t('magazines.saved'), this.i18n.t('magazines.modalTitle'));
          this.closeModal();
          this.reload();
        },
        error: (err) => {
          const msg = err?.error?.message || this.i18n.t('magazines.error');
          this.notifications.showError(msg, this.i18n.t('common.save'));
        }
      });
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(false);
    this.magazinesApi
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
