import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CatalogBrowseRepository } from '../../core/domain/repositories/catalog-browse.repository';
import { CatalogFamily, CatalogOffer, CatalogPack, catalogFamilyTitle, catalogPackTitle, familyMatchType, isAiMatch, isConfirmedMatch } from '../../core/domain/models/catalog-family.model';
import {
  pharmacyDisplayName,
  pharmacyLogo as resolvePharmacyLogo
} from '../../core/domain/pharmacy-brands';
import { I18nService } from '../../core/i18n/i18n.service';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import {
  displayPackSize as formatPackSize,
  packChipLabel as formatPackChipLabel,
  packSizeDir as formatPackSizeDir
} from '../../core/domain/pack-size-display';
import { QuickAddProductModalComponent } from './components/quick-add-product-modal/quick-add-product-modal.component';
import { ProductImageModalComponent } from './components/product-image-modal/product-image-modal.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, CurrencyPipe, QuickAddProductModalComponent, ProductImageModalComponent],
  templateUrl: './product-detail.component.html'
})
export class ProductDetailComponent implements OnInit {
  private readonly catalog = inject(CatalogBrowseRepository);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  readonly locale = inject(LocaleService);

  readonly family = signal<CatalogFamily | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly linkDrafts = signal<Record<string, string>>({});
  readonly linkingId = signal<string | null>(null);
  readonly unlinkingId = signal<string | null>(null);
  readonly selectedMasterId = signal<string | null>(null);
  readonly isQuickAddOpen = signal<boolean>(false);
  readonly isImageModalOpen = signal<boolean>(false);

  readonly selectedPack = computed(() => {
    const f = this.family();
    const id = this.selectedMasterId();
    if (!f?.packs.length) return null;
    return f.packs.find((p) => p.masterId === id) ?? f.packs[0] ?? null;
  });

  readonly displayLowPrice = computed(() => {
    const pack = this.selectedPack();
    if (pack) return pack.lowestPrice > 0 ? pack.lowestPrice : 0;
    return 0;
  });

  readonly displayHighPrice = computed(() => {
    const pack = this.selectedPack();
    if (pack) return pack.highestPrice > 0 ? pack.highestPrice : 0;
    return 0;
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const key = params.get('key')?.trim() || this.route.snapshot.paramMap.get('key')?.trim() || '';
      if (!key) {
        this.error.set(true);
        this.family.set(null);
        this.selectedMasterId.set(null);
        return;
      }
      this.load(key);
    });
  }

  selectPack(masterId: string): void {
    this.selectedMasterId.set(masterId);
  }

  readonly isAiMatch = isAiMatch;

  hasAiMatch(family?: CatalogFamily | null): boolean {
    if (!family) return false;
    return family.packs.some((p) => p.offers.some((o) => isAiMatch(o)));
  }

  familyTitle(f: CatalogFamily): string {
    return catalogFamilyTitle(f, this.locale.locale());
  }

  packChipLabel(pack: CatalogPack): string {
    const title = catalogPackTitle(pack, this.locale.locale());
    return formatPackChipLabel(pack.packSize, title || pack.label, { locale: this.locale.locale() });
  }

  pharmacyLabel(offer: CatalogOffer): string {
    return pharmacyDisplayName(offer.pharmacyCode, offer.pharmacyName, this.locale.locale());
  }

  pharmacyLogo(code: string | null | undefined): string | null {
    return resolvePharmacyLogo(code);
  }

  openImageModal(): void {
    this.isImageModalOpen.set(true);
  }

  onImageChanged(event: { masterId: string; imageUrl: string | null }): void {
    const f = this.family();
    if (!f) return;
    const key = f.familyKey;
    if (key) {
      this.load(key);
    }
  }

  heroImage(f: CatalogFamily): string | null {
    if (f.imageUrl) return f.imageUrl;
    return f.packs.flatMap((p) => p.offers.map((o) => o.imageUrl)).find((u): u is string => !!u) ?? null;
  }

  pharmacyCount(f: CatalogFamily): number {
    const codes = new Set(
      f.packs.flatMap((p) => p.offers.map((o) => o.pharmacyCode.toLowerCase()).filter(Boolean))
    );
    return codes.size || f.packs.reduce((max, p) => Math.max(max, p.pharmacyCount), 0);
  }

  isConfirmedFamily(f: CatalogFamily): boolean {
    return isConfirmedMatch(familyMatchType(f));
  }

  displayPackSize(packSize: string | null | undefined): string {
    return formatPackSize(packSize, this.locale.locale());
  }

  packSizeDir(packSize: string | null | undefined): 'ltr' | null {
    return formatPackSizeDir(this.displayPackSize(packSize));
  }

  copyCode(code: string): void {
    void navigator.clipboard.writeText(code).then(() => {
      this.notifications.showSuccess(this.i18n.t('productDetail.copied'), code);
    });
  }

  copyBarcode(barcode: string): void {
    void navigator.clipboard.writeText(barcode).then(() => {
      this.notifications.showSuccess(this.i18n.t('productDetail.barcodeCopied'), barcode);
    });
  }

  setDraft(id: string, value: string): void {
    this.linkDrafts.update((m) => ({ ...m, [id]: value }));
  }

  linkOffer(offer: CatalogOffer): void {
    const id = offer.pharmacyProductId;
    if (!id) return;
    const code = (this.linkDrafts()[id] || '').trim();
    if (!code) {
      this.notifications.showError(this.i18n.t('productDetail.codeRequired'), this.i18n.t('productDetail.link'));
      return;
    }
    this.linkingId.set(id);
    this.catalog
      .linkByGroupCode(id, code)
      .pipe(finalize(() => this.linkingId.set(null)))
      .subscribe({
        next: (res) => {
          this.notifications.showSuccess(this.i18n.t('productDetail.linkedOk'), res.code);
          const key = this.family()?.familyKey;
          if (key) this.load(key);
        },
        error: () => {
          this.notifications.showError(this.i18n.t('productDetail.linkedFail'), this.i18n.t('productDetail.link'));
        }
      });
  }

  async unlinkOffer(offer: CatalogOffer): Promise<void> {
    const id = offer.pharmacyProductId;
    if (!id) return;
    const confirmed = await this.confirmDialog.confirm({
      title: this.i18n.t('productDetail.unlink'),
      message: this.i18n.t('productDetail.unlinkConfirm'),
      type: 'danger',
      confirmText: this.i18n.t('productDetail.unlink'),
    });
    if (!confirmed) return;

    this.unlinkingId.set(id);
    this.catalog
      .unlinkOffer(id)
      .pipe(finalize(() => this.unlinkingId.set(null)))
      .subscribe({
        next: () => {
          this.removeOfferLocally(id);
          this.notifications.showSuccess(
            this.i18n.t('productDetail.unlinkedOk'),
            this.pharmacyLabel(offer)
          );
          const key = this.family()?.familyKey;
          if (key) this.load(key);
        },
        error: () => {
          this.notifications.showError(
            this.i18n.t('productDetail.unlinkedFail'),
            this.i18n.t('productDetail.unlink')
          );
        }
      });
  }

  private removeOfferLocally(pharmacyProductId: string): void {
    this.family.update((f) => {
      if (!f) return null;
      return {
        ...f,
        packs: f.packs.map((pack) => {
          const remainingOffers = pack.offers.filter((o) => o.pharmacyProductId !== pharmacyProductId);
          return {
            ...pack,
            offers: remainingOffers,
            pharmacyCount: remainingOffers.length
          };
        })
      };
    });
  }

  openQuickAdd(): void {
    this.isQuickAddOpen.set(true);
  }

  closeQuickAdd(): void {
    this.isQuickAddOpen.set(false);
  }

  onQuickProductAdded(event?: { pharmacyProductId: string; groupCode: string }): void {
    this.closeQuickAdd();
    const key = this.family()?.familyKey || event?.groupCode;
    if (key) this.load(key);
  }

  private applyFamily(family: CatalogFamily): void {
    const prev = this.selectedMasterId();
    const stillThere = prev && family.packs.some((p) => p.masterId === prev);
    this.family.set(family);
    this.selectedMasterId.set(stillThere ? prev : family.packs[0]?.masterId ?? null);
  }

  private load(familyKey: string): void {
    this.loading.set(true);
    this.error.set(false);
    this.catalog
      .getFamilyByKey(familyKey)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (family) => this.applyFamily(family),
        error: () => {
          this.error.set(true);
          this.family.set(null);
          this.selectedMasterId.set(null);
        }
      });
  }
}
