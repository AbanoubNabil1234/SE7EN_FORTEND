import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { CatalogBrowseRepository } from '../../../../core/domain/repositories/catalog-browse.repository';
import {
  CatalogFamily,
  CatalogPack,
  ProductImagesResponse,
  ProductPharmacyImageOption,
  catalogFamilyTitle
} from '../../../../core/domain/models/catalog-family.model';
import { pharmacyLogo as resolvePharmacyLogo } from '../../../../core/domain/pharmacy-brands';
import { resolveApiUrl } from '../../../../core/infrastructure/http/api-origin';
import { LocaleService } from '../../../../core/services/locale.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-product-image-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './product-image-modal.component.html'
})
export class ProductImageModalComponent {
  private readonly catalog = inject(CatalogBrowseRepository);
  private readonly notifications = inject(NotificationService);
  private readonly locale = inject(LocaleService);
  private readonly i18n = inject(I18nService);

  readonly isOpen = input<boolean>(false);
  readonly family = input<CatalogFamily | null>(null);
  readonly initialMasterId = input<string | null>(null);

  readonly close = output<void>();
  readonly imageChanged = output<{ masterId: string; imageUrl: string | null }>();

  readonly activeTab = signal<'offers' | 'upload' | 'url'>('offers');
  readonly activeMasterId = signal<string | null>(null);
  readonly loadingImages = signal<boolean>(false);
  readonly imagesData = signal<ProductImagesResponse | null>(null);

  readonly selectedFile = signal<File | null>(null);
  readonly selectedFilePreview = signal<string | null>(null);
  readonly urlInput = signal<string>('');

  readonly submitting = signal<boolean>(false);
  readonly statusMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  readonly resolveApiUrl = resolveApiUrl;

  constructor() {
    effect(
      () => {
        const open = this.isOpen();
        const fam = this.family();
        const initId = this.initialMasterId();

        if (open && fam) {
          const targetId = initId || fam.packs[0]?.masterId || null;
          this.activeMasterId.set(targetId);
          this.activeTab.set('offers');
          this.selectedFile.set(null);
          this.selectedFilePreview.set(null);
          this.urlInput.set('');
          this.statusMessage.set(null);
          if (targetId) {
            this.loadImages(targetId);
          }
        }
      },
      { allowSignalWrites: true }
    );
  }

  isRtl(): boolean {
    return this.locale.isRtl();
  }

  displayTitle(): string {
    const fam = this.family();
    return fam ? catalogFamilyTitle(fam, this.locale.locale()) : '';
  }

  currentPreviewImage(): string | null {
    const data = this.imagesData();
    if (data?.customImageUrl) return data.customImageUrl;
    const fam = this.family();
    if (fam?.imageUrl) return fam.imageUrl;
    const firstOffer = this.pharmacyOfferImages()[0];
    return firstOffer ? firstOffer.imageUrl : null;
  }

  hasCustomImage(): boolean {
    return !!this.imagesData()?.customImageUrl;
  }

  pharmacyOfferImages(): ProductPharmacyImageOption[] {
    return this.imagesData()?.pharmacyImages || [];
  }

  isImageActive(img: ProductPharmacyImageOption): boolean {
    const data = this.imagesData();
    if (!data?.customImageUrl) return false;
    return (
      data.customImageUrl === img.imageUrl ||
      data.customImageUrl.endsWith(img.imageUrl) ||
      img.imageUrl.endsWith(data.customImageUrl)
    );
  }

  pharmacyLogo(code: string | null | undefined): string | null {
    return resolvePharmacyLogo(code);
  }

  selectMaster(masterId: string): void {
    if (this.submitting() || this.activeMasterId() === masterId) return;
    this.activeMasterId.set(masterId);
    this.selectedFile.set(null);
    this.selectedFilePreview.set(null);
    this.urlInput.set('');
    this.statusMessage.set(null);
    this.loadImages(masterId);
  }

  loadImages(masterId: string): void {
    this.loadingImages.set(true);
    this.catalog
      .getProductImages(masterId)
      .pipe(finalize(() => this.loadingImages.set(false)))
      .subscribe({
        next: (res) => {
          this.imagesData.set(res);
        },
        error: (err) => {
          this.statusMessage.set({
            type: 'error',
            text: err?.error?.message || this.i18n.t('productImageModal.loadError')
          });
        }
      });
  }

  selectPharmacyImage(img: ProductPharmacyImageOption): void {
    const masterId = this.activeMasterId();
    if (!masterId || this.submitting()) return;

    this.submitting.set(true);
    this.statusMessage.set(null);

    this.catalog
      .setProductImageUrl(masterId, img.imageUrl)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (res) => {
          this.statusMessage.set({
            type: 'success',
            text: this.i18n.t('productImageModal.setSuccess')
          });
          this.loadImages(masterId);
          this.imageChanged.emit({ masterId, imageUrl: res.imageUrl });
          this.notifications.showSuccess(this.i18n.t('productImageModal.setSuccess'));
        },
        error: (err) => {
          this.statusMessage.set({
            type: 'error',
            text: err?.error?.message || this.i18n.t('productImageModal.setError')
          });
        }
      });
  }

  onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.statusMessage.set({
        type: 'error',
        text: this.i18n.t('productImageModal.invalidFile')
      });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      this.statusMessage.set({
        type: 'error',
        text: this.i18n.t('productImageModal.fileTooLarge')
      });
      return;
    }

    this.statusMessage.set(null);
    this.selectedFile.set(file);

    const reader = new FileReader();
    reader.onload = () => this.selectedFilePreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  clearSelectedFile(): void {
    this.selectedFile.set(null);
    this.selectedFilePreview.set(null);
  }

  submitUploadedFile(): void {
    const masterId = this.activeMasterId();
    const file = this.selectedFile();
    if (!masterId || !file || this.submitting()) return;

    this.submitting.set(true);
    this.statusMessage.set(null);

    this.catalog
      .uploadProductImage(masterId, file)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (res) => {
          this.statusMessage.set({
            type: 'success',
            text: this.i18n.t('productImageModal.uploadSuccess')
          });
          this.clearSelectedFile();
          this.loadImages(masterId);
          this.imageChanged.emit({ masterId, imageUrl: res.imageUrl });
          this.notifications.showSuccess(this.i18n.t('productImageModal.setSuccess'));
        },
        error: (err) => {
          this.statusMessage.set({
            type: 'error',
            text: err?.error?.message || this.i18n.t('productImageModal.uploadError')
          });
        }
      });
  }

  submitUrl(): void {
    const masterId = this.activeMasterId();
    const url = this.urlInput().trim();
    if (!masterId || !url || this.submitting()) return;

    this.submitting.set(true);
    this.statusMessage.set(null);

    this.catalog
      .setProductImageUrl(masterId, url)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (res) => {
          this.statusMessage.set({
            type: 'success',
            text: this.i18n.t('productImageModal.urlSuccess')
          });
          this.urlInput.set('');
          this.loadImages(masterId);
          this.imageChanged.emit({ masterId, imageUrl: res.imageUrl });
          this.notifications.showSuccess(this.i18n.t('productImageModal.setSuccess'));
        },
        error: (err) => {
          this.statusMessage.set({
            type: 'error',
            text: err?.error?.message || this.i18n.t('productImageModal.urlError')
          });
        }
      });
  }

  revertToAutoImage(): void {
    const masterId = this.activeMasterId();
    if (!masterId || this.submitting()) return;

    if (!confirm(this.i18n.t('productImageModal.confirmRestore'))) {
      return;
    }

    this.submitting.set(true);
    this.statusMessage.set(null);

    this.catalog
      .deleteProductImage(masterId)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.statusMessage.set({
            type: 'success',
            text: this.i18n.t('productImageModal.restoreSuccess')
          });
          this.loadImages(masterId);
          this.imageChanged.emit({ masterId, imageUrl: null });
          this.notifications.showInfo(this.i18n.t('productImageModal.restoreSuccess'));
        },
        error: (err) => {
          this.statusMessage.set({
            type: 'error',
            text: err?.error?.message || this.i18n.t('productImageModal.restoreError')
          });
        }
      });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  onImgFallback(event: Event): void {
    const target = event.target as HTMLElement;
    target.style.display = 'none';
  }

  onClose(): void {
    if (this.submitting()) return;
    this.close.emit();
  }
}
