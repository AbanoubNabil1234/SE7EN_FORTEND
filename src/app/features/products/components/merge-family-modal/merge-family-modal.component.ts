import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { CatalogBrowseRepository } from '../../../../core/domain/repositories/catalog-browse.repository';
import {
  CatalogFamily,
  GroupCodeMergeResult,
  catalogFamilyTitle
} from '../../../../core/domain/models/catalog-family.model';
import { pharmacyLogo as resolvePharmacyLogo } from '../../../../core/domain/pharmacy-brands';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { LocaleService } from '../../../../core/services/locale.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-merge-family-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    @if (isOpen() && sourceFamily()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'productsAdmin.mergeGroup' | t"
        (keydown.escape)="onClose()"
      >
        <!-- Backdrop click listener -->
        <div class="fixed inset-0" (click)="onClose()"></div>

        <!-- Modal Box -->
        <div
          class="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden border border-[#E8D5BE] z-10 animate-fade-in"
          [attr.dir]="isRtl() ? 'rtl' : 'ltr'"
        >
          <!-- Header -->
          <div class="px-5 py-4 border-b border-[#EDE0D0] bg-[#FBF8F4] flex items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#F8EEE2] text-[#C27938]">
                  <i class="pi pi-link text-sm"></i>
                </span>
                <h3 class="text-base font-extrabold text-[#181A1D] truncate">
                  {{ 'productsAdmin.mergeGroup' | t }}
                </h3>
              </div>
              <p class="mt-0.5 text-xs text-[#8A735C]">
                {{ 'productsAdmin.mergePrompt' | t }}
              </p>
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

          <!-- Body -->
          <div class="p-5 space-y-4">
            <!-- Source Family Card -->
            <div class="rounded-xl border border-[#EDE0D0] bg-[#FBF8F4] p-3.5 space-y-2">
              <div class="flex items-center justify-between gap-2">
                <span class="text-[11px] font-bold uppercase tracking-wider text-[#A68B6D]">
                  {{ 'productsAdmin.sourceFamily' | t }}
                </span>
                @if (sourceFamily()?.groupCode; as code) {
                  <span class="rounded bg-[#181A1D] px-2 py-0.5 font-mono text-xs font-bold text-white">
                    {{ code }}
                  </span>
                }
              </div>

              <div class="font-extrabold text-sm text-[#181A1D] leading-snug">
                {{ currentFamilyTitle() }}
              </div>

              <!-- Pharmacy badges in source family -->
              <div class="flex flex-wrap items-center gap-1.5 pt-1">
                @for (offer of sourceOffers(); track offer.pharmacyCode + (offer.pharmacyProductId || '')) {
                  <span class="inline-flex items-center gap-1 rounded-md border border-[#E8D5BE] bg-white px-2 py-1 text-xs font-medium text-[#4A4038]">
                    @if (pharmacyLogo(offer.pharmacyCode); as logo) {
                      <img [src]="logo" [alt]="offer.pharmacyName" class="size-3.5 object-contain" />
                    }
                    <span>{{ offer.pharmacyName }}</span>
                    @if (offer.barcode) {
                      <span class="font-mono text-[10px] text-[#A68B6D]" dir="ltr">({{ offer.barcode }})</span>
                    }
                  </span>
                }
              </div>
            </div>

            <!-- Target Group Code Input -->
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-[#181A1D]">
                {{ 'productsAdmin.targetFamily' | t }}
              </label>
              <div class="relative">
                <input
                  type="text"
                  dir="ltr"
                  class="w-full min-h-11 rounded-xl border bg-[#FBF8F4] px-3.5 font-mono text-sm font-bold text-[#181A1D] uppercase outline-none transition-all focus:border-[#C27938] focus:bg-white focus:ring-2 focus:ring-[#C27938]/15"
                  [ngClass]="inputError() ? 'border-rose-400' : 'border-[#E8D5BE]'"
                  [placeholder]="'productsAdmin.targetCodePlaceholder' | t"
                  [ngModel]="targetCode()"
                  (ngModelChange)="onTargetCodeChange($event)"
                  autofocus
                />
              </div>

              @if (inputError()) {
                <p class="text-xs font-medium text-rose-600 flex items-center gap-1">
                  <i class="pi pi-exclamation-circle text-xs"></i>
                  <span>{{ inputError() }}</span>
                </p>
              }
            </div>

            <!-- Warning Notice -->
            <div class="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-start gap-2.5">
              <i class="pi pi-info-circle text-amber-600 text-sm mt-0.5 shrink-0"></i>
              <p class="leading-relaxed">
                {{ 'productsAdmin.mergeWarning' | t }}
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-5 py-3.5 border-t border-[#EDE0D0] bg-[#FBF8F4] flex items-center justify-end gap-2.5">
            <button
              type="button"
              class="min-h-10 px-4 rounded-xl border border-[#E8D5BE] bg-white text-xs font-bold text-[#4A4038] hover:bg-[#F8EEE2] transition-colors"
              (click)="onClose()"
              [disabled]="loading()"
            >
              {{ 'common.cancel' | t }}
            </button>
            <button
              type="button"
              class="min-h-10 px-5 rounded-xl bg-[#C27938] text-xs font-extrabold text-white shadow-xs hover:bg-[#a5632b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              (click)="onConfirmMerge()"
              [disabled]="!canMerge() || loading()"
            >
              @if (loading()) {
                <i class="pi pi-spin pi-spinner text-xs"></i>
                <span>{{ 'productsAdmin.merging' | t }}</span>
              } @else {
                <i class="pi pi-check text-xs"></i>
                <span>{{ 'productsAdmin.confirmMerge' | t }}</span>
              }
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class MergeFamilyModalComponent {
  private readonly catalog = inject(CatalogBrowseRepository);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  private readonly localeService = inject(LocaleService);

  readonly sourceFamily = input<CatalogFamily | null>(null);
  readonly isOpen = input<boolean>(false);

  readonly close = output<void>();
  readonly merged = output<GroupCodeMergeResult>();

  readonly targetCode = signal<string>('');
  readonly loading = signal<boolean>(false);
  readonly inputError = signal<string | null>(null);

  readonly isRtl = computed(() => this.localeService.locale() === 'ar');

  readonly currentFamilyTitle = computed(() => {
    const fam = this.sourceFamily();
    if (!fam) return '';
    return catalogFamilyTitle(fam, this.localeService.locale());
  });

  readonly sourceOffers = computed(() => {
    const fam = this.sourceFamily();
    if (!fam) return [];
    return fam.packs.flatMap((p) => p.offers);
  });

  onTargetCodeChange(value: string): void {
    const cleaned = (value || '').trim().toUpperCase();
    this.targetCode.set(cleaned);
    this.validateTargetCode(cleaned);
  }

  private validateTargetCode(code: string): boolean {
    const sourceCode = (this.sourceFamily()?.groupCode || '').trim().toUpperCase();
    if (!code) {
      this.inputError.set(null);
      return false;
    }
    if (code === sourceCode) {
      this.inputError.set(this.i18n.t('productsAdmin.mergeSameError'));
      return false;
    }
    this.inputError.set(null);
    return true;
  }

  readonly canMerge = computed(() => {
    const code = this.targetCode().trim();
    const sourceCode = (this.sourceFamily()?.groupCode || '').trim();
    return !!code && !!sourceCode && code.toUpperCase() !== sourceCode.toUpperCase() && !this.inputError();
  });

  pharmacyLogo(code: string | null | undefined): string | null {
    return resolvePharmacyLogo(code);
  }

  onClose(): void {
    if (this.loading()) return;
    this.targetCode.set('');
    this.inputError.set(null);
    this.close.emit();
  }

  onConfirmMerge(): void {
    const source = this.sourceFamily();
    const sourceCode = (source?.groupCode || '').trim();
    const target = this.targetCode().trim();

    if (!sourceCode || !target) return;
    if (!this.validateTargetCode(target)) return;

    this.loading.set(true);
    this.catalog
      .mergeGroups(sourceCode, target)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          this.notifications.showSuccess(
            this.i18n.t('productsAdmin.mergedOk'),
            `${sourceCode} ➔ ${result.targetCode}`
          );
          this.targetCode.set('');
          this.inputError.set(null);
          this.merged.emit(result);
        },
        error: (err) => {
          if (err?.status === 409 || err?.error?.code === 'same_pharmacy_in_family') {
            this.notifications.showError(
              this.i18n.t('productsAdmin.mergeConflictError'),
              this.i18n.t('productsAdmin.mergeGroup')
            );
            this.inputError.set(this.i18n.t('productsAdmin.mergeConflictError'));
          } else {
            const msg = err?.error?.message || this.i18n.t('productsAdmin.mergeFailed');
            this.notifications.showError(msg, this.i18n.t('productsAdmin.mergeGroup'));
            this.inputError.set(msg);
          }
        }
      });
  }
}
