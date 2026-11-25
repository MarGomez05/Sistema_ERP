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
import {
  NIT_PATTERN,
  NRC_PATTERN,
  PHONE_PATTERN,
  Supplier,
  SupplierFormValue,
} from '../supplier.model';

const trimmedRequired: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim().length > 0 ? null : { required: true };

type FormField =
  'tradeName' | 'legalName' | 'nit' | 'nrc' | 'address' | 'phone' | 'email' | 'creditDays';

// Alta y edición de proveedores (contrato 6). Solo ADMIN y PURCHASING acceden a la pantalla.
@Component({
  selector: 'app-supplier-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  template: `
    <form class="supplier-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <header class="supplier-form__header">
        <div>
          <p class="supplier-form__eyebrow">
            {{ record() === null ? 'Nuevo registro' : 'Edición' }}
          </p>
          <h2 class="supplier-form__title">
            {{ record() === null ? 'Nuevo proveedor' : 'Editar proveedor' }}
          </h2>
        </div>
        <button
          type="button"
          class="supplier-form__close"
          aria-label="Cerrar formulario"
          (click)="cancelled.emit()"
        >
          <app-icon name="close" [size]="18" />
        </button>
      </header>

      @if (error(); as message) {
        <p class="supplier-form__error" role="alert">
          <app-icon name="alertCircle" [size]="16" />
          {{ message }}
        </p>
      }

      <section class="supplier-form__section" aria-labelledby="supplier-general-title">
        <h3 id="supplier-general-title" class="supplier-form__section-title">Datos generales</h3>

        <div class="field">
          <label class="field__label" for="supplier-trade-name">
            Nombre comercial <span class="field__required" aria-hidden="true">*</span>
          </label>
          <input
            id="supplier-trade-name"
            class="field__control"
            type="text"
            formControlName="tradeName"
            maxlength="150"
            placeholder="Ej. Ferretería La Central"
            [class.is-invalid]="errorFor('tradeName', 150) !== null"
          />
          @if (errorFor('tradeName', 150); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          } @else {
            <p class="field__hint">Nombre con el que se identifica al proveedor en el sistema.</p>
          }
        </div>

        <div class="field">
          <label class="field__label" for="supplier-legal-name">
            Razón social <span class="field__required" aria-hidden="true">*</span>
          </label>
          <input
            id="supplier-legal-name"
            class="field__control"
            type="text"
            formControlName="legalName"
            maxlength="150"
            placeholder="Ej. Ferretería La Central, S.A. de C.V."
            [class.is-invalid]="errorFor('legalName', 150) !== null"
          />
          @if (errorFor('legalName', 150); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          } @else {
            <p class="field__hint">Nombre legal tal como aparece en la factura de compra.</p>
          }
        </div>

        <div class="supplier-form__pair">
          <div class="field">
            <label class="field__label" for="supplier-nit">
              NIT <span class="field__required" aria-hidden="true">*</span>
            </label>
            <input
              id="supplier-nit"
              class="field__control"
              type="text"
              formControlName="nit"
              maxlength="17"
              placeholder="0614-123456-101-2"
              [class.is-invalid]="errorFor('nit', 17) !== null"
            />
            @if (errorFor('nit', 17); as message) {
              <p class="field__error" role="alert">{{ message }}</p>
            }
          </div>

          <div class="field">
            <label class="field__label" for="supplier-nrc">NRC</label>
            <input
              id="supplier-nrc"
              class="field__control"
              type="text"
              formControlName="nrc"
              maxlength="10"
              placeholder="123456-7"
              [class.is-invalid]="errorFor('nrc', 10) !== null"
            />
            @if (errorFor('nrc', 10); as message) {
              <p class="field__error" role="alert">{{ message }}</p>
            }
          </div>
        </div>

        <p class="supplier-form__hint">
          El NIT, el NRC y el correo deben ser únicos si se registran.
        </p>
      </section>

      <section class="supplier-form__section" aria-labelledby="supplier-contact-title">
        <h3 id="supplier-contact-title" class="supplier-form__section-title">Contacto</h3>

        <div class="supplier-form__pair">
          <div class="field">
            <label class="field__label" for="supplier-phone">Teléfono</label>
            <input
              id="supplier-phone"
              class="field__control"
              type="tel"
              formControlName="phone"
              maxlength="20"
              placeholder="Ej. 2222-3333"
              [class.is-invalid]="errorFor('phone', 20) !== null"
            />
            @if (errorFor('phone', 20); as message) {
              <p class="field__error" role="alert">{{ message }}</p>
            } @else {
              <p class="field__hint">Solo dígitos, espacios, + y -.</p>
            }
          </div>

          <div class="field">
            <label class="field__label" for="supplier-email">Correo electrónico</label>
            <input
              id="supplier-email"
              class="field__control"
              type="email"
              formControlName="email"
              maxlength="150"
              placeholder="compras@proveedor.com"
              [class.is-invalid]="errorFor('email', 150) !== null"
            />
            @if (errorFor('email', 150); as message) {
              <p class="field__error" role="alert">{{ message }}</p>
            }
          </div>
        </div>

        <div class="field">
          <label class="field__label" for="supplier-address">Dirección</label>
          <textarea
            id="supplier-address"
            class="field__control"
            rows="2"
            formControlName="address"
            maxlength="255"
            placeholder="Municipio, departamento y referencia"
            [class.is-invalid]="errorFor('address', 255) !== null"
          ></textarea>
          @if (errorFor('address', 255); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          }
        </div>
      </section>

      <section class="supplier-form__section" aria-labelledby="supplier-credit-title">
        <h3 id="supplier-credit-title" class="supplier-form__section-title">
          Condiciones comerciales
        </h3>

        <div class="field">
          <label class="field__label" for="supplier-credit-days">
            Días de crédito <span class="field__required" aria-hidden="true">*</span>
          </label>
          <input
            id="supplier-credit-days"
            class="field__control"
            type="number"
            formControlName="creditDays"
            min="0"
            step="1"
            placeholder="30"
            [class.is-invalid]="errorFor('creditDays') !== null"
          />
          @if (errorFor('creditDays'); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          } @else {
            <p class="field__hint">Usa 0 cuando el proveedor trabaja al contado.</p>
          }
        </div>
      </section>

      <footer class="supplier-form__footer">
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
          {{ record() === null ? 'Crear proveedor' : 'Guardar cambios' }}
        </button>
      </footer>
    </form>
  `,
  styles: `
    :host {
      display: block;
    }

    .supplier-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .supplier-form__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--border);
    }

    .supplier-form__eyebrow {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .supplier-form__title {
      margin-top: 4px;
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
    }

    .supplier-form__close {
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

    .supplier-form__close:hover {
      background: var(--gradient-soft);
      border-color: var(--brand-200);
      color: var(--brand-700);
    }

    .supplier-form__error {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px 14px;
      background: var(--danger-100);
      border: 1px solid var(--danger-border);
      border-radius: var(--radius-md);
      color: var(--danger-700);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
    }

    .supplier-form__section {
      display: grid;
      gap: var(--space-3);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--border);
    }

    .supplier-form__section:last-of-type {
      padding-bottom: 0;
      border-bottom: 0;
    }

    .supplier-form__section-title {
      color: var(--text-muted);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .supplier-form__pair {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-3);
    }

    .supplier-form__hint {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      line-height: 1.55;
    }

    .supplier-form__footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-3);
      padding-top: var(--space-4);
      border-top: 1px solid var(--border);
    }

    @media (max-width: 640px) {
      .supplier-form__pair {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class SupplierFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly record = input<Supplier | null>(null);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly submitted = output<SupplierFormValue>();
  readonly cancelled = output<void>();

  protected readonly form = this.formBuilder.group({
    tradeName: this.formBuilder.nonNullable.control('', [
      trimmedRequired,
      Validators.maxLength(150),
    ]),
    legalName: this.formBuilder.nonNullable.control('', [
      trimmedRequired,
      Validators.maxLength(150),
    ]),
    nit: this.formBuilder.nonNullable.control('', [
      trimmedRequired,
      Validators.maxLength(17),
      Validators.pattern(NIT_PATTERN),
    ]),
    nrc: this.formBuilder.nonNullable.control('', [
      Validators.maxLength(10),
      Validators.pattern(NRC_PATTERN),
    ]),
    address: this.formBuilder.nonNullable.control('', [Validators.maxLength(255)]),
    phone: this.formBuilder.nonNullable.control('', [
      Validators.maxLength(20),
      Validators.pattern(PHONE_PATTERN),
    ]),
    email: this.formBuilder.nonNullable.control('', [Validators.maxLength(150), Validators.email]),
    creditDays: this.formBuilder.nonNullable.control<number>(0, [
      Validators.required,
      Validators.min(0),
    ]),
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

    if (control.hasError('email')) {
      return 'El correo no tiene un formato válido.';
    }

    if (control.hasError('min')) {
      return 'Los días de crédito no pueden ser negativos.';
    }

    if (control.hasError('pattern')) {
      switch (field) {
        case 'nit':
          return 'El NIT debe tener el formato 0000-000000-000-0 o 00000000-0.';
        case 'nrc':
          return 'El NRC debe tener el formato 000000-0.';
        case 'phone':
          return 'El teléfono solo admite dígitos, espacios, + y -.';
        default:
          return 'Revisa el formato del campo.';
      }
    }

    return 'Revisa este campo.';
  }

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();

    this.submitted.emit({
      tradeName: raw.tradeName,
      legalName: raw.legalName,
      nit: raw.nit,
      nrc: raw.nrc,
      address: raw.address,
      phone: raw.phone,
      email: raw.email,
      creditDays: raw.creditDays,
    });
  }

  private patch(record: Supplier | null): void {
    this.form.reset({
      tradeName: record?.tradeName ?? '',
      legalName: record?.legalName ?? '',
      nit: record?.nit ?? '',
      nrc: record?.nrc ?? '',
      address: record?.address ?? '',
      phone: record?.phone ?? '',
      email: record?.email ?? '',
      creditDays: record?.creditDays ?? 0,
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }
}
