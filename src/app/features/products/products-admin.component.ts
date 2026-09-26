import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Subscription, finalize, skip } from 'rxjs';
import { CatalogBrowseRepository, CatalogFamilySort } from '../../core/domain/repositories/catalog-browse.repository';
import {
  CatalogFamily,
  CatalogOffer,
  CatalogPack,
  PharmacyProductSearchHit,
  catalogFamilyTitle,
  catalogListingKey,
  catalogOfferTitle,
  catalogPackTitle,
  flattenFamilyPacks,
  familyHeroImage,
  isAiMatch,
  isCatalogSearchReady,
  matchStatus,
  offerListingTitle
} from '../../core/domain/models/catalog-family.model';
import { CategoryNode } from '../../core/domain/models/category.model';
import { categoryDisplayName } from '../../core/domain/category-display';
import {
  displayPackSize as formatPackSize,
  packChipLabel as formatPackChipLabel,
  packSizeDir as formatPackSizeDir
} from '../../core/domain/pack-size-display';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import {
  pharmacyDisplayName,
  pharmacyLogo as resolvePharmacyLogo
} from '../../core/domain/pharmacy-brands';
import { I18nService } from '../../core/i18n/i18n.service';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { QuickAddProductModalComponent } from './components/quick-add-product-modal/quick-add-product-modal.component';
import { MatchReviewComponent } from '../match-review/match-review.component';
import { MatchReviewRepository } from '../../core/domain/repositories/match-review.repository';
import { AiMatchReviewModalComponent } from './components/ai-match-review-modal/ai-match-review-modal.component';
import { ProductImageModalComponent } from './components/product-image-modal/product-image-modal.component';

/** Server-side page size — do not load the full catalog into the browser. */
const CATALOG_PAGE_SIZE = 24;
const SEARCH_PAGE_SIZE = 24;

interface CategoryOption {
  slug: string;
  name: string;
}

@Component({
  selector: 'app-products-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TranslatePipe,
    CurrencyPipe,
    DecimalPipe,
    QuickAddProductModalComponent,
    MatchReviewComponent,
    AiMatchReviewModalComponent,
    ProductImageModalComponent
  ],
  templateUrl: './products-admin.component.html'
})
export class ProductsAdminComponent implements OnInit, OnDestroy {
  private readonly catalog = inject(CatalogBrowseRepository);
  private readonly matchReviews = inject(MatchReviewRepository);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  readonly locale = inject(LocaleService);

  readonly activeTab = signal<'catalog' | 'model-review'>('catalog');
  readonly modelReviewCount = signal<number>(3712);
  readonly autoCatalogMatchCount = signal<number>(2312);

  readonly isAiReviewModalOpen = signal<boolean>(false);
  readonly selectedAiMatchId = signal<string | null>(null);

  readonly isImageModalOpen = signal<boolean>(false);
  readonly imageTargetFamily = signal<CatalogFamily | null>(null);

  readonly families = signal<CatalogFamily[]>([]);
  readonly brands = signal<string[]>([]);
  readonly categoryNodes = signal<CategoryNode[]>([]);
  readonly primaryCategorySlug = signal<string>('');
  readonly subcategorySlug = signal<string>('');
  readonly pharmacyCount = signal<number | null>(null);
  readonly pharmacyDistribution = signal<Record<number, number>>({});
  readonly distributionTotal = signal<number>(0);
  readonly query = signal('');
  readonly categorySlug = signal('');
  readonly brand = signal('');
  readonly sort = signal<CatalogFamilySort>('pharmaciesDesc');
  readonly page = signal(1);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly selectedPackIds = signal<Record<string, string>>({});
  readonly linkDrafts = signal<Record<string, string>>({});
  readonly linkingId = signal<string | null>(null);
  readonly unlinkingId = signal<string | null>(null);
  readonly openOfferKeys = signal<ReadonlySet<string>>(new Set());
  readonly priceSyncBusyId = signal<string | null>(null);
  readonly barcodeDrafts = signal<Record<string, string>>({});
  readonly barcodeErrors = signal<Record<string, string>>({});
  readonly barcodeBusyId = signal<string | null>(null);
  readonly searching = signal(false);
  readonly listPageSize = signal(CATALOG_PAGE_SIZE);

  readonly quickAddFamily = signal<CatalogFamily | null>(null);
  readonly isQuickAddOpen = signal<boolean>(false);

  private queryTimer: ReturnType<typeof setTimeout> | null = null;
  private fetchSub: Subscription | null = null;

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.listPageSize()))
  );
  readonly rangeStart = computed(() =>
    this.total() === 0 ? 0 : (this.page() - 1) * this.listPageSize() + 1
  );
  readonly rangeEnd = computed(() =>
    Math.min(this.page() * this.listPageSize(), this.total())
  );
  readonly pageButtons = computed(() => this.buildPageButtons(this.page(), this.totalPages()));
  readonly primaryCategories = computed(() => this.categoryNodes());
  readonly selectedPrimaryNode = computed(() =>
    this.primaryCategories().find((c) => c.slug === this.primaryCategorySlug()) ?? null
  );
  readonly currentSubcategories = computed(() => this.selectedPrimaryNode()?.children ?? []);
  readonly searchReady = computed(() => isCatalogSearchReady(this.query()));

  readonly pharmacyCountOptions: Array<{ count: number; labelKey: string }> = [
    { count: 8, labelKey: 'productsAdmin.pharmacyCount8Plus' },
    { count: 7, labelKey: 'productsAdmin.pharmacyCount7' },
    { count: 6, labelKey: 'productsAdmin.pharmacyCount6' },
    { count: 5, labelKey: 'productsAdmin.pharmacyCount5' },
    { count: 4, labelKey: 'productsAdmin.pharmacyCount4' },
    { count: 3, labelKey: 'productsAdmin.pharmacyCount3' },
    { count: 2, labelKey: 'productsAdmin.pharmacyCount2' },
    { count: 1, labelKey: 'productsAdmin.pharmacyCount1' }
  ];

  readonly categoryVisuals: Record<string, { icon: string }> = {
    'medicines-treatments': { icon: 'pi pi-heart-fill' },
    'vitamins-supplements': { icon: 'pi pi-bolt' },
    'skin-care': { icon: 'pi pi-sparkles' },
    'hair-care': { icon: 'pi pi-star-fill' },
    'personal-care': { icon: 'pi pi-user' },
    'mother-baby': { icon: 'pi pi-heart' },
    'medical-supplies': { icon: 'pi pi-shield' },
    'beauty-cosmetics': { icon: 'pi pi-palette' },
    'health-food': { icon: 'pi pi-apple' },
    'other': { icon: 'pi pi-th-large' }
  };

  getCategoryIcon(slug: string): string {
    return this.categoryVisuals[slug]?.icon ?? 'pi pi-tag';
  }

  categoryLabel(node: CategoryNode): string {
    return categoryDisplayName(node, this.locale.locale());
  }

  countFor(n: number): number {
    const dist = this.pharmacyDistribution();
    if (n === 8) {
      let sum = 0;
      for (const [k, v] of Object.entries(dist)) {
        if (Number(k) >= 8) sum += v;
      }
      return sum;
    }
    return dist[n] ?? 0;
  }

  setPharmacyCount(count: number | null): void {
    if (this.pharmacyCount() === count) return;
    this.pharmacyCount.set(count);
    this.reload();
  }

  onPrimaryCategoryChange(slug: string): void {
    this.primaryCategorySlug.set(slug);
    this.subcategorySlug.set('');
    this.categorySlug.set(slug);
    this.reload();
    this.loadPharmacyDistribution();
  }

  onSubcategoryChange(slug: string): void {
    this.subcategorySlug.set(slug);
    const effectiveSlug = slug || this.primaryCategorySlug();
    this.categorySlug.set(effectiveSlug);
    this.reload();
    this.loadPharmacyDistribution();
  }

  loadPharmacyDistribution(): void {
    const cat = this.categorySlug().trim() || undefined;
    this.catalog.getPharmacyDistributionCounts(cat).subscribe({
      next: (res) => {
        this.pharmacyDistribution.set(res.counts);
        this.distributionTotal.set(res.total);
      },
      error: () => {}
    });
  }

  private syncCategoryFromSlug(slug: string): void {
    if (!slug) {
      this.primaryCategorySlug.set('');
      this.subcategorySlug.set('');
      return;
    }
    const nodes = this.categoryNodes();
    for (const parent of nodes) {
      if (parent.slug === slug) {
        this.primaryCategorySlug.set(parent.slug);
        this.subcategorySlug.set('');
        return;
      }
      if (parent.children) {
        for (const child of parent.children) {
          if (child.slug === slug) {
            this.primaryCategorySlug.set(parent.slug);
            this.subcategorySlug.set(child.slug);
            return;
          }
        }
      }
    }
    this.primaryCategorySlug.set('');
    this.subcategorySlug.set('');
  }

  ngOnInit(): void {
    const tabParam = this.route.snapshot.queryParamMap.get('tab')?.trim();
    if (tabParam === 'model-review') {
      this.activeTab.set('model-review');
    }

    this.matchReviews.listQueue({ take: 1 }).subscribe({
      next: (res) => this.modelReviewCount.set(res.queueDepth),
      error: () => {}
    });

    this.matchReviews.listQueue({ take: 1, mode: 'auto_98_99' }).subscribe({
      next: (res) => this.autoCatalogMatchCount.set(res.queueDepth),
      error: () => {}
    });

    const slug = this.route.snapshot.queryParamMap.get('categorySlug')?.trim() ?? '';
    if (slug) {
      this.categorySlug.set(slug);
      this.syncCategoryFromSlug(slug);
    }
    this.ensureFilterOptions();
    this.loadPharmacyDistribution();
    this.reload();
    this.route.queryParamMap.pipe(skip(1)).subscribe((params) => {
      const t = params.get('tab')?.trim();
      if (t === 'model-review' || t === 'catalog') {
        this.activeTab.set(t);
      }
      const next = params.get('categorySlug')?.trim() ?? '';
      if (next === this.categorySlug()) return;
      this.categorySlug.set(next);
      this.syncCategoryFromSlug(next);
      this.reload();
      this.loadPharmacyDistribution();
    });
  }

  switchTab(tab: 'catalog' | 'model-review'): void {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  ngOnDestroy(): void {
    if (this.queryTimer) clearTimeout(this.queryTimer);
    this.fetchSub?.unsubscribe();
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    if (this.queryTimer) clearTimeout(this.queryTimer);
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      this.reload();
      return;
    }
    this.queryTimer = setTimeout(() => {
      if (!isCatalogSearchReady(this.query())) return;
      this.reload();
    }, 120);
  }

  onCategoryChange(value: string): void {
    this.categorySlug.set(value);
    this.syncCategoryFromSlug(value);
    this.reload();
    this.loadPharmacyDistribution();
  }

  onBrandChange(value: string): void {
    this.brand.set(value);
    this.reload();
  }

  onSortChange(value: string): void {
    const s: CatalogFamilySort =
      value === 'pharmaciesDesc' ? 'pharmaciesDesc' :
      value === 'nameDesc' ? 'nameDesc' : 'nameAsc';
    this.sort.set(s);
    this.reload();
  }

  goToPage(page: number): void {
    const target = Math.min(Math.max(1, page), this.totalPages());
    if (target === this.page() || this.loading() || this.searching()) return;
    this.fetch(target);
  }

  listingKey(family: CatalogFamily): string {
    return catalogListingKey(family);
  }

  toggleExpand(key: string): void {
    this.openOfferKeys.update((cur) => {
      const next = new Set(cur);
      if (next.has(key)) {
        next.delete(key);
        return next;
      }
      const family = this.families().find((f) => this.listingKey(f) === key);
      if (family) this.ensurePackSelection(family);
      next.add(key);
      return next;
    });
  }

  offersOpen(family: CatalogFamily): boolean {
    return this.openOfferKeys().has(this.listingKey(family));
  }

  selectPack(familyKey: string, masterId: string): void {
    this.selectedPackIds.update((m) => ({ ...m, [familyKey]: masterId }));
  }

  selectedPackId(family: CatalogFamily): string | null {
    const id = this.selectedPackIds()[family.familyKey];
    if (id && family.packs.some((p) => p.masterId === id)) return id;
    return family.packs[0]?.masterId ?? null;
  }

  selectedPack(family: CatalogFamily): CatalogPack | null {
    const id = this.selectedPackId(family);
    if (!id) return null;
    return family.packs.find((p) => p.masterId === id) ?? family.packs[0] ?? null;
  }

  readonly isAiMatch = isAiMatch;

  hasAiMatch(family: CatalogFamily): boolean {
    return family.packs.some((p) => p.offers.some((o) => isAiMatch(o)));
  }

  familyTitle(family: CatalogFamily): string {
    return catalogFamilyTitle(family, this.locale.locale());
  }

  selectedOffers(family: CatalogFamily): CatalogOffer[] {
    return [...(this.selectedPack(family)?.offers ?? [])].sort((a, b) => a.price - b.price);
  }

  packChipLabel(pack: CatalogPack): string {
    const title = catalogPackTitle(pack, this.locale.locale());
    return formatPackChipLabel(pack.packSize, title || pack.label, { locale: this.locale.locale() });
  }

  displayPackSize(packSize: string | null | undefined): string {
    return formatPackSize(packSize, this.locale.locale());
  }

  packSizeDir(packSize: string | null | undefined): 'ltr' | null {
    return formatPackSizeDir(this.displayPackSize(packSize));
  }

  openDetail(family: CatalogFamily): void {
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/products/detail'], {
        queryParams: { key: family.familyKey }
      })
    );
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      void this.router.navigate(['/products/detail'], {
        queryParams: { key: family.familyKey }
      });
    }
  }

  setDraft(id: string, value: string): void {
    this.linkDrafts.update((m) => ({ ...m, [id]: value }));
  }

  linkOffer(offer: CatalogOffer, family?: CatalogFamily): void {
    const id = offer.pharmacyProductId;
    if (!id) return;
    const code = (this.linkDrafts()[id] || '').trim();
    if (!code) {
      this.notifications.showError(this.i18n.t('productsAdmin.codeRequired'), this.i18n.t('productsAdmin.link'));
      return;
    }

    const prevFamilies = this.families();
    // 1. Optimistically remove from current list/card (0ms)
    this.removeOfferLocally(id);
    this.notifications.showSuccess(this.i18n.t('productsAdmin.linkedOk'), code);

    // 2. Background API request (non-blocking)
    this.linkingId.set(id);
    this.catalog
      .linkByGroupCode(id, code)
      .pipe(finalize(() => this.linkingId.set(null)))
      .subscribe({
        next: (res) => {
          this.loadPharmacyDistribution();
          if (family?.familyKey) {
            this.refreshFamilyInPlace(family.familyKey, family, res.code, true);
          }
        },
        error: () => {
          // Rollback on error
          this.families.set(prevFamilies);
          this.notifications.showError(
            this.i18n.t('productsAdmin.linkedFail'),
            this.i18n.t('productsAdmin.link')
          );
        }
      });
  }

  async unlinkOffer(offer: CatalogOffer, family?: CatalogFamily): Promise<void> {
    const id = offer.pharmacyProductId;
    if (!id) return;
    const confirmed = await this.confirmDialog.confirm({
      title: this.i18n.t('productsAdmin.unlink'),
      message: this.i18n.t('productsAdmin.unlinkConfirm'),
      type: 'danger',
      confirmText: this.i18n.t('productsAdmin.unlink'),
    });
    if (!confirmed) return;

    // Snapshot state for rollback in case of error
    const prevFamilies = this.families();

    // 1. Optimistically remove locally immediately (0ms)
    this.removeOfferLocally(id);
    this.notifications.showSuccess(
      this.i18n.t('productsAdmin.unlinkedOk'),
      this.pharmacyLabel(offer)
    );

    // 2. Background network request (non-blocking, NO full-page reload)
    this.unlinkingId.set(id);
    this.catalog
      .unlinkOffer(id)
      .pipe(finalize(() => this.unlinkingId.set(null)))
      .subscribe({
        next: () => {
          this.loadPharmacyDistribution();
          if (family?.familyKey) {
            this.refreshFamilyInPlace(family.familyKey, family, undefined, true);
          }
        },
        error: () => {
          // Rollback on failure
          this.families.set(prevFamilies);
          this.notifications.showError(
            this.i18n.t('productsAdmin.unlinkedFail'),
            this.i18n.t('productsAdmin.unlink')
          );
        }
      });
  }

  private removeOfferLocally(pharmacyProductId: string): void {
    this.families.update((current) =>
      current.map((fam) => ({
        ...fam,
        packs: fam.packs.map((pack) => {
          const remainingOffers = pack.offers.filter((o) => o.pharmacyProductId !== pharmacyProductId);
          const lowest = remainingOffers.length > 0 ? Math.min(...remainingOffers.map((o) => o.price)) : 0;
          const highest = remainingOffers.length > 0 ? Math.max(...remainingOffers.map((o) => o.price)) : 0;
          return {
            ...pack,
            offers: remainingOffers,
            pharmacyCount: remainingOffers.length,
            lowestPrice: lowest > 0 ? lowest : pack.lowestPrice,
            highestPrice: highest > 0 ? highest : pack.highestPrice
          };
        })
      }))
    );
  }

  private addOfferLocally(familyKey: string, offer: CatalogOffer): void {
    this.families.update((current) =>
      current.map((fam) => {
        const isMatch = fam.familyKey === familyKey;
        if (!isMatch) return fam;
        return {
          ...fam,
          packs: fam.packs.map((pack, idx) => {
            if (idx === 0) {
              const existing = pack.offers.filter((o) => o.pharmacyProductId !== offer.pharmacyProductId);
              const offers = [...existing, offer];
              const lowest = Math.min(...offers.map((o) => o.price));
              const highest = Math.max(...offers.map((o) => o.price));
              return {
                ...pack,
                offers,
                pharmacyCount: offers.length,
                lowestPrice: lowest > 0 ? lowest : pack.lowestPrice,
                highestPrice: highest > 0 ? highest : pack.highestPrice
              };
            }
            return pack;
          })
        };
      })
    );
  }

  private refreshFamilyInPlace(
    familyKey: string,
    oldFamily?: CatalogFamily | null,
    newGroupCode?: string,
    silent = true
  ): void {
    if (!familyKey) return;
    this.catalog.getFamilyByKey(familyKey).subscribe({
      next: (freshFamily) => {
        if (!freshFamily) {
          if (!silent) this.reloadKeepingSelection();
          return;
        }
        const freshCards = flattenFamilyPacks([freshFamily]);
        const replacement = freshCards[0] ?? freshFamily;

        this.families.update((current) =>
          current.map((f) => {
            const isMatch =
              f.familyKey === familyKey ||
              f.familyKey === freshFamily.familyKey ||
              (oldFamily && f.familyKey === oldFamily.familyKey) ||
              (f.groupCode && freshFamily.groupCode && f.groupCode === freshFamily.groupCode) ||
              (newGroupCode && f.groupCode === newGroupCode) ||
              f.packs.some((p) => freshFamily.packs.some((fp) => fp.masterId === p.masterId)) ||
              (oldFamily && f.packs.some((p) => oldFamily.packs.some((op) => op.masterId === p.masterId)));
            return isMatch ? replacement : f;
          })
        );
      },
      error: () => {
        if (!silent) this.reloadKeepingSelection();
      }
    });
  }

  openQuickAdd(family: CatalogFamily): void {
    this.quickAddFamily.set(family);
    this.isQuickAddOpen.set(true);
  }

  closeQuickAdd(): void {
    this.isQuickAddOpen.set(false);
    this.quickAddFamily.set(null);
  }

  onQuickProductAdded(event?: { pharmacyProductId: string; groupCode: string; hit?: PharmacyProductSearchHit }): void {
    const fam = this.quickAddFamily();
    this.closeQuickAdd();
    if (fam && event?.hit) {
      const newOffer: CatalogOffer = {
        pharmacyProductId: event.hit.id,
        pharmacyCode: event.hit.pharmacyCode,
        pharmacyName: event.hit.pharmacyName,
        listingName: event.hit.name,
        englishListingName: event.hit.englishName || null,
        productUrl: event.hit.productUrl || null,
        imageUrl: event.hit.imageUrl || null,
        price: event.hit.price || 0,
        oldPrice: event.hit.oldPrice || null,
        discountPercent: null,
        currency: event.hit.currency || 'SAR',
        availability: 'InStock',
        packSize: event.hit.packSize || '',
        barcode: event.hit.barcode || '',
        matchMethod: 'MANUAL_LINK'
      };
      this.addOfferLocally(fam.familyKey, newOffer);
      if (fam.familyKey) {
        this.openOfferKeys.update((keys) => new Set([...keys, fam.familyKey]));
      }
    }
    this.loadPharmacyDistribution();
    const keyToRefresh = fam?.familyKey || event?.groupCode;
    if (keyToRefresh) {
      this.refreshFamilyInPlace(keyToRefresh, fam, event?.groupCode, true);
    }
  }

  openMergeModal(family: CatalogFamily): void {
    this.openQuickAdd(family);
  }

  onFamilyMerged(): void {
    this.closeQuickAdd();
    this.loadPharmacyDistribution();
    this.reloadKeepingSelection();
  }

  openAiReviewModal(matchId?: string | null): void {
    this.selectedAiMatchId.set(matchId ?? null);
    this.isAiReviewModalOpen.set(true);
  }

  closeAiReviewModal(): void {
    this.isAiReviewModalOpen.set(false);
    this.selectedAiMatchId.set(null);
  }

  onAiMatchResolved(event: { matchId: string; action: 'accept' | 'reject' }): void {
    this.modelReviewCount.update((c) => Math.max(0, c - 1));
    if (event.action === 'accept') {
      this.loadPharmacyDistribution();
      this.reloadKeepingSelection();
    }
  }

  openImageModal(family: CatalogFamily): void {
    this.imageTargetFamily.set(family);
    this.isImageModalOpen.set(true);
  }

  closeImageModal(): void {
    this.isImageModalOpen.set(false);
    this.imageTargetFamily.set(null);
  }

  onImageChanged(event: { masterId: string; imageUrl: string | null }): void {
    const target = this.imageTargetFamily();
    if (target) {
      this.families.update((fams) =>
        fams.map((f) => {
          if (f.familyKey === target.familyKey) {
            return {
              ...f,
              imageUrl: event.imageUrl ?? null
            };
          }
          return f;
        })
      );
    }
  }

  pharmacyLogo(code: string | null | undefined): string | null {
    return resolvePharmacyLogo(code);
  }

  cardImage(family: CatalogFamily): string | null {
    return familyHeroImage(family);
  }

  cardPrice(family: CatalogFamily): number {
    const pack = this.offersOpen(family) ? this.selectedPack(family) : family.packs[0];
    return pack?.lowestPrice || pack?.offers[0]?.price || 0;
  }

  cardPharmacyCount(family: CatalogFamily): number {
    const pack = this.offersOpen(family) ? this.selectedPack(family) : family.packs[0];
    return pack?.pharmacyCount || pack?.offers.length || 0;
  }

  cardSavings(family: CatalogFamily): number | null {
    const pack = this.offersOpen(family) ? this.selectedPack(family) : family.packs[0];
    const value = pack?.savingsPercent;
    return value != null && value > 0 ? value : null;
  }

  cardBarcode(family: CatalogFamily): string | null {
    const pack = this.offersOpen(family) ? this.selectedPack(family) : family.packs[0];
    const code = pack?.barcode == null ? '' : String(pack.barcode).trim();
    return code || null;
  }

  cardMasterId(family: CatalogFamily): string | null {
    const pack = this.offersOpen(family) ? this.selectedPack(family) : family.packs[0];
    const id = pack?.masterId?.trim();
    return id || null;
  }

  listingTitle(offer: CatalogOffer): string {
    return offerListingTitle(offer, this.locale.locale());
  }

  offersPanelId(family: CatalogFamily): string {
    return `offers-${this.listingKey(family)}`;
  }

  canEditBarcode(family: CatalogFamily): boolean {
    const id = this.cardMasterId(family);
    return !!id && !id.startsWith('live:');
  }

  barcodeValue(family: CatalogFamily): string {
    const id = this.cardMasterId(family);
    if (!id) return '';
    const drafts = this.barcodeDrafts();
    if (Object.prototype.hasOwnProperty.call(drafts, id)) return drafts[id] ?? '';
    return this.cardBarcode(family) ?? '';
  }

  setBarcodeDraft(family: CatalogFamily, value: string): void {
    const id = this.cardMasterId(family);
    if (!id) return;
    this.barcodeDrafts.update((m) => ({ ...m, [id]: value }));
    this.barcodeErrors.update((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
  }

  barcodeError(family: CatalogFamily): string | null {
    const id = this.cardMasterId(family);
    if (!id) return null;
    return this.barcodeErrors()[id] ?? null;
  }

  barcodeErrorId(family: CatalogFamily): string {
    return `barcode-err-${this.cardMasterId(family) ?? 'none'}`;
  }

  saveBarcode(family: CatalogFamily): void {
    const id = this.cardMasterId(family);
    if (!id || id.startsWith('live:') || this.barcodeBusyId() === id) return;
    const value = this.barcodeValue(family).trim();
    if (!value) {
      this.barcodeErrors.update((m) => ({ ...m, [id]: this.i18n.t('productsAdmin.barcodeInvalid') }));
      return;
    }
    this.barcodeBusyId.set(id);
    this.catalog
      .setMasterBarcode(id, value)
      .pipe(finalize(() => this.barcodeBusyId.set(null)))
      .subscribe({
        next: (res) => {
          this.families.update((list) =>
            list.map((row) => ({
              ...row,
              packs: row.packs.map((pack) =>
                pack.masterId === res.id ? { ...pack, barcode: res.barcode } : pack
              )
            }))
          );
          this.barcodeDrafts.update((m) => {
            const next = { ...m };
            delete next[id];
            return next;
          });
          this.barcodeErrors.update((m) => {
            const next = { ...m };
            delete next[id];
            return next;
          });
          this.notifications.showSuccess(this.i18n.t('productsAdmin.barcodeSaved'), res.barcode);
        },
        error: () => {
          this.barcodeErrors.update((m) => ({ ...m, [id]: this.i18n.t('productsAdmin.barcodeInvalid') }));
        }
      });
  }

  priceSyncOn(family: CatalogFamily): boolean {
    const pack = this.offersOpen(family) ? this.selectedPack(family) : family.packs[0];
    return pack?.priceSyncEnabled !== false;
  }

  copyCode(code: string): void {
    void navigator.clipboard.writeText(code).then(() => {
      this.notifications.showSuccess(this.i18n.t('productsAdmin.copied'), code);
    });
  }

  togglePriceSync(family: CatalogFamily): void {
    const id = this.cardMasterId(family);
    if (!id || id.startsWith('live:') || this.priceSyncBusyId() === id) return;

    const next = !this.priceSyncOn(family);
    this.priceSyncBusyId.set(id);
    this.catalog
      .setPriceSyncEnabled(id, next)
      .pipe(finalize(() => this.priceSyncBusyId.set(null)))
      .subscribe({
        next: (res) => {
          this.families.update((list) =>
            list.map((row) => ({
              ...row,
              packs: row.packs.map((pack) =>
                pack.masterId === res.id ? { ...pack, priceSyncEnabled: res.enabled } : pack
              )
            }))
          );
          this.notifications.showSuccess(
            this.i18n.t(res.enabled ? 'productsAdmin.priceSyncOnMsg' : 'productsAdmin.priceSyncOffMsg'),
            this.i18n.t('productsAdmin.priceSyncLabel')
          );
        }
      });
  }

  matchLabelKey(family: CatalogFamily): string {
    switch (matchStatus(family)) {
      case 'Exact':
        return 'productsAdmin.matchConfirmed';
      case 'Comparable':
        return 'productsAdmin.matchComparable';
      case 'Single':
        return 'productsAdmin.matchSingle';
      default:
        return 'productsAdmin.matchPending';
    }
  }

  matchBadgeClass(family: CatalogFamily): string {
    switch (matchStatus(family)) {
      case 'Exact':
        return 'rounded-full bg-[#E8F5EE] px-2 py-0.5 text-[11px] font-bold text-[#1B7A45]';
      case 'Pending':
        return 'rounded-full bg-[#F8EEE2] px-2 py-0.5 text-[11px] font-bold text-[#C27938]';
      default:
        return 'rounded-full bg-[#FBF8F4] px-2 py-0.5 text-[11px] font-bold text-[#8A735C]';
    }
  }

  pharmacyLabel(offer: CatalogOffer): string {
    return pharmacyDisplayName(offer.pharmacyCode, offer.pharmacyName, this.locale.locale());
  }

  private ensurePackSelection(family: CatalogFamily): void {
    const current = this.selectedPackIds()[family.familyKey];
    if (current && family.packs.some((p) => p.masterId === current)) return;
    const first = family.packs[0]?.masterId;
    if (first) {
      this.selectedPackIds.update((m) => ({ ...m, [family.familyKey]: first }));
    }
  }

  private filtersRequested = false;

  private ensureFilterOptions(): void {
    if (this.filtersRequested) return;
    this.filtersRequested = true;
    this.loadFilterOptions();
  }

  private loadFilterOptions(): void {
    this.catalog.getCategoryStructure().subscribe({
      next: (nodes) => {
        this.categoryNodes.set(nodes);
        this.syncCategoryFromSlug(this.categorySlug());
      },
      error: () => this.categoryNodes.set([])
    });
    this.catalog.listFamilyBrands().subscribe({
      next: (rows) => this.brands.set(rows),
      error: () => this.brands.set([])
    });
  }

  private flattenCategories(nodes: CategoryNode[]): CategoryOption[] {
    const out: CategoryOption[] = [];
    const walk = (list: CategoryNode[], prefix = '') => {
      for (const n of list) {
        const label = categoryDisplayName(n, this.locale.locale());
        const name = prefix ? `${prefix} / ${label}` : label;
        if (n.slug) out.push({ slug: n.slug, name });
        if (n.children?.length) walk(n.children, name);
      }
    };
    walk(nodes);
    return out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }

  private buildPageButtons(current: number, total: number): Array<number | '…'> {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = new Set<number>([1, total, current, current - 1, current + 1, 2, total - 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
    const result: Array<number | '…'> = [];
    let prev = 0;
    for (const p of sorted) {
      if (prev && p - prev > 1) result.push('…');
      result.push(p);
      prev = p;
    }
    return result;
  }

  private reloadKeepingSelection(): void {
    const openKeys = this.openOfferKeys();
    const packs = this.selectedPackIds();
    this.error.set(false);
    this.fetch(this.page(), () => {
      this.selectedPackIds.set(packs);
      this.openOfferKeys.set(openKeys);
    });
  }

  private reload(): void {
    this.error.set(false);
    this.openOfferKeys.set(new Set());
    this.fetch(1);
  }

  private fetch(page: number, after?: () => void): void {
    this.fetchSub?.unsubscribe();
    const hasRows = this.families().length > 0;
    this.loading.set(!hasRows);
    this.searching.set(hasRows);
    const q = this.query().trim();
    const categorySlug = this.categorySlug().trim();
    const brand = this.brand().trim();
    const sort = this.sort();
    const targetPage = Math.max(1, page);
    const pageSize = q ? SEARCH_PAGE_SIZE : CATALOG_PAGE_SIZE;

    this.fetchSub = this.catalog
      .listFamilies({
        query: q || undefined,
        categorySlug: categorySlug || undefined,
        brand: brand || undefined,
        sort,
        page: targetPage,
        pageSize,
        pharmacyCount: this.pharmacyCount() || undefined
      })
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.searching.set(false);
        })
      )
      .subscribe({
        next: (result) => {
          const cards = flattenFamilyPacks(result.data);
          this.page.set(result.page || targetPage);
          this.listPageSize.set(result.pageSize || pageSize);
          this.total.set(result.total);
          this.families.set(cards);
          after?.();
          this.ensureFilterOptions();
        },
        error: () => {
          this.error.set(true);
          this.families.set([]);
          this.total.set(0);
          this.ensureFilterOptions();
        }
      });
  }
}
