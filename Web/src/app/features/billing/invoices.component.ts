import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@core/ui/toast.service';
import { CustomerOption } from '@features/customers/customer.model';
import { CustomerService } from '@features/customers/customer.service';
import { formatMoney } from '@features/products/product.model';
import { paymentConditionLabel } from '@features/sales/sale.model';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { PaginationComponent } from '@shared/ui/pagination/pagination.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { formatDate, todayIso } from '@shared/util/date.util';
import {
  INVOICE_STATUS_OPTIONS,
  INVOICE_TYPE_OPTIONS,
  InvoiceQuery,
  InvoiceStatus,
  InvoiceSummary,
  InvoiceType,
  invoiceStatusLabel,
  invoiceStatusTone,
  invoiceTypeLabel,
  isCreditNote,
  isInvoiceOverdue,
} from './invoice.model';
import { InvoiceService } from './invoice.service';

const PAGE_SIZE = 10;
const SKELETON_ROWS = Array.from({ length: 5 });

// Listado de facturas y notas de crédito con filtros y acceso al detalle (contrato 12).
@Component({
  selector: 'app-invoices',
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
      title="Facturación"
      subtitle="Consulta facturas y notas de crédito, controla saldos y registra pagos desde el detalle."
    >
      <div actions class="invoices-header-actions">
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
          <a appButton [routerLink]="['/sales']" [queryParams]="{ status: 'CONFIRMED' }">
            <app-icon name="cart" [size]="16" />
            Facturar venta
          </a>
        }
      </div>
    </app-page-header>

    <section class="panel invoices-panel">
      <div class="invoices-filters">
        <label class="invoices-filter">
          <span class="u-sr-only">Desde</span>
          <span class="invoices-filter__label">Desde</span>
          <input
            class="field__control invoices-filter__control"
            type="date"
            [value]="from()"
            (change)="onFromChange($event)"
          />
        </label>

        <label class="invoices-filter">
          <span class="u-sr-only">Hasta</span>
          <span class="invoices-filter__label">Hasta</span>
          <input
            class="field__control invoices-filter__control"
            type="date"
            [value]="to()"
            (change)="onToChange($event)"
          />
        </label>

        @if (canFilterCustomers()) {
          <label class="invoices-filter invoices-filter--wide">
            <span class="u-sr-only">Filtrar por cliente</span>
            <span class="invoices-filter__label">Cliente</span>
            <select
              class="field__control invoices-filter__control"
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

        <label class="invoices-filter invoices-filter--wide">
          <span class="u-sr-only">Filtrar por tipo</span>
          <span class="invoices-filter__label">Tipo</span>
          <select
            class="field__control invoices-filter__control"
            [value]="invoiceType() ?? ''"
            (change)="onTypeChange($event)"
          >
            <option value="">Todos los tipos</option>
            @for (option of typeOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="invoices-filter">
          <span class="u-sr-only">Filtrar por estado</span>
          <span class="invoices-filter__label">Estado</span>
          <select
            class="field__control invoices-filter__control"
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

        <app-badge tone="neutral" class="invoices-count">{{ countLabel() }}</app-badge>
      </div>

      <div class="invoices-list">
        @if (error(); as message) {
          <div class="invoices-feedback" role="alert">
            <app-icon name="alertCircle" [size]="18" />
            <p>{{ message }}</p>
            <button appButton type="button" size="sm" variant="secondary" (click)="load(page())">
              Reintentar
            </button>
          </div>
        } @else if (loading()) {
          <div class="invoices-skeleton" aria-hidden="true">
            @for (row of skeletonRows; track $index) {
              <app-skeleton height="20px" />
            }
          </div>
        } @else if (items().length === 0) {
          <app-empty-state icon="receipt" title="Sin facturas" [description]="emptyMessage()">
            @if (canWrite() && !hasFilters()) {
              <a appButton [routerLink]="['/sales']" [queryParams]="{ status: 'CONFIRMED' }">
                <app-icon name="cart" [size]="16" />
                Ir a ventas confirmadas
              </a>
            }
          </app-empty-state>
        } @else {
          <div class="table-wrap">
            <table class="table invoices-table">
              <thead>
                <tr>
                  <th scope="col">Documento</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Condición</th>
                  <th scope="col">Vencimiento</th>
                  <th scope="col" class="is-numeric">Total</th>
                  <th scope="col" class="is-numeric">Saldo</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (item of items(); track item.id) {
                  <tr>
                    <td>
                      <a class="invoices-number" [routerLink]="['/invoices', item.id]">
                        {{ item.invoiceNumber }}
                      </a>
                      <span class="invoices-meta">{{ formatDate(item.issueDate) }}</span>
                    </td>
                    <td>
                      <span class="invoices-customer">{{ item.customerName }}</span>
                      @if (item.saleId !== null) {
                        <a
                          class="invoices-meta invoices-link"
                          [routerLink]="['/sales', item.saleId]"
                        >
                          Venta #{{ item.saleId }}
                        </a>
                      }
                    </td>
                    <td>
                      <app-badge [tone]="isCreditNote(item) ? 'warning' : 'brand'">
                        {{ typeLabel(item) }}
                      </app-badge>
                    </td>
                    <td>{{ conditionLabel(item) }}</td>
                    <td>
                      @if (item.dueDate === null) {
                        <span class="invoices-meta">Contado</span>
                      } @else {
                        <span [class.invoices-overdue]="overdue(item)">
                          {{ formatDate(item.dueDate) }}
                        </span>
                        @if (overdue(item)) {
                          <app-badge tone="danger" [dot]="true">Vencida</app-badge>
                        }
                      }
                    </td>
                    <td class="is-numeric">
                      <span class="invoices-total">{{ formatMoney(item.total) }}</span>
                    </td>
                    <td class="is-numeric">
                      <span
                        class="invoices-balance"
                        [class.invoices-balance--pending]="item.balance > 0"
                      >
                        {{ formatMoney(item.balance) }}
                      </span>
                      @if (item.paidTotal > 0) {
                        <span class="invoices-meta">Pagado {{ formatMoney(item.paidTotal) }}</span>
                      }
                    </td>
                    <td>
                      <app-badge [tone]="statusTone(item)">{{ statusLabel(item) }}</app-badge>
                    </td>
                    <td>
                      <a appButton size="sm" variant="ghost" [routerLink]="['/invoices', item.id]">
                        <app-icon name="eye" [size]="15" />
                        Ver
                      </a>
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

    .invoices-header-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .invoices-panel {
      overflow: hidden;
    }

    .invoices-filters {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--space-3);
      padding: 16px 22px;
      border-bottom: 1px solid var(--border);
    }

    .invoices-filter {
      display: grid;
      flex: 0 1 160px;
      gap: 4px;
    }

    .invoices-filter--wide {
      flex: 0 1 220px;
    }

    .invoices-filter__label {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .invoices-filter__control {
      min-height: 44px;
    }

    .invoices-count {
      margin-left: auto;
    }

    .invoices-table {
      min-width: 1120px;
    }

    .invoices-number {
      display: block;
      color: var(--brand-700);
      font-weight: var(--weight-semibold);
      text-decoration: none;
      font-variant-numeric: tabular-nums;
    }

    .invoices-number:hover {
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .invoices-meta {
      display: block;
      margin-top: 2px;
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .invoices-link {
      color: var(--brand-700);
      text-decoration: none;
    }

    .invoices-link:hover {
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .invoices-customer {
      display: block;
      font-weight: var(--weight-medium);
    }

    .invoices-overdue {
      color: var(--danger-700);
      font-weight: var(--weight-semibold);
    }

    .invoices-total,
    .invoices-balance {
      font-weight: var(--weight-semibold);
      font-variant-numeric: tabular-nums;
    }

    .invoices-balance--pending {
      color: var(--warning-700);
    }

    .invoices-skeleton {
      display: grid;
      gap: 16px;
      padding: 24px 22px;
    }

    .invoices-feedback {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding: 18px 22px;
      color: var(--danger-700);
      font-size: var(--text-sm);
    }

    .invoices-feedback p {
      flex: 1;
      min-width: 180px;
    }

    @media (max-width: 640px) {
      .invoices-filters {
        padding: 14px 16px;
      }

      .invoices-filter,
      .invoices-filter--wide {
        flex-basis: 100%;
      }

      .invoices-count {
        margin-left: 0;
      }
    }
  `,
})
export class InvoicesComponent implements OnInit {
  private readonly invoices = inject(InvoiceService);
  private readonly customersService = inject(CustomerService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly skeletonRows = SKELETON_ROWS;
  protected readonly typeOptions = INVOICE_TYPE_OPTIONS;
  protected readonly statusOptions = INVOICE_STATUS_OPTIONS;

  protected readonly items = signal<InvoiceSummary[]>([]);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly customerId = signal<number | null>(null);
  protected readonly invoiceType = signal<InvoiceType | null>(null);
  protected readonly status = signal<InvoiceStatus | null>(null);

  protected readonly customers = signal<CustomerOption[]>([]);

  protected readonly canWrite = computed(() => this.auth.canAccess(['ADMIN', 'SELLER']));

  // El catálogo de opciones de clientes solo está disponible para ADMIN y SELLER.
  protected readonly canFilterCustomers = computed(() => this.auth.canAccess(['ADMIN', 'SELLER']));

  protected readonly hasFilters = computed(
    () =>
      this.from().length > 0 ||
      this.to().length > 0 ||
      this.customerId() !== null ||
      this.invoiceType() !== null ||
      this.status() !== null,
  );

  protected readonly countLabel = computed(() => {
    const total = this.totalElements();
    return `${total} ${total === 1 ? 'documento' : 'documentos'}`;
  });

  protected readonly emptyMessage = computed(() =>
    this.hasFilters()
      ? 'No hay facturas que coincidan con los filtros aplicados.'
      : 'Aún no hay facturas emitidas. Emite una desde el detalle de una venta confirmada.',
  );

  ngOnInit(): void {
    if (this.canFilterCustomers()) {
      this.loadCustomers();
    }

    this.load(0);
  }

  protected formatMoney(value: number): string {
    return formatMoney(value);
  }

  protected formatDate(value: string | null): string {
    return formatDate(value);
  }

  protected typeLabel(invoice: InvoiceSummary): string {
    return invoiceTypeLabel(invoice.invoiceType);
  }

  protected statusLabel(invoice: InvoiceSummary): string {
    return invoiceStatusLabel(invoice.status);
  }

  protected statusTone(invoice: InvoiceSummary) {
    return invoiceStatusTone(invoice.status);
  }

  protected conditionLabel(invoice: InvoiceSummary): string {
    return paymentConditionLabel(invoice.paymentCondition);
  }

  protected isCreditNote(invoice: InvoiceSummary): boolean {
    return isCreditNote(invoice);
  }

  protected overdue(invoice: InvoiceSummary): boolean {
    return isInvoiceOverdue(invoice, todayIso());
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

  protected onTypeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.invoiceType.set(value.length === 0 ? null : (value as InvoiceType));
  }

  protected onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.status.set(value.length === 0 ? null : (value as InvoiceStatus));
  }

  protected applyFilters(): void {
    if (this.from().length > 0 && this.to().length > 0 && this.from() > this.to()) {
      this.toast.warning(
        'Rango de fechas inválido',
        'La fecha inicial no puede ser posterior a la final.',
      );
      return;
    }

    this.load(0);
  }

  protected clearFilters(): void {
    this.from.set('');
    this.to.set('');
    this.customerId.set(null);
    this.invoiceType.set(null);
    this.status.set(null);
    this.load(0);
  }

  protected load(page: number): void {
    this.loading.set(true);
    this.error.set(null);

    const query: InvoiceQuery = {
      from: this.from(),
      to: this.to(),
      customerId: this.customerId(),
      invoiceType: this.invoiceType(),
      status: this.status(),
      page,
      size: PAGE_SIZE,
    };

    this.invoices.list(query).subscribe({
      next: (response) => {
        this.items.set(response.content);
        this.page.set(response.page);
        this.totalPages.set(response.totalPages);
        this.totalElements.set(response.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el listado de facturas. Intenta nuevamente.');
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
}
