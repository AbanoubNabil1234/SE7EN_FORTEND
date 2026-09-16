import { Injectable, computed, effect, signal } from '@angular/core';

export type AppLocale = 'ar' | 'en';

const STORAGE_KEY = 'se7en_locale';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  readonly locale = signal<AppLocale>(this.readInitial());
  readonly isRtl = computed(() => this.locale() === 'ar');

  constructor() {
    effect(() => {
      const locale = this.locale();
      const dir = locale === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = locale;
      document.documentElement.dir = dir;
      localStorage.setItem(STORAGE_KEY, locale);
    });
  }

  setLocale(locale: AppLocale): void {
    this.locale.set(locale);
  }

  toggle(): void {
    this.locale.update((current) => (current === 'ar' ? 'en' : 'ar'));
  }

  private readInitial(): AppLocale {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ar' || saved === 'en') {
      return saved;
    }
    return 'ar';
  }
}
