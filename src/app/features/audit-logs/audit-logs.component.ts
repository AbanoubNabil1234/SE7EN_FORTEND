import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
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
export class AuditLogsComponent implements OnInit {
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

  loadFilterOptions(): void {
    this.auditLogRepo.getFilterOptions().subscribe({
      next: (opts) => this.filterOptions.set(opts),
      error: () => {}
    });
  }

  loadLogs(): void {
    this.loading.set(true);

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
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          this.logs.set(result.items);
          this.totalCount.set(result.totalCount);
          this.totalPages.set(result.totalPages || 1);
        },
        error: () => {
          this.notify.showError(this.i18n.t('auditLogs.loadError'));
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
      case 'LINK_GROUP_CODE':
      case 'ACCEPT_MATCH':
      case 'FORCE_MATCH':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'UNLINK_PRODUCT':
      case 'REJECT_MATCH':
      case 'DELETE_PRODUCT_IMAGE':
      case 'DELETE_CATEGORY_IMAGE':
        return 'bg-rose-100 text-rose-800 border border-rose-200';
      case 'MERGE_GROUPS':
      case 'ENSURE_GROUP_CODE':
      case 'UPDATE_PRODUCT_IMAGE':
      case 'UPDATE_CATEGORY_IMAGE':
      case 'UPDATE_DEALS_SETTINGS':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'TOGGLE_DEAL_PIN':
      case 'TOGGLE_DEAL_EXCLUDE':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      default:
        return 'bg-[#F0E4D5] text-[#2C231B] border border-[#E8D5BE]';
    }
  }

  getActionIcon(action: string): string {
    switch (action) {
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
      default:
        return 'pi pi-info-circle';
    }
  }

  getCategoryBadgeClass(category: string): string {
    switch (category) {
      case 'Catalog':
        return 'bg-[#F8EEE2] text-[#C27938] border border-[#E8D5BE]';
      case 'MatchReview':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'Categories':
        return 'bg-teal-50 text-teal-700 border border-teal-200';
      case 'Deals':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
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