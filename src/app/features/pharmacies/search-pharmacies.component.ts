import { Component, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { API_ENDPOINTS } from '../../core/infrastructure/http/api-endpoints.constants';

interface PharmacyVisibility {
  id: string;
  code: string;
  name: string;
  nameArabic: string;
  isEnabled: boolean;
  showInCustomerSearch: boolean;
}

interface CatalogImportResult {
  updated: number;
  created: number;
  unchanged: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

@Component({
  selector: 'app-search-pharmacies',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './search-pharmacies.component.html'
})
export class SearchPharmaciesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  readonly locale = inject(LocaleService);
  private readonly sheetFile = viewChild<ElementRef<HTMLInputElement>>('sheetFile');
  private pendingImport: PharmacyVisibility | null = null;

  readonly items = signal<PharmacyVisibility[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly savingId = signal<string | null>(null);
  readonly syncingId = signal<string | null>(null);
  readonly exportingId = signal<string | null>(null);
  readonly importingId = signal<string | null>(null);
  readonly sheetBusy = () => this.exportingId() !== null || this.importingId() !== null;

  readonly visibleCount = () => this.items().filter((p) => p.showInCustomerSearch).length;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.http
      .get<PharmacyVisibility[]>(API_ENDPOINTS.PHARMACY_SEARCH_VISIBILITY)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (rows) => this.items.set(rows ?? []),
        error: () => this.error.set(this.i18n.t('searchPharmacies.loadError'))
      });
  }

  syncPrices(p: PharmacyVisibility): void {
    if (!p.isEnabled || this.syncingId() === p.id) return;

    this.syncingId.set(p.id);
    this.http
      .post<{ enqueued: boolean }>(API_ENDPOINTS.PHARMACY_PRICE_SYNC(p.id), {})
      .pipe(finalize(() => this.syncingId.set(null)))
      .subscribe({
        next: () =>
          this.notifications.showSuccess(
            this.i18n.t('searchPharmacies.syncOk'),
            this.i18n.t('searchPharmacies.syncTitle')
          )
      });
  }

  toggle(p: PharmacyVisibility): void {
    const next = !p.showInCustomerSearch;
    this.savingId.set(p.id);
    this.http
      .put<PharmacyVisibility>(`${API_ENDPOINTS.PHARMACY_SEARCH_VISIBILITY_BASE}/${p.id}/search-visibility`, {
        showInCustomerSearch: next
      })
      .pipe(finalize(() => this.savingId.set(null)))
      .subscribe({
        next: (updated) => {
          this.items.update((list) =>
            list.map((row) => (row.id === updated.id ? { ...row, ...updated } : row))
          );
          this.notifications.showSuccess(
            next
              ? this.i18n.t('searchPharmacies.shownMsg')
              : this.i18n.t('searchPharmacies.hiddenMsg'),
            this.i18n.t('searchPharmacies.savedTitle')
          );
        },
        error: () =>
          this.notifications.showError(
            this.i18n.t('searchPharmacies.saveError'),
            this.i18n.t('searchPharmacies.savedTitle')
          )
      });
  }

  exportSheet(p: PharmacyVisibility): void {
    if (this.sheetBusy()) return;

    this.exportingId.set(p.id);
    this.http
      .get(API_ENDPOINTS.PHARMACY_CATALOG_XLSX(p.id), { responseType: 'blob' })
      .pipe(finalize(() => this.exportingId.set(null)))
      .subscribe({
        next: (blob) => {
          if (!blob?.size) {
            this.notifications.showError(
              this.i18n.t('searchPharmacies.exportError'),
              this.i18n.t('searchPharmacies.sheetTitle')
            );
            return;
          }
          this.saveBlob(blob, `${p.code}-catalog.xlsx`);
          this.notifications.showSuccess(
            this.i18n.t('searchPharmacies.exportOk'),
            this.i18n.t('searchPharmacies.sheetTitle')
          );
        },
        error: (err: HttpErrorResponse) =>
          void this.readHttpError(err).then((message) =>
            this.notifications.showError(
              message || this.i18n.t('searchPharmacies.exportError'),
              this.i18n.t('searchPharmacies.sheetTitle')
            )
          )
      });
  }

  pickImport(p: PharmacyVisibility): void {
    if (this.sheetBusy()) return;
    this.pendingImport = p;
    this.sheetFile()?.nativeElement.click();
  }

  onSheetSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const pharmacy = this.pendingImport;
    input.value = '';
    this.pendingImport = null;
    if (!file || !pharmacy) return;

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      this.notifications.showError(
        this.i18n.t('searchPharmacies.fileTypeError'),
        this.i18n.t('searchPharmacies.sheetTitle')
      );
      return;
    }

    const body = new FormData();
    body.append('file', file, file.name);
    this.importingId.set(pharmacy.id);
    this.http
      .post<CatalogImportResult>(API_ENDPOINTS.PHARMACY_CATALOG_XLSX(pharmacy.id), body)
      .pipe(finalize(() => this.importingId.set(null)))
      .subscribe({
        next: (result) => {
          const counts = this.fill(this.i18n.t('searchPharmacies.importCounts'), {
            updated: result.updated ?? 0,
            created: result.created ?? 0,
            unchanged: result.unchanged ?? 0,
            skipped: result.skipped ?? 0
          });
          const first = result.errors?.[0];
          const detail = first
            ? `${counts} — ${this.fill(this.i18n.t('searchPharmacies.importRowError'), {
                row: first.row,
                message: first.message
              })}`
            : counts;
          if (first) {
            this.notifications.showWarn(detail, this.i18n.t('searchPharmacies.importOk'));
          } else {
            this.notifications.showSuccess(detail, this.i18n.t('searchPharmacies.importOk'));
          }
        },
        error: (err: HttpErrorResponse) =>
          void this.readHttpError(err).then((message) =>
            this.notifications.showError(
              message || this.i18n.t('searchPharmacies.importError'),
              this.i18n.t('searchPharmacies.sheetTitle')
            )
          )
      });
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private async readHttpError(error: HttpErrorResponse): Promise<string> {
    const body = error.error;
    if (typeof body?.message === 'string' && body.message.trim()) return body.message;
    if (body instanceof Blob) {
      try {
        const parsed = JSON.parse(await body.text()) as { message?: string };
        if (parsed?.message?.trim()) return parsed.message;
      } catch {
        return '';
      }
    }
    return '';
  }

  private fill(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
  }
}
