import { Injectable, signal } from '@angular/core';

/**
 * Global Loading State Manager using Angular Signals.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly _activeRequests = signal<number>(0);
  readonly isLoading = signal<boolean>(false);
  private showTimer: ReturnType<typeof setTimeout> | null = null;

  startLoading(): void {
    this._activeRequests.update(n => n + 1);
    if (this._activeRequests() !== 1) {
      return;
    }

    this.showTimer = setTimeout(() => {
      if (this._activeRequests() > 0) {
        this.isLoading.set(true);
      }
    }, 150);
  }

  stopLoading(): void {
    this._activeRequests.update(n => Math.max(0, n - 1));
    if (this._activeRequests() === 0) {
      if (this.showTimer !== null) {
        clearTimeout(this.showTimer);
        this.showTimer = null;
      }
      this.isLoading.set(false);
    }
  }
}
