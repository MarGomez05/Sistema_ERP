import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import {
  ProductDetail,
  ProductListItem,
  ProductQuery,
  formatMoney,
} from '@features/products/product.model';
import { ProductService } from '@features/products/product.service';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import {
  LastCostItem,
  LotFormValue,
  SupplierOption,
  formatDate,
  lastCostFor,
  todayIso,
} from '../lot.model';
import { LotService } from '../lot.service';

const trimmedRequired: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim().length > 0 ? null : { required: true };

const notFuture: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim().length > 0
    ? control.value > todayIso()
      ? { future: true }
      : null
    : null;

const afterToday: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim().length > 0
    ? control.value <= todayIso()
      ? { past: true }
      : null
    : null;

function tomorrowIso(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// Registro de ingreso de un lote: producto, presentación, proveedor, factura y costo (contrato 7).
@Component({
  selector: 'app-lot-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  template: `
    <form class="lot-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <header class="lot-form__header">
        <div>
          <p class="lot-form__eyebrow">Nuevo registro</p>
          <h2 class="lot-form__title">Registrar ingreso</h2>
        </div>
        <button
          type="button"
          class="lot-form__close"
          aria-label="Cerrar formulario"
          (click)="cancelled.emit()"
        >
          <app-icon name="close" [size]="18" />
        </button>
      </header>

      @if (error(); as message) {
        <p class="lot-form__error" role="alert">
          <app-icon name="alertCircle" [size]="16" />
          {{ message }}
        </p>
      }

      <section class="lot-form__section" aria-labelledby="lot-product-title">
        <h3 id="lot-product-title" class="lot-form__section-title">Producto y presentación</h3>

        @if (selectedProduct(); as product) {
          <div class="lot-form__product">
            <div>
              <strong>{{ product.name }}</strong>
              <span>{{ product.code }}</span>
            </div>
            <button
              type="button"
              class="lot-form__link"
              (click)="clearProduct()"
              [disabled]="saving()"
            >
              Cambiar
            </button>
          </div>

          <div class="field">
            <label class="field__label" for="lot-presentation">
              Presentación <span class="field__required" aria-hidden="true">*</span>
            </label>
            <select
              id="lot-presentation"
              class="field__control"
              formControlName="productPresentationId"
              [class.is-invalid]="presentationError() !== null"
            >
              <option [ngValue]="null" disabled>Selecciona una presentación</option>
              @for (presentation of product.presentations; track presentation.id) {
                @if (presentation.isActive) {
                  <option [ngValue]="presentation.id">
                    {{ presentation.presentation.name }} · {{ presentation.code }}
                  </option>
                }
              }
            </select>
            @if (presentationError(); as message) {
              <p class="field__error" role="alert">{{ message }}</p>
            } @else {
              <p class="field__hint">
                Solo se muestran presentaciones activas del producto seleccionado.
              </p>
            }
          </div>
        } @else {
          <div class="lot-form__search">
            <input
              class="field__control"
              type="search"
              [formControl]="productSearch"
              placeholder="Buscar producto por nombre o código"
              aria-label="Buscar producto por nombre o código"
              (keydown.enter)="searchProducts($event)"
            />
            <button
              appButton
              type="button"
              variant="secondary"
              [loading]="searching()"
              (click)="searchProducts()"
            >
              <app-icon name="search" [size]="16" />
              Buscar
            </button>
          </div>

          @if (searchError(); as message) {
            <p class="lot-form__error" role="alert">{{ message }}</p>
          } @else if (searching()) {
            <p class="lot-form__hint">Buscando productos…</p>
          } @else if (products().length > 0) {
            <ul class="lot-form__results">
              @for (item of products(); track item.id) {
                <li>
                  <button type="button" class="lot-form__result" (click)="selectProduct(item)">
                    <span class="lot-form__result-name">{{ item.name }}</span>
                    <span class="lot-form__result-meta">
                      {{ item.code }} · {{ item.productTypeName }}
                    </span>
                  </button>
                </li>
              }
            </ul>
          } @else if (searched()) {
            <p class="lot-form__hint">No hay productos activos que coincidan con la búsqueda.</p>
          } @else {
            <p class="lot-form__hint">
              Busca el producto al que pertenece el lote. Se listan solo productos activos.
            </p>
          }

          @if (loadingProduct()) {
            <p class="lot-form__hint">Cargando presentaciones…</p>
          }

          @if (productError(); as message) {
            <p class="lot-form__error" role="alert">{{ message }}</p>
          }
        }
      </section>

      <section class="lot-form__section" aria-labelledby="lot-supplier-title">
        <h3 id="lot-supplier-title" class="lot-form__section-title">Proveedor y factura</h3>

        <div class="field">
          <label class="field__label" for="lot-supplier">
            Proveedor <span class="field__required" aria-hidden="true">*</span>
          </label>
          <select
            id="lot-supplier"
            class="field__control"
            formControlName="supplierId"
            [class.is-invalid]="supplierError() !== null"
          >
            <option [ngValue]="null" disabled>Selecciona un proveedor</option>
            @for (supplier of suppliers(); track supplier.id) {
              <option [ngValue]="supplier.id">{{ supplier.name }}</option>
            } @empty {
              <option [ngValue]="null" disabled>Sin proveedores disponibles</option>
            }
          </select>
          @if (supplierError(); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          } @else if (suppliers().length === 0) {
            <p class="field__hint">
              No se pudo cargar el catálogo de proveedores activos. Verifica tus permisos.
            </p>
          }
        </div>

        <div class="field">
          <label class="field__label" for="lot-invoice-number">
            Número de factura <span class="field__required" aria-hidden="true">*</span>
          </label>
          <input
            id="lot-invoice-number"
            class="field__control"
            type="text"
            formControlName="invoiceNumber"
            maxlength="50"
            placeholder="Ej. F-001234"
            [class.is-invalid]="textError('invoiceNumber', 50) !== null"
          />
          @if (textError('invoiceNumber', 50); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          }
        </div>

        <div class="field">
          <label class="field__label" for="lot-invoice-date">
            Fecha de factura <span class="field__required" aria-hidden="true">*</span>
          </label>
          <input
            id="lot-invoice-date"
            class="field__control"
            type="date"
            formControlName="invoiceDate"
            [max]="today"
            [class.is-invalid]="invoiceDateError() !== null"
          />
          @if (invoiceDateError(); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          }
        </div>
      </section>

      <section class="lot-form__section" aria-labelledby="lot-data-title">
        <h3 id="lot-data-title" class="lot-form__section-title">Datos del lote</h3>

        <div class="field">
          <label class="field__label" for="lot-number">
            Número de lote <span class="field__required" aria-hidden="true">*</span>
          </label>
          <input
            id="lot-number"
            class="field__control"
            type="text"
            formControlName="lotNumber"
            maxlength="50"
            placeholder="Ej. L-2026-045"
            [class.is-invalid]="textError('lotNumber', 50) !== null"
          />
          @if (textError('lotNumber', 50); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          } @else {
            <p class="field__hint">Único por proveedor y presentación.</p>
          }
        </div>

        <div class="lot-form__pair">
          <div class="field">
            <label class="field__label" for="lot-received">
              Cantidad recibida <span class="field__required" aria-hidden="true">*</span>
            </label>
            <input
              id="lot-received"
              class="field__control"
              type="number"
              formControlName="receivedQuantity"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              [class.is-invalid]="quantityError() !== null"
            />
            @if (quantityError(); as message) {
              <p class="field__error" role="alert">{{ message }}</p>
            }
          </div>

          <div class="field">
            <label class="field__label" for="lot-unit-cost">
              Costo unitario <span class="field__required" aria-hidden="true">*</span>
            </label>
            <input
              id="lot-unit-cost"
              class="field__control"
              type="number"
              formControlName="unitCost"
              min="0"
              step="0.01"
              placeholder="0.00"
              [class.is-invalid]="unitCostError() !== null"
            />
            @if (unitCostError(); as message) {
              <p class="field__error" role="alert">{{ message }}</p>
            }
          </div>
        </div>

        @if (lastCost(); as cost) {
          <div class="lot-form__last-cost">
            <div>
              <span>Último costo registrado</span>
              <strong>{{ formatMoney(cost.lastUnitCost) }}</strong>
              <small>{{ cost.presentationName }} · {{ formatDate(cost.entryDate) }}</small>
            </div>
            <button type="button" class="lot-form__link" (click)="useLastCost(cost)">Usar</button>
          </div>
        }

        <div class="field">
          <label class="field__label" for="lot-expiration">
            Fecha de vencimiento
            @if (requiresExpiration()) {
              <span class="field__required" aria-hidden="true">*</span>
            }
          </label>
          <input
            id="lot-expiration"
            class="field__control"
            type="date"
            formControlName="expirationDate"
            [min]="minExpiration"
            [class.is-invalid]="expirationError() !== null"
          />
          @if (expirationError(); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          } @else if (requiresExpiration()) {
            <p class="field__hint">
              Este producto requiere vencimiento; debe ser posterior a la fecha de ingreso.
            </p>
          } @else {
            <p class="field__hint">Opcional si el producto no requiere vencimiento.</p>
          }
        </div>

        <div class="field">
          <label class="field__label" for="lot-notes">Notas</label>
          <textarea
            id="lot-notes"
            class="field__control"
            rows="2"
            formControlName="notes"
            maxlength="200"
            placeholder="Observaciones del ingreso"
            [class.is-invalid]="notesError() !== null"
          ></textarea>
          @if (notesError(); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          }
        </div>
      </section>

      <footer class="lot-form__footer">
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
          Registrar ingreso
        </button>
      </footer>
    </form>
  `,
  styles: `
    :host {
      display: block;
    }

    .lot-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .lot-form__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--border);
    }

    .lot-form__eyebrow {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .lot-form__title {
      margin-top: 4px;
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
    }

    .lot-form__close {
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

    .lot-form__close:hover {
      background: var(--gradient-soft);
      border-color: var(--brand-200);
      color: var(--brand-700);
    }

    .lot-form__error {
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

    .lot-form__section {
      display: grid;
      gap: var(--space-3);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--border);
    }

    .lot-form__section:last-of-type {
      padding-bottom: 0;
      border-bottom: 0;
    }

    .lot-form__section-title {
      color: var(--text-muted);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .lot-form__search {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--space-2);
    }

    .lot-form__results {
      display: grid;
      gap: 4px;
      max-height: 220px;
      margin: 0;
      padding: 0;
      overflow-y: auto;
      list-style: none;
    }

    .lot-form__result {
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: 100%;
      padding: 9px 12px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      text-align: left;
      transition:
        background var(--transition-fast),
        border-color var(--transition-fast);
    }

    .lot-form__result:hover {
      background: var(--gradient-soft);
      border-color: var(--brand-200);
    }

    .lot-form__result-name {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    .lot-form__result-meta {
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .lot-form__product {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding: 12px 14px;
      background: var(--gradient-soft);
      border: 1px solid var(--brand-200);
      border-radius: var(--radius-md);
    }

    .lot-form__product strong {
      display: block;
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    .lot-form__product span {
      display: block;
      margin-top: 2px;
      color: var(--text-muted);
      font-size: var(--text-xs);
    }

    .lot-form__link {
      padding: 0;
      background: transparent;
      border: 0;
      color: var(--brand-600);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .lot-form__hint {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      line-height: 1.55;
    }

    .lot-form__pair {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-3);
    }

    .lot-form__last-cost {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: 10px 12px;
      background: var(--surface-muted);
      border: 1px dashed var(--border-strong);
      border-radius: var(--radius-md);
    }

    .lot-form__last-cost span {
      display: block;
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .lot-form__last-cost strong {
      display: block;
      margin-top: 2px;
      font-size: var(--text-base);
      font-variant-numeric: tabular-nums;
    }

    .lot-form__last-cost small {
      display: block;
      margin-top: 2px;
      color: var(--text-subtle);
      font-size: 0.6875rem;
    }

    .lot-form__footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-3);
      padding-top: var(--space-4);
      border-top: 1px solid var(--border);
    }

    @media (max-width: 520px) {
      .lot-form__pair {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class LotFormComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly productsService = inject(ProductService);
  private readonly lotsService = inject(LotService);

  readonly suppliers = input<readonly SupplierOption[]>([]);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly submitted = output<LotFormValue>();
  readonly cancelled = output<void>();

  protected readonly today = todayIso();
  protected readonly minExpiration = tomorrowIso();

  protected readonly productSearch = this.formBuilder.nonNullable.control('');
  protected readonly products = signal<ProductListItem[]>([]);
  protected readonly searching = signal(false);
  protected readonly searched = signal(false);
  protected readonly searchError = signal<string | null>(null);

  protected readonly selectedProduct = signal<ProductDetail | null>(null);
  protected readonly loadingProduct = signal(false);
  protected readonly productError = signal<string | null>(null);

  protected readonly lastCosts = signal<LastCostItem[]>([]);

  protected readonly form = this.formBuilder.group({
    productPresentationId: this.formBuilder.control<number | null>(null, [Validators.required]),
    supplierId: this.formBuilder.control<number | null>(null, [Validators.required]),
    invoiceNumber: this.formBuilder.nonNullable.control('', [
      trimmedRequired,
      Validators.maxLength(50),
    ]),
    invoiceDate: this.formBuilder.nonNullable.control(todayIso(), [Validators.required, notFuture]),
    lotNumber: this.formBuilder.nonNullable.control('', [
      trimmedRequired,
      Validators.maxLength(50),
    ]),
    receivedQuantity: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
    ]),
    unitCost: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(0),
    ]),
    expirationDate: this.formBuilder.nonNullable.control('', [afterToday]),
    notes: this.formBuilder.nonNullable.control('', [Validators.maxLength(200)]),
  });

  constructor() {
    // Al elegir presentación se sugiere el último costo si el campo sigue vacío.
    this.form.controls.productPresentationId.valueChanges.subscribe((presentationId) => {
      const cost = lastCostFor(this.lastCosts(), presentationId);

      if (cost !== null && this.form.controls.unitCost.value === null) {
        this.form.controls.unitCost.setValue(cost.lastUnitCost);
      }
    });
  }

  protected readonly requiresExpiration = computed(
    () => this.selectedProduct()?.requiresExpiration ?? false,
  );

  protected lastCost(): LastCostItem | null {
    return lastCostFor(this.lastCosts(), this.form.controls.productPresentationId.value);
  }

  protected searchProducts(event?: Event): void {
    event?.preventDefault();

    const search = this.productSearch.value.trim();

    this.searching.set(true);
    this.searched.set(false);
    this.searchError.set(null);

    const query: ProductQuery = {
      search,
      categoryId: null,
      productTypeId: null,
      isActive: true,
      page: 0,
      size: 8,
    };

    this.productsService.list(query).subscribe({
      next: (page) => {
        this.products.set(page.content);
        this.searching.set(false);
        this.searched.set(true);
      },
      error: () => {
        this.products.set([]);
        this.searching.set(false);
        this.searched.set(true);
        this.searchError.set('No se pudo buscar productos. Intenta nuevamente.');
      },
    });
  }

  protected selectProduct(item: ProductListItem): void {
    this.loadingProduct.set(true);
    this.productError.set(null);
    this.products.set([]);

    this.productsService.getById(item.id).subscribe({
      next: (product) => {
        this.selectedProduct.set(product);
        this.form.controls.productPresentationId.setValue(null);
        this.lastCosts.set([]);
        this.loadingProduct.set(false);
        this.loadLastCosts(product.id);
        this.syncExpirationValidator(product.requiresExpiration);
      },
      error: () => {
        this.loadingProduct.set(false);
        this.productError.set('No se pudo cargar el producto seleccionado.');
      },
    });
  }

  protected clearProduct(): void {
    this.selectedProduct.set(null);
    this.form.controls.productPresentationId.setValue(null);
    this.lastCosts.set([]);
    this.syncExpirationValidator(false);
  }

  protected useLastCost(cost: LastCostItem): void {
    this.form.controls.unitCost.setValue(cost.lastUnitCost);
  }

  protected formatMoney(value: number): string {
    return formatMoney(value);
  }

  protected formatDate(value: string | null): string {
    return formatDate(value);
  }

  protected presentationError(): string | null {
    return this.touchedError('productPresentationId', 'Selecciona una presentación.');
  }

  protected supplierError(): string | null {
    return this.touchedError('supplierId', 'Selecciona un proveedor.');
  }

  protected invoiceDateError(): string | null {
    const control = this.form.controls.invoiceDate;

    if (!control.invalid || (!control.touched && !control.dirty)) {
      return null;
    }

    if (control.hasError('required')) {
      return 'La fecha de la factura es obligatoria.';
    }

    return 'La fecha de la factura no puede ser futura.';
  }

  protected textError(field: 'invoiceNumber' | 'lotNumber', max: number): string | null {
    const control = this.form.controls[field];

    if (!control.invalid || (!control.touched && !control.dirty)) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    return control.hasError('maxlength')
      ? `El valor no puede superar los ${max} caracteres.`
      : 'Revisa este campo.';
  }

  protected quantityError(): string | null {
    const control = this.form.controls.receivedQuantity;

    if (!control.invalid || (!control.touched && !control.dirty)) {
      return null;
    }

    return control.hasError('required')
      ? 'La cantidad recibida es obligatoria.'
      : 'La cantidad recibida debe ser mayor que 0.';
  }

  protected unitCostError(): string | null {
    const control = this.form.controls.unitCost;

    if (!control.invalid || (!control.touched && !control.dirty)) {
      return null;
    }

    return control.hasError('required')
      ? 'El costo unitario es obligatorio.'
      : 'El costo unitario no puede ser negativo.';
  }

  protected expirationError(): string | null {
    const control = this.form.controls.expirationDate;

    if (!control.invalid || (!control.touched && !control.dirty)) {
      return null;
    }

    return control.hasError('required')
      ? 'La fecha de vencimiento es obligatoria para este producto.'
      : 'La fecha de vencimiento debe ser posterior a hoy.';
  }

  protected notesError(): string | null {
    const control = this.form.controls.notes;

    return control.invalid && (control.touched || control.dirty)
      ? 'Las notas no pueden superar los 200 caracteres.'
      : null;
  }

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();

    this.submitted.emit({
      productPresentationId: raw.productPresentationId,
      supplierId: raw.supplierId,
      invoiceNumber: raw.invoiceNumber,
      invoiceDate: raw.invoiceDate,
      lotNumber: raw.lotNumber,
      receivedQuantity: raw.receivedQuantity,
      unitCost: raw.unitCost,
      expirationDate: raw.expirationDate,
      notes: raw.notes,
    });
  }

  private loadLastCosts(productId: number): void {
    // El último costo es exclusivo de ADMIN y PURCHASING; WAREHOUSE recibe 403 y se ignora.
    this.lotsService.getLastCosts(productId).subscribe({
      next: (costs) => this.lastCosts.set(costs),
      error: () => this.lastCosts.set([]),
    });
  }

  private syncExpirationValidator(requires: boolean): void {
    const control = this.form.controls.expirationDate;

    if (requires) {
      control.setValidators([Validators.required, afterToday]);
    } else {
      control.setValidators([afterToday]);
    }

    control.updateValueAndValidity();
  }

  private touchedError(
    field: 'productPresentationId' | 'supplierId',
    message: string,
  ): string | null {
    const control = this.form.controls[field];

    return control.invalid && (control.touched || control.dirty) ? message : null;
  }
}
