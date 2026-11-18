import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { formatMoney } from '@features/products/product.model';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { CreditFormValue, Customer, availableCredit, creditTone } from '../customer.model';

const maxTwoDecimals: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;

  if (value === null || value === undefined || value === '') {
    return null;
  }

  const fraction = String(value).split('.')[1] ?? '';
  return fraction.length > 2 ? { decimals: true } : null;
};

const wholeNumber: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;

  if (value === null || value === undefined || value === '') {
    return null;
  }

  return Number.isInteger(Number(value)) ? null : { integer: true };
};

// Ajuste de límite y días de crédito de un cliente (contrato 10, solo ADMIN).
@Component({
  selector: 'app-customer-credit-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  template: `
    <form class="credit-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <header class="credit-form__header">
        <div>
          <p class="credit-form__eyebrow">Condiciones comerciales</p>
          <h2 class="credit-form__title">Crédito del cliente</h2>
          <p class="credit-form__subtitle">{{ record()?.legalName ?? 'Cliente' }}</p>
        </div>
        <button
          type="button"
          class="credit-form__close"
          aria-label="Cerrar formulario"
          (click)="cancelled.emit()"
        >
          <app-icon name="close" [size]="18" />
        </button>
      </header>

      @if (record(); as customer) {
        <dl class="credit-form__summary">
          <div>
            <dt>Límite actual</dt>
            <dd>{{ formatMoney(customer.creditLimit) }}</dd>
          </div>
          <div>
            <dt>Saldo pendiente</dt>
            <dd>{{ formatMoney(customer.outstandingBalance) }}</dd>
          </div>
          <div>
            <dt>Disponible</dt>
            <dd [class.credit-form__amount--danger]="creditTone(customer) === 'danger'">
              {{ formatMoney(availableCredit(customer)) }}
            </dd>
          </div>
        </dl>
      }

      @if (error(); as message) {
        <p class="credit-form__error" role="alert">
          <app-icon name="alertCircle" [size]="16" />
          {{ message }}
        </p>
      }

      <div class="field">
        <label class="field__label" for="credit-limit">
          Límite de crédito <span class="field__required" aria-hidden="true">*</span>
        </label>
        <input
          id="credit-limit"
          class="field__control"
          type="number"
          formControlName="creditLimit"
          min="0"
          step="0.01"
          placeholder="0.00"
          [class.is-invalid]="limitError() !== null"
        />
        @if (limitError(); as message) {
          <p class="field__error" role="alert">{{ message }}</p>
        } @else {
          <p class="field__hint">
            Monto máximo de facturas pendientes. Usa 0 para dejar al cliente sin línea de crédito.
          </p>
        }
      </div>

      <div class="field">
        <label class="field__label" for="credit-days">
          Días de crédito <span class="field__required" aria-hidden="true">*</span>
        </label>
        <input
          id="credit-days"
          class="field__control"
          type="number"
          formControlName="creditDays"
          min="0"
          step="1"
          placeholder="0"
          [class.is-invalid]="daysError() !== null"
        />
        @if (daysError(); as message) {
          <p class="field__error" role="alert">{{ message }}</p>
        }
        @if (limitWarning(); as message) {
          <p class="field__warning" role="status">
            <app-icon name="alertTriangle" [size]="15" />
            {{ message }}
          </p>
        }
        @if (daysError() === null && limitWarning() === null) {
          <p class="field__hint">0 significa pago de contado.</p>
        }
      </div>

      <footer class="credit-form__footer">
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
          Guardar condiciones
        </button>
      </footer>
    </form>
  `,
  styles: `
    :host {
      display: block;
    }

    .credit-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .credit-form__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--border);
    }

    .credit-form__eyebrow {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .credit-form__title {
      margin-top: 4px;
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
    }

    .credit-form__subtitle {
      margin-top: 2px;
      color: var(--text-muted);
      font-size: var(--text-xs);
    }

    .credit-form__close {
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

    .credit-form__close:hover {
      background: var(--gradient-soft);
      border-color: var(--brand-200);
      color: var(--brand-700);
    }

    .credit-form__summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-3);
      margin: 0;
      padding: 12px 14px;
      background: var(--surface-muted);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
    }

    .credit-form__summary dt {
      color: var(--text-subtle);
      font-size: 0.6875rem;
      font-weight: var(--weight-semibold);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .credit-form__summary dd {
      margin: 3px 0 0;
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      font-variant-numeric: tabular-nums;
    }

    .credit-form__amount--danger {
      color: var(--danger-700);
    }

    .credit-form__error {
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

    .field__warning {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      color: var(--warning-700);
      font-size: var(--text-xs);
      line-height: 1.5;
    }

    .credit-form__footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-3);
      padding-top: var(--space-4);
      border-top: 1px solid var(--border);
    }

    @media (max-width: 520px) {
      .credit-form__summary {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class CustomerCreditFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly record = input<Customer | null>(null);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly submitted = output<CreditFormValue>();
  readonly cancelled = output<void>();

  protected readonly form = this.formBuilder.group({
    creditLimit: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(9999999999.99),
      maxTwoDecimals,
    ]),
    creditDays: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(0),
      wholeNumber,
    ]),
  });

  constructor() {
    effect(() => this.patch(this.record()));
  }

  protected formatMoney(value: number): string {
    return formatMoney(value);
  }

  protected availableCredit(customer: Customer): number {
    return availableCredit(customer);
  }

  protected creditTone(customer: Customer) {
    return creditTone(customer);
  }

  protected limitError(): string | null {
    const control = this.form.controls.creditLimit;

    if (!control.invalid || (!control.touched && !control.dirty)) {
      return null;
    }

    if (control.hasError('required')) {
      return 'El límite de crédito es obligatorio.';
    }

    if (control.hasError('min')) {
      return 'El límite de crédito no puede ser negativo.';
    }

    if (control.hasError('max')) {
      return 'El límite de crédito admite hasta 10 enteros y 2 decimales.';
    }

    return 'El límite admite como máximo 2 decimales.';
  }

  protected daysError(): string | null {
    const control = this.form.controls.creditDays;

    if (!control.invalid || (!control.touched && !control.dirty)) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Los días de crédito son obligatorios.';
    }

    if (control.hasError('min')) {
      return 'Los días de crédito no pueden ser negativos.';
    }

    return 'Los días de crédito deben ser un número entero.';
  }

  protected limitWarning(): string | null {
    const customer = this.record();
    const limit = this.form.controls.creditLimit.value;

    if (customer === null || limit === null) {
      return null;
    }

    return limit < customer.outstandingBalance
      ? 'El nuevo límite queda por debajo del saldo pendiente actual. Revisa la cobranza antes de guardar.'
      : null;
  }

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();

    this.submitted.emit({
      creditLimit: raw.creditLimit,
      creditDays: raw.creditDays,
    });
  }

  private patch(record: Customer | null): void {
    this.form.reset({
      creditLimit: record?.creditLimit ?? 0,
      creditDays: record?.creditDays ?? 0,
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }
}
