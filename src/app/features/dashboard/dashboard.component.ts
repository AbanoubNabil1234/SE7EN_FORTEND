import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { CatalogBrowseRepository } from '../../core/domain/repositories/catalog-browse.repository';
import { DashboardRepository } from '../../core/domain/repositories/dashboard.repository';
import { CategoryNode } from '../../core/domain/models/category.model';
import { CatalogFamily, catalogFamilyTitle, familyMatchType, isConfirmedMatch } from '../../core/domain/models/catalog-family.model';
import { OpsDashboardSnapshot } from '../../core/domain/models/dashboard.model';
import { I18nService } from '../../core/i18n/i18n.service';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { CategoryMegaMenuComponent } from '../../shared/components/category-mega-menu/category-mega-menu.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { KpiCardComponent } from '../../shared/components/charts/kpi-card.component';
import { TrendChartComponent } from '../../shared/components/charts/trend-chart.component';
import { PharmacyBarChartComponent } from '../../shared/components/charts/pharmacy-bar-chart.component';
import { CategoryDonutChartComponent } from '../../shared/components/charts/category-donut-chart.component';
import { CouponStatsComponent } from '../../shared/components/charts/coupon-stats.component';
import { OverlapDepthChartComponent } from '../../shared/components/charts/overlap-depth-chart.component';
import { MatchingBreakdownChartComponent } from '../../shared/components/charts/matching-breakdown-chart.component';
import { MarketSpreadWidgetComponent } from '../../shared/components/charts/market-spread-widget.component';

const PAGE_SIZE = 24;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    CurrencyPipe,
    DecimalPipe,
    CategoryMegaMenuComponent,
    KpiCardComponent,
    TrendChartComponent,
    PharmacyBarChartComponent,
    CategoryDonutChartComponent,
    CouponStatsComponent,
    OverlapDepthChartComponent,
    MatchingBreakdownChartComponent,
    MarketSpreadWidgetComponent
  ],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly catalog = inject(CatalogBrowseRepository);
  private readonly dashboardRepo = inject(DashboardRepository);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  readonly locale = inject(LocaleService);

  readonly activeTab = signal<'analytics' | 'catalog'>('analytics');

  // Executive Dashboard Analytics Signals
  readonly snapshot = signal<OpsDashboardSnapshot | null>(null);
  readonly snapshotLoading = signal(false);
  readonly snapshotError = signal(false);

  // Catalog Browser Signals
  readonly roots = signal<CategoryNode[]>([]);
  readonly primarySlug = signal('');
  readonly subSlug = signal('');
  readonly query = signal('');
  readonly families = signal<CatalogFamily[]>([]);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly categoriesLoading = signal(false);
  readonly productsLoading = signal(false);
  readonly categoriesError = signal(false);
  readonly productsError = signal(false);

  private queryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly activeSlug = computed(() => this.subSlug() || this.primarySlug());
  readonly hasMore = computed(() => this.families().length < this.total());

  ngOnInit(): void {
    this.loadStats();
  }

  ngOnDestroy(): void {
    if (this.queryTimer) {
      clearTimeout(this.queryTimer);
      this.queryTimer = null;
    }
  }

  openCatalogTab(): void {
    this.activeTab.set('catalog');
    if (this.roots().length === 0 && !this.categoriesLoading()) {
      this.loadCategories();
    }
  }

  loadStats(forceRefresh = false): void {
    this.snapshotLoading.set(true);
    this.snapshotError.set(false);
    const req$ = forceRefresh
      ? this.dashboardRepo.refreshSnapshot()
      : this.dashboardRepo.getSnapshot();

    req$
      .pipe(finalize(() => this.snapshotLoading.set(false)))
      .subscribe({
        next: (data) => {
          this.snapshot.set(data);
          if (forceRefresh) {
            this.notifications.showSuccess('تم تحديث إحصائيات النظام وإعادة الحساب بنجاح');
          }
        },
        error: () => {
          this.snapshotError.set(true);
          this.notifications.showError('تعذر تحميل بيانات لوحة التحكم الحية');
        }
      });
  }

  onPrimaryChange(slug: string): void {
    this.primarySlug.set(slug);
    this.subSlug.set('');
    this.query.set('');
    this.resetProducts();
    if (slug) {
      this.fetchProducts(1, false);
    }
  }

  onSubChange(slug: string): void {
    this.subSlug.set(slug);
    this.resetProducts();
    if (this.primarySlug()) {
      this.fetchProducts(1, false);
    }
  }

  onChildPick(node: CategoryNode): void {
    const parent = this.roots().find((root) => root.children?.some((child) => child.id === node.id));
    if (parent) this.primarySlug.set(parent.slug);
    this.onSubChange(node.slug);
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    if (this.queryTimer) clearTimeout(this.queryTimer);
    this.queryTimer = setTimeout(() => {
      if (!this.activeSlug()) return;
      this.resetProducts();
      this.fetchProducts(1, false);
    }, 120);
  }

  loadMore(): void {
    if (!this.hasMore() || this.productsLoading()) return;
    this.fetchProducts(this.page() + 1, true);
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

  private loadCategories(): void {
    this.categoriesLoading.set(true);
    this.categoriesError.set(false);
    this.catalog
      .getCategoryStructure()
      .pipe(finalize(() => this.categoriesLoading.set(false)))
      .subscribe({
        next: (nodes) => this.roots.set(nodes.filter((n) => !n.parentId)),
        error: () => {
          this.categoriesError.set(true);
          this.notifications.showError(
            this.i18n.t('dashboard.categoriesError'),
            this.i18n.t('dashboard.sourceNahdi')
          );
        }
      });
  }

  private resetProducts(): void {
    this.families.set([]);
    this.page.set(1);
    this.total.set(0);
    this.productsError.set(false);
  }

  private fetchProducts(page: number, append: boolean): void {
    const slug = this.activeSlug();
    if (!slug) return;

    this.productsLoading.set(true);
    this.productsError.set(false);
    this.catalog
      .listFamilies({
        categorySlug: slug,
        query: this.query(),
        page,
        pageSize: PAGE_SIZE
      })
      .pipe(finalize(() => this.productsLoading.set(false)))
      .subscribe({
        next: (result) => {
          this.page.set(result.page);
          this.total.set(result.total);
          this.families.update((current) => (append ? [...current, ...result.data] : result.data));
        },
        error: () => {
          this.productsError.set(true);
          if (!append) this.families.set([]);
        }
      });
  }
}
