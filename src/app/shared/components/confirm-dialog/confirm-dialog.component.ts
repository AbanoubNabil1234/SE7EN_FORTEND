import { Component, HostListener, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { LocaleService } from '../../../core/services/locale.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.css'
})
export class ConfirmDialogComponent {
  private readonly i18n = inject(I18nService);
  readonly dialog = inject(ConfirmDialogService);
  private readonly locale = inject(LocaleService);

  readonly options = computed(() => this.dialog.options());
  readonly isRtl = computed(() => this.locale.locale() === 'ar');

  readonly defaultTitle = computed(() => {
    const type = this.options()?.type;
    if (type === 'danger') return this.i18n.t('common.confirmActionDanger');
    if (type === 'warning') return this.i18n.t('common.warning');
    return this.i18n.t('common.confirmAction');
  });

  readonly iconContainerClass = computed(() => {
    const type = this.options()?.type;
    switch (type) {
      case 'danger':
        return 'bg-red-50 text-red-600 border border-red-200';
      case 'info':
        return 'bg-blue-50 text-blue-600 border border-blue-200';
      case 'warning':
      default:
        return 'bg-amber-50 text-amber-700 border border-amber-200';
    }
  });

  readonly iconClass = computed(() => {
    const custom = this.options()?.icon;
    if (custom) return custom;
    const type = this.options()?.type;
    switch (type) {
      case 'danger':
        return 'pi pi-exclamation-triangle';
      case 'info':
        return 'pi pi-info-circle';
      case 'warning':
      default:
        return 'pi pi-exclamation-circle';
    }
  });

  readonly confirmButtonClass = computed(() => {
    const type = this.options()?.type;
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-400';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-400';
      case 'warning':
      default:
        return 'bg-[#C27938] hover:bg-[#A66428] focus:ring-[#C27938]/40';
    }
  });

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.dialog.isOpen()) {
      this.dialog.handleCancel();
    }
  }
}
