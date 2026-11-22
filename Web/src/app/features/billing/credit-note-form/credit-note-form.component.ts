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
import { CreditNoteFormValue, Invoice } from '../invoice.model';

const notBlank: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;

  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  return value.trim().length === 0 ? { required: true } : null;
};

// Emisión de una nota de crédito sobre una factura emitida (contrato 12.3, solo ADMIN).
@Component({
  selector: 'app-credit-note-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  template: `
    <form class="note-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <header class="note-form__header">
        <div>
          <p class="note-form__eyebrow">Anulación</p>
          <h2 class="note-form__title">Nota de crédito</h2>
          <p class="note-form__subtitle">{{ invoice()?.invoiceNumber ?? 'Factura' }}</p>
        </div>
        <button
          type="button"
          class="note-form__close"
          aria-label="Cerrar formulario"
          (click)="cancelled.emit()"
        >
          <app-icon name="close" [size]="18" />
        </button>
      </header>

      <p class="note-form__warning">
        <app-icon name="alertTriangle" [size]="16" />
        La factura original y la venta asociada quedarán canceladas. Esta acción no se puede
        deshacer.
      </p>

      @if (error(); as message) {
        <p class="note-form__error" role="alert">
          <app-icon name="alertCircle" [size]="16" />
          {{ message }}
        </p>
      }

      <div class="field">
        <label class="field__label" for="credit-note-reason">
          Motivo <span class="field__required" aria-hidden="true">*</span>
        </label>
        <textarea
          id="credit-note-reason"
          class="field__control"
          rows="3"
          formControlName="reason"
          maxlength="255"
          placeholder="Describe el motivo de la nota de crédito"
          [class.is-invalid]="reasonError() !== null"
        ></textarea>
        @if (reasonError(); as message) {
          <p class="field__error" role="alert">{{ message }}</p>
        } @else {
          <p class="field__hint">Obligatorio, máximo 255 caracteres.</p>
        }
      </div>

      <label class="note-form__check">
        <input type="checkbox" formControlName="returnStock" />
        <span>
          <span class="note-form__check-title">Devolver stock a los lotes de la venta</span>
          <span class="note-form__check-hint">
            Marca esta opción si la mercadería regresa físicamente a la bodega.
          </span>
        </span>
      </label>

      <footer class="note-form__footer">
        <button
          appButton
          type="button"
          variant="secondary"
          [disabled]="saving()"
          (click)="cancelled.emit()"
        >
          Cancelar
        </button>
        <button appButton type="submit" variant="danger" [loading]="saving()">
          <app-icon name="receipt" [size]="16" />
          Emitir nota de crédito
        </button>
      </footer>
    </form>
  `,
  styles: `
    :host {
      display: block;
    }

    .note-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .note-form__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--border);
    }

    .note-form__eyebrow {
      color: var(--danger-700);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .note-form__title {
      margin-top: 4px;
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
      color: var(--danger-700);
    }

    .note-form__subtitle {
      margin-top: 2px;
      color: var(--text-muted);
      font-size: var(--text-xs);
      font-variant-numeric: tabular-nums;
    }

    .note-form__close {
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

    .note-form__close:hover {
      background: var(--danger-100);
      border-color: var(--danger-border);
      color: var(--danger-700);
    }

    .note-form__warning {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 11px 13px;
      background: var(--warning-100);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--warning-700);
      font-size: var(--text-xs);
      line-height: 1.55;
    }

    .note-form__error {
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

    .note-form__check {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      background: var(--surface-muted);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      cursor: pointer;
    }

    .note-form__check input {
      width: 18px;
      height: 18px;
      margin-top: 1px;
      accent-color: var(--brand-700);
    }

    .note-form__check-title {
      display: block;
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    .note-form__check-hint {
      display: block;
      margin-top: 2px;
      color: var(--text-muted);
      font-size: var(--text-xs);
      line-height: 1.5;
    }

    .note-form__footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-3);
      padding-top: var(--space-4);
      border-top: 1px solid var(--border);
    }
  `,
})
export class CreditNoteFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly invoice = input<Invoice | null>(null);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly submitted = output<CreditNoteFormValue>();
  readonly cancelled = output<void>();

  protected readonly form = this.formBuilder.nonNullable.group({
    reason: ['', [Validators.required, notBlank, Validators.maxLength(255)]],
    returnStock: [true],
  });

  constructor() {
    effect(() => this.reset(this.invoice()));
  }

  protected reasonError(): string | null {
    const control = this.form.controls.reason;

    if (!control.invalid || (!control.touched && !control.dirty)) {
      return null;
    }

    if (control.hasError('required')) {
      return 'El motivo de la nota de crédito es obligatorio.';
    }

    return 'El motivo no puede superar los 255 caracteres.';
  }

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();

    this.submitted.emit({
      reason: raw.reason,
      returnStock: raw.returnStock,
    });
  }

  private reset(invoice: Invoice | null): void {
    this.form.reset({ reason: '', returnStock: invoice !== null });

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }
}
