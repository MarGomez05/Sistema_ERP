import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { readApiError } from '@core/http/api-error';
import { ToastService } from '@core/ui/toast.service';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { PaginationComponent } from '@shared/ui/pagination/pagination.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { ProductFormComponent } from './product-form/product-form.component';
import {
  ProductDetail,
  ProductFormValue,
  ProductListItem,
  ProductModelOption,
  ProductQuery,
  ProductSelectOption,
  formatQuantity,
  hiddenStockCount,
  visibleStock,
} from './product.model';
import { ProductService } from './product.service';

const PAGE_SIZE = 10;
const SKELETON_ROWS = Array.from({ length: 5 });

type StatusFilter = 'all' | 'active' | 'inactive';

// Listado de productos con filtros, alta, edición y baja lógica (contrato 5.1).
@Component({
  selector: 'app-products',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    IconComponent,
    PageHeaderComponent,
    PaginationComponent,
    ProductFormComponent,
    RouterLink,
    SkeletonComponent,
  ],
  template: `
    <app-page-header
      title="Productos"
      subtitle="Administra el catálogo de productos, sus categorías, tipos y vencimiento."
    >
      <div actions class="products-header-actions">
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
        @if (canWrite()) {
          <button appButton type="button" (click)="startCreate()">
            <app-icon name="plus" [size]="16" />
            Nuevo producto
          </button>
        }
      </div>
    </app-page-header>

    <section class="panel products-panel">
      <div class="products-filters">
        <div class="products-search">
          <app-icon name="search" [size]="17" />
          <input
            class="field__control products-search__input"
            type="search"
            [value]="search()"
            placeholder="Buscar producto por nombre o código"
            aria-label="Buscar producto por nombre o código"
            (input)="onSearchInput($event)"
            (keydown.enter)="applyFilters()"
          />
        </div>

        <label class="products-filter">
          <span class="u-sr-only">Filtrar por categoría</span>
          <select
            class="field__control products-filter__control"
            [value]="categoryId() ?? ''"
            (change)="onCategoryChange($event)"
          >
            <option value="">Todas las categorías</option>
            @for (option of categories(); track option.id) {
              <option [value]="option.id">{{ option.name }}</option>
            }
          </select>
        </label>

        <label class="products-filter">
          <span class="u-sr-only">Filtrar por tipo de producto</span>
          <select
            class="field__control products-filter__control"
            [value]="productTypeId() ?? ''"
            (change)="onTypeChange($event)"
          >
            <option value="">Todos los tipos</option>
            @for (option of productTypes(); track option.id) {
              <option [value]="option.id">{{ option.name }}</option>
            }
          </select>
        </label>

        <label class="products-filter">
          <span class="u-sr-only">Filtrar por estado</span>
          <select
            class="field__control products-filter__control"
            [value]="statusFilter()"
            (change)="onStatusChange($event)"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Solo activos</option>
            <option value="inactive">Solo inactivos</option>
          </select>
        </label>

        <button appButton type="button" variant="secondary" (click)="applyFilters()">Buscar</button>

        @if (hasFilters()) {
          <button appButton type="button" variant="ghost" (click)="clearFilters()">Limpiar</button>
        }

        <app-badge tone="neutral" class="products-count">{{ countLabel() }}</app-badge>
      </div>

      <div class="products-layout" [class.products-layout--panel]="panelOpen()">
        <div class="products-list">
          @if (error(); as message) {
            <div class="products-feedback" role="alert">
              <app-icon name="alertCircle" [size]="18" />
              <p>{{ message }}</p>
              <button appButton type="button" size="sm" variant="secondary" (click)="load(page())">
                Reintentar
              </button>
            </div>
          } @else if (loading()) {
            <div class="products-skeleton" aria-hidden="true">
              @for (row of skeletonRows; track $index) {
                <app-skeleton height="20px" />
              }
            </div>
          } @else if (items().length === 0) {
            <app-empty-state icon="package" title="Sin productos" [description]="emptyMessage()">
              @if (canWrite()) {
                <button appButton type="button" (click)="startCreate()">
                  <app-icon name="plus" [size]="16" />
                  Registrar el primero
                </button>
              }
            </app-empty-state>
          } @else {
            <div class="table-wrap">
              <table class="table products-table">
                <thead>
                  <tr>
                    <th scope="col">Código</th>
                    <th scope="col">Producto</th>
                    <th scope="col">Categoría</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Vencimiento</th>
                    <th scope="col">Existencias</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of items(); track item.id) {
                    <tr [class.products-row--inactive]="!item.isActive">
                      <td class="is-muted">{{ item.code }}</td>
                      <td>
                        <a class="products-name" [routerLink]="['/products', item.id]">
                          {{ item.name }}
                        </a>
                      </td>
                      <td>{{ item.categoryName }}</td>
                      <td class="is-muted">{{ item.productTypeName }}</td>
                      <td>
                        <app-badge [tone]="item.requiresExpiration ? 'warning' : 'neutral'">
                          {{ item.requiresExpiration ? 'Sí' : 'No' }}
                        </app-badge>
                      </td>
                      <td>
                        @if (item.stockByPresentation.length === 0) {
                          <span class="products-empty-stock">Sin presentaciones</span>
                        } @else {
                          <div class="products-stock">
                            @for (stock of visibleStock(item); track stock.productPresentationId) {
                              <span
                                class="products-stock__chip"
                                [class.products-stock__chip--danger]="stock.stockStatus === 'OUT'"
                                [class.products-stock__chip--warning]="stock.stockStatus === 'LOW'"
                              >
                                <span class="products-stock__dot" aria-hidden="true"></span>
                                {{ stock.presentationName }}:
                                {{ formatQuantity(stock.stock) }}
                              </span>
                            }
                            @if (hiddenStockCount(item) > 0) {
                              <span class="products-stock__more">
                                +{{ hiddenStockCount(item) }} más
                              </span>
                            }
                          </div>
                        }
                      </td>
                      <td>
                        <app-badge [tone]="item.isActive ? 'success' : 'neutral'" [dot]="true">
                          {{ item.isActive ? 'Activo' : 'Inactivo' }}
                        </app-badge>
                      </td>
                      <td>
                        <div class="products-actions">
                          <a
                            appButton
                            size="sm"
                            variant="ghost"
                            [routerLink]="['/products', item.id]"
                          >
                            <app-icon name="eye" [size]="15" />
                            Ver
                          </a>

                          @if (canWrite()) {
                            @if (confirmingId() === item.id) {
                              <span class="products-confirm">¿Desactivar?</span>
                              <button
                                appButton
                                type="button"
                                size="sm"
                                variant="danger"
                                [loading]="statusLoadingId() === item.id"
                                (click)="changeStatus(item)"
                              >
                                Sí
                              </button>
                              <button
                                appButton
                                type="button"
                                size="sm"
                                variant="ghost"
                                (click)="confirmingId.set(null)"
                              >
                                No
                              </button>
                            } @else {
                              <button
                                appButton
                                type="button"
                                size="sm"
                                variant="ghost"
                                [loading]="preparingId() === item.id"
                                (click)="startEdit(item)"
                              >
                                <app-icon name="edit" [size]="15" />
                                Editar
                              </button>
                              <button
                                appButton
                                type="button"
                                size="sm"
                                variant="ghost"
                                [loading]="statusLoadingId() === item.id"
                                (click)="requestStatusChange(item)"
                              >
                                <app-icon name="power" [size]="15" />
                                {{ item.isActive ? 'Desactivar' : 'Activar' }}
                              </button>
                            }
                          }
                        </div>
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

        @if (panelOpen()) {
          <aside class="products-side" aria-label="Formulario de producto">
            <app-product-form
              [record]="editing()"
              [categories]="categories()"
              [productTypes]="productTypes()"
              [models]="models()"
              [saving]="saving()"
              [error]="formError()"
              (submitted)="saveProduct($event)"
              (cancelled)="closePanel()"
            />
          </aside>
        }
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .products-header-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .products-panel {
      overflow: hidden;
    }

    .products-filters {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
      padding: 16px 22px;
      border-bottom: 1px solid var(--border);
    }

    .products-search {
      position: relative;
      flex: 1 1 260px;
      max-width: 360px;
      color: var(--text-subtle);
    }

    .products-search app-icon {
      position: absolute;
      top: 50%;
      left: 12px;
      transform: translateY(-50%);
      pointer-events: none;
    }

    .products-search__input {
      padding-left: 38px;
    }

    .products-filter {
      flex: 0 1 190px;
    }

    .products-filter__control {
      min-height: 44px;
    }

    .products-count {
      margin-left: auto;
    }

    .products-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
    }

    .products-layout--panel {
      grid-template-columns: minmax(0, 1fr) 390px;
    }

    .products-list {
      min-width: 0;
    }

    .products-side {
      padding: var(--space-5);
      background: var(--surface-muted);
      border-left: 1px solid var(--border);
    }

    .products-table {
      min-width: 1120px;
    }

    .products-name {
      font-weight: var(--weight-semibold);
      color: var(--text);
    }

    .products-name:hover {
      color: var(--brand-600);
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .products-row--inactive {
      background: var(--surface-muted);
    }

    .products-row--inactive td {
      color: var(--text-muted);
    }

    .products-stock {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      max-width: 250px;
    }

    .products-stock__chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: var(--radius-pill);
      background: var(--success-100);
      color: var(--success-700);
      font-size: var(--text-xs);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .products-stock__chip--warning {
      background: var(--warning-100);
      color: var(--warning-700);
    }

    .products-stock__chip--danger {
      background: var(--danger-100);
      color: var(--danger-700);
    }

    .products-stock__dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
    }

    .products-stock__more {
      align-self: center;
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .products-empty-stock {
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .products-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
    }

    .products-confirm {
      color: var(--danger-700);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
    }

    .products-skeleton {
      display: grid;
      gap: 16px;
      padding: 24px 22px;
    }

    .products-feedback {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding: 18px 22px;
      color: var(--danger-700);
      font-size: var(--text-sm);
    }

    .products-feedback p {
      flex: 1;
      min-width: 180px;
    }

    @media (max-width: 1240px) {
      .products-layout--panel {
        grid-template-columns: minmax(0, 1fr);
      }

      .products-side {
        border-top: 1px solid var(--border);
        border-left: 0;
      }
    }

    @media (max-width: 640px) {
      .products-filters {
        padding: 14px 16px;
      }

      .products-search,
      .products-filter {
        flex-basis: 100%;
        max-width: none;
      }

      .products-count {
        margin-left: 0;
      }
    }
  `,
})
export class ProductsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly products = inject(ProductService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly skeletonRows = SKELETON_ROWS;

  protected readonly items = signal<ProductListItem[]>([]);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly categoryId = signal<number | null>(null);
  protected readonly productTypeId = signal<number | null>(null);

  protected readonly categories = signal<ProductSelectOption[]>([]);
  protected readonly productTypes = signal<ProductSelectOption[]>([]);
  protected readonly models = signal<ProductModelOption[]>([]);

  protected readonly panelOpen = signal(false);
  protected readonly editing = signal<ProductDetail | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly preparingId = signal<number | null>(null);

  protected readonly confirmingId = signal<number | null>(null);
  protected readonly statusLoadingId = signal<number | null>(null);

  protected readonly canWrite = computed(() => this.auth.canAccess(['ADMIN', 'WAREHOUSE']));

  private readonly isActiveFilter = computed<boolean | null>(() => {
    const filter = this.statusFilter();
    return filter === 'all' ? null : filter === 'active';
  });

  protected readonly hasFilters = computed(
    () =>
      this.search().trim().length > 0 ||
      this.statusFilter() !== 'all' ||
      this.categoryId() !== null ||
      this.productTypeId() !== null,
  );

  protected readonly countLabel = computed(() => {
    const total = this.totalElements();
    return `${total} ${total === 1 ? 'producto' : 'productos'}`;
  });

  protected readonly emptyMessage = computed(() =>
    this.hasFilters()
      ? 'No hay coincidencias con los filtros aplicados.'
      : 'Aún no hay productos registrados en el inventario.',
  );

  ngOnInit(): void {
    this.loadOptions();
    this.load(0);
  }

  protected visibleStock(item: ProductListItem) {
    return visibleStock(item);
  }

  protected hiddenStockCount(item: ProductListItem): number {
    return hiddenStockCount(item);
  }

  protected formatQuantity(value: number): string {
    return formatQuantity(value);
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as StatusFilter);
  }

  protected onCategoryChange(event: Event): void {
    this.categoryId.set(this.numberOrNull((event.target as HTMLSelectElement).value));
  }

  protected onTypeChange(event: Event): void {
    this.productTypeId.set(this.numberOrNull((event.target as HTMLSelectElement).value));
  }

  protected applyFilters(): void {
    this.load(0);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.statusFilter.set('all');
    this.categoryId.set(null);
    this.productTypeId.set(null);
    this.load(0);
  }

  protected load(page: number): void {
    this.loading.set(true);
    this.error.set(null);

    const query: ProductQuery = {
      search: this.search(),
      categoryId: this.categoryId(),
      productTypeId: this.productTypeId(),
      isActive: this.isActiveFilter(),
      page,
      size: PAGE_SIZE,
    };

    this.products.list(query).subscribe({
      next: (response) => {
        this.items.set(response.content);
        this.page.set(response.page);
        this.totalPages.set(response.totalPages);
        this.totalElements.set(response.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el listado de productos. Intenta nuevamente.');
        this.loading.set(false);
      },
    });
  }

  protected startCreate(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.panelOpen.set(true);
  }

  protected startEdit(item: ProductListItem): void {
    this.preparingId.set(item.id);

    this.products.getById(item.id).subscribe({
      next: (product) => {
        this.preparingId.set(null);
        this.editing.set(product);
        this.formError.set(null);
        this.panelOpen.set(true);
      },
      error: (error: unknown) => {
        this.preparingId.set(null);
        this.toast.error(
          'No se pudo abrir el producto',
          readApiError(error, 'Intenta nuevamente en unos segundos.'),
        );
      },
    });
  }

  protected closePanel(): void {
    this.panelOpen.set(false);
    this.editing.set(null);
    this.formError.set(null);
  }

  protected saveProduct(value: ProductFormValue): void {
    const editing = this.editing();

    this.saving.set(true);
    this.formError.set(null);

    const request =
      editing === null ? this.products.create(value) : this.products.update(editing.id, value);

    request.subscribe({
      next: (product) => {
        this.saving.set(false);
        this.toast.success(
          editing === null ? 'Producto creado' : 'Producto actualizado',
          `${product.code} · ${product.name}`,
        );

        if (editing === null) {
          void this.router.navigate(['/products', product.id]);
          return;
        }

        this.closePanel();
        this.load(this.page());
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(
          readApiError(
            error,
            'No se pudo guardar el producto. Revisa los datos e inténtalo de nuevo.',
          ),
        );
      },
    });
  }

  protected requestStatusChange(item: ProductListItem): void {
    if (item.isActive) {
      this.confirmingId.set(item.id);
      return;
    }

    this.changeStatus(item);
  }

  protected changeStatus(item: ProductListItem): void {
    const next = !item.isActive;

    this.statusLoadingId.set(item.id);

    this.products.changeStatus(item.id, next).subscribe({
      next: () => {
        this.statusLoadingId.set(null);
        this.confirmingId.set(null);
        this.toast.success(
          next ? 'Producto activado' : 'Producto desactivado',
          `${item.code} · ${item.name}`,
        );
        this.load(this.page());
      },
      error: (error: unknown) => {
        this.statusLoadingId.set(null);
        this.confirmingId.set(null);
        this.toast.error(
          'No se pudo cambiar el estado',
          readApiError(error, 'Revisa las dependencias del producto.'),
        );
      },
    });
  }

  private loadOptions(): void {
    this.products.getCategoryOptions().subscribe({
      next: (options) => this.categories.set(options),
      error: () => this.categories.set([]),
    });

    this.products.getTypeOptions().subscribe({
      next: (options) => this.productTypes.set(options),
      error: () => this.productTypes.set([]),
    });

    this.products.getModelOptions().subscribe({
      next: (options) => this.models.set(options),
      error: () => this.models.set([]),
    });
  }

  private numberOrNull(value: string): number | null {
    return value.length === 0 ? null : Number(value);
  }
}
