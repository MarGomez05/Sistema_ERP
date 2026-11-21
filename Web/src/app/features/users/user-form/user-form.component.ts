import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { RoleOption, UserFormValue, UserRecord, roleTone } from '../admin.model';

const trimmedRequired: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim().length > 0 ? null : { required: true };

type FormField = 'username' | 'password' | 'fullName' | 'email';

// Alta y edición de usuarios del panel (solo ADMIN).
@Component({
  selector: 'app-user-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, BadgeComponent, ButtonComponent, IconComponent],
  template: `
    <form class="admin-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <header class="admin-form__header">
        <div>
          <p class="admin-form__eyebrow">
            {{ record() === null ? 'Nuevo registro' : 'Edición' }}
          </p>
          <h2 class="admin-form__title">
            {{ record() === null ? 'Nuevo usuario' : 'Editar usuario' }}
          </h2>
        </div>
        <button
          type="button"
          class="admin-form__close"
          aria-label="Cerrar formulario"
          (click)="cancelled.emit()"
        >
          <app-icon name="close" [size]="18" />
        </button>
      </header>

      @if (error(); as message) {
        <p class="admin-form__error" role="alert">
          <app-icon name="alertCircle" [size]="16" />
          {{ message }}
        </p>
      }

      <section class="admin-form__section" aria-labelledby="user-access-title">
        <h3 id="user-access-title" class="admin-form__section-title">Acceso</h3>

        <div class="field">
          <label class="field__label" for="user-username">
            Nombre de usuario <span class="field__required" aria-hidden="true">*</span>
          </label>
          <input
            id="user-username"
            class="field__control"
            type="text"
            formControlName="username"
            maxlength="50"
            autocomplete="off"
            placeholder="Ej. jlopez"
            [class.is-invalid]="errorFor('username', 50) !== null"
          />
          @if (errorFor('username', 50); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          } @else if (record() === null) {
            <p class="field__hint">
              Se usa para iniciar sesión. No se puede cambiar después de crear el usuario.
            </p>
          } @else {
            <p class="field__hint">El nombre de usuario no se puede modificar.</p>
          }
        </div>

        @if (record() === null) {
          <div class="field">
            <label class="field__label" for="user-password">
              Contraseña inicial <span class="field__required" aria-hidden="true">*</span>
            </label>
            <input
              id="user-password"
              class="field__control"
              type="password"
              formControlName="password"
              maxlength="100"
              autocomplete="new-password"
              placeholder="Mínimo 8 caracteres"
              [class.is-invalid]="errorFor('password', 100, 8) !== null"
            />
            @if (errorFor('password', 100, 8); as message) {
              <p class="field__error" role="alert">{{ message }}</p>
            } @else {
              <p class="field__hint">
                El usuario podrá iniciar sesión con esta contraseña. Compártela por un canal seguro.
              </p>
            }
          </div>
        }

        <div class="field">
          <label class="field__label" for="user-role">
            Rol <span class="field__required" aria-hidden="true">*</span>
          </label>
          <select id="user-role" class="field__control" formControlName="roleId">
            <option [ngValue]="null" disabled>Selecciona un rol</option>
            @for (role of roles(); track role.id) {
              <option [ngValue]="role.id">{{ role.name }} ({{ role.code }})</option>
            }
          </select>
          @if (form.controls.roleId.invalid && form.controls.roleId.touched) {
            <p class="field__error" role="alert">Selecciona un rol activo.</p>
          } @else {
            <p class="field__hint">El rol define los módulos a los que puede entrar el usuario.</p>
          }
        </div>

        @if (selectedRole(); as role) {
          <div class="admin-form__role">
            <app-badge [tone]="tone(role.code)">{{ role.code }}</app-badge>
            <span>{{ role.name }}</span>
          </div>
        }
      </section>

      <section class="admin-form__section" aria-labelledby="user-profile-title">
        <h3 id="user-profile-title" class="admin-form__section-title">Datos del usuario</h3>

        <div class="field">
          <label class="field__label" for="user-full-name">
            Nombre completo <span class="field__required" aria-hidden="true">*</span>
          </label>
          <input
            id="user-full-name"
            class="field__control"
            type="text"
            formControlName="fullName"
            maxlength="150"
            placeholder="Ej. José López"
            [class.is-invalid]="errorFor('fullName', 150) !== null"
          />
          @if (errorFor('fullName', 150); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          }
        </div>

        <div class="field">
          <label class="field__label" for="user-email">Correo electrónico</label>
          <input
            id="user-email"
            class="field__control"
            type="email"
            formControlName="email"
            maxlength="150"
            placeholder="usuario@empresa.com"
            [class.is-invalid]="errorFor('email', 150) !== null"
          />
          @if (errorFor('email', 150); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          } @else {
            <p class="field__hint">Opcional. También se puede usar para iniciar sesión.</p>
          }
        </div>
      </section>

      <p class="admin-form__note">
        <app-icon name="lock" [size]="15" />
        Solo los administradores pueden crear, editar o desactivar usuarios.
      </p>

      <footer class="admin-form__footer">
        <button
          appButton
          type="button"
          variant="secondary"
          [disabled]="saving()"
          (click)="cancelled.emit()"
        >
          Cancelar
        </button>
        <button appButton type="submit" [loading]="saving()">
          <app-icon name="checkCircle" [size]="16" />
          {{ record() === null ? 'Crear usuario' : 'Guardar cambios' }}
        </button>
      </footer>
    </form>
  `,
  styles: `
    :host {
      display: block;
    }

    .admin-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .admin-form__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--border);
    }

    .admin-form__eyebrow {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .admin-form__title {
      margin-top: 4px;
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
    }

    .admin-form__close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      color: var(--text-subtle);
      transition:
        background var(--transition-fast),
        border-color var(--transition-fast),
        color var(--transition-fast);
    }

    .admin-form__close:hover {
      background: var(--gradient-soft);
      border-color: var(--brand-200);
      color: var(--brand-700);
    }

    .admin-form__error {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px 14px;
      background: var(--danger-100);
      border: 1px solid #f0cdca;
      border-radius: var(--radius-md);
      color: var(--danger-700);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
    }

    .admin-form__section {
      display: grid;
      gap: var(--space-3);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--border);
    }

    .admin-form__section:last-of-type {
      padding-bottom: 0;
      border-bottom: 0;
    }

    .admin-form__section-title {
      color: var(--text-muted);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .admin-form__role {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: var(--surface-muted);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--text-muted);
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
    }

    .admin-form__note {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px 14px;
      background: var(--info-100, #e8f1fb);
      border-radius: var(--radius-md);
      color: var(--text-muted);
      font-size: var(--text-xs);
    }

    .admin-form__footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      padding-top: var(--space-2);
    }
  `,
})
export class UserFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly record = input<UserRecord | null>(null);
  readonly roles = input<readonly RoleOption[]>([]);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly submitted = output<UserFormValue>();
  readonly cancelled = output<void>();

  protected readonly form = this.formBuilder.group({
    username: ['', [trimmedRequired, Validators.maxLength(50)]],
    password: ['', [Validators.maxLength(100)]],
    fullName: ['', [trimmedRequired, Validators.maxLength(150)]],
    email: ['', [Validators.maxLength(150), Validators.email]],
    roleId: [null as number | null, [Validators.required]],
  });

  constructor() {
    effect(() => this.patch(this.record()));
  }

  protected selectedRole(): RoleOption | null {
    const roleId = this.form.controls.roleId.value;
    return this.roles().find((role) => role.id === roleId) ?? null;
  }

  protected tone(code: string): 'neutral' | 'brand' | 'info' | 'warning' | 'success' | 'danger' {
    return roleTone(code);
  }

  protected errorFor(field: FormField, maxLength?: number, minLength?: number): string | null {
    const control = this.form.controls[field];

    if (!control.invalid || (!control.touched && !control.dirty)) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (control.hasError('minlength')) {
      return minLength === undefined
        ? 'El valor es demasiado corto.'
        : `El valor debe tener al menos ${minLength} caracteres.`;
    }

    if (control.hasError('maxlength')) {
      return maxLength === undefined
        ? 'El valor supera la longitud permitida.'
        : `El valor no puede superar los ${maxLength} caracteres.`;
    }

    if (control.hasError('email')) {
      return 'El correo no tiene un formato válido.';
    }

    return 'Revisa este campo.';
  }

  protected submit(): void {
    this.form.markAllAsTouched();

    const isEditing = this.record() !== null;

    if (isEditing) {
      this.form.controls.username.disable({ emitEvent: false });
      this.form.controls.password.disable({ emitEvent: false });
    }

    if (this.form.invalid) {
      if (isEditing) {
        this.form.controls.username.enable({ emitEvent: false });
        this.form.controls.password.enable({ emitEvent: false });
      }
      return;
    }

    const raw = this.form.getRawValue();

    this.submitted.emit({
      username: raw.username ?? '',
      password: raw.password ?? '',
      fullName: raw.fullName ?? '',
      email: raw.email ?? '',
      roleId: raw.roleId,
    });
  }

  private patch(record: UserRecord | null): void {
    this.form.reset({
      username: record?.username ?? '',
      password: '',
      fullName: record?.fullName ?? '',
      email: record?.email ?? '',
      roleId: record?.role.id ?? null,
    });

    if (record === null) {
      this.form.controls.password.setValidators([
        trimmedRequired,
        Validators.minLength(8),
        Validators.maxLength(100),
      ]);
      this.form.controls.username.enable({ emitEvent: false });
      this.form.controls.password.enable({ emitEvent: false });
    } else {
      this.form.controls.password.clearValidators();
      this.form.controls.username.disable({ emitEvent: false });
      this.form.controls.password.disable({ emitEvent: false });
    }

    this.form.controls.password.updateValueAndValidity({ emitEvent: false });

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }
}
