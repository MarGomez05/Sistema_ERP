import { Injectable, computed, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'tamachihua.theme';
const DARK_THEME_COLOR = '#171310';
const LIGHT_THEME_COLOR = '#0873c4';

// Preferencia guardada; si no existe, respeta el sistema operativo.
function resolveInitialTheme(): Theme {
  if (typeof document === 'undefined') {
    return 'light';
  }

  const current = document.documentElement.getAttribute('data-theme');

  if (current === 'dark' || current === 'light') {
    return current;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
  } catch {
    // Navegadores con almacenamiento bloqueado: se usa la preferencia del sistema.
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Tema visual del sistema: claro u oscuro cálido, persistido por navegador.
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themeState = signal<Theme>(resolveInitialTheme());

  readonly theme = this.themeState.asReadonly();
  readonly isDark = computed(() => this.themeState() === 'dark');

  constructor() {
    this.apply(this.themeState());
  }

  toggle(): void {
    this.set(this.themeState() === 'dark' ? 'light' : 'dark');
  }

  set(theme: Theme): void {
    this.themeState.set(theme);
    this.apply(theme);
  }

  private apply(theme: Theme): void {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;

    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;

    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

    if (meta !== null) {
      meta.content = theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Sin persistencia disponible; el cambio sigue aplicándose en la sesión actual.
    }
  }
}
