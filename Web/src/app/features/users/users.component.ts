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
import { formatDate } from '@shared/util/date.util';
import {
  AdminTab,
  Role,
  RoleFormValue,
  UserFormValue,
  UserQuery,
  UserRecord,
  canDeactivateRole,
  isSystemRole,
  roleTone,
  userStatusLabel,
} from './admin.model';
import { AdminService } from './admin.service';
import { RoleFormComponent } from './role-form/role-form.component';
import { UserFormComponent } from './user-form/user-form.component';

const PAGE_SIZE = 10;
const SKELETON_ROWS = Array.from({ length: 5 });

type StatusFilter = 'all' | 'active' | 'inactive';
type PanelMode = 'user' | 'role';
type StatusTarget = { kind: PanelMode; id: number };

// Administración de usuarios y roles. La ruta completa requiere rol ADMIN.
@Component({
  selector: 'app-users',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    IconComponent,
    PageHeaderComponent,
    PaginationComponent,
    RoleFormComponent,
    SkeletonComponent,
    UserFormComponent,
  ],
  template: `
    <app-page-header
      title="Usuarios y roles"
      subtitle="Administra quién puede entrar al sistema y qué rol tiene cada persona."
    >
      <div actions class="admin-header-actions">
        <button
          appButton
          type="button"
          variant="secondary"
          [loading]="loading() || rolesLoading()"
          (click)="refresh()"
        >
          <app-icon name="refresh" [size]="16" />
          Actualizar
        </button>
      </div>
    </app-page-header>

    <div class="admin-tabs" role="tablist" aria-label="Usuarios y roles">
      <button
        type="button"
        role="tab"
        class="admin-tabs__tab"
        [class.admin-tabs__tab--active]="tab() === 'users'"
        [attr.aria-selected]="tab() === 'users'"
        (click)="selectTab('users')"
      >
        <app-icon name="users" [size]="16" />
        Usuarios
        <span class="admin-tabs__count">{{ totalElements() }}</span>
      </button>
      <button
        type="button"
        role="tab"
        class="admin-tabs__tab"
        [class.admin-tabs__tab--active]="tab() === 'roles'"
        [attr.aria-selected]="tab() === 'roles'"
        (click)="selectTab('roles')"
      >
        <app-icon name="lock" [size]="16" />
        Roles
        <span class="admin-tabs__count">{{ roles().length }}</span>
      </button>
    </div>

    <section class="panel admin-panel">
      <div
        class="admin-layout"
        [class.admin-layout--panel]="panelMode() !== null"
        [class.admin-layout--roles]="tab() === 'roles'"
      >
        <div class="admin-list">
          @if (tab() === 'users') {
            <div class="admin-toolbar">
              <div class="admin-search">
                <app-icon name="search" [size]="17" />
                <input
                  class="field__control admin-search__input"
                  type="search"
                  [value]="search()"
                  placeholder="Buscar por usuario, nombre o correo"
                  aria-label="Buscar por usuario, nombre o correo"
                  (input)="onSearchInput($event)"
                  (keydown.enter)="applyFilters()"
                />
              </div>

              <label class="admin-filter">
                <span class="u-sr-only">Filtrar por rol</span>
                <select
                  class="field__control admin-filter__control"
                  [value]="roleFilter() ?? ''"
                  (change)="onRoleFilterChange($event)"
                >
                  <option value="">Todos los roles</option>
                  @for (role of roles(); track role.id) {
                    <option [value]="role.id">{{ role.name }}</option>
                  }
                </select>
              </label>

              <label class="admin-filter">
                <span class="u-sr-only">Filtrar por estado</span>
                <select
                  class="field__control admin-filter__control"
                  [value]="statusFilter()"
                  (change)="onStatusChange($event)"
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Solo activos</option>
                  <option value="inactive">Solo inactivos</option>
                </select>
              </label>

              <button appButton type="button" variant="secondary" (click)="applyFilters()">
                Buscar
              </button>

              @if (hasFilters()) {
                <button appButton type="button" variant="ghost" (click)="clearFilters()">
                  Limpiar
                </button>
              }

              <button
                appButton
                type="button"
                class="admin-toolbar__action"
                (click)="startCreateUser()"
              >
                <app-icon name="plus" [size]="16" />
                Nuevo usuario
              </button>
            </div>

            @if (error(); as message) {
              <div class="admin-feedback" role="alert">
                <app-icon name="alertCircle" [size]="18" />
                <p>{{ message }}</p>
                <button
                  appButton
                  type="button"
                  size="sm"
                  variant="secondary"
                  (click)="loadUsers(page())"
                >
                  Reintentar
                </button>
              </div>
            } @else if (loading()) {
              <div class="admin-skeleton" aria-hidden="true">
                @for (row of skeletonRows; track $index) {
                  <app-skeleton height="20px" />
                }
              </div>
            } @else if (users().length === 0) {
              <app-empty-state
                icon="users"
                title="Sin usuarios"
                [description]="emptyUsersMessage()"
              >
                <button appButton type="button" (click)="startCreateUser()">
                  <app-icon name="plus" [size]="16" />
                  Registrar el primero
                </button>
              </app-empty-state>
            } @else {
              <div class="table-wrap">
                <table class="table admin-table">
                  <thead>
                    <tr>
                      <th scope="col">Usuario</th>
                      <th scope="col">Correo</th>
                      <th scope="col">Rol</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Actualizado</th>
                      <th scope="col">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (user of users(); track user.id) {
                      <tr [class.admin-row--inactive]="!user.isActive">
                        <td>
                          <span class="admin-user">
                            <strong>{{ user.fullName }}</strong>
                            @if (isCurrentUser(user)) {
                              <app-badge tone="info">Tu usuario</app-badge>
                            }
                          </span>
                          <span class="admin-meta">{{ user.username }}</span>
                        </td>
                        <td>
                          @if (user.email) {
                            {{ user.email }}
                          } @else {
                            <span class="admin-muted">Sin correo</span>
                          }
                        </td>
                        <td>
                          <app-badge [tone]="tone(user.role.code)">{{ user.role.name }}</app-badge>
                          <span class="admin-meta">{{ user.role.code }}</span>
                        </td>
                        <td>
                          <app-badge [tone]="user.isActive ? 'success' : 'neutral'" [dot]="true">
                            {{ statusLabel(user.isActive) }}
                          </app-badge>
                        </td>
                        <td class="admin-date">{{ date(user.updatedAt) }}</td>
                        <td>
                          <div class="admin-actions">
                            <button
                              appButton
                              type="button"
                              size="sm"
                              variant="ghost"
                              (click)="startEditUser(user)"
                            >
                              <app-icon name="edit" [size]="15" />
                              Editar
                            </button>

                            @if (isConfirming('user', user.id)) {
                              <span class="admin-confirm"
                                >¿{{ user.isActive ? 'Desactivar' : 'Activar' }}?</span
                              >
                              <button
                                appButton
                                type="button"
                                size="sm"
                                [variant]="user.isActive ? 'danger' : 'primary'"
                                [loading]="statusLoadingId() === user.id"
                                (click)="changeUserStatus(user)"
                              >
                                Sí
                              </button>
                              <button
                                appButton
                                type="button"
                                size="sm"
                                variant="ghost"
                                (click)="cancelStatus()"
                              >
                                No
                              </button>
                            } @else {
                              <button
                                appButton
                                type="button"
                                size="sm"
                                variant="ghost"
                                [disabled]="user.isActive && isCurrentUser(user)"
                                [title]="
                                  user.isActive && isCurrentUser(user)
                                    ? 'No puedes desactivar tu propio usuario'
                                    : ''
                                "
                                (click)="requestStatus('user', user.id)"
                              >
                                <app-icon name="power" [size]="15" />
                                {{ user.isActive ? 'Desactivar' : 'Activar' }}
                              </button>
                            }
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              @if (totalPages() > 1) {
                <app-pagination
                  [page]="page()"
                  [totalPages]="totalPages()"
                  [totalElements]="totalElements()"
                  [size]="pageSize"
                  [disabled]="loading()"
                  (pageChange)="loadUsers($event)"
                />
              }
            }
          } @else {
            <div class="admin-toolbar">
              <p class="admin-toolbar__summary">{{ rolesSummary() }}</p>
              <button
                appButton
                type="button"
                class="admin-toolbar__action"
                (click)="startCreateRole()"
              >
                <app-icon name="plus" [size]="16" />
                Nuevo rol
              </button>
            </div>

            @if (rolesError(); as message) {
              <div class="admin-feedback" role="alert">
                <app-icon name="alertCircle" [size]="18" />
                <p>{{ message }}</p>
                <button appButton type="button" size="sm" variant="secondary" (click)="loadRoles()">
                  Reintentar
                </button>
              </div>
            } @else if (rolesLoading()) {
              <div class="admin-skeleton" aria-hidden="true">
                @for (row of skeletonRows; track $index) {
                  <app-skeleton height="20px" />
                }
              </div>
            } @else if (roles().length === 0) {
              <app-empty-state
                icon="lock"
                title="Sin roles"
                description="Aún no hay roles registrados en el sistema."
              />
            } @else {
              <div class="table-wrap">
                <table class="table admin-table admin-table--roles">
                  <thead>
                    <tr>
                      <th scope="col">Rol</th>
                      <th scope="col">Descripción</th>
                      <th scope="col" class="is-numeric">Usuarios activos</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (role of roles(); track role.id) {
                      <tr [class.admin-row--inactive]="!role.isActive">
                        <td>
                          <span class="admin-user">
                            <strong>{{ role.name }}</strong>
                            <app-badge [tone]="tone(role.code)">{{ role.code }}</app-badge>
                            @if (isSystemRole(role)) {
                              <app-badge tone="neutral">Base</app-badge>
                            }
                          </span>
                        </td>
                        <td>
                          @if (role.description) {
                            {{ role.description }}
                          } @else {
                            <span class="admin-muted">Sin descripción</span>
                          }
                        </td>
                        <td class="is-numeric admin-count">{{ role.activeUsers }}</td>
                        <td>
                          <app-badge [tone]="role.isActive ? 'success' : 'neutral'" [dot]="true">
                            {{ statusLabel(role.isActive) }}
                          </app-badge>
                        </td>
                        <td>
                          <div class="admin-actions">
                            <button
                              appButton
                              type="button"
                              size="sm"
                              variant="ghost"
                              (click)="startEditRole(role)"
                            >
                              <app-icon name="edit" [size]="15" />
                              Editar
                            </button>

                            @if (isConfirming('role', role.id)) {
                              <span class="admin-confirm"
                                >¿{{ role.isActive ? 'Desactivar' : 'Activar' }}?</span
                              >
                              <button
                                appButton
                                type="button"
                                size="sm"
                                [variant]="role.isActive ? 'danger' : 'primary'"
                                [loading]="statusLoadingId() === role.id"
                                (click)="changeRoleStatus(role)"
                              >
                                Sí
                              </button>
                              <button
                                appButton
                                type="button"
                                size="sm"
                                variant="ghost"
                                (click)="cancelStatus()"
                              >
                                No
                              </button>
                            } @else {
                              <button
                                appButton
                                type="button"
                                size="sm"
                                variant="ghost"
                                [disabled]="role.isActive && !canDeactivate(role)"
                                [title]="deactivateHint(role)"
                                (click)="requestStatus('role', role.id)"
                              >
                                <app-icon name="power" [size]="15" />
                                {{ role.isActive ? 'Desactivar' : 'Activar' }}
                              </button>
                            }
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
        </div>

        @if (panelMode() === 'user') {
          <aside class="admin-side" aria-label="Formulario de usuario">
            <app-user-form
              [record]="editingUser()"
              [roles]="roleOptions()"
              [saving]="saving()"
              [error]="formError()"
              (submitted)="saveUser($event)"
              (cancelled)="closePanel()"
            />
          </aside>
        } @else if (panelMode() === 'role') {
          <aside class="admin-side" aria-label="Formulario de rol">
            <app-role-form
              [record]="editingRole()"
              [saving]="saving()"
              [error]="formError()"
              (submitted)="saveRole($event)"
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

    .admin-header-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .admin-tabs {
      display: inline-flex;
      gap: 4px;
      margin-bottom: var(--space-4);
      padding: 4px;
      background: var(--surface-muted);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
    }

    .admin-tabs__tab {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 8px 14px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      color: var(--text-muted);
      font-family: inherit;
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      cursor: pointer;
      transition:
        background var(--transition-fast),
        color var(--transition-fast),
        border-color var(--transition-fast);
    }

    .admin-tabs__tab:hover {
      color: var(--brand-700);
    }

    .admin-tabs__tab--active {
      background: var(--surface);
      border-color: var(--border);
      color: var(--brand-700);
      box-shadow: var(--shadow-sm);
    }

    .admin-tabs__count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 20px;
      padding: 0 6px;
      background: var(--brand-50);
      border-radius: 999px;
      color: var(--brand-700);
      font-size: var(--text-xs);
      font-variant-numeric: tabular-nums;
    }

    .admin-panel {
      overflow: hidden;
    }

    .admin-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
    }

    .admin-layout--panel {
      grid-template-columns: minmax(0, 1fr) 400px;
    }

    .admin-list {
      min-width: 0;
    }

    .admin-side {
      padding: var(--space-5);
      background: var(--surface-muted);
      border-left: 1px solid var(--border);
    }

    .admin-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
      padding: 16px 22px;
      border-bottom: 1px solid var(--border);
    }

    .admin-toolbar__summary {
      flex: 1;
      color: var(--text-muted);
      font-size: var(--text-sm);
    }

    .admin-toolbar__action {
      margin-left: auto;
    }

    .admin-search {
      position: relative;
      flex: 1 1 260px;
      max-width: 380px;
      color: var(--text-subtle);
    }

    .admin-search app-icon {
      position: absolute;
      top: 50%;
      left: 12px;
      transform: translateY(-50%);
      pointer-events: none;
    }

    .admin-search__input {
      padding-left: 38px;
    }

    .admin-filter {
      flex: 0 1 180px;
    }

    .admin-filter__control {
      min-height: 44px;
    }

    .admin-table {
      min-width: 900px;
    }

    .admin-table--roles {
      min-width: 820px;
    }

    .admin-row--inactive {
      opacity: 0.72;
    }

    .admin-user {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
    }

    .admin-meta {
      display: block;
      margin-top: 2px;
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .admin-muted {
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .admin-date {
      color: var(--text-muted);
      font-size: var(--text-xs);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .admin-count {
      font-variant-numeric: tabular-nums;
      font-weight: var(--weight-semibold);
    }

    .admin-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
    }

    .admin-confirm {
      color: var(--danger-700);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
    }

    .admin-skeleton {
      display: grid;
      gap: 16px;
      padding: 24px 22px;
    }

    .admin-feedback {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding: 18px 22px;
      color: var(--danger-700);
      font-size: var(--text-sm);
    }

    .admin-feedback p {
      flex: 1;
      min-width: 180px;
    }

    @media (max-width: 1240px) {
      .admin-layout--panel {
        grid-template-columns: minmax(0, 1fr);
      }

      .admin-side {
        border-top: 1px solid var(--border);
        border-left: 0;
      }
    }

    @media (max-width: 640px) {
      .admin-toolbar {
        padding: 14px 16px;
      }

      .admin-search,
      .admin-filter {
        flex-basis: 100%;
        max-width: none;
      }

      .admin-toolbar__action {
        margin-left: 0;
      }
    }
  `,
})
export class UsersComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly skeletonRows = SKELETON_ROWS;

  protected readonly tab = signal<AdminTab>('users');

  protected readonly users = signal<UserRecord[]>([]);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly search = signal('');
  protected readonly roleFilter = signal<number | null>(null);
  protected readonly statusFilter = signal<StatusFilter>('all');

  protected readonly roles = signal<Role[]>([]);
  protected readonly rolesLoading = signal(false);
  protected readonly rolesError = signal<string | null>(null);

  protected readonly panelMode = signal<PanelMode | null>(null);
  protected readonly editingUser = signal<UserRecord | null>(null);
  protected readonly editingRole = signal<Role | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly confirming = signal<StatusTarget | null>(null);
  protected readonly statusLoadingId = signal<number | null>(null);

  protected readonly roleOptions = computed(() => this.roles().filter((role) => role.isActive));

  protected readonly currentUserId = computed(() => this.auth.user()?.id ?? null);

  protected readonly hasFilters = computed(
    () =>
      this.search().trim().length > 0 ||
      this.roleFilter() !== null ||
      this.statusFilter() !== 'all',
  );

  protected readonly emptyUsersMessage = computed(() =>
    this.hasFilters()
      ? 'No hay usuarios que coincidan con los filtros aplicados.'
      : 'Aún no hay usuarios registrados en el sistema.',
  );

  protected readonly rolesSummary = computed(() => {
    const total = this.roles().length;
    const active = this.roles().filter((role) => role.isActive).length;
    return `${total} ${total === 1 ? 'rol registrado' : 'roles registrados'} · ${active} ${active === 1 ? 'activo' : 'activos'}`;
  });

  ngOnInit(): void {
    this.loadUsers(0);
    this.loadRoles();
  }

  protected selectTab(tab: AdminTab): void {
    this.tab.set(tab);
    this.closePanel();
    this.cancelStatus();
  }

  protected refresh(): void {
    this.loadRoles();

    if (this.tab() === 'users') {
      this.loadUsers(this.page());
    }
  }

  protected loadUsers(page: number): void {
    this.loading.set(true);
    this.error.set(null);

    const query: UserQuery = {
      search: this.search(),
      roleId: this.roleFilter(),
      isActive: this.isActiveFilter(),
      page,
      size: PAGE_SIZE,
    };

    this.admin.listUsers(query).subscribe({
      next: (response) => {
        this.users.set(response.content);
        this.page.set(response.page);
        this.totalPages.set(response.totalPages);
        this.totalElements.set(response.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el listado de usuarios. Intenta nuevamente.');
        this.loading.set(false);
      },
    });
  }

  protected loadRoles(): void {
    this.rolesLoading.set(true);
    this.rolesError.set(null);

    this.admin.listRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.rolesLoading.set(false);
      },
      error: () => {
        this.rolesError.set('No se pudo cargar el listado de roles. Intenta nuevamente.');
        this.rolesLoading.set(false);
      },
    });
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onRoleFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.roleFilter.set(value.length === 0 ? null : Number(value));
  }

  protected onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as StatusFilter);
  }

  protected applyFilters(): void {
    this.loadUsers(0);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.roleFilter.set(null);
    this.statusFilter.set('all');
    this.loadUsers(0);
  }

  protected startCreateUser(): void {
    this.editingUser.set(null);
    this.formError.set(null);
    this.panelMode.set('user');
  }

  protected startEditUser(user: UserRecord): void {
    this.editingUser.set(user);
    this.formError.set(null);
    this.panelMode.set('user');
  }

  protected startCreateRole(): void {
    this.editingRole.set(null);
    this.formError.set(null);
    this.panelMode.set('role');
  }

  protected startEditRole(role: Role): void {
    this.editingRole.set(role);
    this.formError.set(null);
    this.panelMode.set('role');
  }

  protected closePanel(): void {
    this.panelMode.set(null);
    this.editingUser.set(null);
    this.editingRole.set(null);
    this.formError.set(null);
  }

  protected saveUser(value: UserFormValue): void {
    const editing = this.editingUser();

    this.saving.set(true);
    this.formError.set(null);

    const request =
      editing === null ? this.admin.createUser(value) : this.admin.updateUser(editing.id, value);

    request.subscribe({
      next: (user) => {
        this.saving.set(false);
        this.toast.success(
          editing === null ? 'Usuario creado' : 'Usuario actualizado',
          user.fullName,
        );
        this.closePanel();
        this.loadUsers(editing === null ? 0 : this.page());
        this.loadRoles();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(readApiError(error, 'No se pudo guardar el usuario. Revisa los datos.'));
      },
    });
  }

  protected saveRole(value: RoleFormValue): void {
    const editing = this.editingRole();

    this.saving.set(true);
    this.formError.set(null);

    const request =
      editing === null ? this.admin.createRole(value) : this.admin.updateRole(editing.id, value);

    request.subscribe({
      next: (role) => {
        this.saving.set(false);
        this.toast.success(editing === null ? 'Rol creado' : 'Rol actualizado', role.name);
        this.closePanel();
        this.loadRoles();
        this.loadUsers(this.page());
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(readApiError(error, 'No se pudo guardar el rol. Revisa los datos.'));
      },
    });
  }

  protected requestStatus(kind: PanelMode, id: number): void {
    this.confirming.set({ kind, id });
  }

  protected cancelStatus(): void {
    this.confirming.set(null);
  }

  protected isConfirming(kind: PanelMode, id: number): boolean {
    const target = this.confirming();
    return target !== null && target.kind === kind && target.id === id;
  }

  protected changeUserStatus(user: UserRecord): void {
    this.statusLoadingId.set(user.id);

    this.admin.changeUserStatus(user.id, !user.isActive).subscribe({
      next: () => {
        this.statusLoadingId.set(null);
        this.cancelStatus();
        this.toast.success(
          user.isActive ? 'Usuario desactivado' : 'Usuario activado',
          user.fullName,
        );
        this.loadUsers(this.page());
        this.loadRoles();
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

  protected changeRoleStatus(role: Role): void {
    this.statusLoadingId.set(role.id);

    this.admin.changeRoleStatus(role.id, !role.isActive).subscribe({
      next: () => {
        this.statusLoadingId.set(null);
        this.cancelStatus();
        this.toast.success(role.isActive ? 'Rol desactivado' : 'Rol activado', role.name);
        this.loadRoles();
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

  protected canDeactivate(role: Role): boolean {
    return canDeactivateRole(role);
  }

  protected deactivateHint(role: Role): string {
    if (!role.isActive) {
      return 'Activar el rol';
    }

    if (role.code === 'ADMIN') {
      return 'El rol ADMIN no se puede desactivar';
    }

    if (role.activeUsers > 0) {
      return 'Reasigna a los usuarios activos antes de desactivar el rol';
    }

    return '';
  }

  protected isSystemRole(role: Role): boolean {
    return isSystemRole(role);
  }

  protected isCurrentUser(user: UserRecord): boolean {
    return user.id === this.currentUserId();
  }

  protected tone(code: string) {
    return roleTone(code);
  }

  protected statusLabel(isActive: boolean): string {
    return userStatusLabel(isActive);
  }

  protected date(value: string | null): string {
    return formatDate(value);
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
