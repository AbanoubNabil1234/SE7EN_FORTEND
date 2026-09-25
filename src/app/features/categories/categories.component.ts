import { Component, computed, inject, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { CatalogBrowseRepository, CatalogFamilySort } from '../../core/domain/repositories/catalog-browse.repository';
import { CategoryNode } from '../../core/domain/models/category.model';
import {
  CatalogFamily,
  catalogFamilyTitle,
  familyMatchType,
  isConfirmedMatch
} from '../../core/domain/models/catalog-family.model';
import { filterCategoryTree } from '../../core/domain/category-display';
import { LocaleService } from '../../core/services/locale.service';
import { resolveApiUrl } from '../../core/infrastructure/http/api-origin';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface CategoryVisual {
  icon: string;
  gradient: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}

const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  'medicines-treatments': {
    icon: 'pi pi-heart-fill',
    gradient: 'from-emerald-500/10 via-teal-500/5 to-transparent text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-500/30'
  },
  'vitamins-supplements': {
    icon: 'pi pi-bolt',
    gradient: 'from-amber-500/10 via-orange-500/5 to-transparent text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
    badgeText: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-500/30'
  },
  'skin-care': {
    icon: 'pi pi-sparkles',
    gradient: 'from-rose-500/10 via-pink-500/5 to-transparent text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/60',
    badgeText: 'text-rose-700 dark:text-rose-300',
    borderColor: 'border-rose-500/30'
  },
  'hair-care': {
    icon: 'pi pi-star-fill',
    gradient: 'from-purple-500/10 via-indigo-500/5 to-transparent text-purple-600 dark:text-purple-400',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/60',
    badgeText: 'text-purple-700 dark:text-purple-300',
    borderColor: 'border-purple-500/30'
  },
  'personal-care': {
    icon: 'pi pi-user',
    gradient: 'from-sky-500/10 via-cyan-500/5 to-transparent text-sky-600 dark:text-sky-400',
    badgeBg: 'bg-sky-50 dark:bg-sky-950/60',
    badgeText: 'text-sky-700 dark:text-sky-300',
    borderColor: 'border-sky-500/30'
  },
  'mother-baby': {
    icon: 'pi pi-heart',
    gradient: 'from-indigo-500/10 via-blue-500/5 to-transparent text-indigo-600 dark:text-indigo-400',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    borderColor: 'border-indigo-500/30'
  },
  'medical-supplies': {
    icon: 'pi pi-shield',
    gradient: 'from-blue-500/10 via-cyan-500/5 to-transparent text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/60',
    badgeText: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-500/30'
  },
  'beauty-cosmetics': {
    icon: 'pi pi-palette',
    gradient: 'from-fuchsia-500/10 via-pink-500/5 to-transparent text-fuchsia-600 dark:text-fuchsia-400',
    badgeBg: 'bg-fuchsia-50 dark:bg-fuchsia-950/60',
    badgeText: 'text-fuchsia-700 dark:text-fuchsia-300',
    borderColor: 'border-fuchsia-500/30'
  },
  'health-food': {
    icon: 'pi pi-apple',
    gradient: 'from-lime-500/10 via-emerald-500/5 to-transparent text-lime-600 dark:text-lime-400',
    badgeBg: 'bg-lime-50 dark:bg-lime-950/60',
    badgeText: 'text-lime-700 dark:text-lime-300',
    borderColor: 'border-lime-500/30'
  },
  'other': {
    icon: 'pi pi-th-large',
    gradient: 'from-slate-500/10 via-zinc-500/5 to-transparent text-slate-600 dark:text-slate-400',
    badgeBg: 'bg-slate-50 dark:bg-slate-900',
    badgeText: 'text-slate-700 dark:text-slate-300',
    borderColor: 'border-slate-500/30'
  }
};

const DEFAULT_VISUAL: CategoryVisual = {
  icon: 'pi pi-box',
  gradient: 'from-[#C27938]/10 via-[#F8EEE2]/30 to-transparent text-[#C27938]',
  badgeBg: 'bg-[#F8EEE2] dark:bg-neutral-800',
  badgeText: 'text-[#C27938]',
  borderColor: 'border-[#E8D5BE]'
};

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe, TranslatePipe],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css'
})
export class CategoriesComponent implements OnInit, OnDestroy {
  private readonly catalog = inject(CatalogBrowseRepository);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly locale = inject(LocaleService);
  readonly i18n = inject(I18nService);

  // Categories Tree State
  readonly roots = signal<CategoryNode[]>([]);
  readonly categoriesLoading = signal<boolean>(false);
  readonly categoriesError = signal<boolean>(false);
  readonly categoryFilterQuery = signal<string>('');
  readonly expandedSlugs = signal<Set<string>>(new Set<string>());

  // Selected Category State
  readonly selectedPrimarySlug = signal<string>('');
  readonly selectedSubSlug = signal<string>('');

  // Products State
  readonly products = signal<CatalogFamily[]>([]);
  readonly productsLoading = signal<boolean>(false);
  readonly productsError = signal<boolean>(false);
  readonly page = signal<number>(1);
  readonly pageSize = signal<number>(24);
  readonly total = signal<number>(0);
  readonly productSearchQuery = signal<string>('');
  readonly selectedSort = signal<CatalogFamilySort>('pharmaciesDesc');
  readonly viewMode = signal<'grid' | 'list'>('grid');
  readonly mobileSidebarOpen = signal<boolean>(false);

  private readonly searchSubject = new Subject<string>();
  private searchSub?: Subscription;
  private routeSub?: Subscription;

  // Category Image Upload State
  readonly resolveApiUrl = resolveApiUrl;
  readonly brokenImages = signal<Set<string>>(new Set());

  onImageError(url: string | null | undefined): void {
    if (!url) return;
    this.brokenImages.update((set) => {
      const next = new Set(set);
      next.add(url);
      const resolved = resolveApiUrl(url);
      if (resolved) next.add(resolved);
      return next;
    });
  }

  hasValidImage(url: string | null | undefined): boolean {
    if (!url) return false;
    const resolved = resolveApiUrl(url);
    return !!resolved && !this.brokenImages().has(url) && !this.brokenImages().has(resolved);
  }

  readonly imageModalOpen = signal<boolean>(false);
  readonly targetCategory = signal<CategoryNode | null>(null);
  readonly selectedImageFile = signal<File | null>(null);
  readonly imagePreviewUrl = signal<string | null>(null);
  readonly uploadingImage = signal<boolean>(false);
  readonly uploadSuccessMessage = signal<string | null>(null);
  readonly uploadErrorMessage = signal<string | null>(null);

  // Computed Values
  readonly activeSlug = computed(() => this.selectedSubSlug() || this.selectedPrimarySlug());

  readonly filteredRoots = computed(() => {
    const q = this.categoryFilterQuery().trim().toLowerCase();
    if (!q) return this.roots();
    return filterCategoryTree(this.roots(), q);
  });

  readonly currentPrimaryNode = computed(() => {
    const slug = this.selectedPrimarySlug();
    if (!slug) return this.roots()[0] ?? null;
    return this.roots().find((r) => r.slug === slug) ?? this.roots()[0] ?? null;
  });

  readonly currentSubNode = computed(() => {
    const primary = this.currentPrimaryNode();
    const subSlug = this.selectedSubSlug();
    if (!primary || !subSlug || !primary.children) return null;
    return primary.children.find((c) => c.slug === subSlug) ?? null;
  });

  readonly activeCategoryNode = computed(() => this.currentSubNode() ?? this.currentPrimaryNode());

  readonly activeCategoryTitle = computed(() => {
    const sub = this.currentSubNode();
    if (sub) return this.locale.isRtl() ? sub.name : (sub.nameEn || sub.name);
    const prim = this.currentPrimaryNode();
    if (prim) return this.locale.isRtl() ? prim.name : (prim.nameEn || prim.name);
    return this.i18n.t('categories.allCategories');
  });

  readonly hasMore = computed(() => this.products().length < this.total());

  readonly totalPages = computed(() => {
    const t = this.total();
    const s = this.pageSize();
    return t > 0 ? Math.ceil(t / s) : 1;
  });

  readonly pageStartItem = computed(() => {
    const t = this.total();
    if (t === 0) return 0;
    return (this.page() - 1) * this.pageSize() + 1;
  });

  readonly pageEndItem = computed(() => {
    return Math.min(this.page() * this.pageSize(), this.total());
  });

  readonly visiblePages = computed(() => {
    const current = this.page();
    const total = this.totalPages();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    pages.push(1);

    if (current > 4) {
      pages.push('...');
    }

    const start = Math.max(2, current - 2);
    const end = Math.min(total - 1, current + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < total - 3) {
      pages.push('...');
    }

    pages.push(total);
    return pages;
  });

  ngOnInit(): void {
    // Setup debounced product search
    this.searchSub = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((query) => {
        this.productSearchQuery.set(query);
        this.resetAndFetchProducts();
      });

    // Load Categories Tree first
    this.loadCategoryTree();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  getVisual(slug: string): CategoryVisual {
    return CATEGORY_VISUALS[slug] || DEFAULT_VISUAL;
  }

  isExpanded(slug: string): boolean {
    return this.expandedSlugs().has(slug);
  }

  toggleAccordion(slug: string, event: MouseEvent): void {
    event.stopPropagation();
    this.expandedSlugs.update((current) => {
      const next = new Set(current);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  onSelectRoot(root: CategoryNode): void {
    this.selectedPrimarySlug.set(root.slug);
    this.selectedSubSlug.set('');
    this.expandedSlugs.update((current) => new Set(current).add(root.slug));
    this.updateUrl();
    this.resetAndFetchProducts();
  }

  onSelectAllInRoot(root: CategoryNode): void {
    this.selectedPrimarySlug.set(root.slug);
    this.selectedSubSlug.set('');
    this.updateUrl();
    this.resetAndFetchProducts();
  }

  onSelectSub(root: CategoryNode, sub: CategoryNode): void {
    this.selectedPrimarySlug.set(root.slug);
    this.selectedSubSlug.set(sub.slug);
    this.expandedSlugs.update((current) => new Set(current).add(root.slug));
    this.updateUrl();
    this.resetAndFetchProducts();
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.productSearchQuery.set('');
    this.resetAndFetchProducts();
  }

  onSortChange(sort: CatalogFamilySort): void {
    this.selectedSort.set(sort);
    this.resetAndFetchProducts();
  }

  loadMore(): void {
    if (!this.hasMore() || this.productsLoading()) return;
    this.fetchProducts(this.page() + 1, true);
  }

  goToPage(p: number | string): void {
    if (typeof p !== 'number') return;
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.fetchProducts(p, false);
    this.scrollToTop();
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) {
      this.goToPage(this.page() + 1);
    }
  }

  prevPage(): void {
    if (this.page() > 1) {
      this.goToPage(this.page() - 1);
    }
  }

  private scrollToTop(): void {
    if (typeof window !== 'undefined') {
      const element = document.getElementById('products-pane');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  reloadProducts(): void {
    this.resetAndFetchProducts();
  }

  familyTitle(family: CatalogFamily): string {
    return catalogFamilyTitle(family, this.locale.locale());
  }

  cardImage(family: CatalogFamily): string | null {
    if (family.imageUrl) return family.imageUrl;
    return family.packs.flatMap((p) => p.offers.map((o) => o.imageUrl)).find((u): u is string => !!u) ?? null;
  }

  cardPrice(family: CatalogFamily): number {
    const pack = family.packs[0];
    if (!pack) return 0;
    return pack.lowestPrice || pack.offers[0]?.price || 0;
  }

  cardPharmacyCount(family: CatalogFamily): number {
    const pack = family.packs[0];
    if (!pack) return 0;
    return pack.pharmacyCount || pack.offers.length || 0;
  }

  isConfirmedFamily(family: CatalogFamily): boolean {
    return isConfirmedMatch(familyMatchType(family));
  }

  cardSavings(family: CatalogFamily): number | null {
    const value = family.packs[0]?.savingsPercent;
    return value != null && value > 0 ? value : null;
  }

  private loadCategoryTree(): void {
    this.categoriesLoading.set(true);
    this.categoriesError.set(false);

    this.catalog
      .getCategoryTree()
      .pipe(finalize(() => this.categoriesLoading.set(false)))
      .subscribe({
        next: (nodes) => {
          this.roots.set(nodes);
          this.handleInitialRoute(nodes);
        },
        error: () => {
          this.catalog.getCategoryStructure().subscribe({
            next: (nodes) => {
              this.roots.set(nodes.filter((n) => !n.parentId));
              this.handleInitialRoute(nodes);
            },
            error: () => this.categoriesError.set(true)
          });
        }
      });
  }

  private handleInitialRoute(nodes: CategoryNode[]): void {
    this.routeSub = this.route.queryParams.subscribe((params) => {
      const catSlug = params['categorySlug'] || params['slug'] || (nodes[0]?.slug ?? 'medicines-treatments');
      const subSlug = params['subSlug'] || '';

      this.selectedPrimarySlug.set(catSlug);
      this.selectedSubSlug.set(subSlug);
      this.expandedSlugs.update((current) => new Set(current).add(catSlug));

      this.resetAndFetchProducts();
    });
  }

  private updateUrl(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        categorySlug: this.selectedPrimarySlug(),
        subSlug: this.selectedSubSlug() || null
      },
      queryParamsHandling: 'merge'
    });
  }

  private resetAndFetchProducts(): void {
    this.page.set(1);
    this.products.set([]);
    this.fetchProducts(1, false);
  }

  private fetchProducts(page: number, append: boolean): void {
    const slug = this.activeSlug();
    if (!slug) return;

    this.productsLoading.set(true);
    this.productsError.set(false);

    this.catalog
      .listFamilies({
        categorySlug: slug,
        query: this.productSearchQuery(),
        sort: this.selectedSort(),
        page,
        pageSize: this.pageSize()
      })
      .pipe(finalize(() => this.productsLoading.set(false)))
      .subscribe({
        next: (result) => {
          this.page.set(result.page);
          this.total.set(result.total);
          this.products.update((curr) => (append ? [...curr, ...result.data] : result.data));
        },
        error: () => {
          this.productsError.set(true);
          if (!append) this.products.set([]);
        }
      });
  }

  openImageModal(category: CategoryNode | null): void {
    if (!category) return;
    this.targetCategory.set(category);
    this.selectedImageFile.set(null);
    this.imagePreviewUrl.set(category.imageUrl || null);
    this.uploadSuccessMessage.set(null);
    this.uploadErrorMessage.set(null);
    this.imageModalOpen.set(true);
  }

  closeImageModal(): void {
    if (this.uploadingImage()) return;
    this.imageModalOpen.set(false);
    this.targetCategory.set(null);
    this.selectedImageFile.set(null);
    this.imagePreviewUrl.set(null);
  }

  onImagePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.uploadErrorMessage.set(this.i18n.t('categories.invalidImageFile'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.uploadErrorMessage.set(this.i18n.t('categories.imageTooLarge'));
      return;
    }

    this.uploadErrorMessage.set(null);
    this.selectedImageFile.set(file);
    const reader = new FileReader();
    reader.onload = () => this.imagePreviewUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  submitCategoryImage(): void {
    const cat = this.targetCategory();
    const file = this.selectedImageFile();
    if (!cat || !file) return;

    this.uploadingImage.set(true);
    this.uploadErrorMessage.set(null);
    this.uploadSuccessMessage.set(null);

    this.catalog.uploadCategoryImage(cat.id, file).subscribe({
      next: (res) => {
        this.uploadingImage.set(false);
        this.uploadSuccessMessage.set(this.i18n.t('categories.imageUpdateSuccess'));
        this.updateNodeImageUrlInTree(cat.id, res.imageUrl);
        setTimeout(() => this.closeImageModal(), 1200);
      },
      error: (err) => {
        this.uploadingImage.set(false);
        const msg = err?.error?.message || this.i18n.t('categories.imageUploadError');
        this.uploadErrorMessage.set(msg);
      }
    });
  }

  deleteCategoryImage(cat: CategoryNode | null): void {
    if (!cat) return;
    if (!confirm(this.i18n.t('categories.confirmDeleteImage'))) return;

    this.uploadingImage.set(true);
    this.catalog.deleteCategoryImage(cat.id).subscribe({
      next: () => {
        this.uploadingImage.set(false);
        this.updateNodeImageUrlInTree(cat.id, null);
        this.imagePreviewUrl.set(null);
        this.uploadSuccessMessage.set(this.i18n.t('categories.imageDeleteSuccess'));
        setTimeout(() => this.closeImageModal(), 1000);
      },
      error: (err) => {
        this.uploadingImage.set(false);
        this.uploadErrorMessage.set(err?.error?.message || this.i18n.t('categories.imageDeleteError'));
      }
    });
  }

  private updateNodeImageUrlInTree(id: string, imageUrl: string | null): void {
    const updateNodes = (nodes: CategoryNode[]): CategoryNode[] => {
      return nodes.map((n) => {
        if (n.id === id) {
          return { ...n, imageUrl };
        }
        if (n.children && n.children.length > 0) {
          return { ...n, children: updateNodes(n.children) };
        }
        return n;
      });
    };
    this.roots.update((current) => updateNodes(current));
  }
}
