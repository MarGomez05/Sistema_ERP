import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { roleLabel as formatRoleLabel } from '@core/auth/auth.model';
import { ThemeService } from '@core/ui/theme.service';
import { IconComponent } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <header class="header">
      <div class="header__left">
        <button
          type="button"
          class="header__icon-button header__menu"
          aria-label="Abrir menú"
          (click)="toggleMobile.emit()"
        >
          <app-icon name="menu" [size]="20" />
        </button>

        <nav class="breadcrumb" aria-label="Ruta de navegación">
          <a class="breadcrumb__link" routerLink="/dashboard">Inicio</a>
          <app-icon name="chevronRight" [size]="14" />
          <span class="breadcrumb__current" aria-current="page">{{ pageTitle() }}</span>
        </nav>
      </div>

      <div class="header__right">
        <button
          type="button"
          class="header__theme"
          [attr.aria-label]="themeLabel()"
          [attr.title]="themeLabel()"
          (click)="theme.toggle()"
        >
          <app-icon [name]="theme.isDark() ? 'sun' : 'moon'" [size]="18" />
        </button>

        <div class="header__user">
          <button
            type="button"
            class="header__user-button"
            [attr.aria-expanded]="userMenuOpen()"
            aria-haspopup="menu"
            (click)="toggleUserMenu($event)"
          >
            <span class="header__avatar" aria-hidden="true">{{ initials() }}</span>
            <span class="header__user-info">
              <span class="header__user-name">{{ user()?.fullName }}</span>
              <span class="header__user-role">{{ roleLabel() }}</span>
            </span>
            <app-icon name="chevronDown" [size]="16" />
          </button>

          @if (userMenuOpen()) {
            <div class="header__panel" role="menu">
              <div class="header__panel-head">
                <p class="header__panel-name">{{ user()?.fullName }}</p>
                <p class="header__panel-meta">{{ user()?.username }}</p>
              </div>
              <button type="button" class="header__panel-item" role="menuitem" (click)="logout()">
                <app-icon name="logout" [size]="17" />
                Cerrar sesión
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: `
    .header {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      height: var(--header-height);
      padding: 0 24px;
      background: var(--header-bg);
      border-bottom: 1px solid var(--border);
      backdrop-filter: blur(10px);
    }

    .header__left {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }

    .header__icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--text-muted);
      transition:
        background var(--transition-fast),
        color var(--transition-fast);
    }

    .header__icon-button:hover {
      background: var(--gradient-soft);
      border-color: var(--brand-200);
      color: var(--brand-700);
    }

    .header__menu {
      display: none;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      color: var(--text-subtle);
      font-size: var(--text-sm);
    }

    .breadcrumb__link {
      color: var(--text-muted);
      font-weight: var(--weight-medium);
    }

    .breadcrumb__link:hover {
      color: var(--brand-600);
    }

    .breadcrumb__current {
      overflow: hidden;
      color: var(--text);
      font-weight: var(--weight-semibold);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .header__right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header__theme {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      background: var(--surface-muted);
      border: 1px solid var(--border);
      border-radius: var(--radius-pill);
      color: var(--text-muted);
      transition:
        background var(--transition-fast),
        border-color var(--transition-fast),
        color var(--transition-fast),
        transform var(--transition-fast);
    }

    .header__theme:hover {
      background: var(--surface-hover);
      border-color: var(--accent-500);
      color: var(--accent-600);
      transform: translateY(-1px);
    }

    :host-context(:root[data-theme='dark']) .header__theme {
      color: var(--accent-600);
    }

    :host-context(:root[data-theme='dark']) .header__theme:hover {
      box-shadow: 0 0 18px -6px var(--accent-500);
    }

    .header__user {
      position: relative;
    }

    .header__user-button {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 5px 10px 5px 5px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-pill);
      transition:
        background var(--transition-fast),
        border-color var(--transition-fast);
    }

    .header__user-button:hover {
      background: var(--surface-hover);
      border-color: var(--border);
    }

    .header__avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--gradient-brand);
      color: var(--text-inverse);
      font-size: var(--text-xs);
      font-weight: var(--weight-bold);
      letter-spacing: 0.04em;
    }

    .header__user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      line-height: 1.25;
    }

    .header__user-name {
      max-width: 190px;
      overflow: hidden;
      color: var(--text);
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .header__user-role {
      color: var(--text-subtle);
      font-size: 0.6875rem;
    }

    .header__panel {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 232px;
      padding: 8px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-md);
      animation: rise var(--transition-fast) both;
    }

    .header__panel-head {
      padding: 8px 10px 10px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 6px;
    }

    .header__panel-name {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    .header__panel-meta {
      margin-top: 2px;
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .header__panel-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 9px 10px;
      background: transparent;
      border: 0;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      font-size: var(--text-sm);
      text-align: left;
      transition:
        background var(--transition-fast),
        color var(--transition-fast);
    }

    .header__panel-item:hover {
      background: var(--danger-100);
      color: var(--danger-700);
    }

    @media (max-width: 1024px) {
      .header {
        padding: 0 16px;
      }

      .header__menu {
        display: inline-flex;
      }
    }

    @media (max-width: 720px) {
      .header__user-info {
        display: none;
      }

      .header__user-button {
        padding: 4px;
      }
    }
  `,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeUserMenu()',
  },
})
export class HeaderComponent {
  private readonly auth = inject(AuthService);

  protected readonly theme = inject(ThemeService);

  readonly pageTitle = input.required<string>();

  readonly toggleMobile = output<void>();

  protected readonly user = this.auth.user;
  protected readonly userMenuOpen = signal(false);

  protected readonly themeLabel = computed(() =>
    this.theme.isDark() ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
  );

  protected readonly roleLabel = computed(() => formatRoleLabel(this.user()?.role));

  protected readonly initials = computed(() => {
    const name = this.user()?.fullName ?? '';
    const parts = name.trim().split(/\s+/).filter(Boolean);

    return parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  });

  protected toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.userMenuOpen.update((open) => !open);
  }

  protected closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  protected onDocumentClick(event: Event): void {
    const target = event.target;

    if (target instanceof Element && target.closest('.header__user') !== null) {
      return;
    }

    this.closeUserMenu();
  }

  protected logout(): void {
    this.closeUserMenu();
    this.auth.logout();
  }
}
