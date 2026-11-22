import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { environment } from '@env/environment';

const COLLAPSED_KEY = 'tamachihua.sidebar.collapsed';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  template: `
    <a class="shell__skip" href="#contenido">Saltar al contenido</a>

    <div class="shell">
      <app-sidebar
        [collapsed]="collapsed()"
        [mobileOpen]="mobileOpen()"
        (toggleCollapse)="toggleCollapse()"
        (navigated)="closeMobileMenu()"
      />

      <div class="shell__main">
        <app-header [pageTitle]="pageTitle()" (toggleMobile)="openMobileMenu()" />

        <main id="contenido" class="shell__content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .shell {
      display: grid;
      grid-template-columns: auto 1fr;
      min-height: 100dvh;
    }

    .shell__main {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .shell__content {
      flex: 1;
      width: 100%;
      max-width: var(--content-max);
      margin: 0 auto;
      padding: 28px 30px 56px;
      animation: rise var(--transition-slow) both;
    }

    .shell__skip {
      position: fixed;
      top: 10px;
      left: 10px;
      z-index: 2000;
      padding: 10px 16px;
      background: var(--brand-solid);
      border-radius: var(--radius-md);
      color: var(--text-inverse);
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      transform: translateY(-160%);
      transition: transform var(--transition-fast);
    }

    .shell__skip:focus {
      transform: translateY(0);
    }

    @media (max-width: 1024px) {
      .shell {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 720px) {
      .shell__content {
        padding: 20px 16px 44px;
      }
    }
  `,
  host: {
    '(document:keydown.escape)': 'closeMobileMenu()',
  },
})
export class ShellComponent {
  private readonly router = inject(Router);

  private readonly navigation = toSignal(
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)),
    { initialValue: null },
  );

  protected readonly collapsed = signal(this.readCollapsed());
  protected readonly mobileOpen = signal(false);

  protected readonly pageTitle = computed(() => {
    this.navigation();

    const title = this.deepestTitle();

    return title === '' ? environment.appName : title;
  });

  protected toggleCollapse(): void {
    this.collapsed.update((collapsed) => !collapsed);
    this.persistCollapsed(this.collapsed());
  }

  protected openMobileMenu(): void {
    this.mobileOpen.set(true);
  }

  protected closeMobileMenu(): void {
    this.mobileOpen.set(false);
  }

  private deepestTitle(): string {
    let route = this.router.routerState.snapshot.root;
    let title = '';

    while (route.firstChild !== null) {
      route = route.firstChild;
      title = route.title ?? title;
    }

    return title;
  }

  private readCollapsed(): boolean {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private persistCollapsed(collapsed: boolean): void {
    try {
      localStorage.setItem(COLLAPSED_KEY, String(collapsed));
    } catch {
      // Sin almacenamiento disponible: el estado queda en memoria.
    }
  }
}
