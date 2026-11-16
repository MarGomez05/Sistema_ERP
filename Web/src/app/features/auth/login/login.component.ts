import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService, loginErrorMessage } from '@core/auth/auth.service';
import { ToastService } from '@core/ui/toast.service';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { environment } from '@env/environment';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  template: `
    <main class="login">
      <!-- Panel de marca -->
      <section class="login__brand" aria-label="TAMACHIHUA ERP">
        <div class="login__brand-top">
          <img
            class="login__logo"
            src="brand/logo-horizontal-blanco.png"
            alt="TAMACHIHUA"
            width="2181"
            height="420"
          />
        </div>

        <div class="login__brand-body">
          <p class="login__eyebrow">Sistema de gestión empresarial</p>
          <h2 class="login__headline">
            Controla tu inventario, ventas y facturación en un solo lugar.
          </h2>
          <p class="login__description">
            Información clara para decidir mejor: existencias por lote, vencimientos, clientes y
            documentos comerciales siempre a la mano.
          </p>

          <ul class="login__features">
            @for (feature of features; track feature.title) {
              <li class="login__feature">
                <span class="login__feature-icon">
                  <app-icon [name]="feature.icon" [size]="18" />
                </span>
                <div>
                  <p class="login__feature-title">{{ feature.title }}</p>
                  <p class="login__feature-text">{{ feature.text }}</p>
                </div>
              </li>
            }
          </ul>
        </div>

        <p class="login__brand-footer">TAMACHIHUA ERP · {{ version }}</p>
      </section>

      <!-- Formulario -->
      <section class="login__panel">
        <img
          class="login__mobile-logo"
          src="brand/logo-horizontal.png"
          alt="TAMACHIHUA ERP"
          width="2181"
          height="420"
        />

        <div class="login__card">
          <div class="login__card-head">
            <span class="login__badge">
              <app-icon name="lock" [size]="15" />
              Acceso seguro
            </span>
            <h1 class="login__title">Iniciar sesión</h1>
            <p class="login__subtitle">
              Ingresa con las credenciales asignadas por el administrador.
            </p>
          </div>

          <form class="login__form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="field">
              <label class="field__label" for="username">
                Usuario o correo
                <span class="field__required" aria-hidden="true">*</span>
              </label>

              <div class="login__control">
                <span class="login__control-icon" aria-hidden="true">
                  <app-icon name="user" [size]="18" />
                </span>
                <input
                  id="username"
                  class="field__control login__input"
                  type="text"
                  formControlName="username"
                  autocomplete="username"
                  placeholder="nombre de usuario"
                  [class.is-invalid]="showError(usernameControl)"
                  [attr.aria-invalid]="showError(usernameControl)"
                  [attr.aria-describedby]="showError(usernameControl) ? 'username-error' : null"
                />
              </div>

              @if (showError(usernameControl)) {
                <p id="username-error" class="field__error">
                  <app-icon name="alertCircle" [size]="14" />
                  {{ usernameError }}
                </p>
              }
            </div>

            <div class="field">
              <label class="field__label" for="password">
                Contraseña
                <span class="field__required" aria-hidden="true">*</span>
              </label>

              <div class="login__control">
                <span class="login__control-icon" aria-hidden="true">
                  <app-icon name="lock" [size]="18" />
                </span>
                <input
                  id="password"
                  class="field__control login__input login__input--password"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  autocomplete="current-password"
                  placeholder="contraseña"
                  [class.is-invalid]="showError(passwordControl)"
                  [attr.aria-invalid]="showError(passwordControl)"
                  [attr.aria-describedby]="showError(passwordControl) ? 'password-error' : null"
                />
                <button
                  type="button"
                  class="login__reveal"
                  [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  [attr.aria-pressed]="showPassword()"
                  (click)="togglePassword()"
                >
                  <app-icon [name]="showPassword() ? 'eyeOff' : 'eye'" [size]="18" />
                </button>
              </div>

              @if (showError(passwordControl)) {
                <p id="password-error" class="field__error">
                  <app-icon name="alertCircle" [size]="14" />
                  {{ passwordError }}
                </p>
              }
            </div>

            @if (errorMessage()) {
              <div class="login__alert" role="alert">
                <app-icon name="alertCircle" [size]="18" />
                <p>{{ errorMessage() }}</p>
              </div>
            }

            <button appButton type="submit" class="u-full" [loading]="submitting()" [block]="true">
              <app-icon name="logout" [size]="17" />
              Ingresar al sistema
            </button>
          </form>

          <p class="login__help">
            ¿Olvidaste tu contraseña? Solicita el restablecimiento al administrador del sistema.
          </p>
        </div>

        <p class="login__legal">Uso exclusivo del personal autorizado de TAMACHIHUA.</p>
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
    }

    .login {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
      min-height: 100dvh;
      background: var(--surface);
    }

    /* ---------- Panel de marca ---------- */
    .login__brand {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      padding: 44px 52px;
      overflow: hidden;
      background:
        radial-gradient(1200px 620px at 8% -10%, rgba(0, 168, 255, 0.24), transparent 62%),
        radial-gradient(900px 520px at 100% 105%, rgba(0, 168, 255, 0.18), transparent 60%),
        linear-gradient(150deg, var(--brand-700) 0%, var(--brand-600) 48%, #05558f 100%);
      color: #eaf4fc;
    }

    .login__brand::after {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
      background-size: 44px 44px;
      mask-image: radial-gradient(circle at 30% 25%, #000 0%, transparent 72%);
      pointer-events: none;
    }

    .login__brand-top,
    .login__brand-body,
    .login__brand-footer {
      position: relative;
      z-index: 1;
    }

    .login__logo {
      width: min(260px, 62%);
      height: auto;
    }

    .login__brand-body {
      display: flex;
      flex-direction: column;
      justify-content: center;
      flex: 1;
      max-width: 520px;
      animation: rise var(--transition-slow) both;
    }

    .login__eyebrow {
      margin-bottom: 14px;
      color: var(--accent-200);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .login__headline {
      color: #ffffff;
      font-size: clamp(1.65rem, 2.4vw, 2.15rem);
      font-weight: var(--weight-bold);
      line-height: 1.22;
      letter-spacing: -0.02em;
    }

    .login__description {
      margin-top: 16px;
      color: rgba(234, 244, 252, 0.82);
      font-size: var(--text-base);
      line-height: 1.6;
    }

    .login__features {
      display: grid;
      gap: 16px;
      margin: 32px 0 0;
      padding: 0;
      list-style: none;
    }

    .login__feature {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .login__feature-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: none;
      width: 36px;
      height: 36px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: var(--radius-md);
      color: #ffffff;
    }

    .login__feature-title {
      color: #ffffff;
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    .login__feature-text {
      margin-top: 2px;
      color: rgba(234, 244, 252, 0.74);
      font-size: var(--text-xs);
      line-height: 1.5;
    }

    .login__brand-footer {
      color: rgba(234, 244, 252, 0.6);
      font-size: var(--text-xs);
      letter-spacing: 0.04em;
    }

    /* ---------- Formulario ---------- */
    .login__panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 22px;
      padding: 48px 32px;
      background:
        radial-gradient(760px 420px at 100% 0%, var(--brand-50), transparent 66%), var(--canvas);
    }

    .login__mobile-logo {
      display: none;
      width: 190px;
      height: auto;
      margin-bottom: 4px;
    }

    .login__card {
      width: 100%;
      max-width: 424px;
      padding: 36px 34px 30px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-md);
      animation: rise var(--transition-slow) both;
    }

    .login__card-head {
      margin-bottom: 26px;
      text-align: left;
    }

    .login__badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 16px;
      padding: 5px 11px;
      background: var(--brand-50);
      border: 1px solid var(--brand-100);
      border-radius: var(--radius-pill);
      color: var(--brand-700);
      font-size: 0.6875rem;
      font-weight: var(--weight-semibold);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .login__title {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      letter-spacing: -0.02em;
    }

    .login__subtitle {
      margin-top: 8px;
      color: var(--text-muted);
      font-size: var(--text-sm);
      line-height: 1.55;
    }

    .login__form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .login__control {
      position: relative;
    }

    .login__input {
      padding-left: 44px;
      padding-right: 46px;
    }

    .login__control-icon {
      position: absolute;
      top: 50%;
      left: 14px;
      display: inline-flex;
      color: var(--text-subtle);
      transform: translateY(-50%);
      pointer-events: none;
    }

    .login__reveal {
      position: absolute;
      top: 50%;
      right: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      background: transparent;
      border: 0;
      border-radius: var(--radius-sm);
      color: var(--text-subtle);
      transform: translateY(-50%);
      transition:
        background var(--transition-fast),
        color var(--transition-fast);
    }

    .login__reveal:hover {
      background: var(--surface-hover);
      color: var(--brand-600);
    }

    .login__alert {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      background: var(--danger-100);
      border: 1px solid #f0cdca;
      border-radius: var(--radius-md);
      color: var(--danger-700);
      font-size: var(--text-sm);
      animation: fade var(--transition) both;
    }

    .login__alert app-icon {
      margin-top: 1px;
      flex: none;
    }

    .login__help {
      margin-top: 20px;
      padding-top: 18px;
      border-top: 1px solid var(--border);
      color: var(--text-subtle);
      font-size: var(--text-xs);
      line-height: 1.55;
      text-align: center;
    }

    .login__legal {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      text-align: center;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 960px) {
      .login {
        grid-template-columns: 1fr;
      }

      .login__brand {
        display: none;
      }

      .login__panel {
        min-height: 100dvh;
        padding: 32px 20px;
      }

      .login__mobile-logo {
        display: block;
      }
    }

    @media (max-width: 480px) {
      .login__card {
        padding: 28px 22px 24px;
        border-radius: var(--radius-lg);
      }
    }
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  private readonly formBuilder = inject(FormBuilder);

  protected readonly version = environment.version;
  protected readonly showPassword = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    username: [
      '',
      [Validators.required, Validators.maxLength(50), LoginComponent.noWhitespaceOnly],
    ],
    password: ['', [Validators.required]],
  });

  protected readonly features = [
    {
      icon: 'package' as const,
      title: 'Inventario con trazabilidad',
      text: 'Existencias por lote, fechas de vencimiento y alertas de bajo stock.',
    },
    {
      icon: 'cart' as const,
      title: 'Ventas y facturación',
      text: 'Documentos comerciales consistentes y control de crédito.',
    },
    {
      icon: 'trendingUp' as const,
      title: 'Decisiones con datos',
      text: 'Indicadores actualizados para priorizar el trabajo del día.',
    },
  ];

  protected readonly usernameControl = this.form.controls.username;
  protected readonly passwordControl = this.form.controls.password;

  protected get usernameError(): string {
    const control = this.usernameControl;

    if (control.hasError('required')) {
      return 'El usuario o correo es obligatorio.';
    }

    if (control.hasError('maxlength')) {
      return 'El usuario no puede superar los 50 caracteres.';
    }

    if (control.hasError('whitespace')) {
      return 'El usuario no puede estar vacío.';
    }

    return '';
  }

  protected get passwordError(): string {
    return this.passwordControl.hasError('required') ? 'La contraseña es obligatoria.' : '';
  }

  protected showError(control: AbstractControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  protected togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected submit(): void {
    this.errorMessage.set(null);

    if (this.submitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    const credentials = {
      username: this.usernameControl.value.trim(),
      password: this.passwordControl.value,
    };

    this.auth.login(credentials).subscribe({
      next: (user) => {
        this.submitting.set(false);
        this.passwordControl.reset('');
        this.toast.success(`Bienvenido, ${user.fullName}`, 'Sesión iniciada correctamente.');
        void this.router.navigateByUrl(this.safeRedirect());
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(
          error instanceof HttpErrorResponse
            ? loginErrorMessage(error)
            : 'No se pudo iniciar sesión. Intenta de nuevo.',
        );
      },
    });
  }

  // Solo permite rutas internas para evitar redirecciones externas.
  private safeRedirect(): string {
    const redirect = this.route.snapshot.queryParamMap.get('redirect');

    if (redirect === null || !redirect.startsWith('/') || redirect.startsWith('//')) {
      return '/dashboard';
    }

    return redirect;
  }

  private static noWhitespaceOnly(control: AbstractControl): ValidationErrors | null {
    const value = control.value;

    if (typeof value !== 'string') {
      return null;
    }

    return value.trim().length === 0 ? { whitespace: true } : null;
  }
}
