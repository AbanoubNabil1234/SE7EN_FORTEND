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
  templateUrl: './merge-family-modal.component.html'
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
