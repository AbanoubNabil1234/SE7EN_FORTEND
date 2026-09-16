import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

/**
 * Theme Service for dark mode toggling, persisted in localStorage and reactive via Signals.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.getInitialTheme());

  constructor() {
    effect(() => {
      const current = this.theme();
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('se7en_theme', current);
          if (current === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      } catch (e) {
        console.warn('Theme storage error', e);
      }
    });
  }

  toggleTheme(): void {
    this.theme.update(t => (t === 'light' ? 'dark' : 'light'));
  }

  private getInitialTheme(): Theme {
    try {
      if (typeof window === 'undefined') return 'light';
      const saved = localStorage.getItem('se7en_theme') as Theme;
      if (saved) return saved;
      return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }
}
