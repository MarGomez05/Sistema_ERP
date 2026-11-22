import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import {
  PriceFormValue,
  ProductPresentation,
  ProductPriceHistoryItem,
  formatDateTime,
  formatMoney,
  isCurrentPrice,
} from '../product.model';

const MAX_PRICE = 99_999_999.99;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

// Cambio de precio vigente e historial de una presentación (contrato 5.3, solo ADMIN).
@Component({
  selector: 'app-product-price-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, BadgeComponent, ButtonComponent, IconComponent, SkeletonComponent],
  template: `
    <div class="price-panel">
      <header class="price-panel__header">
        <div>
          <p class="price-panel__eyebrow">Precio de venta</p>
          <h2 class="price-panel__title">{{ record().presentation.name }}</h2>
          <p class="price-panel__meta">
            {{ record().code }} · {{ record().presentation.quantity }}
            {{ record().presentation.measureUnit }}
          </p>
        </div>
        <button
          type="button"
          class="price-panel__close"
          aria-label="Cerrar formulario de precio"
          (click)="cancelled.emit()"
        >
          <app-icon name="close" [size]="18" />
        </button>
      </header>

      <div class="price-panel__current">
        <div>
          <span class="price-panel__current-label">Precio vigente</span>
          <strong class="price-panel__current-value">
            {{ formatMoney(record().currentPrice) }}
          </strong>
        </div>
        <app-icon name="trendingUp" [size]="22" />
      </div>

      @if (error(); as message) {
        <p class="price-panel__error" role="alert">
          <app-icon name="alertCircle" [size]="16" />
          {{ message }}
        </p>
      }

      <form class="price-panel__form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="field">
          <label class="field__label" for="presentation-price">
            Nuevo precio <span class="field__required" aria-hidden="true">*</span>
          </label>
          <div class="price-panel__input">
            <span aria-hidden="true">$</span>
            <input
              id="presentation-price"
              class="field__control"
              type="number"
              formControlName="price"
              min="0.01"
              step="0.01"
              inputmode="decimal"
              placeholder="0.00"
              [class.is-invalid]="priceError() !== null"
            />
          </div>
          @if (priceError(); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          } @else {
            <p class="field__hint">
              El precio incluye IVA. Al guardar, el precio vigente se cierra y este queda como
              vigente en el historial.
            </p>
          }
        </div>

        <button appButton type="submit" [loading]="saving()" [block]="true">
          <app-icon name="checkCircle" [size]="16" />
          Guardar precio
        </button>
      </form>

      <section class="price-panel__history" aria-labelledby="price-history-title">
        <div class="price-panel__history-head">
          <h3 id="price-history-title" class="price-panel__history-title">Historial de precios</h3>
          <app-badge tone="neutral">{{ history().length }}</app-badge>
        </div>

        @if (historyLoading()) {
          <div class="price-panel__history-skeleton" aria-hidden="true">
            <app-skeleton height="54px" />
            <app-skeleton height="54px" />
            <app-skeleton height="54px" />
          </div>
        } @else if (historyError(); as message) {
          <div class="price-panel__history-feedback" role="alert">
            <p>{{ message }}</p>
            <button
              appButton
              type="button"
              size="sm"
              variant="secondary"
              (click)="historyRetry.emit()"
            >
              Reintentar
            </button>
          </div>
        } @else if (history().length === 0) {
          <p class="price-panel__history-empty">
            Esta presentación aún no tiene precios registrados. Guarda el primero para poder
            venderla.
          </p>
        } @else {
          <ol class="price-history">
            @for (item of history(); track item.id) {
              <li
                class="price-history__item"
                [class.price-history__item--current]="isCurrent(item)"
              >
                <div class="price-history__main">
                  <span class="price-history__price">{{ formatMoney(item.price) }}</span>
                  @if (isCurrent(item)) {
                    <app-badge tone="success" [dot]="true">Vigente</app-badge>
                  } @else {
                    <app-badge tone="neutral">Cerrado</app-badge>
                  }
                </div>
                <dl class="price-history__dates">
                  <div>
                    <dt>Desde</dt>
                    <dd>{{ formatDateTime(item.startDate) }}</dd>
                  </div>
                  <div>
                    <dt>Hasta</dt>
                    <dd>{{ formatDateTime(item.endDate) }}</dd>
                  </div>
                </dl>
                <p class="price-history__user">
                  <app-icon name="user" [size]="13" />
                  {{ item.changedBy.fullName }}
                </p>
              </li>
            }
          </ol>
        }
      </section>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .price-panel {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .price-panel__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--border);
    }

    .price-panel__eyebrow {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .price-panel__title {
      margin-top: 4px;
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
    }

    .price-panel__meta {
      margin-top: 2px;
      color: var(--text-muted);
      font-size: var(--text-xs);
    }

    .price-panel__close {
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

    .price-panel__close:hover {
      background: var(--gradient-soft);
      border-color: var(--brand-200);
      color: var(--brand-700);
    }

    .price-panel__current {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: 14px 16px;
      background: var(--gradient-brand);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-brand);
      color: var(--text-inverse);
    }

    .price-panel__current-label {
      display: block;
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      opacity: 0.86;
    }

    .price-panel__current-value {
      display: block;
      margin-top: 2px;
      font-size: var(--text-xl);
      font-variant-numeric: tabular-nums;
      font-weight: var(--weight-bold);
    }

    .price-panel__error {
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

    .price-panel__form {
      display: grid;
      gap: var(--space-4);
    }

    .price-panel__input {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-left: 12px;
      background: var(--surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      color: var(--text-subtle);
      font-weight: var(--weight-semibold);
      transition:
        border-color var(--transition-fast),
        box-shadow var(--transition-fast);
    }

    .price-panel__input:focus-within {
      border-color: var(--brand-400);
      box-shadow: 0 0 0 3px rgba(8, 115, 196, 0.14);
    }

    .price-panel__input:has(.is-invalid) {
      border-color: var(--danger-500);
      box-shadow: 0 0 0 3px rgba(197, 68, 59, 0.12);
    }

    .price-panel__input .field__control {
      padding-left: 0;
      background: transparent;
      border: 0;
      box-shadow: none;
      font-variant-numeric: tabular-nums;
    }

    .price-panel__input .field__control:focus-visible {
      outline: none;
    }

    .price-panel__input .field__control.is-invalid {
      background: transparent;
    }

    .price-panel__history {
      display: grid;
      gap: var(--space-3);
      padding-top: var(--space-4);
      border-top: 1px solid var(--border);
    }

    .price-panel__history-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }

    .price-panel__history-title {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    .price-panel__history-skeleton {
      display: grid;
      gap: 8px;
    }

    .price-panel__history-feedback {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      color: var(--danger-700);
      font-size: var(--text-xs);
    }

    .price-panel__history-feedback p {
      flex: 1;
      min-width: 140px;
    }

    .price-panel__history-empty {
      color: var(--text-muted);
      font-size: var(--text-xs);
      line-height: 1.6;
    }

    .price-history {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .price-history__item {
      display: grid;
      gap: 8px;
      padding: 12px 14px;
      background: var(--surface-muted);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
    }

    .price-history__item--current {
      background: var(--gradient-soft);
      border-color: var(--brand-200);
    }

    .price-history__main {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }

    .price-history__price {
      font-size: var(--text-base);
      font-weight: var(--weight-bold);
      font-variant-numeric: tabular-nums;
    }

    .price-history__dates {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin: 0;
    }

    .price-history__dates dt {
      color: var(--text-subtle);
      font-size: 0.6875rem;
      font-weight: var(--weight-semibold);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .price-history__dates dd {
      margin: 2px 0 0;
      color: var(--text-muted);
      font-size: var(--text-xs);
      font-variant-numeric: tabular-nums;
    }

    .price-history__user {
      display: flex;
      align-items: center;
      gap: 5px;
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }
  `,
})
export class ProductPricePanelComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly record = input.required<ProductPresentation>();
  readonly history = input<readonly ProductPriceHistoryItem[]>([]);
  readonly historyLoading = input(false);
  readonly historyError = input<string | null>(null);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly submitted = output<PriceFormValue>();
  readonly cancelled = output<void>();
  readonly historyRetry = output<void>();

  protected readonly form = this.formBuilder.group({
    price: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(MAX_PRICE),
    ]),
  });

  constructor() {
    effect(() => this.patch(this.record()));
  }

  protected formatMoney(value: number | null): string {
    return formatMoney(value);
  }

  protected formatDateTime(value: string | null): string {
    return formatDateTime(value);
  }

  protected isCurrent(item: ProductPriceHistoryItem): boolean {
    return isCurrentPrice(item);
  }

  protected priceError(): string | null {
    const control = this.form.controls.price;

    if (!control.invalid || (!control.touched && !control.dirty)) {
      return null;
    }

    if (control.hasError('required')) {
      return 'El precio es obligatorio.';
    }

    if (control.hasError('min')) {
      return 'El precio debe ser mayor que 0.';
    }

    return 'El precio admite hasta 8 enteros y 2 decimales.';
  }

  protected submit(): void {
    this.form.markAllAsTouched();

    const price = this.form.controls.price.value;

    if (this.form.invalid || price === null) {
      return;
    }

    this.submitted.emit({ price: roundMoney(price) });
  }

  private patch(record: ProductPresentation): void {
    this.form.reset({ price: record.currentPrice });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }
}
