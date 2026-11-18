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
import { formatMoney } from '@features/products/product.model';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { PaginationComponent } from '@shared/ui/pagination/pagination.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { CustomerFormComponent } from './customer-form/customer-form.component';
import {
  DOCUMENT_TYPE_OPTIONS,
  Customer,
  CustomerFormValue,
  CustomerQuery,
  DocumentType,
  creditDaysLabel,
  creditLimitLabel,
  creditTone,
  customerTypeLabel,
  documentTypeLabel,
} from './customer.model';
import { CustomerService } from './customer.service';

const PAGE_SIZE = 10;
const SKELETON_ROWS = Array.from({ length: 5 });

type StatusFilter = 'all' | 'active' | 'inactive';

// Listado de clientes con filtros, alta, edición y baja lógica (contrato 10).
@Component({
  selector: 'app-customers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    ButtonComponent,
    CustomerFormComponent,
    EmptyStateComponent,
    IconComponent,
    PageHeaderComponent,
    PaginationComponent,
    RouterLink,
    SkeletonComponent,
  ],
  template: `
    <app-page-header
      title="Clientes"
      subtitle="Consulta el saldo y el crédito de cada cliente, y administra sus datos comerciales."
    >
      <div actions class="customers-header-actions">
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
            Nuevo cliente
          </button>
        }
      </div>
    </app-page-header>

    <section class="panel customers-panel">
      <div class="customers-filters">
        <div class="customers-search">
          <app-icon name="search" [size]="17" />
          <input
            class="field__control customers-search__input"
            type="search"
            [value]="search()"
            placeholder="Buscar por nombre, documento, NIT o correo"
            aria-label="Buscar por nombre, documento, NIT o correo"
            (input)="onSearchInput($event)"
            (keydown.enter)="applyFilters()"
          />
        </div>

        <label class="customers-filter">
          <span class="u-sr-only">Filtrar por tipo de documento</span>
          <select
            class="field__control customers-filter__control"
            [value]="documentType() ?? ''"
            (change)="onDocumentTypeChange($event)"
          >
            <option value="">Todos los documentos</option>
            @for (option of documentTypes; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="customers-filter">
          <span class="u-sr-only">Filtrar por estado</span>
          <select
            class="field__control customers-filter__control"
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

        <app-badge tone="neutral" class="customers-count">{{ countLabel() }}</app-badge>
      </div>

      <div class="customers-layout" [class.customers-layout--panel]="panelOpen()">
        <div class="customers-list">
          @if (error(); as message) {
            <div class="customers-feedback" role="alert">
              <app-icon name="alertCircle" [size]="18" />
              <p>{{ message }}</p>
              <button appButton type="button" size="sm" variant="secondary" (click)="load(page())">
                Reintentar
              </button>
            </div>
          } @else if (loading()) {
            <div class="customers-skeleton" aria-hidden="true">
              @for (row of skeletonRows; track $index) {
                <app-skeleton height="20px" />
              }
            </div>
          } @else if (items().length === 0) {
            <app-empty-state icon="users" title="Sin clientes" [description]="emptyMessage()">
              @if (canWrite()) {
                <button appButton type="button" (click)="startCreate()">
                  <app-icon name="plus" [size]="16" />
                  Registrar el primero
                </button>
              }
            </app-empty-state>
          } @else {
            <div class="table-wrap">
              <table class="table customers-table">
                <thead>
                  <tr>
                    <th scope="col">Cliente</th>
                    <th scope="col">Documento</th>
                    <th scope="col">Contacto</th>
                    <th scope="col">Crédito</th>
                    <th scope="col" class="is-numeric">Saldo</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of items(); track item.id) {
                    <tr [class.customers-row--inactive]="!item.isActive">
                      <td>
                        <a class="customers-name" [routerLink]="['/customers', item.id]">
                          {{ item.legalName }}
                        </a>
                        <span class="customers-meta">
                          {{ item.tradeName ?? customerTypeLabel(item.customerType) }}
                        </span>
                      </td>
                      <td>
                        <span class="customers-document">
                          {{ documentTypeLabel(item.documentType) }}
                        </span>
                        @if (item.documentNumber) {
                          <span class="customers-meta">{{ item.documentNumber }}</span>
                        }
                      </td>
                      <td>
                        @if (item.phone || item.email) {
                          @if (item.phone) {
                            <span class="customers-contact">
                              <app-icon name="phone" [size]="13" />
                              {{ item.phone }}
                            </span>
                          }
                          @if (item.email) {
                            <span class="customers-meta">{{ item.email }}</span>
                          }
                        } @else {
                          <span class="customers-muted">Sin contacto</span>
                        }
                      </td>
                      <td>
                        <span class="customers-credit">
                          {{ creditLimitLabel(item) }}
                        </span>
                        <span class="customers-meta">{{ creditDaysLabel(item) }}</span>
                      </td>
                      <td class="is-numeric">
                        <span
                          class="customers-balance"
                          [class.customers-balance--danger]="creditTone(item) === 'danger'"
                          [class.customers-balance--warning]="creditTone(item) === 'warning'"
                        >
                          {{ formatMoney(item.outstandingBalance) }}
                        </span>
                      </td>
                      <td>
                        <app-badge [tone]="item.isActive ? 'success' : 'neutral'" [dot]="true">
                          {{ item.isActive ? 'Activo' : 'Inactivo' }}
                        </app-badge>
                      </td>
                      <td>
                        <div class="customers-actions">
                          <a
                            appButton
                            size="sm"
                            variant="ghost"
                            [routerLink]="['/customers', item.id]"
                          >
                            <app-icon name="eye" [size]="15" />
                            Ver
                          </a>

                          @if (canWrite()) {
                            <button
                              appButton
                              type="button"
                              size="sm"
                              variant="ghost"
                              (click)="startEdit(item)"
                            >
                              <app-icon name="edit" [size]="15" />
                              Editar
                            </button>
                          }

                          @if (canManageStatus()) {
                            @if (confirmingId() === item.id) {
                              <span class="customers-confirm">
                                ¿{{ item.isActive ? 'Desactivar' : 'Activar' }}?
                              </span>
                              <button
                                appButton
                                type="button"
                                size="sm"
                                [variant]="item.isActive ? 'danger' : 'primary'"
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
          <aside class="customers-side" aria-label="Formulario de cliente">
            <app-customer-form
              [record]="editing()"
              [saving]="saving()"
              [error]="formError()"
              (submitted)="saveCustomer($event)"
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

    .customers-header-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .customers-panel {
      overflow: hidden;
    }

    .customers-filters {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
      padding: 16px 22px;
      border-bottom: 1px solid var(--border);
    }

    .customers-search {
      position: relative;
      flex: 1 1 280px;
      max-width: 420px;
      color: var(--text-subtle);
    }

    .customers-search app-icon {
      position: absolute;
      top: 50%;
      left: 12px;
      transform: translateY(-50%);
      pointer-events: none;
    }

    .customers-search__input {
      padding-left: 38px;
    }

    .customers-filter {
      flex: 0 1 200px;
    }

    .customers-filter__control {
      min-height: 44px;
    }

    .customers-count {
      margin-left: auto;
    }

    .customers-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
    }

    .customers-layout--panel {
      grid-template-columns: minmax(0, 1fr) 400px;
    }

    .customers-list {
      min-width: 0;
    }

    .customers-side {
      padding: var(--space-5);
      background: var(--surface-muted);
      border-left: 1px solid var(--border);
    }

    .customers-table {
      min-width: 1080px;
    }

    .customers-row--inactive {
      opacity: 0.72;
    }

    .customers-name {
      display: block;
      color: var(--brand-700);
      font-weight: var(--weight-semibold);
      text-decoration: none;
    }

    .customers-name:hover {
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .customers-meta {
      display: block;
      margin-top: 2px;
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .customers-document {
      display: block;
      font-weight: var(--weight-medium);
    }

    .customers-contact {
      display: flex;
      align-items: center;
      gap: 5px;
      font-variant-numeric: tabular-nums;
    }

    .customers-muted {
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .customers-credit {
      display: block;
      font-weight: var(--weight-semibold);
      font-variant-numeric: tabular-nums;
    }

    .customers-balance {
      font-weight: var(--weight-semibold);
      font-variant-numeric: tabular-nums;
    }

    .customers-balance--warning {
      color: var(--warning-700);
    }

    .customers-balance--danger {
      color: var(--danger-700);
    }

    .customers-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
    }

    .customers-confirm {
      color: var(--danger-700);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
    }

    .customers-skeleton {
      display: grid;
      gap: 16px;
      padding: 24px 22px;
    }

    .customers-feedback {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding: 18px 22px;
      color: var(--danger-700);
      font-size: var(--text-sm);
    }

    .customers-feedback p {
      flex: 1;
      min-width: 180px;
    }

    @media (max-width: 1240px) {
      .customers-layout--panel {
        grid-template-columns: minmax(0, 1fr);
      }

      .customers-side {
        border-top: 1px solid var(--border);
        border-left: 0;
      }
    }

    @media (max-width: 640px) {
      .customers-filters {
        padding: 14px 16px;
      }

      .customers-search,
      .customers-filter {
        flex-basis: 100%;
        max-width: none;
      }

      .customers-count {
        margin-left: 0;
      }
    }
  `,
})
export class CustomersComponent implements OnInit {
  private readonly customers = inject(CustomerService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly skeletonRows = SKELETON_ROWS;
  protected readonly documentTypes = DOCUMENT_TYPE_OPTIONS;

  protected readonly items = signal<Customer[]>([]);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly search = signal('');
  protected readonly documentType = signal<DocumentType | null>(null);
  protected readonly statusFilter = signal<StatusFilter>('all');

  protected readonly panelOpen = signal(false);
  protected readonly editing = signal<Customer | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly confirmingId = signal<number | null>(null);
  protected readonly statusLoadingId = signal<number | null>(null);

  protected readonly canWrite = computed(() => this.auth.canAccess(['ADMIN', 'SELLER']));

  protected readonly canManageStatus = computed(() => this.auth.canAccess(['ADMIN']));

  protected readonly hasFilters = computed(
    () =>
      this.search().trim().length > 0 ||
      this.documentType() !== null ||
      this.statusFilter() !== 'all',
  );

  protected readonly countLabel = computed(() => {
    const total = this.totalElements();
    return `${total} ${total === 1 ? 'cliente' : 'clientes'}`;
  });

  protected readonly emptyMessage = computed(() =>
    this.hasFilters()
      ? 'No hay clientes que coincidan con los filtros aplicados.'
      : 'Aún no hay clientes registrados en el sistema.',
  );

  ngOnInit(): void {
    this.load(0);
  }

  protected formatMoney(value: number): string {
    return formatMoney(value);
  }

  protected customerTypeLabel(type: Customer['customerType']): string {
    return customerTypeLabel(type);
  }

  protected documentTypeLabel(type: DocumentType | null): string {
    return documentTypeLabel(type);
  }

  protected creditLimitLabel(customer: Customer): string {
    return creditLimitLabel(customer);
  }

  protected creditDaysLabel(customer: Customer): string {
    return creditDaysLabel(customer);
  }

  protected creditTone(customer: Customer) {
    return creditTone(customer);
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onDocumentTypeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.documentType.set(value.length === 0 ? null : (value as DocumentType));
  }

  protected onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as StatusFilter);
  }

  protected applyFilters(): void {
    this.load(0);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.documentType.set(null);
    this.statusFilter.set('all');
    this.load(0);
  }

  protected load(page: number): void {
    this.loading.set(true);
    this.error.set(null);

    const query: CustomerQuery = {
      search: this.search(),
      documentType: this.documentType(),
      isActive: this.isActiveFilter(),
      page,
      size: PAGE_SIZE,
    };

    this.customers.list(query).subscribe({
      next: (response) => {
        this.items.set(response.content);
        this.page.set(response.page);
        this.totalPages.set(response.totalPages);
        this.totalElements.set(response.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el listado de clientes. Intenta nuevamente.');
        this.loading.set(false);
      },
    });
  }

  protected startCreate(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.panelOpen.set(true);
  }

  protected startEdit(customer: Customer): void {
    this.editing.set(customer);
    this.formError.set(null);
    this.panelOpen.set(true);
  }

  protected closePanel(): void {
    this.panelOpen.set(false);
    this.editing.set(null);
    this.formError.set(null);
  }

  protected saveCustomer(value: CustomerFormValue): void {
    const editing = this.editing();
    const credit =
      editing === null
        ? { creditLimit: 0, creditDays: 0 }
        : { creditLimit: editing.creditLimit, creditDays: editing.creditDays };

    this.saving.set(true);
    this.formError.set(null);

    const request =
      editing === null
        ? this.customers.create(value, credit)
        : this.customers.update(editing.id, value, credit);

    request.subscribe({
      next: (customer) => {
        this.saving.set(false);

        if (editing === null) {
          this.toast.success('Cliente creado', customer.legalName);
          this.closePanel();
          void this.router.navigate(['/customers', customer.id]);
          return;
        }

        this.toast.success('Cliente actualizado', customer.legalName);
        this.closePanel();
        this.load(this.page());
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(readApiError(error, 'No se pudo guardar el cliente. Revisa los datos.'));
      },
    });
  }

  protected requestStatusChange(customer: Customer): void {
    this.confirmingId.set(customer.id);
  }

  protected changeStatus(customer: Customer): void {
    this.statusLoadingId.set(customer.id);

    this.customers.changeStatus(customer.id, !customer.isActive).subscribe({
      next: () => {
        this.statusLoadingId.set(null);
        this.confirmingId.set(null);
        this.toast.success(
          customer.isActive ? 'Cliente desactivado' : 'Cliente activado',
          customer.legalName,
        );
        this.load(this.page());
      },
      error: (error: unknown) => {
        this.statusLoadingId.set(null);
        this.toast.error(
          'No se pudo cambiar el estado',
          readApiError(error, 'Intenta nuevamente.'),
        );
      },
    });
  }

  private isActiveFilter(): boolean | null {
    switch (this.statusFilter()) {
      case 'active':
        return true;
      case 'inactive':
        return false;
      case 'all':
        return null;
    }
  }
}
