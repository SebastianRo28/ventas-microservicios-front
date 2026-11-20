import { Injectable } from '@angular/core';

export interface ThemeColors { nav: string; modalBg: string; modalFg: string; }

/** Defaults match the Nexo RH design (topbar primary-900, white modal headers). */
export const DEFAULT_THEME: ThemeColors = { nav: '#263D8B', modalBg: '#FFFFFF', modalFg: '#1E2433' };
const KEY = 'nexo-theme';

/** "Personaliza tu Nexo": applies brand colors as CSS variables and remembers them in this browser. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  current: ThemeColors = { ...DEFAULT_THEME };

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as ThemeColors | null;
      if (saved) this.current = { ...DEFAULT_THEME, ...saved };
    } catch { /* storage unavailable: keep defaults */ }
    this.apply(this.current);
  }

  apply(c: ThemeColors): void {
    const s = document.documentElement.style;
    s.setProperty('--nx-topbar-bg', c.nav);
    s.setProperty('--nx-modal-head-bg', c.modalBg);
    s.setProperty('--nx-modal-head-fg', c.modalFg);
  }

  save(c: ThemeColors): void {
    this.current = { ...c };
    this.apply(c);
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* ignore */ }
  }
}
