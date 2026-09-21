import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { CatalogBrowseRepository } from '../../../../core/domain/repositories/catalog-browse.repository';
import {
  CatalogFamily,
  PharmacyProductSearchHit,
  catalogFamilyTitle
} from '../../../../core/domain/models/catalog-family.model';
import { pharmacyLogo as resolvePharmacyLogo } from '../../../../core/domain/pharmacy-brands';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { LocaleService } from '../../../../core/services/locale.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-quick-add-product-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, TranslatePipe],
  template: `
    @if (isOpen() && family()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'quickAdd.modalTitle' | t"
        (keydown.escape)="onClose()"
      >
        <!-- Backdrop click listener -->
        <div class="fixed inset-0" (click)="onClose()"></div>

        <!-- Modal Box -->
        <div
          class="relative w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden border border-[#E8D5BE] z-10 animate-fade-in"
          [attr.dir]="isRtl() ? 'rtl' : 'ltr'"
        >
          <!-- Header -->
          <div class="px-5 py-4 border-b border-[#EDE0D0] bg-[#FBF8F4] flex items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#F8EEE2] text-[#C27938]">
                  <i class="pi pi-plus text-sm"></i>
                </span>
                <h3 class="text-base font-extrabold text-[#181A1D] truncate">
                  {{ 'quickAdd.modalTitle' | t }}
                </h3>
              </div>
              <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#8A735C]">
                <span>{{ currentFamilyTitle() }}</span>
                @if (family()?.groupCode; as code) {
                  <span class="rounded bg-[#181A1D] px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">
                    {{ code }}
                  </span>
                }
              </div>
            </div>

            <!-- Close Button -->
            <button
              type="button"
              class="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#E8D5BE] bg-white text-[#8A735C] hover:bg-[#F8EEE2] hover:text-[#181A1D] transition-colors"
              (click)="onClose()"
              [attr.aria-label]="'common.close' | t"
            >
              <i class="pi pi-times text-xs"></i>
            </button>
          </div>

          <!-- Search Input Section -->
          <div class="p-4 border-b border-[#EDE0D0] bg-white">
            <div class="relative flex items-center">
              <span class="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-[#A68B6D]">
                <i class="pi pi-search text-sm"></i>
              </span>
              <input
                type="text"
                class="w-full min-h-11 rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] ps-10 pe-10 text-sm font-medium text-[#181A1D] outline-none transition-all focus:border-[#C27938] focus:bg-white focus:ring-2 focus:ring-[#C27938]/15"
                [placeholder]="'quickAdd.searchPlaceholder' | t"
                [ngModel]="searchQuery()"
                (ngModelChange)="onSearchInput($event)"
                autofocus
              />
              @if (searchQuery()) {
                <button
                  type="button"
                  class="absolute inset-y-0 end-0 flex items-center pe-3 text-[#A68B6D] hover:text-[#181A1D]"
                  (click)="clearSearch()"
                  [attr.aria-label]="'common.dismiss' | t"
                >
                  <i class="pi pi-times-circle text-sm"></i>
                </button>
              }
            </div>

            @if (loading()) {
              <div class="mt-2 flex items-center gap-2 text-xs font-semibold text-[#C27938]">
                <i class="pi pi-spin pi-spinner text-xs"></i>
                <span>{{ 'quickAdd.searching' | t }}</span>
              </div>
            }
          </div>

          <!-- Results Body -->
          <div class="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[220px] max-h-[50vh] divide-y divide-[#F2E8DC]">
            @if (hits().length > 0) {
              @for (hit of hits(); track hit.id) {
                <div class="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-[#EDE0D0] bg-white hover:bg-[#FBF8F4] transition-colors">
                  <!-- Product Info with Pharmacy Logo -->
                  <div class="flex items-start gap-3 min-w-0 flex-1">
                    @if (pharmacyLogo(hit.pharmacyCode); as logo) {
                      <img
                        [src]="logo"
                        [alt]="hit.pharmacyName"
                        class="size-10 shrink-0 rounded-lg border border-[#E8D5BE] bg-white object-contain p-0.5"
                      />
                    } @else {
                      <span class="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#F8EEE2] text-[#C27938]">
                        <i class="pi pi-shop text-sm"></i>
                      </span>
                    }

                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-1.5">
                        <span class="rounded bg-[#F8EEE2] px-2 py-0.5 text-[11px] font-bold text-[#8A735C]">
                          {{ hit.pharmacyName }}
                        </span>
                        @if (hit.packSize) {
                          <span class="text-[11px] font-semibold text-[#8A735C]" dir="ltr">
                            {{ hit.packSize }}
                          </span>
                        }
                      </div>

                      <h4 class="mt-1 text-sm font-bold text-[#181A1D] text-pretty">
                        {{ hit.name }}
                      </h4>

                      @if (hit.englishName && hit.englishName !== hit.name) {
                        <p class="text-xs text-[#8A735C] truncate" dir="ltr">
                          {{ hit.englishName }}
                        </p>
                      }

                      <div class="mt-1.5 flex flex-wrap items-center gap-2">
                        @if (hit.price != null) {
                          <span class="text-sm font-extrabold text-[#181A1D] tabular-nums">
                            {{ hit.price | currency: (hit.currency || 'SAR'):'symbol':'1.2-2' }}
                          </span>
                        }
                        @if (hit.oldPrice != null && hit.oldPrice > (hit.price || 0)) {
                          <span class="text-xs text-slate-400 line-through tabular-nums">
                            {{ hit.oldPrice | currency: (hit.currency || 'SAR'):'symbol':'1.2-2' }}
                          </span>
                        }
                        @if (hit.barcode) {
                          <span class="inline-flex items-center gap-1 rounded bg-[#F8EEE2] px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#181A1D]">
                            <i class="pi pi-barcode text-[11px] text-[#C27938]"></i>
                            <span dir="ltr">{{ hit.barcode }}</span>
                          </span>
                        }
                        @if (hit.manualGroupCode && hit.manualGroupCode !== family()?.groupCode) {
                          <span class="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                            {{ 'quickAdd.alreadyLinked' | t }}: {{ hit.manualGroupCode }}
                          </span>
                        }
                      </div>
                    </div>
                  </div>

                  <!-- Add Button -->
                  <div class="shrink-0 flex items-center justify-end">
                    <button
                      type="button"
                      class="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#181A1D] px-3.5 text-xs font-bold text-white hover:bg-black disabled:opacity-50 transition-colors"
                      [disabled]="linkingId() === hit.id || isAlreadyInFamily(hit)"
                      (click)="addHitToFamily(hit)"
                    >
                      @if (linkingId() === hit.id) {
                        <i class="pi pi-spin pi-spinner text-xs"></i>
                        <span>{{ 'quickAdd.adding' | t }}</span>
                      } @else if (isAlreadyInFamily(hit)) {
                        <i class="pi pi-check text-xs text-emerald-400"></i>
                        <span>{{ 'productsAdmin.link' | t }}</span>
                      } @else {
                        <i class="pi pi-plus text-xs text-[#C27938]"></i>
                        <span>{{ 'quickAdd.addToFamily' | t }}</span>
                      }
                    </button>
                  </div>
                </div>
              }
            } @else if (hasSearched() && !loading()) {
              <div class="py-12 text-center text-slate-400">
                <i class="pi pi-search text-3xl mb-2 text-[#A68B6D]"></i>
                <p class="text-sm font-bold text-[#181A1D]">{{ 'quickAdd.noResults' | t }}</p>
                <p class="text-xs text-[#8A735C] mt-1">{{ 'quickAdd.modalSubtitle' | t }}</p>
              </div>
            } @else if (!loading()) {
              <div class="py-12 text-center text-slate-400">
                <i class="pi pi-box text-3xl mb-2 text-[#A68B6D]/60"></i>
                <p class="text-sm font-semibold text-[#8A735C]">{{ 'quickAdd.startTyping' | t }}</p>
              </div>
            }
          </div>

          <!-- Footer -->
          <div class="px-5 py-3 border-t border-[#EDE0D0] bg-[#FBF8F4] flex items-center justify-between text-xs text-[#8A735C]">
            <span>
              {{ hits().length }} {{ 'common.search' | t }}
            </span>
            <button
              type="button"
              class="inline-flex min-h-8 items-center rounded-lg border border-[#E8D5BE] bg-white px-3 text-xs font-bold text-[#181A1D] hover:bg-[#F8EEE2]"
              (click)="onClose()"
            >
              {{ 'common.close' | t }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class QuickAddProductModalComponent {
  private readonly catalog = inject(CatalogBrowseRepository);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  private readonly locale = inject(LocaleService);

  readonly family = input<CatalogFamily | null>(null);
  readonly isOpen = input<boolean>(false);

  readonly close = output<void>();
  readonly productAdded = output<{ pharmacyProductId: string; groupCode: string }>();

  readonly searchQuery = signal<string>('');
  readonly hits = signal<PharmacyProductSearchHit[]>([]);
  readonly loading = signal<boolean>(false);
  readonly linkingId = signal<string | null>(null);
  readonly hasSearched = signal<boolean>(false);

  private searchDebounceTimer?: ReturnType<typeof setTimeout>;

  readonly isRtl = computed(() => this.locale.locale() === 'ar');

  currentFamilyTitle(): string {
    return catalogFamilyTitle(this.family(), this.locale.locale());
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
      this.executeSearch(trimmed);
    }, 300);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.hits.set([]);
    this.hasSearched.set(false);
    this.loading.set(false);
  }

  private executeSearch(term: string): void {
    this.catalog
      .searchPharmacyProducts(term, 30)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (results) => {
          this.hits.set(results);
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
            groupCode: res.code
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

  onClose(): void {
    this.clearSearch();
    this.close.emit();
  }
}
