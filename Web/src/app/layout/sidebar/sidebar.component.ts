import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { ThemeService } from '@core/ui/theme.service';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { environment } from '@env/environment';
import { NAV_SECTIONS, NavItem } from '../nav.config';

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  template: `
    <aside
      class="sidebar"
      [class.sidebar--collapsed]="compact()"
      [class.sidebar--open]="mobileOpen()"
    >
      <div class="sidebar__brand">
        <a class="sidebar__brand-link" routerLink="/dashboard" aria-label="Ir al panel general">
          @if (compact()) {
            <img
              class="sidebar__isotipo"
              src="brand/isotipo.png"
              alt="TAMACHIHUA"
              width="34"
              height="34"
            />
          } @else {
            <img class="sidebar__logo" [src]="logoSrc()" alt="TAMACHIHUA ERP" />
          }
        </a>

        <button
          type="button"
          class="sidebar__collapse"
          [attr.aria-label]="compact() ? 'Expandir menú' : 'Contraer menú'"
          (click)="toggleCollapse.emit()"
        >
          <app-icon [name]="compact() ? 'panelLeftOpen' : 'panelLeftClose'" [size]="18" />
        </button>
      </div>

      <nav class="sidebar__nav" aria-label="Navegación principal">
        @for (section of sections(); track section.label) {
          <div class="sidebar__section">
            @if (!compact()) {
              <p class="sidebar__section-label">{{ section.label }}</p>
            }
            @for (item of section.items; track item.route) {
              <a
                class="sidebar__link"
                [routerLink]="item.route"
                routerLinkActive="sidebar__link--active"
                #link="routerLinkActive"
                [attr.aria-current]="link.isActive ? 'page' : null"
                [attr.title]="compact() ? item.label : null"
                (click)="navigated.emit()"
              >
                <app-icon [name]="item.icon" [size]="19" />
                @if (!compact()) {
                  <span class="sidebar__link-label">{{ item.label }}</span>
                }
              </a>
            }
          </div>
        }
      </nav>

      <div class="sidebar__footer">
        @if (!compact()) {
          <p class="sidebar__footer-title">TAMACHIHUA ERP</p>
          <p class="sidebar__footer-meta">Versión {{ version }}</p>
        } @else {
          <span class="sidebar__footer-dot" aria-hidden="true"></span>
        }
      </div>
    </aside>

    @if (mobileOpen()) {
      <button
        type="button"
        class="sidebar__backdrop"
        aria-label="Cerrar menú"
        (click)="navigated.emit()"
      ></button>
    }
  `,
  styles: `
    .sidebar {
      position: sticky;
      top: 0;
      display: flex;
      flex-direction: column;
      width: var(--sidebar-width);
      height: 100dvh;
      background: var(--surface);
      border-right: 1px solid var(--border);
      transition: width var(--transition);
      z-index: 40;
    }

    .sidebar--collapsed {
      width: var(--sidebar-collapsed);
    }

    .sidebar__brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      height: var(--header-height);
      padding: 0 18px;
      border-bottom: 1px solid var(--border);
    }

    .sidebar--collapsed .sidebar__brand {
      flex-direction: column;
      height: auto;
      gap: 10px;
      padding: 16px 0;
    }

    .sidebar__brand-link {
      display: inline-flex;
      align-items: center;
      min-width: 0;
    }

    .sidebar__logo {
      width: 148px;
      height: auto;
    }

    .sidebar__isotipo {
      width: 34px;
      height: 34px;
      border-radius: 8px;
    }

    .sidebar__collapse {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      color: var(--text-subtle);
      transition:
        background var(--transition-fast),
        color var(--transition-fast),
        border-color var(--transition-fast);
    }

    .sidebar__collapse:hover {
      background: var(--gradient-soft);
      border-color: var(--brand-200);
      color: var(--brand-600);
    }

    .sidebar__nav {
      flex: 1;
      padding: 18px 12px;
      overflow-y: auto;
    }

    .sidebar__section + .sidebar__section {
      margin-top: 22px;
    }

    .sidebar__section-label {
      padding: 0 10px;
      margin-bottom: 8px;
      color: var(--text-subtle);
      font-size: 0.6875rem;
      font-weight: var(--weight-semibold);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .sidebar__link {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: var(--radius-md);
      color: var(--text-muted);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      transition:
        background var(--transition-fast),
        color var(--transition-fast);
    }

    .sidebar--collapsed .sidebar__link {
      justify-content: center;
      padding: 11px 0;
    }

    .sidebar__link:hover {
      background: var(--surface-hover);
      color: var(--brand-700);
    }

    .sidebar__link--active {
      background: var(--gradient-soft);
      color: var(--brand-700);
      font-weight: var(--weight-semibold);
    }

    .sidebar__link--active::before {
      content: '';
      position: absolute;
      left: -12px;
      top: 50%;
      width: 3px;
      height: 22px;
      border-radius: var(--radius-pill);
      background: var(--brand-500);
      transform: translateY(-50%);
    }

    .sidebar__link-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sidebar__footer {
      padding: 16px 22px;
      border-top: 1px solid var(--border);
    }

    .sidebar__footer-title {
      color: var(--text-muted);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.02em;
    }

    .sidebar__footer-meta {
      margin-top: 2px;
      color: var(--text-subtle);
      font-size: 0.6875rem;
    }

    .sidebar__footer-dot {
      display: block;
      width: 8px;
      height: 8px;
      margin: 0 auto;
      border-radius: 50%;
      background: var(--success-500);
    }

    .sidebar__backdrop {
      display: none;
    }

    @media (max-width: 1024px) {
      .sidebar {
        position: fixed;
        left: 0;
        top: 0;
        transform: translateX(-100%);
        box-shadow: var(--shadow-lg);
      }

      .sidebar--open {
        transform: translateX(0);
      }

      .sidebar__backdrop {
        position: fixed;
        inset: 0;
        z-index: 30;
        display: block;
        background: rgba(11, 39, 57, 0.42);
        border: 0;
        animation: fade var(--transition) both;
      }

      .sidebar__collapse {
        display: none;
      }
    }
  `,
})
export class SidebarComponent {
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);

  readonly collapsed = input(false);
  readonly mobileOpen = input(false);

  readonly toggleCollapse = output<void>();
  readonly navigated = output<void>();

  protected readonly version = environment.version;

  // El logotipo blanco mantiene la lectura sobre el fondo oscuro cálido.
  protected readonly logoSrc = computed(() =>
    this.theme.isDark() ? 'brand/logo-horizontal-blanco.png' : 'brand/logo-horizontal.png',
  );

  // En móvil el panel abierto siempre muestra etiquetas, aunque esté contraído.
  protected readonly compact = computed(() => this.collapsed() && !this.mobileOpen());

  protected readonly sections = computed(() =>
    NAV_SECTIONS.map((section) => ({
      label: section.label,
      items: section.items.filter((item: NavItem) => this.auth.canAccess(item.roles)),
    })).filter((section) => section.items.length > 0),
  );
}
