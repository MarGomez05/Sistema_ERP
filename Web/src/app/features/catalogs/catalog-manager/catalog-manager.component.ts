import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

import { AuthService } from '@core/auth/auth.service';
import { readApiError } from '@core/http/api-error';
import { ToastService } from '@core/ui/toast.service';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PaginationComponent } from '@shared/ui/pagination/pagination.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { CatalogFormComponent } from '../catalog-form/catalog-form.component';
import {
  CatalogColumn,
  CatalogConfig,
  CatalogFormValue,
  CatalogOption,
  CatalogOptionKey,
  CatalogQuery,
  CatalogRecord,
  columnValue,
} from '../catalog.model';
import { CatalogService } from '../catalog.service';

const PAGE_SIZE = 10;
const SKELETON_ROWS = Array.from({ length: 5 });

type CatalogStatusFilter = 'all' | 'active' | 'inactive';

// Listado y mantenimiento de un catálogo concreto, dirigido por configuración.
@Component({
  selector: 'app-catalog-manager',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    ButtonComponent,
    CatalogFormComponent,
    EmptyStateComponent,
    IconComponent,
    PaginationComponent,
    SkeletonComponent,
  ],
  template: `
    <div class="panel__header catalog-header">
      <div>
        <h2 class="panel__title">{{ config().label }}</h2>
        <p class="panel__subtitle">{{ config().description }}</p>
      </div>
      <div class="toolbar">
        <app-badge tone="neutral">{{ countLabel() }}</app-badge>
        @if (canWrite()) {
          <button appButton type="button" (click)="startCreate()">
            <app-icon name="plus" [size]="16" />
            Nuevo
          </button>
        }
      </div>
    </div>

    <div class="catalog-filters">
      <div class="catalog-search">
        <app-icon name="search" [size]="17" />
        <input
          class="field__control catalog-search__input"
          type="search"
          [value]="search()"
          [attr.placeholder]="config().searchPlaceholder"
          [attr.aria-label]="config().searchPlaceholder"
          (input)="onSearchInput($event)"
          (keydown.enter)="applyFilters()"
        />
      </div>

      <label class="catalog-filter">
        <span class="u-sr-only">Filtrar por estado</span>
        <select
          class="field__control catalog-filter__control"
          [value]="statusFilter()"
          (change)="onStatusChange($event)"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Solo activos</option>
          <option value="inactive">Solo inactivos</option>
        </select>
      </label>

      @if (config().filter; as filter) {
        <label class="catalog-filter">
          <span class="u-sr-only">Filtrar por {{ filter.label }}</span>
          <select
            class="field__control catalog-filter__control"
            [value]="relationId() ?? ''"
            (change)="onRelationChange($event)"
          >
            <option value="">Todas: {{ filter.label }}</option>
            @for (option of filterOptions(); track option.id) {
              <option [value]="option.id">{{ optionLabel(option) }}</option>
            }
          </select>
        </label>
      }

      <button appButton type="button" variant="secondary" (click)="applyFilters()">Buscar</button>

      @if (hasFilters()) {
        <button appButton type="button" variant="ghost" (click)="clearFilters()">Limpiar</button>
      }
    </div>

    <div class="catalog-layout" [class.catalog-layout--panel]="panelOpen()">
      <div class="catalog-list">
        @if (error(); as message) {
          <div class="catalog-feedback" role="alert">
            <app-icon name="alertCircle" [size]="18" />
            <p>{{ message }}</p>
            <button appButton type="button" size="sm" variant="secondary" (click)="load(page())">
              Reintentar
            </button>
          </div>
        } @else if (loading()) {
          <div class="catalog-skeleton" aria-hidden="true">
            @for (row of skeletonRows; track $index) {
              <app-skeleton height="20px" />
            }
          </div>
        } @else if (records().length === 0) {
          <app-empty-state
            [icon]="config().icon"
            [title]="'Sin ' + config().label.toLowerCase()"
            [description]="emptyMessage()"
          >
            @if (canWrite()) {
              <button appButton type="button" (click)="startCreate()">
                <app-icon name="plus" [size]="16" />
                Registrar el primero
              </button>
            }
          </app-empty-state>
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  @for (column of config().columns; track column.key) {
                    <th scope="col" [class.is-numeric]="column.numeric">{{ column.label }}</th>
                  }
                  <th scope="col">Estado</th>
                  @if (canWrite()) {
                    <th scope="col">Acciones</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (record of records(); track record.id) {
                  <tr [class.catalog-row--inactive]="!record.isActive">
                    @for (column of config().columns; track column.key) {
                      <td
                        [class.is-numeric]="column.numeric"
                        [class.is-muted]="column.muted"
                        [class.is-strong]="column.key === 'name'"
                      >
                        {{ value(record, column) }}
                      </td>
                    }
                    <td>
                      <app-badge [tone]="record.isActive ? 'success' : 'neutral'" [dot]="true">
                        {{ record.isActive ? 'Activo' : 'Inactivo' }}
                      </app-badge>
                    </td>
                    @if (canWrite()) {
                      <td>
                        <div class="catalog-row__actions">
                          @if (confirmingId() === record.id) {
                            <span class="catalog-row__confirm">¿Desactivar?</span>
                            <button
                              appButton
                              type="button"
                              size="sm"
                              variant="danger"
                              [loading]="statusLoadingId() === record.id"
                              (click)="changeStatus(record)"
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
                              (click)="startEdit(record)"
                            >
                              <app-icon name="edit" [size]="15" />
                              Editar
                            </button>
                            <button
                              appButton
                              type="button"
                              size="sm"
                              variant="ghost"
                              [loading]="statusLoadingId() === record.id"
                              (click)="requestStatusChange(record)"
                            >
                              <app-icon name="power" [size]="15" />
                              {{ record.isActive ? 'Desactivar' : 'Activar' }}
                            </button>
                          }
                        </div>
                      </td>
                    }
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
        <aside class="catalog-side" aria-label="Formulario del catálogo">
          <app-catalog-form
            [config]="config()"
            [record]="editing()"
            [selectOptions]="options()"
            [saving]="saving()"
            [error]="formError()"
            (submitted)="save($event)"
            (cancelled)="closePanel()"
          />
        </aside>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .catalog-header {
      border-bottom: 1px solid var(--border);
    }

    .catalog-filters {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
      padding: 16px 22px;
      border-bottom: 1px solid var(--border);
    }

    .catalog-search {
      position: relative;
      flex: 1 1 240px;
      max-width: 360px;
      color: var(--text-subtle);
    }

    .catalog-search app-icon {
      position: absolute;
      top: 50%;
      left: 12px;
      transform: translateY(-50%);
      pointer-events: none;
    }

    .catalog-search__input {
      padding-left: 38px;
    }

    .catalog-filter {
      flex: 0 1 210px;
    }

    .catalog-filter__control {
      min-height: 44px;
    }

    .catalog-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
    }

    .catalog-layout--panel {
      grid-template-columns: minmax(0, 1fr) 350px;
    }

    .catalog-list {
      min-width: 0;
    }

    .catalog-side {
      padding: var(--space-5);
      background: var(--surface-muted);
      border-left: 1px solid var(--border);
    }

    .catalog-row--inactive {
      background: var(--surface-muted);
    }

    .catalog-row--inactive td {
      color: var(--text-muted);
    }

    .catalog-row__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
    }

    .catalog-row__confirm {
      color: var(--danger-700);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
    }

    .catalog-skeleton {
      display: grid;
      gap: 16px;
      padding: 24px 22px;
    }

    .catalog-feedback {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding: 18px 22px;
      color: var(--danger-700);
      font-size: var(--text-sm);
    }

    .catalog-feedback p {
      flex: 1;
      min-width: 180px;
    }

    @media (max-width: 1180px) {
      .catalog-layout--panel {
        grid-template-columns: minmax(0, 1fr);
      }

      .catalog-side {
        border-top: 1px solid var(--border);
        border-left: 0;
      }
    }

    @media (max-width: 640px) {
      .catalog-filters {
        padding: 14px 16px;
      }

      .catalog-search,
      .catalog-filter {
        flex-basis: 100%;
        max-width: none;
      }
    }
  `,
})
export class CatalogManagerComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly catalogs = inject(CatalogService);
  private readonly toast = inject(ToastService);

  readonly config = input.required<CatalogConfig>();

  protected readonly pageSize = PAGE_SIZE;
  protected readonly skeletonRows = SKELETON_ROWS;

  protected readonly records = signal<CatalogRecord[]>([]);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly search = signal('');
  protected readonly statusFilter = signal<CatalogStatusFilter>('all');
  protected readonly relationId = signal<number | null>(null);

  protected readonly options = signal<Partial<Record<CatalogOptionKey, readonly CatalogOption[]>>>(
    {},
  );

  protected readonly panelOpen = signal(false);
  protected readonly editing = signal<CatalogRecord | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly confirmingId = signal<number | null>(null);
  protected readonly statusLoadingId = signal<number | null>(null);

  protected readonly canWrite = computed(() => this.auth.canAccess(['ADMIN']));

  private readonly isActiveFilter = computed<boolean | null>(() => {
    const filter = this.statusFilter();

    if (filter === 'all') {
      return null;
    }

    return filter === 'active';
  });

  protected readonly filterOptions = computed<readonly CatalogOption[]>(() => {
    const filter = this.config().filter;
    return filter === undefined ? [] : (this.options()[filter.optionsKey] ?? []);
  });

  protected readonly hasFilters = computed(
    () =>
      this.search().trim().length > 0 ||
      this.statusFilter() !== 'all' ||
      this.relationId() !== null,
  );

  protected readonly countLabel = computed(() => {
    const total = this.totalElements();
    return `${total} ${total === 1 ? 'registro' : 'registros'}`;
  });

  protected readonly emptyMessage = computed(() =>
    this.hasFilters()
      ? 'No hay coincidencias con los filtros aplicados. Ajusta la búsqueda e inténtalo de nuevo.'
      : this.config().emptyDescription,
  );

  ngOnInit(): void {
    this.loadOptions();
    this.load(0);
  }

  protected value(record: CatalogRecord, column: CatalogColumn): string {
    return columnValue(record, column);
  }

  protected optionLabel(option: CatalogOption): string {
    return option.code === undefined ? option.name : `${option.name} (${option.code})`;
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as CatalogStatusFilter);
  }

  protected onRelationChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.relationId.set(value.length === 0 ? null : Number(value));
  }

  protected applyFilters(): void {
    this.load(0);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.statusFilter.set('all');
    this.relationId.set(null);
    this.load(0);
  }

  protected load(page: number): void {
    this.loading.set(true);
    this.error.set(null);

    const query: CatalogQuery = {
      search: this.search(),
      isActive: this.isActiveFilter(),
      relationId: this.relationId(),
      page,
      size: PAGE_SIZE,
    };

    this.catalogs.list(this.config(), query).subscribe({
      next: (response) => {
        this.records.set(response.content);
        this.page.set(response.page);
        this.totalPages.set(response.totalPages);
        this.totalElements.set(response.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el catálogo. Intenta nuevamente.');
        this.loading.set(false);
      },
    });
  }

  protected startCreate(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.panelOpen.set(true);
  }

  protected startEdit(record: CatalogRecord): void {
    this.editing.set(record);
    this.formError.set(null);
    this.panelOpen.set(true);
  }

  protected closePanel(): void {
    this.panelOpen.set(false);
    this.editing.set(null);
    this.formError.set(null);
  }

  protected save(value: CatalogFormValue): void {
    const config = this.config();
    const editing = this.editing();

    this.saving.set(true);
    this.formError.set(null);

    const request =
      editing === null
        ? this.catalogs.create(config, value)
        : this.catalogs.update(config, editing.id, value);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(
          editing === null ? 'Registro creado' : 'Registro actualizado',
          `${config.label}: ${value.name.trim()}`,
        );
        this.closePanel();
        this.load(editing === null ? 0 : this.page());
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(
          readApiError(
            error,
            'No se pudo guardar el registro. Revisa los datos e inténtalo de nuevo.',
          ),
        );
      },
    });
  }

  protected requestStatusChange(record: CatalogRecord): void {
    if (record.isActive) {
      this.confirmingId.set(record.id);
      return;
    }

    this.changeStatus(record);
  }

  protected changeStatus(record: CatalogRecord): void {
    const next = !record.isActive;

    this.statusLoadingId.set(record.id);

    this.catalogs.changeStatus(this.config(), record.id, next).subscribe({
      next: () => {
        this.statusLoadingId.set(null);
        this.confirmingId.set(null);
        this.toast.success(
          next ? 'Registro activado' : 'Registro desactivado',
          `${this.config().label}: ${record.name}`,
        );
        this.load(this.page());
      },
      error: (error: unknown) => {
        this.statusLoadingId.set(null);
        this.confirmingId.set(null);
        this.notifyStatusError(error);
      },
    });
  }

  private loadOptions(): void {
    const keys = new Set<CatalogOptionKey>();
    const filter = this.config().filter;

    if (filter !== undefined) {
      keys.add(filter.optionsKey);
    }

    for (const field of this.config().fields) {
      if (field.optionsKey !== undefined) {
        keys.add(field.optionsKey);
      }
    }

    for (const key of keys) {
      this.catalogs.options(key).subscribe({
        next: (options) => this.options.update((current) => ({ ...current, [key]: options })),
        error: () => this.options.update((current) => ({ ...current, [key]: [] })),
      });
    }
  }

  private notifyStatusError(error: unknown): void {
    if (error instanceof HttpErrorResponse && (error.status === 400 || error.status === 409)) {
      this.toast.error(
        'No se pudo cambiar el estado',
        readApiError(error, 'El registro tiene dependencias activas.'),
      );
    }
  }
}
