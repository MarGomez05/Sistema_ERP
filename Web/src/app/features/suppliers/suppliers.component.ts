import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

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
import { SupplierFormComponent } from './supplier-form/supplier-form.component';
import { Supplier, SupplierFormValue, SupplierQuery, creditDaysLabel } from './supplier.model';
import { SupplierService } from './supplier.service';

const PAGE_SIZE = 10;
const SKELETON_ROWS = Array.from({ length: 5 });

type StatusFilter = 'all' | 'active' | 'inactive';

// Listado de proveedores con filtros, alta, edición y baja lógica (contrato 6).
@Component({
  selector: 'app-suppliers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    IconComponent,
    PageHeaderComponent,
    PaginationComponent,
    SkeletonComponent,
    SupplierFormComponent,
  ],
  template: `
    <app-page-header
      title="Proveedores"
      subtitle="Administra los proveedores, sus datos fiscales, contacto y condiciones de crédito."
    >
      <div actions class="suppliers-header-actions">
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
            Nuevo proveedor
          </button>
        }
      </div>
    </app-page-header>

    <section class="panel suppliers-panel">
      <div class="suppliers-filters">
        <div class="suppliers-search">
          <app-icon name="search" [size]="17" />
          <input
            class="field__control suppliers-search__input"
            type="search"
            [value]="search()"
            placeholder="Buscar por nombre comercial, razón social o NIT"
            aria-label="Buscar por nombre comercial, razón social o NIT"
            (input)="onSearchInput($event)"
            (keydown.enter)="applyFilters()"
          />
        </div>

        <label class="suppliers-filter">
          <span class="u-sr-only">Filtrar por estado</span>
          <select
            class="field__control suppliers-filter__control"
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

        <app-badge tone="neutral" class="suppliers-count">{{ countLabel() }}</app-badge>
      </div>

      <div class="suppliers-layout" [class.suppliers-layout--panel]="panelOpen()">
        <div class="suppliers-list">
          @if (error(); as message) {
            <div class="suppliers-feedback" role="alert">
              <app-icon name="alertCircle" [size]="18" />
              <p>{{ message }}</p>
              <button appButton type="button" size="sm" variant="secondary" (click)="load(page())">
                Reintentar
              </button>
            </div>
          } @else if (loading()) {
            <div class="suppliers-skeleton" aria-hidden="true">
              @for (row of skeletonRows; track $index) {
                <app-skeleton height="20px" />
              }
            </div>
          } @else if (items().length === 0) {
            <app-empty-state icon="truck" title="Sin proveedores" [description]="emptyMessage()">
              @if (canWrite()) {
                <button appButton type="button" (click)="startCreate()">
                  <app-icon name="plus" [size]="16" />
                  Registrar el primero
                </button>
              }
            </app-empty-state>
          } @else {
            <div class="table-wrap">
              <table class="table suppliers-table">
                <thead>
                  <tr>
                    <th scope="col">Proveedor</th>
                    <th scope="col">NIT / NRC</th>
                    <th scope="col">Contacto</th>
                    <th scope="col">Dirección</th>
                    <th scope="col">Crédito</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of items(); track item.id) {
                    <tr [class.suppliers-row--inactive]="!item.isActive">
                      <td>
                        <span class="suppliers-name">{{ item.tradeName }}</span>
                        <span class="suppliers-meta">{{ item.legalName }}</span>
                      </td>
                      <td>
                        <span class="suppliers-document">{{ item.nit }}</span>
                        <span class="suppliers-meta">{{ item.nrc ?? 'Sin NRC' }}</span>
                      </td>
                      <td>
                        @if (item.phone || item.email) {
                          @if (item.phone) {
                            <span class="suppliers-contact">
                              <app-icon name="phone" [size]="13" />
                              {{ item.phone }}
                            </span>
                          }
                          @if (item.email) {
                            <span class="suppliers-meta">{{ item.email }}</span>
                          }
                        } @else {
                          <span class="suppliers-muted">Sin contacto</span>
                        }
                      </td>
                      <td>
                        <span class="suppliers-address" [attr.title]="item.address ?? null">
                          {{ item.address ?? 'Sin dirección' }}
                        </span>
                      </td>
                      <td>
                        <span class="suppliers-credit">{{ creditDaysLabel(item.creditDays) }}</span>
                      </td>
                      <td>
                        <app-badge [tone]="item.isActive ? 'success' : 'neutral'" [dot]="true">
                          {{ item.isActive ? 'Activo' : 'Inactivo' }}
                        </app-badge>
                      </td>
                      <td>
                        <div class="suppliers-actions">
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

                            @if (confirmingId() === item.id) {
                              <span class="suppliers-confirm">
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
          <aside class="suppliers-side" aria-label="Formulario de proveedor">
            <app-supplier-form
              [record]="editing()"
              [saving]="saving()"
              [error]="formError()"
              (submitted)="saveSupplier($event)"
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

    .suppliers-header-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .suppliers-panel {
      overflow: hidden;
    }

    .suppliers-filters {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
      padding: 16px 22px;
      border-bottom: 1px solid var(--border);
    }

    .suppliers-search {
      position: relative;
      flex: 1 1 300px;
      max-width: 460px;
      color: var(--text-subtle);
    }

    .suppliers-search app-icon {
      position: absolute;
      top: 50%;
      left: 12px;
      transform: translateY(-50%);
      pointer-events: none;
    }

    .suppliers-search__input {
      padding-left: 38px;
    }

    .suppliers-filter {
      flex: 0 1 200px;
    }

    .suppliers-filter__control {
      min-height: 44px;
    }

    .suppliers-count {
      margin-left: auto;
    }

    .suppliers-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
    }

    .suppliers-layout--panel {
      grid-template-columns: minmax(0, 1fr) 400px;
    }

    .suppliers-list {
      min-width: 0;
    }

    .suppliers-side {
      padding: var(--space-5);
      background: var(--surface-muted);
      border-left: 1px solid var(--border);
    }

    .suppliers-table {
      min-width: 1040px;
    }

    .suppliers-row--inactive {
      opacity: 0.72;
    }

    .suppliers-name {
      display: block;
      font-weight: var(--weight-semibold);
    }

    .suppliers-meta {
      display: block;
      margin-top: 2px;
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .suppliers-document {
      display: block;
      font-weight: var(--weight-medium);
      font-variant-numeric: tabular-nums;
    }

    .suppliers-contact {
      display: flex;
      align-items: center;
      gap: 5px;
      font-variant-numeric: tabular-nums;
    }

    .suppliers-address {
      display: block;
      max-width: 240px;
      overflow: hidden;
      color: var(--text-muted);
      font-size: var(--text-sm);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .suppliers-muted {
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .suppliers-credit {
      font-weight: var(--weight-semibold);
    }

    .suppliers-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
    }

    .suppliers-confirm {
      color: var(--danger-700);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
    }

    .suppliers-skeleton {
      display: grid;
      gap: 16px;
      padding: 24px 22px;
    }

    .suppliers-feedback {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding: 18px 22px;
      color: var(--danger-700);
      font-size: var(--text-sm);
    }

    .suppliers-feedback p {
      flex: 1;
      min-width: 180px;
    }

    @media (max-width: 1240px) {
      .suppliers-layout--panel {
        grid-template-columns: minmax(0, 1fr);
      }

      .suppliers-side {
        border-top: 1px solid var(--border);
        border-left: 0;
      }
    }

    @media (max-width: 640px) {
      .suppliers-filters {
        padding: 14px 16px;
      }

      .suppliers-search,
      .suppliers-filter {
        flex-basis: 100%;
        max-width: none;
      }

      .suppliers-count {
        margin-left: 0;
      }
    }
  `,
})
export class SuppliersComponent implements OnInit {
  private readonly suppliers = inject(SupplierService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly skeletonRows = SKELETON_ROWS;

  protected readonly items = signal<Supplier[]>([]);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilter>('all');

  protected readonly panelOpen = signal(false);
  protected readonly editing = signal<Supplier | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly confirmingId = signal<number | null>(null);
  protected readonly statusLoadingId = signal<number | null>(null);

  // Solo ADMIN y PURCHASING pueden crear, editar y cambiar el estado.
  protected readonly canWrite = computed(() => this.auth.canAccess(['ADMIN', 'PURCHASING']));

  protected readonly hasFilters = computed(
    () => this.search().trim().length > 0 || this.statusFilter() !== 'all',
  );

  protected readonly countLabel = computed(() => {
    const total = this.totalElements();
    return `${total} ${total === 1 ? 'proveedor' : 'proveedores'}`;
  });

  protected readonly emptyMessage = computed(() =>
    this.hasFilters()
      ? 'No hay proveedores que coincidan con los filtros aplicados.'
      : 'Aún no hay proveedores registrados en el sistema.',
  );

  ngOnInit(): void {
    this.load(0);
  }

  protected creditDaysLabel(days: number): string {
    return creditDaysLabel(days);
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as StatusFilter);
  }

  protected applyFilters(): void {
    this.load(0);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.statusFilter.set('all');
    this.load(0);
  }

  protected load(page: number): void {
    this.loading.set(true);
    this.error.set(null);

    const query: SupplierQuery = {
      search: this.search(),
      isActive: this.isActiveFilter(),
      page,
      size: PAGE_SIZE,
    };

    this.suppliers.list(query).subscribe({
      next: (response) => {
        this.items.set(response.content);
        this.page.set(response.page);
        this.totalPages.set(response.totalPages);
        this.totalElements.set(response.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el listado de proveedores. Intenta nuevamente.');
        this.loading.set(false);
      },
    });
  }

  protected startCreate(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.panelOpen.set(true);
  }

  protected startEdit(supplier: Supplier): void {
    this.editing.set(supplier);
    this.formError.set(null);
    this.panelOpen.set(true);
  }

  protected closePanel(): void {
    this.panelOpen.set(false);
    this.editing.set(null);
    this.formError.set(null);
  }

  protected saveSupplier(value: SupplierFormValue): void {
    const editing = this.editing();

    this.saving.set(true);
    this.formError.set(null);

    const request =
      editing === null ? this.suppliers.create(value) : this.suppliers.update(editing.id, value);

    request.subscribe({
      next: (supplier) => {
        this.saving.set(false);
        this.toast.success(
          editing === null ? 'Proveedor creado' : 'Proveedor actualizado',
          supplier.tradeName,
        );
        this.closePanel();
        this.load(editing === null ? 0 : this.page());
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(
          readApiError(error, 'No se pudo guardar el proveedor. Revisa los datos.'),
        );
      },
    });
  }

  protected requestStatusChange(supplier: Supplier): void {
    this.confirmingId.set(supplier.id);
  }

  protected changeStatus(supplier: Supplier): void {
    this.statusLoadingId.set(supplier.id);

    this.suppliers.changeStatus(supplier.id, !supplier.isActive).subscribe({
      next: () => {
        this.statusLoadingId.set(null);
        this.confirmingId.set(null);
        this.toast.success(
          supplier.isActive ? 'Proveedor desactivado' : 'Proveedor activado',
          supplier.tradeName,
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
