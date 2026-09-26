import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { CatalogBrowseRepository } from '../../../../core/domain/repositories/catalog-browse.repository';
import {
  CatalogFamily,
  FamilyAiSuggestion,
  GroupCodeMergeResult,
  PharmacyProductSearchHit,
  catalogFamilyTitle,
  familyHeroImage
} from '../../../../core/domain/models/catalog-family.model';
import {
  PHARMACY_BRANDS,
  PharmacyBrand,
  pharmacyLogo as resolvePharmacyLogo
} from '../../../../core/domain/pharmacy-brands';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { LocaleService } from '../../../../core/services/locale.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ProxyImgPipe } from '../../../../shared/pipes/proxy-img.pipe';

@Component({
  selector: 'app-quick-add-product-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, TranslatePipe, ProxyImgPipe],
  templateUrl: './quick-add-product-modal.component.html'
})
export class QuickAddProductModalComponent {
  private readonly catalog = inject(CatalogBrowseRepository);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  private readonly locale = inject(LocaleService);

  readonly family = input<CatalogFamily | null>(null);
  readonly isOpen = input<boolean>(false);

  readonly close = output<void>();
  readonly productAdded = output<{
    pharmacyProductId: string;
    groupCode: string;
    hit?: PharmacyProductSearchHit;
  }>();
  readonly familyMerged = output<GroupCodeMergeResult>();

  readonly searchQuery = signal<string>('');
  readonly selectedPharmacy = signal<string>('all');
  readonly hits = signal<PharmacyProductSearchHit[]>([]);
  readonly aiSuggestions = signal<FamilyAiSuggestion[]>([]);
  readonly loading = signal<boolean>(false);
  readonly suggestionsLoading = signal<boolean>(false);
  readonly linkingId = signal<string | null>(null);
  readonly mergingCode = signal<string | null>(null);
  readonly hasSearched = signal<boolean>(false);
  readonly targetImageError = signal<boolean>(false);

  private searchDebounceTimer?: ReturnType<typeof setTimeout>;

  readonly isRtl = computed(() => this.locale.locale() === 'ar');

  readonly existingPharmacyCodes = computed<Set<string>>(() => {
    const fam = this.family();
    const set = new Set<string>();
    if (!fam?.packs) return set;
    for (const pack of fam.packs) {
      if (pack.offers) {
        for (const offer of pack.offers) {
          if (offer.pharmacyCode) {
            set.add(offer.pharmacyCode.trim().toLowerCase());
          }
        }
      }
    }
    return set;
  });

  readonly availablePharmacies = computed<readonly PharmacyBrand[]>(() => {
    const existing = this.existingPharmacyCodes();
    return PHARMACY_BRANDS.filter(
      (b) => !existing.has(b.code.toLowerCase())
    );
  });

  readonly selectedPharmacyBrand = computed<PharmacyBrand | null>(() => {
    const code = this.selectedPharmacy();
    if (!code || code === 'all') return null;
    return PHARMACY_BRANDS.find((b) => b.code.toLowerCase() === code.toLowerCase()) ?? null;
  });

  private lastLoadedGroupCode: string | null = null;

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const fam = this.family();
      const code = fam?.groupCode;
      if (open && code) {
        if (this.lastLoadedGroupCode !== code) {
          this.lastLoadedGroupCode = code;
          this.loadAiSuggestions(code);
        }
      } else {
        this.lastLoadedGroupCode = null;
        this.aiSuggestions.set([]);
        this.searchQuery.set('');
        this.selectedPharmacy.set('all');
        this.hits.set([]);
        this.hasSearched.set(false);
      }
    });
  }

  loadAiSuggestions(groupCode: string): void {
    this.suggestionsLoading.set(true);
    this.catalog
      .getFamilyAiSuggestions(groupCode, 8)
      .pipe(finalize(() => this.suggestionsLoading.set(false)))
      .subscribe({
        next: (items) => this.aiSuggestions.set(items),
        error: () => this.aiSuggestions.set([])
      });
  }

  formatConfidence(conf: number): string {
    if (conf == null) return '0%';
    const pct = conf <= 1 ? Math.round(conf * 100) : Math.round(conf);
    return `${pct}%`;
  }

  addSuggestionToFamily(sug: FamilyAiSuggestion): void {
    const hit: PharmacyProductSearchHit = {
      id: sug.id,
      name: sug.name,
      englishName: sug.englishName,
      pharmacyCode: sug.pharmacyCode,
      pharmacyName: sug.pharmacyName,
      barcode: sug.barcode,
      price: sug.price,
      oldPrice: sug.oldPrice,
      currency: sug.currency,
      imageUrl: sug.imageUrl,
      productUrl: sug.productUrl,
      packSize: sug.packSize,
      manualGroupCode: sug.manualGroupCode,
      masterProductId: null
    };
    this.addHitToFamily(hit);
    // Remove added item from local suggestions
    this.aiSuggestions.update((list) => list.filter((s) => s.id !== sug.id));
  }

  currentFamilyTitle(): string {
    return catalogFamilyTitle(this.family(), this.locale.locale());
  }

  targetImageUrl(): string | null {
    if (this.targetImageError()) return null;
    const fam = this.family();
    if (!fam) return null;
    return familyHeroImage(fam);
  }

  onTargetImageError(): void {
    this.targetImageError.set(true);
  }

  onHitImageError(hit: PharmacyProductSearchHit): void {
    hit.imageUrl = null;
  }

  currentOffersCount(): number {
    const fam = this.family();
    if (!fam?.packs) return 0;
    return fam.packs.reduce((sum, p) => sum + (p.offers ? p.offers.length : 0), 0);
  }

  pharmacyLogo(code: string | null | undefined): string | null {
    return resolvePharmacyLogo(code);
  }

  isAlreadyInFamily(hit: PharmacyProductSearchHit): boolean {
    const fam = this.family();
    if (!fam) return false;
    return fam.packs.some((pack) =>
      pack.offers.some((offer) => offer.pharmacyProductId === hit.id)
    );
  }

  isGroupCodeQuery(query: string): boolean {
    const q = (query || '').trim().toUpperCase();
    return q.startsWith('G-') && q.length >= 4;
  }

  onPharmacyChange(code: string): void {
    this.selectedPharmacy.set(code);
    const query = this.searchQuery().trim();
    if (query.length >= 2) {
      this.loading.set(true);
      this.executeSearch(query, code);
    }
  }

  onSearchInput(query: string): void {
    this.searchQuery.set(query);
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      this.hits.set([]);
      this.hasSearched.set(false);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.searchDebounceTimer = setTimeout(() => {
      this.executeSearch(trimmed, this.selectedPharmacy());
    }, 300);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.hits.set([]);
    this.hasSearched.set(false);
    this.loading.set(false);
  }

  private executeSearch(term: string, pharmacyCode: string = this.selectedPharmacy()): void {
    const code = pharmacyCode === 'all' ? null : pharmacyCode;
    this.catalog
      .searchPharmacyProducts(term, code, 30)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (results) => {
          const existing = this.existingPharmacyCodes();
          const filtered = results.filter((r) => {
            if (code) {
              return r.pharmacyCode.toLowerCase() === code.toLowerCase();
            }
            return !existing.has(r.pharmacyCode.toLowerCase());
          });
          this.hits.set(filtered);
          this.hasSearched.set(true);
        },
        error: () => {
          this.hits.set([]);
          this.hasSearched.set(true);
        }
      });
  }

  addHitToFamily(hit: PharmacyProductSearchHit): void {
    const fam = this.family();
    const groupCode = fam?.groupCode;
    if (!fam || !groupCode) {
      this.notifications.showError(
        this.i18n.t('quickAdd.linkFailed'),
        this.i18n.t('productsAdmin.link')
      );
      return;
    }

    this.linkingId.set(hit.id);
    this.catalog
      .linkByGroupCode(hit.id, groupCode)
      .pipe(finalize(() => this.linkingId.set(null)))
      .subscribe({
        next: (res) => {
          this.notifications.showSuccess(this.i18n.t('quickAdd.addedSuccess'), hit.name);
          this.productAdded.emit({
            pharmacyProductId: hit.id,
            groupCode: res.code,
            hit
          });
          // Update hit's manualGroupCode locally
          this.hits.update((list) =>
            list.map((h) => (h.id === hit.id ? { ...h, manualGroupCode: res.code } : h))
          );
        },
        error: (err: { status?: number; error?: { code?: string } }) => {
          if (err.status === 409 || err.error?.code === 'same_pharmacy_in_family') {
            this.notifications.showError(
              this.i18n.t('quickAdd.conflictPharmacy'),
              this.i18n.t('productsAdmin.link')
            );
          } else {
            this.notifications.showError(
              this.i18n.t('quickAdd.linkFailed'),
              this.i18n.t('productsAdmin.link')
            );
          }
        }
      });
  }

  mergeGroup(otherCode: string): void {
    const fam = this.family();
    const currentCode = (fam?.groupCode || '').trim().toUpperCase();
    const sourceCode = (otherCode || '').trim().toUpperCase();
    if (!fam || !currentCode || !sourceCode) return;

    if (sourceCode === currentCode) {
      this.notifications.showError(
        this.i18n.t('productsAdmin.mergeSameError'),
        this.i18n.t('productsAdmin.mergeGroup')
      );
      return;
    }

    this.mergingCode.set(sourceCode);
    this.catalog
      .mergeGroups(sourceCode, currentCode)
      .pipe(finalize(() => this.mergingCode.set(null)))
      .subscribe({
        next: (res) => {
          this.notifications.showSuccess(
            this.i18n.t('quickAdd.familyMergedSuccess'),
            `${sourceCode} ➔ ${currentCode}`
          );
          this.familyMerged.emit(res);
          this.onClose();
        },
        error: (err: { status?: number; error?: { code?: string; message?: string } }) => {
          if (err?.status === 409 || err?.error?.code === 'same_pharmacy_in_family') {
            this.notifications.showError(
              this.i18n.t('productsAdmin.mergeConflictError'),
              this.i18n.t('productsAdmin.mergeGroup')
            );
          } else {
            const msg = err?.error?.message || this.i18n.t('productsAdmin.mergeFailed');
            this.notifications.showError(msg, this.i18n.t('productsAdmin.mergeGroup'));
          }
        }
      });
  }

  onClose(): void {
    this.clearSearch();
    this.selectedPharmacy.set('all');
    this.targetImageError.set(false);
    this.close.emit();
  }
}
