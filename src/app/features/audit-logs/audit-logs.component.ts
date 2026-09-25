import { Component, computed, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuditLogRepository } from '../../core/domain/repositories/audit-log.repository';
import {
  AuditLogDetail,
  AuditLogFilterOptions,
  AuditLogItem,
  AuditLogQuery,
  AuditUserOption
} from '../../core/domain/models/audit-log.model';
import { LocaleService } from '../../core/services/locale.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { NotificationService } from '../../core/services/notification.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface PropertyDiffDisplay {
  propertyName: string;
  oldValue: string;
  newValue: string;
}

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, TranslatePipe],
  templateUrl: './audit-logs.component.html'
})
export class AuditLogsComponent implements OnInit, OnDestroy {
  readonly isEmbedded = input<boolean>(false);
  private readonly auditLogRepo = inject(AuditLogRepository);
  readonly locale = inject(LocaleService);
  private readonly i18n = inject(I18nService);
  private readonly notify = inject(NotificationService);

  // Filter Signals
  readonly searchQuery = signal<string>('');
  readonly selectedCategory = signal<string>('');
  readonly selectedAction = signal<string>('');
  readonly selectedUserId = signal<string>('');
  readonly fromDate = signal<string>('');
  readonly toDate = signal<string>('');
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(20);

  // Data Signals
  readonly loading = signal<boolean>(false);
  readonly logs = signal<AuditLogItem[]>([]);
  readonly totalCount = signal<number>(0);
  readonly totalPages = signal<number>(1);
  readonly autoRefreshEnabled = signal<boolean>(false);
  private refreshTimer: any = null;

  readonly filterOptions = signal<AuditLogFilterOptions>({
    categories: [],
    actions: [],
    users: []
  });

  // Modal Signals
  readonly selectedDetail = signal<AuditLogDetail | null>(null);
  readonly activeModalTab = signal<'overview' | 'diff' | 'json'>('overview');

  readonly hasActiveFilters = computed(() => {
    return !!(
      this.searchQuery() ||
      this.selectedCategory() ||
      this.selectedAction() ||
      this.selectedUserId() ||
      this.fromDate() ||
      this.toDate()
    );
  });

  readonly parsedDiffs = computed<PropertyDiffDisplay[]>(() => {
    const detail = this.selectedDetail();
    if (!detail?.changesJson) return [];
    try {
      const raw = JSON.parse(detail.changesJson);
      if (!Array.isArray(raw)) return [];
      return raw.map((item: any) => ({
        propertyName: item.propertyName || item.PropertyName || 'Unknown',
        oldValue: this.formatValue(item.oldValue ?? item.OldValue),
        newValue: this.formatValue(item.newValue ?? item.NewValue)
      }));
    } catch {
      return [];
    }
  });

  ngOnInit(): void {
    this.loadFilterOptions();
    this.loadLogs();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  toggleAutoRefresh(): void {
    const next = !this.autoRefreshEnabled();
    this.autoRefreshEnabled.set(next);
    if (next) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.refreshTimer = setInterval(() => {
      if (!this.loading()) {
        this.loadLogs(true);
        this.loadFilterOptions();
      }
    }, 10000);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  loadFilterOptions(): void {
    this.auditLogRepo.getFilterOptions().subscribe({
      next: (opts) => this.filterOptions.set(opts),
      error: () => {}
    });
  }

  loadLogs(isSilent = false): void {
    if (!isSilent) {
      this.loading.set(true);
    }

    const query: AuditLogQuery = {
      search: this.searchQuery().trim() || null,
      category: this.selectedCategory() || null,
      action: this.selectedAction() || null,
      userId: this.selectedUserId() || null,
      fromDateUtc: this.fromDate() ? new Date(this.fromDate()).toISOString() : null,
      toDateUtc: this.toDate() ? new Date(this.toDate() + 'T23:59:59.999Z').toISOString() : null,
      page: this.currentPage(),
      pageSize: this.pageSize()
    };

    this.auditLogRepo
      .query(query)
      .pipe(finalize(() => {
        if (!isSilent) {
          this.loading.set(false);
        }
      }))
      .subscribe({
        next: (result) => {
          this.logs.set(result.items);
          this.totalCount.set(result.totalCount);
          this.totalPages.set(result.totalPages || 1);
        },
        error: () => {
          if (!isSilent) {
            this.notify.showError(this.i18n.t('auditLogs.loadError'));
          }
        }
      });
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadLogs();
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('');
    this.selectedAction.set('');
    this.selectedUserId.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.currentPage.set(1);
    this.loadLogs();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadLogs();
  }

  openDetail(id: string): void {
    this.auditLogRepo.getById(id).subscribe({
      next: (detail) => {
        this.selectedDetail.set(detail);
        this.activeModalTab.set(detail.changesJson ? 'diff' : 'overview');
      },
      error: () => {
        this.notify.showError(this.i18n.t('auditLogs.detailError'));
      }
    });
  }

  closeDetail(): void {
    this.selectedDetail.set(null);
  }

  copyText(text: string): void {
    void navigator.clipboard.writeText(text);
    this.notify.showSuccess(this.i18n.t('auditLogs.copySuccess'));
  }

  formatJson(raw: string | null | undefined): string {
    if (!raw) return '';
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }

  private formatValue(val: any): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }

  getActionBadgeClass(action: string): string {
    switch (action) {
      // Emerald / Success Actions
      case 'LOGIN_SUCCESS':
      case 'REGISTER_CUSTOMER':
      case 'CONFIRM_REGISTRATION':
      case 'CREATE_ADMIN':
      case 'SCRAPE_RUN_PASSED':
      case 'LINK_GROUP_CODE':
      case 'ACCEPT_MATCH':
      case 'FORCE_MATCH':
      case 'BULK_MATCH':
      case 'ACKNOWLEDGE_ALERT':
        return 'bg-emerald-50 text-emerald-800 border border-emerald-200';

      // Rose / Destructive / Failed Actions
      case 'LOGIN_FAILED':
      case 'SCRAPE_RUN_FAILED':
      case 'SCRAPE_RUN_ROLLED_BACK':
      case 'SYSTEM_ERROR':
      case 'UNLINK_PRODUCT':
      case 'REJECT_MATCH':
      case 'DELETE_PRODUCT_IMAGE':
      case 'DELETE_CATEGORY_IMAGE':
        return 'bg-rose-50 text-rose-800 border border-rose-200';

      // Amber / Modifications & Alerts
      case 'CHANGE_PASSWORD':
      case 'RESET_PASSWORD':
      case 'FORGOT_PASSWORD_REQUEST':
      case 'SET_PHARMACY_ENABLED':
      case 'SET_MASTER_PRICE_SYNC':
      case 'SET_MASTER_BARCODE':
      case 'UPDATE_PRODUCT_IMAGE':
      case 'UPDATE_CATEGORY_IMAGE':
      case 'UPDATE_DEALS_SETTINGS':
      case 'UPDATE_PLATFORM_CONTENT':
      case 'SYSTEM_ALERT_RAISED':
      case 'MERGE_GROUPS':
      case 'ENSURE_GROUP_CODE':
        return 'bg-amber-50 text-amber-800 border border-amber-200';

      // Blue / Enqueued background jobs & Data ops
      case 'ENQUEUE_PRICE_SYNC':
      case 'ENQUEUE_FULL_SYNC':
      case 'ENQUEUE_DISCOVERY':
      case 'ENQUEUE_PRODUCT_DETAILS':
      case 'ENQUEUE_FULL_CATALOG_HARVEST':
      case 'ENQUEUE_MATCHING':
      case 'ENQUEUE_MASTER_MERGE':
      case 'ENQUEUE_NAME_BRAND_CLUSTER':
      case 'REMATCH_PRODUCT':
      case 'GTIN_ENRICH':
      case 'GTIN_BACKFILL':
      case 'LISTING_IMAGE_BACKFILL':
      case 'BILINGUAL_FILL':
      case 'ARABIC_REHARVEST':
      case 'CROSS_GTIN_FILL':
      case 'TOGGLE_DEAL_PIN':
      case 'TOGGLE_DEAL_EXCLUDE':
        return 'bg-blue-50 text-blue-800 border border-blue-200';

      default:
        return 'bg-[#F0E4D5] text-[#2C231B] border border-[#E8D5BE]';
    }
  }

  getActionIcon(action: string): string {
    switch (action) {
      case 'LOGIN_SUCCESS':
        return 'pi pi-sign-in';
      case 'LOGIN_FAILED':
        return 'pi pi-times';
      case 'REGISTER_CUSTOMER':
        return 'pi pi-user-plus';
      case 'CONFIRM_REGISTRATION':
        return 'pi pi-check';
      case 'CREATE_ADMIN':
        return 'pi pi-shield';
      case 'CHANGE_PASSWORD':
      case 'RESET_PASSWORD':
      case 'FORGOT_PASSWORD_REQUEST':
        return 'pi pi-key';
      case 'SET_PHARMACY_ENABLED':
        return 'pi pi-power-off';
      case 'SCRAPE_RUN_PASSED':
        return 'pi pi-check-circle';
      case 'SCRAPE_RUN_FAILED':
        return 'pi pi-exclamation-triangle';
      case 'SCRAPE_RUN_ROLLED_BACK':
        return 'pi pi-undo';
      case 'ENQUEUE_PRICE_SYNC':
      case 'ENQUEUE_FULL_SYNC':
      case 'ENQUEUE_DISCOVERY':
      case 'ENQUEUE_PRODUCT_DETAILS':
      case 'ENQUEUE_FULL_CATALOG_HARVEST':
      case 'ENQUEUE_MATCHING':
      case 'ENQUEUE_MASTER_MERGE':
      case 'ENQUEUE_NAME_BRAND_CLUSTER':
        return 'pi pi-sync';
      case 'REMATCH_PRODUCT':
        return 'pi pi-refresh';
      case 'SET_MASTER_PRICE_SYNC':
        return 'pi pi-dollar';
      case 'SET_MASTER_BARCODE':
        return 'pi pi-barcode';
      case 'LINK_GROUP_CODE':
        return 'pi pi-link';
      case 'UNLINK_PRODUCT':
        return 'pi pi-unlink';
      case 'MERGE_GROUPS':
        return 'pi pi-clone';
      case 'ENSURE_GROUP_CODE':
        return 'pi pi-check';
      case 'ACCEPT_MATCH':
        return 'pi pi-check-circle';
      case 'REJECT_MATCH':
        return 'pi pi-times-circle';
      case 'FORCE_MATCH':
        return 'pi pi-bolt';
      case 'BULK_MATCH':
        return 'pi pi-clone';
      case 'UPDATE_PRODUCT_IMAGE':
      case 'UPDATE_CATEGORY_IMAGE':
        return 'pi pi-image';
      case 'DELETE_PRODUCT_IMAGE':
      case 'DELETE_CATEGORY_IMAGE':
        return 'pi pi-trash';
      case 'UPDATE_DEALS_SETTINGS':
        return 'pi pi-cog';
      case 'TOGGLE_DEAL_PIN':
        return 'pi pi-bookmark';
      case 'TOGGLE_DEAL_EXCLUDE':
        return 'pi pi-ban';
      case 'UPDATE_PLATFORM_CONTENT':
        return 'pi pi-file-edit';
      case 'ACKNOWLEDGE_ALERT':
        return 'pi pi-bell-slash';
      case 'SYSTEM_ALERT_RAISED':
        return 'pi pi-bell';
      case 'SYSTEM_ERROR':
        return 'pi pi-exclamation-circle';
      case 'GTIN_ENRICH':
      case 'GTIN_BACKFILL':
      case 'LISTING_IMAGE_BACKFILL':
      case 'CROSS_GTIN_FILL':
        return 'pi pi-database';
      case 'BILINGUAL_FILL':
      case 'ARABIC_REHARVEST':
        return 'pi pi-language';
      default:
        return 'pi pi-info-circle';
    }
  }

  getCategoryBadgeClass(category: string): string {
    switch (category) {
      case 'Auth':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      case 'Scraping':
        return 'bg-sky-50 text-sky-700 border border-sky-200';
      case 'Pharmacies':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Products':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      case 'Catalog':
        return 'bg-[#F8EEE2] text-[#C27938] border border-[#E8D5BE]';
      case 'MatchReview':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'Categories':
        return 'bg-teal-50 text-teal-700 border border-teal-200';
      case 'Deals':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'Platform':
        return 'bg-violet-50 text-violet-700 border border-violet-200';
      case 'Alerts':
        return 'bg-orange-50 text-orange-700 border border-orange-200';
      case 'System':
        return 'bg-slate-100 text-slate-800 border border-slate-300';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  }

  getActionLabel(action: string): string {
    const key = `auditLogs.actions.${action}`;
    const res = this.i18n.t(key);
    return res !== key ? res : action;
  }

  getCategoryLabel(category: string): string {
    const key = `auditLogs.categories.${category}`;
    const res = this.i18n.t(key);
    return res !== key ? res : category;
  }
}