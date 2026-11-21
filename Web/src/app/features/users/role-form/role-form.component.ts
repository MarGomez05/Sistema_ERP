import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { Role, RoleFormValue } from '../admin.model';

const trimmedRequired: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim().length > 0 ? null : { required: true };

type FormField = 'code' | 'name' | 'description';

// Alta y edición de roles del sistema (solo ADMIN). El código no cambia al editar.
@Component({
  selector: 'app-role-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  template: `
    <form class="admin-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <header class="admin-form__header">
        <div>
          <p class="admin-form__eyebrow">
            {{ record() === null ? 'Nuevo registro' : 'Edición' }}
          </p>
          <h2 class="admin-form__title">
            {{ record() === null ? 'Nuevo rol' : 'Editar rol' }}
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

      <section class="admin-form__section" aria-labelledby="role-data-title">
        <h3 id="role-data-title" class="admin-form__section-title">Datos del rol</h3>

        <div class="field">
          <label class="field__label" for="role-code">
            Código <span class="field__required" aria-hidden="true">*</span>
          </label>
          <input
            id="role-code"
            class="field__control"
            type="text"
            formControlName="code"
            maxlength="20"
            autocomplete="off"
            placeholder="Ej. SUPERVISOR"
            [class.is-invalid]="errorFor('code', 20) !== null"
          />
          @if (errorFor('code', 20); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          } @else if (record() === null) {
            <p class="field__hint">
              Solo letras y guiones bajos. Se guarda en mayúsculas y no se puede cambiar después.
            </p>
          } @else {
            <p class="field__hint">
              El código identifica al rol en la API y no se puede modificar.
            </p>
          }
        </div>

        <div class="field">
          <label class="field__label" for="role-name">
            Nombre <span class="field__required" aria-hidden="true">*</span>
          </label>
          <input
            id="role-name"
            class="field__control"
            type="text"
            formControlName="name"
            maxlength="50"
            placeholder="Ej. Supervisor de bodega"
            [class.is-invalid]="errorFor('name', 50) !== null"
          />
          @if (errorFor('name', 50); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          } @else {
            <p class="field__hint">Nombre que se muestra en el panel y en los combos.</p>
          }
        </div>

        <div class="field">
          <label class="field__label" for="role-description">Descripción</label>
          <textarea
            id="role-description"
            class="field__control"
            rows="3"
            formControlName="description"
            maxlength="255"
            placeholder="Describe qué puede hacer este rol"
            [class.is-invalid]="errorFor('description', 255) !== null"
          ></textarea>
          @if (errorFor('description', 255); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          }
        </div>
      </section>

      <p class="admin-form__note">
        <app-icon name="info" [size]="15" />
        Los permisos por módulo se asignan en la configuración de seguridad del sistema. Los roles
        ADMIN, WAREHOUSE, PURCHASING y SELLER tienen acceso a los módulos ya habilitados.
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
          {{ record() === null ? 'Crear rol' : 'Guardar cambios' }}
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
    }

    .admin-form__section-title {
      color: var(--text-muted);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .admin-form__note {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px 14px;
      background: var(--surface-muted);
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
export class RoleFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly record = input<Role | null>(null);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly submitted = output<RoleFormValue>();
  readonly cancelled = output<void>();

  protected readonly form = this.formBuilder.group({
    code: [
      '',
      [trimmedRequired, Validators.maxLength(20), Validators.pattern(/^[A-Za-z][A-Za-z_]*$/)],
    ],
    name: ['', [trimmedRequired, Validators.maxLength(50)]],
    description: ['', [Validators.maxLength(255)]],
  });

  constructor() {
    effect(() => this.patch(this.record()));
  }

  protected errorFor(field: FormField, maxLength?: number): string | null {
    const control = this.form.controls[field];

    if (!control.invalid || (!control.touched && !control.dirty)) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (control.hasError('maxlength')) {
      return maxLength === undefined
        ? 'El valor supera la longitud permitida.'
        : `El valor no puede superar los ${maxLength} caracteres.`;
    }

    if (control.hasError('pattern')) {
      return 'El código debe iniciar con una letra y solo admite letras y guiones bajos.';
    }

    return 'Revisa este campo.';
  }

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.record() === null) {
      this.form.controls.code.setValue(this.form.controls.code.value?.toUpperCase() ?? '');
    }

    if (this.form.invalid) {
      return;
    }

    this.submitted.emit({
      code: this.form.controls.code.value ?? '',
      name: this.form.controls.name.value ?? '',
      description: this.form.controls.description.value ?? '',
    });
  }

  private patch(record: Role | null): void {
    this.form.reset({
      code: record?.code ?? '',
      name: record?.name ?? '',
      description: record?.description ?? '',
    });

    if (record === null) {
      this.form.controls.code.enable({ emitEvent: false });
    } else {
      this.form.controls.code.disable({ emitEvent: false });
    }

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }
}
