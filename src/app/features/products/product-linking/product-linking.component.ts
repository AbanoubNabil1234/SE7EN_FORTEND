import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';
import { CatalogBrowseRepository } from '../../../core/domain/repositories/catalog-browse.repository';
import {
  CatalogFamily,
  FamilyAiSuggestion,
  PharmacyProductSearchHit
} from '../../../core/domain/models/catalog-family.model';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LocaleService } from '../../../core/services/locale.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ProxyImgPipe } from '../../../shared/pipes/proxy-img.pipe';

export type LinkingFilterMode = 'all' | 'binary' | 'ternary' | 'quaternary' | 'partial' | 'full';

@Component({
  selector: 'app-product-linking',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ProxyImgPipe],
  templateUrl: './product-linking.component.html',
  styleUrl: './product-linking.component.css'
})
export class ProductLinkingComponent implements OnInit, OnDestroy {
  readonly locale = inject(LocaleService);
  private readonly catalog = inject(CatalogBrowseRepository);
  private readonly i18n = inject(I18nService);
  private readonly notifications = inject(NotificationService);

  // Filter & Search for Linked Products (Left Pane)
  readonly filterMode = signal<LinkingFilterMode>('all');
  readonly searchLinkedQuery = signal<string>('');
  readonly families = signal<CatalogFamily[]>([]);
  readonly loadingLinked = signal<boolean>(false);
  readonly selectedFamily = signal<CatalogFamily | null>(null);

  // Accordion toggle states
  readonly accordionOpen = signal<{
    full: boolean;
    partial: boolean;
    two: boolean;
    three: boolean;
  }>({
    full: true,
    partial: true,
    two: true,
    three: true
  });

  // Right Pane Tabs
  readonly activeTab = signal<'suggestions' | 'search'>('suggestions');

  // Suggestions state
  readonly suggestions = signal<FamilyAiSuggestion[]>([]);
  readonly loadingSuggestions = signal<boolean>(false);
  readonly ignoredSuggestionIds = signal<Set<string>>(new Set());
  readonly linkingSuggestionId = signal<string | null>(null);

  // Manual Search state
  readonly manualSearchQuery = signal<string>('');
  readonly unlinkedOnly = signal<boolean>(true);
  readonly searchResults = signal<PharmacyProductSearchHit[]>([]);
  readonly searchingManual = signal<boolean>(false);
  readonly linkingManualId = signal<string | null>(null);

  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private linkedDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private familiesSub: Subscription | null = null;

  // Filtered families based on search query
  readonly filteredFamilies = computed(() => {
    const list = this.families();
    const q = this.searchLinkedQuery().trim().toLowerCase();
    if (!q) return list;
    return list.filter((f) => {
      const nameAr = (f.arabicName || '').toLowerCase();
      const nameEn = (f.englishName || f.label || '').toLowerCase();
      const groupCode = (f.groupCode || '').toLowerCase();
      const barcode = (this.getBarcode(f) || '').toLowerCase();
      return (
        nameAr.includes(q) ||
        nameEn.includes(q) ||
        groupCode.includes(q) ||
        barcode.includes(q)
      );
    });
  });

  // Grouped families for accordion sections
  readonly fullyLinkedFamilies = computed(() =>
    this.filteredFamilies().filter((f) => this.getPharmacyCount(f) >= 12)
  );

  readonly partiallyLinkedFamilies = computed(() =>
    this.filteredFamilies().filter((f) => {
      const count = this.getPharmacyCount(f);
      return count >= 4 && count < 12;
    })
  );

  readonly twoPharmaciesFamilies = computed(() =>
    this.filteredFamilies().filter((f) => this.getPharmacyCount(f) === 2)
  );

  readonly threePharmaciesFamilies = computed(() =>
    this.filteredFamilies().filter((f) => this.getPharmacyCount(f) === 3)
  );

  // Visible suggestions excluding ignored
  readonly visibleSuggestions = computed(() => {
    const ignored = this.ignoredSuggestionIds();
    return this.suggestions().filter((s) => !ignored.has(s.id));
  });

  ngOnInit(): void {
    this.loadFamilies();
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    if (this.linkedDebounceTimer) clearTimeout(this.linkedDebounceTimer);
    this.familiesSub?.unsubscribe();
  }

  loadFamilies(): void {
    this.loadingLinked.set(true);
    let pharmacyCount: number | undefined;

    const mode = this.filterMode();
    if (mode === 'binary') pharmacyCount = 2;
    else if (mode === 'ternary') pharmacyCount = 3;
    else if (mode === 'quaternary') pharmacyCount = 4;

    this.familiesSub?.unsubscribe();
    this.familiesSub = this.catalog
      .listFamilies({
        pageSize: 60,
        pharmacyCount
      })
      .pipe(finalize(() => this.loadingLinked.set(false)))
      .subscribe({
        next: (page) => {
          this.families.set(page.data || []);
          if (!this.selectedFamily() && page.data.length > 0) {
            this.selectFamily(page.data[0]);
          }
        },
        error: () => {
          this.notifications.showError(
            this.i18n.t('productLinking.loadError'),
            this.i18n.t('productLinking.title')
          );
        }
      });
  }

  setFilterMode(mode: LinkingFilterMode): void {
    if (this.filterMode() === mode) return;
    this.filterMode.set(mode);
    this.loadFamilies();
  }

  onLinkedQueryChange(query: string): void {
    this.searchLinkedQuery.set(query);
  }

  toggleAccordion(section: 'full' | 'partial' | 'two' | 'three'): void {
    this.accordionOpen.update((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  }

  selectFamily(family: CatalogFamily): void {
    this.selectedFamily.set(family);
    this.ignoredSuggestionIds.set(new Set());
    this.loadSuggestions(family);
    if (this.manualSearchQuery().trim()) {
      this.executeManualSearch();
    }
  }

  loadSuggestions(family: CatalogFamily): void {
    const code = family.groupCode || family.familyKey;
    if (!code) {
      this.suggestions.set([]);
      return;
    }
    this.loadingSuggestions.set(true);
    this.catalog
      .getFamilyAiSuggestions(code, 20)
      .pipe(finalize(() => this.loadingSuggestions.set(false)))
      .subscribe({
        next: (res) => this.suggestions.set(res || []),
        error: () => this.suggestions.set([])
      });
  }

  confirmLinkSuggestion(suggestion: FamilyAiSuggestion): void {
    const family = this.selectedFamily();
    const groupCode = family?.groupCode;
    if (!family || !groupCode) return;

    this.linkingSuggestionId.set(suggestion.id);
    this.catalog
      .linkByGroupCode(suggestion.id, groupCode)
      .pipe(finalize(() => this.linkingSuggestionId.set(null)))
      .subscribe({
        next: () => {
          this.notifications.showSuccess(
            this.i18n.t('productLinking.linkedSuccessfully'),
            suggestion.name
          );
          // Remove linked item from suggestions
          this.suggestions.update((prev) => prev.filter((s) => s.id !== suggestion.id));
          // Reload current family
          this.refreshSelectedFamily(family.familyKey);
        },
        error: () => {
          this.notifications.showError(
            this.i18n.t('productLinking.linkedFailed'),
            this.i18n.t('productLinking.title')
          );
        }
      });
  }

  ignoreSuggestion(suggestion: FamilyAiSuggestion): void {
    this.ignoredSuggestionIds.update((prev) => {
      const next = new Set(prev);
      next.add(suggestion.id);
      return next;
    });
    this.notifications.showWarn(
      this.i18n.t('productLinking.ignoredToast'),
      suggestion.name
    );
  }

  onManualQueryChange(val: string): void {
    this.manualSearchQuery.set(val);
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    const q = val.trim();
    if (q.length < 2) {
      this.searchResults.set([]);
      return;
    }
    this.searchDebounceTimer = setTimeout(() => {
      this.executeManualSearch();
    }, 280);
  }

  toggleUnlinkedOnly(): void {
    this.unlinkedOnly.update((v) => !v);
    if (this.manualSearchQuery().trim().length >= 2) {
      this.executeManualSearch();
    }
  }

  executeManualSearch(): void {
    const q = this.manualSearchQuery().trim();
    if (q.length < 2) return;
    this.searchingManual.set(true);
    this.catalog
      .searchPharmacyProducts(q, null, 30, this.unlinkedOnly())
      .pipe(finalize(() => this.searchingManual.set(false)))
      .subscribe({
        next: (hits) => this.searchResults.set(hits || []),
        error: () => this.searchResults.set([])
      });
  }

  linkSearchedProduct(hit: PharmacyProductSearchHit): void {
    const family = this.selectedFamily();
    const groupCode = family?.groupCode;
    if (!family || !groupCode) return;

    this.linkingManualId.set(hit.id);
    this.catalog
      .linkByGroupCode(hit.id, groupCode)
      .pipe(finalize(() => this.linkingManualId.set(null)))
      .subscribe({
        next: () => {
          this.notifications.showSuccess(
            this.i18n.t('productLinking.linkedSuccessfully'),
            hit.name
          );
          // Remove from search results
          this.searchResults.update((prev) => prev.filter((h) => h.id !== hit.id));
          // Refresh selected family
          this.refreshSelectedFamily(family.familyKey);
        },
        error: () => {
          this.notifications.showError(
            this.i18n.t('productLinking.linkedFailed'),
            this.i18n.t('productLinking.title')
          );
        }
      });
  }

  viewProductUrl(url?: string | null): void {
    if (url && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  private refreshSelectedFamily(familyKey: string): void {
    this.catalog.getFamilyByKey(familyKey).subscribe({
      next: (updated) => {
        this.selectedFamily.set(updated);
        this.families.update((list) =>
          list.map((f) => (f.familyKey === familyKey ? updated : f))
        );
      },
      error: () => {}
    });
  }

  // Helpers
  getDisplayName(family: CatalogFamily): string {
    if (this.locale.isRtl()) {
      return family.arabicName || family.englishName || family.label || '';
    }
    return family.englishName || family.arabicName || family.label || '';
  }

  getBarcode(family: CatalogFamily): string {
    for (const pack of family.packs) {
      if (pack.barcode?.trim()) return pack.barcode.trim();
      for (const off of pack.offers) {
        if (off.barcode?.trim()) return off.barcode.trim();
      }
    }
    return '';
  }

  getPackSize(family: CatalogFamily): string {
    const pack = family.packs[0];
    return pack?.packSize || family.dosageForm || '';
  }

  getPharmacyCount(family: CatalogFamily): number {
    let maxCount = 0;
    for (const pack of family.packs) {
      const distinct = new Set(pack.offers.map((o) => (o.pharmacyCode || '').toLowerCase()));
      const c = Math.max(pack.pharmacyCount, distinct.size);
      if (c > maxCount) maxCount = c;
    }
    return maxCount;
  }

  getMatchPercent(confidence: number): number {
    return Math.round(confidence <= 1 ? confidence * 100 : confidence);
  }

  isHighMatch(confidence: number): boolean {
    return this.getMatchPercent(confidence) >= 90;
  }

  isMediumMatch(confidence: number): boolean {
    const p = this.getMatchPercent(confidence);
    return p >= 60 && p < 90;
  }
}
