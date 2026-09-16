import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warn';
  title?: string;
  message: string;
}

/**
 * Toast Notification Service using reactive Angular Signals.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly toasts = signal<ToastMessage[]>([]);

  showSuccess(message: string, title: string = 'Success'): void {
    this.addToast('success', message, title);
  }

  showError(message: string, title: string = 'Error'): void {
    this.addToast('error', message, title);
  }

  showInfo(message: string, title: string = 'Info'): void {
    this.addToast('info', message, title);
  }

  showWarn(message: string, title: string = 'Notice'): void {
    this.addToast('warn', message, title);
  }

  private addToast(type: ToastMessage['type'], message: string, title: string): void {
    const toast: ToastMessage = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      title,
      message
    };
    this.toasts.update(current => [...current, toast]);

    setTimeout(() => {
      this.remove(toast.id);
    }, 4000);
  }

  remove(id: string): void {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }
}
