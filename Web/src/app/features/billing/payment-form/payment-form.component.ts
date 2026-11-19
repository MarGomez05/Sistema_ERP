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
import { todayIso } from '@shared/util/date.util';
import {
  INVOICE_PAYMENT_METHOD_OPTIONS,
  Invoice,
  InvoicePaymentMethod,
  PaymentFormValue,
  invoiceBalance,
} from '../invoice.model';

const maxTwoDecimals: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;

  if (value === null || value === undefined || value === '') {
    return null;
  }

  const fraction = String(value).split('.')[1] ?? '';
  return fraction.length > 2 ? { decimals: true } : null;
};

const notFuture: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;

  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  return value > todayIso() ? { future: true } : null;
};

const withinBalance = (balance: () => number): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (value === null || value === undefined || value === '') {
      return null;
    }

    const amount = Number(value);

    if (!Number.isFinite(amount)) {
      return null;
    }

    return amount > balance() ? { exceedsBalance: true } : null;
  };
};

// Registro de un pago sobre una factura emitida (contrato 12.2).
@Component({
  selector: 'app-payment-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  template: `
    <form class="payment-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <header class="payment-form__header">
        <div>
          <p class="payment-form__eyebrow">Cobranza</p>
          <h2 class="payment-form__title">Registrar pago</h2>
          <p class="payment-form__subtitle">{{ invoice()?.invoiceNumber ?? 'Factura' }}</p>
        </div>
        <button
          type="button"
          class="payment-form__close"
          aria-label="Cerrar formulario"
          (click)="cancelled.emit()"
        >
          <app-icon name="close" [size]="18" />
        </button>
      </header>

      @if (invoice(); as current) {
        <dl class="payment-form__summary">
          <div>
            <dt>Total</dt>
            <dd>{{ formatMoney(current.total) }}</dd>
          </div>
          <div>
            <dt>Pagado</dt>
            <dd>{{ formatMoney(current.paidTotal) }}</dd>
          </div>
          <div>
            <dt>Saldo</dt>
            <dd class="payment-form__balance">{{ formatMoney(pending(current)) }}</dd>
          </div>
        </dl>
      }

      @if (error(); as message) {
        <p class="payment-form__error" role="alert">
          <app-icon name="alertCircle" [size]="16" />
          {{ message }}
        </p>
      }

      <div class="payment-form__grid">
        <div class="field">
          <label class="field__label" for="payment-date">
            Fecha del pago <span class="field__required" aria-hidden="true">*</span>
          </label>
          <input
            id="payment-date"
            class="field__control"
            type="date"
            formControlName="paymentDate"
            [max]="today"
            [class.is-invalid]="dateError() !== null"
          />
          @if (dateError(); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          }
        </div>

        <div class="field">
          <label class="field__label" for="payment-amount">
            Monto <span class="field__required" aria-hidden="true">*</span>
          </label>
          <input
            id="payment-amount"
            class="field__control"
            type="number"
            formControlName="amount"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            [class.is-invalid]="amountError() !== null"
          />
          @if (amountError(); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          } @else {
            <p class="field__hint">No puede superar el saldo pendiente.</p>
          }
        </div>
      </div>

      <div class="field">
        <label class="field__label" for="payment-method">
          Método de pago <span class="field__required" aria-hidden="true">*</span>
        </label>
        <select
          id="payment-method"
          class="field__control"
          formControlName="paymentMethod"
          [class.is-invalid]="methodError() !== null"
        >
          @for (option of methodOptions; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
        @if (methodError(); as message) {
          <p class="field__error" role="alert">{{ message }}</p>
        }
      </div>

      <div class="field">
        <label class="field__label" for="payment-reference">Referencia</label>
        <input
          id="payment-reference"
          class="field__control"
          type="text"
          formControlName="reference"
          maxlength="50"
          placeholder="Número de boleta, cheque o transferencia"
          [class.is-invalid]="referenceError() !== null"
        />
        @if (referenceError(); as message) {
          <p class="field__error" role="alert">{{ message }}</p>
        }
      </div>

      <div class="field">
        <label class="field__label" for="payment-notes">Notas</label>
        <textarea
          id="payment-notes"
          class="field__control"
          rows="2"
          formControlName="notes"
          maxlength="255"
          placeholder="Opcional, máximo 255 caracteres"
          [class.is-invalid]="notesError() !== null"
        ></textarea>
        @if (notesError(); as message) {
          <p class="field__error" role="alert">{{ message }}</p>
        }
      </div>

      <footer class="payment-form__footer">
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
          Registrar pago
        </button>
      </footer>
    </form>
  `,
  styles: `
    :host {
      display: block;
    }

    .payment-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .payment-form__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--border);
    }

    .payment-form__eyebrow {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .payment-form__title {
      margin-top: 4px;
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
    }

    .payment-form__subtitle {
      margin-top: 2px;
      color: var(--text-muted);
      font-size: var(--text-xs);
      font-variant-numeric: tabular-nums;
    }

    .payment-form__close {
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

    .payment-form__close:hover {
      background: var(--gradient-soft);
      border-color: var(--brand-200);
      color: var(--brand-700);
    }

    .payment-form__summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-3);
      margin: 0;
      padding: 12px 14px;
      background: var(--surface-muted);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
    }

    .payment-form__summary dt {
      color: var(--text-subtle);
      font-size: 0.6875rem;
      font-weight: var(--weight-semibold);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .payment-form__summary dd {
      margin: 3px 0 0;
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      font-variant-numeric: tabular-nums;
    }

    .payment-form__balance {
      color: var(--warning-700);
    }

    .payment-form__error {
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

    .payment-form__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-4);
    }

    .payment-form__footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-3);
      padding-top: var(--space-4);
      border-top: 1px solid var(--border);
    }

    @media (max-width: 520px) {
      .payment-form__grid,
      .payment-form__summary {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class PaymentFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly invoice = input<Invoice | null>(null);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly submitted = output<PaymentFormValue>();
  readonly cancelled = output<void>();

  protected readonly today = todayIso();
  protected readonly methodOptions = INVOICE_PAYMENT_METHOD_OPTIONS;

  protected readonly form = this.formBuilder.group({
    paymentDate: this.formBuilder.nonNullable.control(this.today, [Validators.required, notFuture]),
    amount: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(9999999999.99),
      maxTwoDecimals,
      withinBalance(() => {
        const current = this.invoice();
        return current === null ? Number.POSITIVE_INFINITY : invoiceBalance(current);
      }),
    ]),
    paymentMethod: this.formBuilder.nonNullable.control<InvoicePaymentMethod>('CASH', [
      Validators.required,
    ]),
    reference: this.formBuilder.nonNullable.control('', [Validators.maxLength(50)]),
    notes: this.formBuilder.nonNullable.control('', [Validators.maxLength(255)]),
  });

  constructor() {
    effect(() => this.patch(this.invoice()));
  }

  protected formatMoney(value: number): string {
    return formatMoney(value);
  }

  protected pending(invoice: Invoice): number {
    return invoiceBalance(invoice);
  }

  protected dateError(): string | null {
    const control = this.form.controls.paymentDate;

    if (!control.invalid || (!control.touched && !control.dirty)) {
      return null;
    }

    if (control.hasError('required')) {
      return 'La fecha del pago es obligatoria.';
    }

    return 'La fecha del pago no puede ser futura.';
  }

  protected amountError(): string | null {
    const control = this.form.controls.amount;

    if (!control.invalid || (!control.touched && !control.dirty)) {
      return null;
    }

    if (control.hasError('required')) {
      return 'El monto es obligatorio.';
    }

    if (control.hasError('min')) {
      return 'El monto debe ser mayor que cero.';
    }

    if (control.hasError('exceedsBalance')) {
      return 'El monto supera el saldo pendiente de la factura.';
    }

    if (control.hasError('max')) {
      return 'El monto admite hasta 10 enteros y 2 decimales.';
    }

    return 'El monto admite como máximo 2 decimales.';
  }

  protected methodError(): string | null {
    const control = this.form.controls.paymentMethod;
    return control.invalid && (control.touched || control.dirty)
      ? 'El método de pago es obligatorio.'
      : null;
  }

  protected referenceError(): string | null {
    const control = this.form.controls.reference;
    return control.hasError('maxlength') && (control.touched || control.dirty)
      ? 'La referencia no puede superar los 50 caracteres.'
      : null;
  }

  protected notesError(): string | null {
    const control = this.form.controls.notes;
    return control.hasError('maxlength') && (control.touched || control.dirty)
      ? 'Las notas no pueden superar los 255 caracteres.'
      : null;
  }

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();

    this.submitted.emit({
      paymentDate: raw.paymentDate,
      amount: raw.amount,
      paymentMethod: raw.paymentMethod,
      reference: raw.reference,
      notes: raw.notes,
    });
  }

  private patch(invoice: Invoice | null): void {
    this.form.reset({
      paymentDate: this.today,
      amount: invoice === null ? null : invoiceBalance(invoice),
      paymentMethod: 'CASH',
      reference: '',
      notes: '',
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }
}
