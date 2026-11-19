import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@core/ui/toast.service';
import { CustomerOption } from '@features/customers/customer.model';
import { CustomerService } from '@features/customers/customer.service';
import { formatDateTime, formatMoney } from '@features/products/product.model';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { PaginationComponent } from '@shared/ui/pagination/pagination.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import {
  PaymentCondition,
  SALE_STATUS_OPTIONS,
  SaleQuery,
  SaleStatus,
  SaleSummary,
  canEditSale,
  paymentConditionLabel,
  saleStatusLabel,
  saleStatusTone,
} from './sale.model';
import { SaleService } from './sale.service';

const PAGE_SIZE = 10;
const SKELETON_ROWS = Array.from({ length: 5 });

// Listado de ventas con filtros por fecha, cliente y estado (contrato 11).
@Component({
  selector: 'app-sales',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    IconComponent,
    PageHeaderComponent,
    PaginationComponent,
    RouterLink,
    SkeletonComponent,
  ],
  template: `
    <app-page-header
      title="Ventas"
      subtitle="Registra ventas de contado o crédito, confírmalas con asignación FEFO y consulta su historial."
    >
      <div actions class="sales-header-actions">
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
          <a appButton [routerLink]="['/sales/new']">
            <app-icon name="plus" [size]="16" />
            Nueva venta
          </a>
        }
      </div>
    </app-page-header>

    <section class="panel sales-panel">
      <div class="sales-filters">
        <label class="sales-filter">
          <span class="u-sr-only">Desde</span>
          <span class="sales-filter__label">Desde</span>
          <input
            class="field__control sales-filter__control"
            type="date"
            [value]="from()"
            (change)="onFromChange($event)"
          />
        </label>

        <label class="sales-filter">
          <span class="u-sr-only">Hasta</span>
          <span class="sales-filter__label">Hasta</span>
          <input
            class="field__control sales-filter__control"
            type="date"
            [value]="to()"
            (change)="onToChange($event)"
          />
        </label>

        @if (canFilterCustomers()) {
          <label class="sales-filter sales-filter--wide">
            <span class="u-sr-only">Filtrar por cliente</span>
            <span class="sales-filter__label">Cliente</span>
            <select
              class="field__control sales-filter__control"
              [value]="customerId() ?? ''"
              (change)="onCustomerChange($event)"
            >
              <option value="">Todos los clientes</option>
              @for (customer of customers(); track customer.id) {
                <option [value]="customer.id">{{ customer.name }}</option>
              }
            </select>
          </label>
        }

        <label class="sales-filter">
          <span class="u-sr-only">Filtrar por estado</span>
          <span class="sales-filter__label">Estado</span>
          <select
            class="field__control sales-filter__control"
            [value]="status() ?? ''"
            (change)="onStatusChange($event)"
          >
            <option value="">Todos los estados</option>
            @for (option of statusOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <button appButton type="button" variant="secondary" (click)="applyFilters()">Buscar</button>

        @if (hasFilters()) {
          <button appButton type="button" variant="ghost" (click)="clearFilters()">Limpiar</button>
        }

        <app-badge tone="neutral" class="sales-count">{{ countLabel() }}</app-badge>
      </div>

      <div class="sales-list">
        @if (error(); as message) {
          <div class="sales-feedback" role="alert">
            <app-icon name="alertCircle" [size]="18" />
            <p>{{ message }}</p>
            <button appButton type="button" size="sm" variant="secondary" (click)="load(page())">
              Reintentar
            </button>
          </div>
        } @else if (loading()) {
          <div class="sales-skeleton" aria-hidden="true">
            @for (row of skeletonRows; track $index) {
              <app-skeleton height="20px" />
            }
          </div>
        } @else if (items().length === 0) {
          <app-empty-state icon="receipt" title="Sin ventas" [description]="emptyMessage()">
            @if (canCreate() && !hasFilters()) {
              <a appButton [routerLink]="['/sales/new']">
                <app-icon name="plus" [size]="16" />
                Registrar la primera
              </a>
            }
          </app-empty-state>
        } @else {
          <div class="table-wrap">
            <table class="table sales-table">
              <thead>
                <tr>
                  <th scope="col">Venta</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Vendedor</th>
                  <th scope="col">Pago</th>
                  <th scope="col" class="is-numeric">Total</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (item of items(); track item.id) {
                  <tr>
                    <td>
                      <a class="sales-number" [routerLink]="['/sales', item.id]">
                        {{ item.saleNumber }}
                      </a>
                      <span class="sales-meta">{{ formatDateTime(item.saleDate) }}</span>
                    </td>
                    <td>
                      <span class="sales-customer">{{ item.customerName }}</span>
                      @if (item.customerId === null) {
                        <span class="sales-meta">Sin cliente registrado</span>
                      }
                    </td>
                    <td>{{ item.sellerName }}</td>
                    <td>
                      <span class="sales-condition">
                        {{ paymentConditionLabel(item.paymentCondition) }}
                      </span>
                    </td>
                    <td class="is-numeric">
                      <span class="sales-total">{{ formatMoney(item.total) }}</span>
                      @if (item.paidTotal > 0) {
                        <span class="sales-meta">Pagado {{ formatMoney(item.paidTotal) }}</span>
                      }
                    </td>
                    <td>
                      <app-badge [tone]="saleStatusTone(item.status)">
                        {{ saleStatusLabel(item.status) }}
                      </app-badge>
                    </td>
                    <td>
                      <div class="sales-actions">
                        <a appButton size="sm" variant="ghost" [routerLink]="['/sales', item.id]">
                          <app-icon name="eye" [size]="15" />
                          Ver
                        </a>

                        @if (canManage(item)) {
                          <a
                            appButton
                            size="sm"
                            variant="ghost"
                            [routerLink]="['/sales', item.id, 'edit']"
                          >
                            <app-icon name="edit" [size]="15" />
                            Editar
                          </a>
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
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .sales-header-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .sales-panel {
      overflow: hidden;
    }

    .sales-filters {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--space-3);
      padding: 16px 22px;
      border-bottom: 1px solid var(--border);
    }

    .sales-filter {
      display: grid;
      flex: 0 1 160px;
      gap: 4px;
    }

    .sales-filter--wide {
      flex: 0 1 240px;
    }

    .sales-filter__label {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .sales-filter__control {
      min-height: 44px;
    }

    .sales-count {
      margin-left: auto;
    }

    .sales-table {
      min-width: 980px;
    }

    .sales-number {
      display: block;
      color: var(--brand-700);
      font-weight: var(--weight-semibold);
      text-decoration: none;
      font-variant-numeric: tabular-nums;
    }

    .sales-number:hover {
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .sales-meta {
      display: block;
      margin-top: 2px;
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .sales-customer {
      display: block;
      font-weight: var(--weight-medium);
    }

    .sales-condition {
      font-weight: var(--weight-medium);
    }

    .sales-total {
      font-weight: var(--weight-semibold);
      font-variant-numeric: tabular-nums;
    }

    .sales-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
    }

    .sales-skeleton {
      display: grid;
      gap: 16px;
      padding: 24px 22px;
    }

    .sales-feedback {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding: 18px 22px;
      color: var(--danger-700);
      font-size: var(--text-sm);
    }

    .sales-feedback p {
      flex: 1;
      min-width: 180px;
    }

    @media (max-width: 640px) {
      .sales-filters {
        padding: 14px 16px;
      }

      .sales-filter,
      .sales-filter--wide {
        flex-basis: 100%;
      }

      .sales-count {
        margin-left: 0;
      }
    }
  `,
})
export class SalesComponent implements OnInit {
  private readonly sales = inject(SaleService);
  private readonly customersService = inject(CustomerService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly skeletonRows = SKELETON_ROWS;
  protected readonly statusOptions = SALE_STATUS_OPTIONS;

  protected readonly items = signal<SaleSummary[]>([]);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly customerId = signal<number | null>(null);
  protected readonly status = signal<SaleStatus | null>(null);

  protected readonly customers = signal<CustomerOption[]>([]);

  protected readonly canCreate = computed(() => this.auth.canAccess(['ADMIN', 'SELLER']));

  // El catálogo de opciones de clientes solo está disponible para ADMIN y SELLER.
  protected readonly canFilterCustomers = computed(() => this.auth.canAccess(['ADMIN', 'SELLER']));

  protected readonly hasFilters = computed(
    () =>
      this.from().length > 0 ||
      this.to().length > 0 ||
      this.customerId() !== null ||
      this.status() !== null,
  );

  protected readonly countLabel = computed(() => {
    const total = this.totalElements();
    return `${total} ${total === 1 ? 'venta' : 'ventas'}`;
  });

  protected readonly emptyMessage = computed(() =>
    this.hasFilters()
      ? 'No hay ventas que coincidan con los filtros aplicados.'
      : 'Aún no hay ventas registradas en el sistema.',
  );

  ngOnInit(): void {
    const requestedStatus = this.route.snapshot.queryParamMap.get('status');
    const match = SALE_STATUS_OPTIONS.find((option) => option.value === requestedStatus);

    if (match) {
      this.status.set(match.value);
    }

    if (this.canFilterCustomers()) {
      this.loadCustomers();
    }

    this.load(0);
  }

  protected formatMoney(value: number): string {
    return formatMoney(value);
  }

  protected formatDateTime(value: string | null): string {
    return formatDateTime(value);
  }

  protected paymentConditionLabel(condition: PaymentCondition): string {
    return paymentConditionLabel(condition);
  }

  protected saleStatusLabel(status: SaleStatus): string {
    return saleStatusLabel(status);
  }

  protected saleStatusTone(status: SaleStatus) {
    return saleStatusTone(status);
  }

  protected canManage(sale: SaleSummary): boolean {
    return canEditSale(
      { status: sale.status, seller: { id: sale.sellerId, fullName: sale.sellerName } },
      this.auth.user()?.id ?? null,
      this.auth.canAccess(['ADMIN']),
    );
  }

  protected onFromChange(event: Event): void {
    this.from.set((event.target as HTMLInputElement).value);
  }

  protected onToChange(event: Event): void {
    this.to.set((event.target as HTMLInputElement).value);
  }

  protected onCustomerChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.customerId.set(value.length === 0 ? null : Number(value));
  }

  protected onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.status.set(value.length === 0 ? null : (value as SaleStatus));
  }

  protected applyFilters(): void {
    if (this.from().length > 0 && this.to().length > 0 && this.from() > this.to()) {
      this.toast.warning(
        'Rango de fechas inválido',
        'La fecha inicial no puede ser posterior a la final.',
      );
      return;
    }

    this.syncStatusParam();
    this.load(0);
  }

  protected clearFilters(): void {
    this.from.set('');
    this.to.set('');
    this.customerId.set(null);
    this.status.set(null);
    this.syncStatusParam();
    this.load(0);
  }

  protected load(page: number): void {
    this.loading.set(true);
    this.error.set(null);

    const query: SaleQuery = {
      from: this.from(),
      to: this.to(),
      customerId: this.customerId(),
      status: this.status(),
      page,
      size: PAGE_SIZE,
    };

    this.sales.list(query).subscribe({
      next: (response) => {
        this.items.set(response.content);
        this.page.set(response.page);
        this.totalPages.set(response.totalPages);
        this.totalElements.set(response.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el listado de ventas. Intenta nuevamente.');
        this.loading.set(false);
      },
    });
  }

  private loadCustomers(): void {
    this.customersService.findOptions().subscribe({
      next: (options) => this.customers.set(options),
      error: () => this.customers.set([]),
    });
  }

  // Mantiene el filtro de estado en la URL para enlaces como /sales?status=CONFIRMED.
  private syncStatusParam(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: this.status() },
      replaceUrl: true,
    });
  }
}
