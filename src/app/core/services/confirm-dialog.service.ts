import { Injectable, signal, inject } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  icon?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly i18n = inject(I18nService);
  readonly isOpen = signal<boolean>(false);
  readonly options = signal<ConfirmDialogOptions | null>(null);

  private resolver: ((value: boolean) => void) | null = null;

  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    // If a dialog is already open, resolve previous with false
    if (this.resolver) {
      this.resolver(false);
    }

    this.options.set({
      type: 'warning',
      confirmText: this.i18n.t('common.confirm'),
      cancelText: this.i18n.t('common.cancel'),
      ...options
    });
    this.isOpen.set(true);

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  handleConfirm(): void {
    const fn = this.resolver;
    this.resolver = null;
    this.isOpen.set(false);
    this.options.set(null);
    fn?.(true);
  }

  handleCancel(): void {
    const fn = this.resolver;
    this.resolver = null;
    this.isOpen.set(false);
    this.options.set(null);
    fn?.(false);
  }
}
