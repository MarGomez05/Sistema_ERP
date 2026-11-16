import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonComponent, IconComponent],
  template: `
    <main class="not-found">
      <div class="not-found__card">
        <img
          class="not-found__logo"
          src="brand/logo-horizontal.png"
          alt="TAMACHIHUA ERP"
          width="2181"
          height="420"
        />

        <div class="not-found__code" aria-hidden="true">404</div>

        <h1 class="not-found__title">Página no encontrada</h1>
        <p class="not-found__text">
          La dirección que solicitaste no existe o fue movida. Verifica el enlace o regresa al panel
          principal.
        </p>

        <div class="not-found__actions">
          <a appButton routerLink="/dashboard">
            <app-icon name="dashboard" [size]="17" />
            Ir al panel general
          </a>

          @if (!isAuthenticated()) {
            <a appButton variant="secondary" routerLink="/login">
              <app-icon name="lock" [size]="17" />
              Iniciar sesión
            </a>
          }
        </div>
      </div>

      <p class="not-found__footer">TAMACHIHUA ERP</p>
    </main>
  `,
  styles: `
    :host {
      display: block;
    }

    .not-found {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      min-height: 100dvh;
      padding: 32px 20px;
      background:
        radial-gradient(820px 420px at 50% -10%, var(--brand-100), transparent 68%), var(--canvas);
    }

    .not-found__card {
      width: 100%;
      max-width: 520px;
      padding: 40px 36px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-md);
      text-align: center;
      animation: rise var(--transition-slow) both;
    }

    .not-found__logo {
      width: 190px;
      height: auto;
      margin: 0 auto;
    }

    .not-found__code {
      margin-top: 20px;
      background: linear-gradient(120deg, var(--brand-500), var(--accent-500));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      font-size: clamp(3.2rem, 9vw, 4.4rem);
      font-weight: var(--weight-bold);
      line-height: 1;
      letter-spacing: -0.04em;
    }

    .not-found__title {
      margin-top: 14px;
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      letter-spacing: -0.02em;
    }

    .not-found__text {
      margin-top: 10px;
      color: var(--text-muted);
      font-size: var(--text-sm);
      line-height: 1.6;
    }

    .not-found__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
      margin-top: 26px;
    }

    .not-found__footer {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      letter-spacing: 0.04em;
    }

    @media (max-width: 480px) {
      .not-found__card {
        padding: 30px 22px;
      }
    }
  `,
})
export class NotFoundComponent {
  private readonly auth = inject(AuthService);

  protected readonly isAuthenticated = computed(() => this.auth.isAuthenticated());
}
