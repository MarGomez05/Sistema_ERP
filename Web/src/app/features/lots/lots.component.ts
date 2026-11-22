import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { readApiError } from '@core/http/api-error';
import { ToastService } from '@core/ui/toast.service';
import { ProductDetail, formatQuantity } from '@features/products/product.model';
import { ProductService } from '@features/products/product.service';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { PaginationComponent } from '@shared/ui/pagination/pagination.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { LotFormComponent } from './lot-form/lot-form.component';
import {
  ExpirationTone,
  LotFormValue,
  LotQuery,
  ProductLot,
  SupplierOption,
  daysToExpireLabel,
  expirationLabel,
  expirationTone,
  formatDate,
  lotCostLabel,
  lotQuantityLabel,
  lotUnitCostLabel,
} from './lot.model';
import { LotService } from './lot.service';

const PAGE_SIZE = 15;
const SKELETON_ROWS = Array.from({ length: 6 });

type LotsPanel = 'create' | 'quantity';

// Consulta de lotes por vencimiento, registro de ingresos y corrección de cantidad (contrato 7).
@Component({
  selector: 'app-lots',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    IconComponent,
    LotFormComponent,
    PageHeaderComponent,
    PaginationComponent,
    ReactiveFormsModule,
    SkeletonComponent,
  ],
  template: `
    <app-page-header
      title="Lotes"
      subtitle="Consulta los ingresos por vencimiento, registra nuevos lotes y corrige existencias."
    >
      <div actions class="lots-header-actions">
        <button
          appButton
          type="button"
          variant="secondary"
          [loading]="loading()"
          (click)="load(page())"
        >
          <app-icon name="refresh" [size]="16" />
          Actualizar
        </button>
        @if (canCreate()) {
          <button appButton type="button" (click)="startCreate()">
            <app-icon name="plus" [size]="16" />
            Registrar ingreso
          </button>
        }
      </div>
    </app-page-header>

    <section class="panel lots-panel">
      <div class="lots-filters">
        <div class="lots-search">
          <app-icon name="search" [size]="17" />
          <input
            class="field__control lots-search__input"
            type="search"
            [value]="invoiceNumber()"
            placeholder="Buscar por número de factura"
            aria-label="Buscar por número de factura"
            (input)="onInvoiceInput($event)"
            (keydown.enter)="applyFilters()"
          />
        </div>

        @if (canFilterSuppliers()) {
          <label class="lots-filter">
            <span class="u-sr-only">Filtrar por proveedor</span>
            <select
              class="field__control lots-filter__control"
              [value]="supplierId() ?? ''"
              (change)="onSupplierChange($event)"
            >
              <option value="">Todos los proveedores</option>
              @for (supplier of suppliers(); track supplier.id) {
                <option [value]="supplier.id">{{ supplier.name }}</option>
              }
            </select>
          </label>
        }

        <label class="lots-check">
          <input
            type="checkbox"
            [checked]="onlyAvailable()"
            (change)="onOnlyAvailableChange($event)"
          />
          Solo con existencia
        </label>

        <button appButton type="button" variant="secondary" (click)="applyFilters()">Buscar</button>

        @if (hasFilters()) {
          <button appButton type="button" variant="ghost" (click)="clearFilters()">Limpiar</button>
        }

        <app-badge tone="neutral" class="lots-count">{{ countLabel() }}</app-badge>
      </div>

      @if (productId() !== null) {
        <div class="lots-product-filter">
          <app-icon name="package" [size]="15" />
          <span
            >Producto: <strong>{{ productFilterLabel() }}</strong></span
          >
          <button type="button" class="lots-product-filter__remove" (click)="removeProductFilter()">
            <app-icon name="close" [size]="14" />
            <span class="u-sr-only">Quitar filtro de producto</span>
          </button>
        </div>
      }

      @if (canWrite() && !canCreate()) {
        <p class="lots-permission-note">
          <app-icon name="info" [size]="15" />
          Puedes corregir existencias, pero el registro de ingresos requiere el catálogo de
          proveedores, disponible para administración.
        </p>
      }

      <div class="lots-layout" [class.lots-layout--panel]="panel() !== null">
        <div class="lots-list">
          @if (error(); as message) {
            <div class="lots-feedback" role="alert">
              <app-icon name="alertCircle" [size]="18" />
              <p>{{ message }}</p>
              <button appButton type="button" size="sm" variant="secondary" (click)="load(page())">
                Reintentar
              </button>
            </div>
          } @else if (loading()) {
            <div class="lots-skeleton" aria-hidden="true">
              @for (row of skeletonRows; track $index) {
                <app-skeleton height="20px" />
              }
            </div>
          } @else if (items().length === 0) {
            <app-empty-state icon="truck" title="Sin lotes" [description]="emptyMessage()">
              @if (canCreate()) {
                <button appButton type="button" (click)="startCreate()">
                  <app-icon name="plus" [size]="16" />
                  Registrar el primero
                </button>
              }
            </app-empty-state>
          } @else {
            <div class="table-wrap">
              <table class="table lots-table">
                <thead>
                  <tr>
                    <th scope="col">Producto</th>
                    <th scope="col">Lote</th>
                    <th scope="col">Proveedor</th>
                    <th scope="col">Factura</th>
                    <th scope="col">Ingreso</th>
                    <th scope="col">Vencimiento</th>
                    <th scope="col" class="is-numeric">Disponible / recibido</th>
                    @if (canSeeCosts()) {
                      <th scope="col" class="is-numeric">Costo unit.</th>
                      <th scope="col" class="is-numeric">Total</th>
                    }
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (lot of items(); track lot.id) {
                    <tr>
                      <td>
                        <span class="lots-product">{{ lot.product.name }}</span>
                        <span class="lots-product__meta">
                          {{ lot.product.code }} · {{ lot.presentation.name }}
                        </span>
                      </td>
                      <td>
                        <span class="lots-lot">{{ lot.lotNumber }}</span>
                        @if (lot.notes) {
                          <span class="lots-lot__notes" [title]="lot.notes">{{ lot.notes }}</span>
                        }
                      </td>
                      <td>{{ lot.supplier.tradeName }}</td>
                      <td>
                        <span class="lots-invoice">{{ lot.invoiceNumber }}</span>
                        <span class="lots-invoice__date">{{ formatDate(lot.invoiceDate) }}</span>
                      </td>
                      <td class="is-muted">{{ formatDate(lot.entryDate) }}</td>
                      <td>
                        <div class="lots-expiration">
                          <app-badge [tone]="expirationTone(lot)">
                            {{ expirationLabel(lot) }}
                          </app-badge>
                          <span class="lots-expiration__date">
                            {{ formatDate(lot.expirationDate) }}
                          </span>
                          <span class="lots-expiration__days">{{ daysLabel(lot) }}</span>
                        </div>
                      </td>
                      <td class="is-numeric is-strong">{{ lotQuantityLabel(lot) }}</td>
                      @if (canSeeCosts()) {
                        <td class="is-numeric">{{ unitCostLabel(lot) }}</td>
                        <td class="is-numeric is-strong">{{ costLabel(lot) }}</td>
                      }
                      <td>
                        @if (canWrite()) {
                          <button
                            appButton
                            type="button"
                            size="sm"
                            variant="ghost"
                            (click)="startQuantityEdit(lot)"
                          >
                            <app-icon name="edit" [size]="15" />
                            Corregir
                          </button>
                        } @else {
                          <span class="lots-readonly">Solo lectura</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <app-pagination
              [page]="page()"
              [totalPages]="totalPages()"
              [totalElements]="totalElements()"
              [size]="pageSize"
              [disabled]="loading()"
              (pageChange)="load($event)"
            />
          }
        </div>

        @if (panel() !== null) {
          <aside class="lots-side" aria-label="Panel de lotes">
            @if (panel() === 'create') {
              <app-lot-form
                [suppliers]="suppliers()"
                [saving]="savingLot()"
                [error]="lotFormError()"
                (submitted)="createLot($event)"
                (cancelled)="closePanel()"
              />
            } @else if (editingLot(); as lot) {
              <div class="quantity-panel">
                <header class="quantity-panel__header">
                  <div>
                    <p class="quantity-panel__eyebrow">Corrección</p>
                    <h2 class="quantity-panel__title">Cantidad disponible</h2>
                    <p class="quantity-panel__subtitle">
                      Lote {{ lot.lotNumber }} · {{ lot.product.name }}
                    </p>
                  </div>
                  <button
                    type="button"
                    class="quantity-panel__close"
                    aria-label="Cerrar formulario"
                    (click)="closePanel()"
                  >
                    <app-icon name="close" [size]="18" />
                  </button>
                </header>

                <dl class="quantity-panel__meta">
                  <div>
                    <dt>Recibido</dt>
                    <dd>{{ formatQuantity(lot.receivedQuantity) }}</dd>
                  </div>
                  <div>
                    <dt>Disponible actual</dt>
                    <dd>{{ formatQuantity(lot.availableQuantity) }}</dd>
                  </div>
                  <div>
                    <dt>Presentación</dt>
                    <dd>{{ lot.presentation.name }}</dd>
                  </div>
                </dl>

                @if (quantityError(); as message) {
                  <p class="quantity-panel__error" role="alert">
                    <app-icon name="alertCircle" [size]="16" />
                    {{ message }}
                  </p>
                }

                <form
                  class="quantity-panel__form"
                  [formGroup]="quantityForm"
                  (ngSubmit)="saveQuantity()"
                >
                  <div class="field">
                    <label class="field__label" for="lot-available">
                      Nueva cantidad disponible
                      <span class="field__required" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="lot-available"
                      class="field__control"
                      type="number"
                      formControlName="availableQuantity"
                      min="0"
                      [max]="lot.receivedQuantity"
                      step="0.01"
                      [class.is-invalid]="quantityFieldError() !== null"
                      (input)="quantityError.set(null)"
                    />
                    @if (quantityFieldError(); as message) {
                      <p class="field__error" role="alert">{{ message }}</p>
                    } @else {
                      <p class="field__hint">
                        No puede ser negativa ni superar la cantidad recibida ({{
                          lot.receivedQuantity
                        }}).
                      </p>
                    }
                  </div>

                  <button appButton type="submit" [loading]="savingQuantity()" [block]="true">
                    <app-icon name="checkCircle" [size]="16" />
                    Guardar cantidad
                  </button>
                </form>
              </div>
            }
          </aside>
        }
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .lots-header-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .lots-panel {
      overflow: hidden;
    }

    .lots-filters {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
      padding: 16px 22px;
      border-bottom: 1px solid var(--border);
    }

    .lots-search {
      position: relative;
      flex: 1 1 260px;
      max-width: 360px;
      color: var(--text-subtle);
    }

    .lots-search app-icon {
      position: absolute;
      top: 50%;
      left: 12px;
      transform: translateY(-50%);
      pointer-events: none;
    }

    .lots-search__input {
      padding-left: 38px;
    }

    .lots-filter {
      flex: 0 1 220px;
    }

    .lots-filter__control {
      min-height: 44px;
    }

    .lots-check {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--text-muted);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
    }

    .lots-check input {
      width: 17px;
      height: 17px;
      accent-color: var(--brand-500);
    }

    .lots-count {
      margin-left: auto;
    }

    .lots-product-filter {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 22px;
      background: var(--gradient-soft);
      border-bottom: 1px solid var(--border);
      color: var(--brand-700);
      font-size: var(--text-xs);
    }

    .lots-product-filter__remove {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-left: auto;
      padding: 4px 8px;
      background: var(--surface);
      border: 1px solid var(--brand-200);
      border-radius: var(--radius-pill);
      color: var(--brand-700);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
    }

    .lots-permission-note {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 22px;
      background: var(--info-100);
      border-bottom: 1px solid var(--border);
      color: var(--info-700);
      font-size: var(--text-xs);
      line-height: 1.5;
    }

    .lots-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
    }

    .lots-layout--panel {
      grid-template-columns: minmax(0, 1fr) 400px;
    }

    .lots-list {
      min-width: 0;
    }

    .lots-side {
      padding: var(--space-5);
      background: var(--surface-muted);
      border-left: 1px solid var(--border);
    }

    .lots-table {
      min-width: 1180px;
    }

    .lots-product {
      display: block;
      font-weight: var(--weight-semibold);
    }

    .lots-product__meta {
      display: block;
      margin-top: 2px;
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .lots-lot {
      display: block;
      font-weight: var(--weight-semibold);
      font-variant-numeric: tabular-nums;
    }

    .lots-lot__notes {
      display: block;
      max-width: 180px;
      margin-top: 2px;
      overflow: hidden;
      color: var(--text-subtle);
      font-size: var(--text-xs);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .lots-invoice {
      display: block;
      font-variant-numeric: tabular-nums;
    }

    .lots-invoice__date {
      display: block;
      margin-top: 2px;
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .lots-expiration {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 3px;
    }

    .lots-expiration__date {
      font-size: var(--text-xs);
      font-variant-numeric: tabular-nums;
    }

    .lots-expiration__days {
      color: var(--text-subtle);
      font-size: 0.6875rem;
    }

    .lots-readonly {
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .lots-skeleton {
      display: grid;
      gap: 16px;
      padding: 24px 22px;
    }

    .lots-feedback {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding: 18px 22px;
      color: var(--danger-700);
      font-size: var(--text-sm);
    }

    .lots-feedback p {
      flex: 1;
      min-width: 180px;
    }

    .quantity-panel {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .quantity-panel__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--border);
    }

    .quantity-panel__eyebrow {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .quantity-panel__title {
      margin-top: 4px;
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
    }

    .quantity-panel__subtitle {
      margin-top: 2px;
      color: var(--text-muted);
      font-size: var(--text-xs);
    }

    .quantity-panel__close {
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

    .quantity-panel__close:hover {
      background: var(--gradient-soft);
      border-color: var(--brand-200);
      color: var(--brand-700);
    }

    .quantity-panel__meta {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-3);
      margin: 0;
      padding: 12px 14px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
    }

    .quantity-panel__meta dt {
      color: var(--text-subtle);
      font-size: 0.6875rem;
      font-weight: var(--weight-semibold);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .quantity-panel__meta dd {
      margin: 3px 0 0;
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      font-variant-numeric: tabular-nums;
    }

    .quantity-panel__error {
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

    .quantity-panel__form {
      display: grid;
      gap: var(--space-4);
    }

    @media (max-width: 1240px) {
      .lots-layout--panel {
        grid-template-columns: minmax(0, 1fr);
      }

      .lots-side {
        border-top: 1px solid var(--border);
        border-left: 0;
      }
    }

    @media (max-width: 640px) {
      .lots-filters {
        padding: 14px 16px;
      }

      .lots-search,
      .lots-filter {
        flex-basis: 100%;
        max-width: none;
      }

      .lots-count {
        margin-left: 0;
      }
    }
  `,
})
export class LotsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly lots = inject(LotService);
  private readonly products = inject(ProductService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly formBuilder = inject(FormBuilder);

  private initialized = false;

  protected readonly pageSize = PAGE_SIZE;
  protected readonly skeletonRows = SKELETON_ROWS;

  protected readonly items = signal<ProductLot[]>([]);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly invoiceNumber = signal('');
  protected readonly supplierId = signal<number | null>(null);
  protected readonly onlyAvailable = signal(false);
  protected readonly productId = signal<number | null>(null);
  protected readonly productFilter = signal<ProductDetail | null>(null);

  protected readonly suppliers = signal<SupplierOption[]>([]);

  protected readonly panel = signal<LotsPanel | null>(null);
  protected readonly savingLot = signal(false);
  protected readonly lotFormError = signal<string | null>(null);

  protected readonly editingLot = signal<ProductLot | null>(null);
  protected readonly savingQuantity = signal(false);
  protected readonly quantityError = signal<string | null>(null);

  protected readonly quantityForm = this.formBuilder.group({
    availableQuantity: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(0),
    ]),
  });

  protected readonly canWrite = computed(() => this.auth.canAccess(['ADMIN', 'WAREHOUSE']));

  // El alta necesita proveedores, que solo ADMIN/PURCHASING pueden consultar.
  protected readonly canCreate = computed(() => this.auth.canAccess(['ADMIN']));

  protected readonly canFilterSuppliers = computed(() =>
    this.auth.canAccess(['ADMIN', 'PURCHASING']),
  );

  protected readonly canSeeCosts = computed(() => this.auth.canAccess(['ADMIN', 'PURCHASING']));

  protected readonly hasFilters = computed(
    () =>
      this.invoiceNumber().trim().length > 0 ||
      this.supplierId() !== null ||
      this.onlyAvailable() ||
      this.productId() !== null,
  );

  protected readonly countLabel = computed(() => {
    const total = this.totalElements();
    return `${total} ${total === 1 ? 'lote' : 'lotes'}`;
  });

  protected readonly productFilterLabel = computed(() => {
    const product = this.productFilter();
    const id = this.productId();

    if (product !== null) {
      return product.name;
    }

    return id === null ? '' : `Producto #${id}`;
  });

  protected readonly emptyMessage = computed(() =>
    this.hasFilters()
      ? 'No hay lotes que coincidan con los filtros aplicados.'
      : 'Aún no hay ingresos registrados en el inventario.',
  );

  ngOnInit(): void {
    if (this.canFilterSuppliers()) {
      this.loadSuppliers();
    }

    // Reacciona al chip de producto, incluso si ya se está en /lots.
    this.route.queryParamMap.subscribe((params) => {
      const raw = params.get('productId');
      const parsed = raw === null ? null : Number(raw);
      const id = parsed !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : null;
      const firstLoad = !this.initialized;

      this.initialized = true;

      if (!firstLoad && id === this.productId()) {
        return;
      }

      this.productId.set(id);
      this.productFilter.set(null);

      if (id !== null) {
        this.loadProductFilter(id);
      }

      this.load(0);
    });
  }

  protected formatDate(value: string | null): string {
    return formatDate(value);
  }

  protected formatQuantity(value: number): string {
    return formatQuantity(value);
  }

  protected expirationLabel(lot: ProductLot): string {
    return expirationLabel(lot.expirationSeverity);
  }

  protected expirationTone(lot: ProductLot): ExpirationTone {
    return expirationTone(lot.expirationSeverity);
  }

  protected daysLabel(lot: ProductLot): string {
    return daysToExpireLabel(lot);
  }

  protected lotQuantityLabel(lot: ProductLot): string {
    return lotQuantityLabel(lot);
  }

  protected unitCostLabel(lot: ProductLot): string {
    return lotUnitCostLabel(lot);
  }

  protected costLabel(lot: ProductLot): string {
    return lotCostLabel(lot);
  }

  protected onInvoiceInput(event: Event): void {
    this.invoiceNumber.set((event.target as HTMLInputElement).value);
  }

  protected onSupplierChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.supplierId.set(value.length === 0 ? null : Number(value));
  }

  protected onOnlyAvailableChange(event: Event): void {
    this.onlyAvailable.set((event.target as HTMLInputElement).checked);
  }

  protected applyFilters(): void {
    this.load(0);
  }

  protected clearFilters(): void {
    this.invoiceNumber.set('');
    this.supplierId.set(null);
    this.onlyAvailable.set(false);
    this.productId.set(null);
    this.productFilter.set(null);
    this.syncProductQueryParam(null);
    this.load(0);
  }

  protected removeProductFilter(): void {
    this.productId.set(null);
    this.productFilter.set(null);
    this.syncProductQueryParam(null);
    this.load(0);
  }

  protected load(page: number): void {
    this.loading.set(true);
    this.error.set(null);

    const query: LotQuery = {
      productId: this.productId(),
      supplierId: this.supplierId(),
      invoiceNumber: this.invoiceNumber(),
      onlyAvailable: this.onlyAvailable(),
      page,
      size: PAGE_SIZE,
    };

    this.lots.list(query).subscribe({
      next: (response) => {
        this.items.set(response.content);
        this.page.set(response.page);
        this.totalPages.set(response.totalPages);
        this.totalElements.set(response.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el listado de lotes. Intenta nuevamente.');
        this.loading.set(false);
      },
    });
  }

  protected startCreate(): void {
    this.lotFormError.set(null);
    this.panel.set('create');
  }

  protected startQuantityEdit(lot: ProductLot): void {
    this.editingLot.set(lot);
    this.quantityError.set(null);
    this.quantityForm.reset({ availableQuantity: lot.availableQuantity });
    this.quantityForm.markAsPristine();
    this.quantityForm.markAsUntouched();
    this.panel.set('quantity');
  }

  protected closePanel(): void {
    this.panel.set(null);
    this.editingLot.set(null);
    this.lotFormError.set(null);
    this.quantityError.set(null);
  }

  protected createLot(value: LotFormValue): void {
    this.savingLot.set(true);
    this.lotFormError.set(null);

    this.lots.create(value).subscribe({
      next: (lot) => {
        this.savingLot.set(false);
        this.toast.success('Ingreso registrado', `Lote ${lot.lotNumber} · ${lot.product.name}`);
        this.closePanel();
        this.load(0);
      },
      error: (error: unknown) => {
        this.savingLot.set(false);
        this.lotFormError.set(
          readApiError(error, 'No se pudo registrar el ingreso. Revisa los datos.'),
        );
      },
    });
  }

  protected quantityFieldError(): string | null {
    const control = this.quantityForm.controls.availableQuantity;
    const lot = this.editingLot();

    if (!control.touched && !control.dirty) {
      return null;
    }

    if (control.hasError('required')) {
      return 'La cantidad disponible es obligatoria.';
    }

    if (control.hasError('min')) {
      return 'La cantidad disponible no puede ser negativa.';
    }

    if (lot !== null && (control.value ?? 0) > lot.receivedQuantity) {
      return 'La cantidad disponible no puede superar la cantidad recibida.';
    }

    return control.invalid ? 'Revisa este campo.' : null;
  }

  protected saveQuantity(): void {
    const lot = this.editingLot();

    if (lot === null) {
      return;
    }

    this.quantityForm.markAllAsTouched();

    const value = this.quantityForm.controls.availableQuantity.value;

    if (this.quantityForm.invalid || value === null) {
      return;
    }

    if (value > lot.receivedQuantity) {
      return;
    }

    this.savingQuantity.set(true);
    this.quantityError.set(null);

    this.lots.updateAvailableQuantity(lot.id, value).subscribe({
      next: () => {
        this.savingQuantity.set(false);
        this.toast.success('Cantidad corregida', `Lote ${lot.lotNumber}`);
        this.closePanel();
        this.load(this.page());
      },
      error: (error: unknown) => {
        this.savingQuantity.set(false);
        this.quantityError.set(
          readApiError(error, 'No se pudo corregir la cantidad. Revisa el valor.'),
        );
      },
    });
  }

  private loadSuppliers(): void {
    this.lots.getSupplierOptions().subscribe({
      next: (options) => this.suppliers.set(options),
      error: () => this.suppliers.set([]),
    });
  }

  private loadProductFilter(productId: number): void {
    this.products.getById(productId).subscribe({
      next: (product) => this.productFilter.set(product),
      error: () => this.productFilter.set(null),
    });
  }

  // Mantiene el chip de producto coherente con la URL compartible.
  private syncProductQueryParam(productId: number | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { productId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
