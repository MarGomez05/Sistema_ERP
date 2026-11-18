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
  CUSTOMER_TYPE_OPTIONS,
  Customer,
  CustomerFormValue,
  CustomerType,
  DOCUMENT_TYPE_OPTIONS,
  DocumentType,
} from '../customer.model';

const trimmedRequired: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim().length > 0 ? null : { required: true };

type FormField =
  | 'customerType'
  | 'documentType'
  | 'documentNumber'
  | 'legalName'
  | 'tradeName'
  | 'nit'
  | 'nrc'
  | 'dui'
  | 'address'
  | 'phone'
  | 'email';

// Alta y edición de clientes (contrato 10). El crédito se ajusta en el detalle.
@Component({
  selector: 'app-customer-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  template: `
    <form class="customer-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <header class="customer-form__header">
        <div>
          <p class="customer-form__eyebrow">
            {{ record() === null ? 'Nuevo registro' : 'Edición' }}
          </p>
          <h2 class="customer-form__title">
            {{ record() === null ? 'Nuevo cliente' : 'Editar cliente' }}
          </h2>
        </div>
        <button
          type="button"
          class="customer-form__close"
          aria-label="Cerrar formulario"
          (click)="cancelled.emit()"
        >
          <app-icon name="close" [size]="18" />
        </button>
      </header>

      @if (error(); as message) {
        <p class="customer-form__error" role="alert">
          <app-icon name="alertCircle" [size]="16" />
          {{ message }}
        </p>
      }

      <section class="customer-form__section" aria-labelledby="customer-general-title">
        <h3 id="customer-general-title" class="customer-form__section-title">Datos generales</h3>

        <div class="field">
          <label class="field__label" for="customer-type">
            Tipo de cliente <span class="field__required" aria-hidden="true">*</span>
          </label>
          <select id="customer-type" class="field__control" formControlName="customerType">
            @for (option of customerTypes; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </div>

        <div class="field">
          <label class="field__label" for="customer-legal-name">
            Nombre o razón social <span class="field__required" aria-hidden="true">*</span>
          </label>
          <input
            id="customer-legal-name"
            class="field__control"
            type="text"
            formControlName="legalName"
            maxlength="200"
            placeholder="Ej. Agroservicio El Progreso, S.A."
            [class.is-invalid]="errorFor('legalName', 200) !== null"
          />
          @if (errorFor('legalName', 200); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          } @else {
            <p class="field__hint">Nombre legal o razón social tal como aparece en la factura.</p>
          }
        </div>

        <div class="field">
          <label class="field__label" for="customer-trade-name">Nombre comercial</label>
          <input
            id="customer-trade-name"
            class="field__control"
            type="text"
            formControlName="tradeName"
            maxlength="200"
            placeholder="Ej. El Progreso"
            [class.is-invalid]="errorFor('tradeName', 200) !== null"
          />
          @if (errorFor('tradeName', 200); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          } @else {
            <p class="field__hint">Nombre visible en el sistema cuando difiere del legal.</p>
          }
        </div>
      </section>

      <section class="customer-form__section" aria-labelledby="customer-documents-title">
        <h3 id="customer-documents-title" class="customer-form__section-title">Documentos</h3>

        <div class="customer-form__pair">
          <div class="field">
            <label class="field__label" for="customer-document-type">Tipo de documento</label>
            <select
              id="customer-document-type"
              class="field__control"
              formControlName="documentType"
            >
              <option [ngValue]="null">Sin documento</option>
              @for (option of documentTypes; track option.value) {
                <option [ngValue]="option.value">{{ option.label }}</option>
              }
            </select>
          </div>

          <div class="field">
            <label class="field__label" for="customer-document-number">Número de documento</label>
            <input
              id="customer-document-number"
              class="field__control"
              type="text"
              formControlName="documentNumber"
              maxlength="20"
              placeholder="Ej. 0614-123456-101-2"
              [class.is-invalid]="errorFor('documentNumber', 20) !== null"
            />
            @if (errorFor('documentNumber', 20); as message) {
              <p class="field__error" role="alert">{{ message }}</p>
            }
          </div>
        </div>

        <div class="customer-form__triple">
          <div class="field">
            <label class="field__label" for="customer-nit">NIT</label>
            <input
              id="customer-nit"
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
            <label class="field__label" for="customer-nrc">NRC</label>
            <input
              id="customer-nrc"
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

          <div class="field">
            <label class="field__label" for="customer-dui">DUI</label>
            <input
              id="customer-dui"
              class="field__control"
              type="text"
              formControlName="dui"
              maxlength="10"
              placeholder="01234567-8"
              [class.is-invalid]="errorFor('dui', 10) !== null"
            />
            @if (errorFor('dui', 10); as message) {
              <p class="field__error" role="alert">{{ message }}</p>
            }
          </div>
        </div>

        <p class="customer-form__hint">
          El número de documento, NIT, NRC, DUI y correo deben ser únicos si se registran.
        </p>
      </section>

      <section class="customer-form__section" aria-labelledby="customer-contact-title">
        <h3 id="customer-contact-title" class="customer-form__section-title">Contacto</h3>

        <div class="customer-form__pair">
          <div class="field">
            <label class="field__label" for="customer-phone">Teléfono</label>
            <input
              id="customer-phone"
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
            <label class="field__label" for="customer-email">Correo electrónico</label>
            <input
              id="customer-email"
              class="field__control"
              type="email"
              formControlName="email"
              maxlength="150"
              placeholder="compras@empresa.com"
              [class.is-invalid]="errorFor('email', 150) !== null"
            />
            @if (errorFor('email', 150); as message) {
              <p class="field__error" role="alert">{{ message }}</p>
            }
          </div>
        </div>

        <div class="field">
          <label class="field__label" for="customer-address">Dirección</label>
          <textarea
            id="customer-address"
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

      <p class="customer-form__note">
        <app-icon name="info" [size]="15" />
        Las condiciones de crédito se ajustan desde el detalle y requieren rol de administración.
      </p>

      <footer class="customer-form__footer">
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
          {{ record() === null ? 'Crear cliente' : 'Guardar cambios' }}
        </button>
      </footer>
    </form>
  `,
  styles: `
    :host {
      display: block;
    }

    .customer-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .customer-form__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--border);
    }

    .customer-form__eyebrow {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .customer-form__title {
      margin-top: 4px;
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
    }

    .customer-form__close {
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

    .customer-form__close:hover {
      background: var(--gradient-soft);
      border-color: var(--brand-200);
      color: var(--brand-700);
    }

    .customer-form__error {
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

    .customer-form__section {
      display: grid;
      gap: var(--space-3);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--border);
    }

    .customer-form__section:last-of-type {
      padding-bottom: 0;
      border-bottom: 0;
    }

    .customer-form__section-title {
      color: var(--text-muted);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .customer-form__pair {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-3);
    }

    .customer-form__triple {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-3);
    }

    .customer-form__hint {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      line-height: 1.55;
    }

    .customer-form__note {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 12px;
      background: var(--info-100);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--info-700);
      font-size: var(--text-xs);
      line-height: 1.5;
    }

    .customer-form__footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-3);
      padding-top: var(--space-4);
      border-top: 1px solid var(--border);
    }

    @media (max-width: 640px) {
      .customer-form__pair,
      .customer-form__triple {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class CustomerFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly record = input<Customer | null>(null);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly submitted = output<CustomerFormValue>();
  readonly cancelled = output<void>();

  protected readonly customerTypes = CUSTOMER_TYPE_OPTIONS;
  protected readonly documentTypes = DOCUMENT_TYPE_OPTIONS;

  protected readonly form = this.formBuilder.group({
    customerType: this.formBuilder.nonNullable.control<CustomerType>('NATURAL', [
      Validators.required,
    ]),
    documentType: this.formBuilder.control<DocumentType | null>(null),
    documentNumber: this.formBuilder.nonNullable.control('', [Validators.maxLength(20)]),
    legalName: this.formBuilder.nonNullable.control('', [
      trimmedRequired,
      Validators.maxLength(200),
    ]),
    tradeName: this.formBuilder.nonNullable.control('', [Validators.maxLength(200)]),
    nit: this.formBuilder.nonNullable.control('', [Validators.maxLength(17)]),
    nrc: this.formBuilder.nonNullable.control('', [Validators.maxLength(10)]),
    dui: this.formBuilder.nonNullable.control('', [Validators.maxLength(10)]),
    address: this.formBuilder.nonNullable.control('', [Validators.maxLength(255)]),
    phone: this.formBuilder.nonNullable.control('', [
      Validators.maxLength(20),
      Validators.pattern(/^$|^[0-9 +-]+$/),
    ]),
    email: this.formBuilder.nonNullable.control('', [Validators.maxLength(150), Validators.email]),
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

    if (control.hasError('pattern')) {
      return 'El teléfono solo admite dígitos, espacios, + y -.';
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
      customerType: raw.customerType,
      documentType: raw.documentType,
      documentNumber: raw.documentNumber,
      legalName: raw.legalName,
      tradeName: raw.tradeName,
      nit: raw.nit,
      nrc: raw.nrc,
      dui: raw.dui,
      address: raw.address,
      phone: raw.phone,
      email: raw.email,
    });
  }

  private patch(record: Customer | null): void {
    this.form.reset({
      customerType: record?.customerType ?? 'NATURAL',
      documentType: record?.documentType ?? null,
      documentNumber: record?.documentNumber ?? '',
      legalName: record?.legalName ?? '',
      tradeName: record?.tradeName ?? '',
      nit: record?.nit ?? '',
      nrc: record?.nrc ?? '',
      dui: record?.dui ?? '',
      address: record?.address ?? '',
      phone: record?.phone ?? '',
      email: record?.email ?? '',
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }
}
