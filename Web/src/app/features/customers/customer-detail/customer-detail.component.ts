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
import { readApiError } from '@core/http/api-error';
import { ToastService } from '@core/ui/toast.service';
import { formatDateTime, formatMoney } from '@features/products/product.model';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { CustomerCreditFormComponent } from '../customer-credit-form/customer-credit-form.component';
import { CustomerFormComponent } from '../customer-form/customer-form.component';
import {
  CreditFormValue,
  Customer,
  CustomerFormValue,
  availableCredit,
  creditDaysLabel,
  creditLimitLabel,
  creditStatusLabel,
  creditTone,
  creditUsagePercent,
  customerTypeLabel,
  documentSummary,
} from '../customer.model';
import { CustomerService } from '../customer.service';

type DetailPanel = 'edit' | 'credit';

// Detalle del cliente con saldo, crédito, edición, estado y condiciones comerciales (contrato 10).
@Component({
  selector: 'app-customer-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    ButtonComponent,
    CustomerCreditFormComponent,
    CustomerFormComponent,
    IconComponent,
    PageHeaderComponent,
    RouterLink,
    SkeletonComponent,
  ],
  template: `
    <app-page-header [title]="headerTitle()" [subtitle]="headerSubtitle()">
      <div actions class="detail-actions">
        <a appButton variant="secondary" [routerLink]="['/customers']">
          <app-icon name="arrowLeft" [size]="16" />
          Volver
        </a>
        <button appButton type="button" variant="secondary" [loading]="loading()" (click)="load()">
          <app-icon name="refresh" [size]="16" />
          Actualizar
        </button>

        @if (customer(); as current) {
          @if (canWrite()) {
            <button appButton type="button" variant="secondary" (click)="startEdit()">
              <app-icon name="edit" [size]="16" />
              Editar cliente
            </button>
          }

          @if (canManageCredit()) {
            <button appButton type="button" variant="secondary" (click)="startCredit()">
              <app-icon name="creditCard" [size]="16" />
              Crédito
            </button>
          }

          @if (canManageStatus()) {
            @if (confirmingStatus()) {
              <span class="detail-confirm">
                ¿{{ current.isActive ? 'Desactivar' : 'Activar' }} cliente?
              </span>
              <button
                appButton
                type="button"
                size="sm"
                [variant]="current.isActive ? 'danger' : 'primary'"
                [loading]="statusLoading()"
                (click)="changeStatus(current)"
              >
                Sí, {{ current.isActive ? 'desactivar' : 'activar' }}
              </button>
              <button
                appButton
                type="button"
                size="sm"
                variant="ghost"
                (click)="confirmingStatus.set(false)"
              >
                Cancelar
              </button>
            } @else {
              <button
                appButton
                type="button"
                variant="secondary"
                [loading]="statusLoading()"
                (click)="requestStatusChange()"
              >
                <app-icon name="power" [size]="16" />
                {{ current.isActive ? 'Desactivar' : 'Activar' }}
              </button>
            }
          }
        }
      </div>
    </app-page-header>

    @if (loading() && customer() === null) {
      <div class="panel detail-skeleton" aria-hidden="true">
        @for (row of skeletonRows; track $index) {
          <app-skeleton height="22px" />
        }
      </div>
    } @else if (error(); as message) {
      <div class="panel detail-feedback" role="alert">
        <app-icon name="alertCircle" [size]="20" />
        <div>
          <p class="detail-feedback__title">No se pudo cargar el cliente</p>
          <p>{{ message }}</p>
        </div>
        <button appButton type="button" size="sm" variant="secondary" (click)="load()">
          Reintentar
        </button>
      </div>
    } @else if (customer(); as current) {
      <div class="detail-layout" [class.detail-layout--panel]="activePanel() !== null">
        <div class="detail-main">
          <section class="panel" aria-labelledby="customer-overview-title">
            <div class="panel__header">
              <div>
                <h2 id="customer-overview-title" class="panel__title">Información general</h2>
                <p class="panel__subtitle">Datos fiscales, contacto y trazabilidad del cliente.</p>
              </div>
              <app-badge [tone]="current.isActive ? 'success' : 'neutral'" [dot]="true">
                {{ current.isActive ? 'Activo' : 'Inactivo' }}
              </app-badge>
            </div>

            <div class="panel__body">
              <dl class="detail-meta">
                <div>
                  <dt>Tipo de cliente</dt>
                  <dd>
                    <app-badge tone="brand">
                      {{ customerTypeLabel(current.customerType) }}
                    </app-badge>
                  </dd>
                </div>
                <div>
                  <dt>Documento</dt>
                  <dd>{{ documentSummary(current) }}</dd>
                </div>
                <div>
                  <dt>Nombre comercial</dt>
                  <dd>{{ current.tradeName ?? '—' }}</dd>
                </div>
                <div>
                  <dt>NIT</dt>
                  <dd>{{ current.nit ?? '—' }}</dd>
                </div>
                <div>
                  <dt>NRC</dt>
                  <dd>{{ current.nrc ?? '—' }}</dd>
                </div>
                <div>
                  <dt>DUI</dt>
                  <dd>{{ current.dui ?? '—' }}</dd>
                </div>
                <div>
                  <dt>Teléfono</dt>
                  <dd>{{ current.phone ?? '—' }}</dd>
                </div>
                <div>
                  <dt>Correo</dt>
                  <dd>{{ current.email ?? '—' }}</dd>
                </div>
                <div class="detail-meta__wide">
                  <dt>Dirección</dt>
                  <dd>{{ current.address ?? '—' }}</dd>
                </div>
                <div>
                  <dt>Registrado</dt>
                  <dd class="detail-meta__date">{{ formatDateTime(current.createdAt) }}</dd>
                </div>
                <div>
                  <dt>Última actualización</dt>
                  <dd class="detail-meta__date">{{ formatDateTime(current.updatedAt) }}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section class="panel" aria-labelledby="customer-credit-title">
            <div class="panel__header">
              <div>
                <h2 id="customer-credit-title" class="panel__title">Crédito y saldo</h2>
                <p class="panel__subtitle">
                  Saldo pendiente de facturas emitidas y línea de crédito autorizada.
                </p>
              </div>
              <app-badge [tone]="creditTone(current)">{{ creditStatusLabel(current) }}</app-badge>
            </div>

            <div class="panel__body credit-body">
              <dl class="credit-stats">
                <div>
                  <dt>Límite de crédito</dt>
                  <dd>{{ creditLimitLabel(current) }}</dd>
                </div>
                <div>
                  <dt>Días de crédito</dt>
                  <dd>{{ creditDaysLabel(current) }}</dd>
                </div>
                <div>
                  <dt>Saldo pendiente</dt>
                  <dd>{{ formatMoney(current.outstandingBalance) }}</dd>
                </div>
                <div>
                  <dt>Disponible</dt>
                  <dd
                    [class.credit-stats__danger]="creditTone(current) === 'danger'"
                    [class.credit-stats__warning]="creditTone(current) === 'warning'"
                  >
                    {{ formatMoney(availableCredit(current)) }}
                  </dd>
                </div>
              </dl>

              @if (current.creditLimit > 0) {
                <div class="credit-meter">
                  <div
                    class="credit-meter__track"
                    role="img"
                    [attr.aria-label]="'Uso del crédito: ' + usagePercent(current) + ' %'"
                  >
                    <span
                      class="credit-meter__fill"
                      [class.credit-meter__fill--warning]="creditTone(current) === 'warning'"
                      [class.credit-meter__fill--danger]="creditTone(current) === 'danger'"
                      [style.width.%]="usagePercent(current)"
                    ></span>
                  </div>
                  <p class="credit-meter__caption">
                    Uso del crédito: <strong>{{ usagePercent(current) }} %</strong>
                  </p>
                </div>
              } @else {
                <p class="credit-note">
                  <app-icon name="info" [size]="15" />
                  El cliente no tiene línea de crédito; las ventas deben ser de contado.
                </p>
              }

              @if (!current.isActive) {
                <p class="credit-note credit-note--warning">
                  <app-icon name="alertTriangle" [size]="15" />
                  El cliente está inactivo y no puede usarse en ventas nuevas.
                </p>
              }
            </div>
          </section>
        </div>

        @if (activePanel() !== null) {
          <aside class="detail-side" aria-label="Panel del cliente">
            @if (activePanel() === 'edit') {
              <app-customer-form
                [record]="current"
                [saving]="saving()"
                [error]="formError()"
                (submitted)="saveCustomer($event)"
                (cancelled)="closePanel()"
              />
            } @else {
              <app-customer-credit-form
                [record]="current"
                [saving]="savingCredit()"
                [error]="creditError()"
                (submitted)="saveCredit($event)"
                (cancelled)="closePanel()"
              />
            }
          </aside>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .detail-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
    }

    .detail-confirm {
      color: var(--danger-700);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
    }

    .detail-skeleton {
      display: grid;
      gap: 16px;
      padding: 24px 22px;
    }

    .detail-feedback {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 14px;
      padding: 20px 22px;
      color: var(--danger-700);
      font-size: var(--text-sm);
    }

    .detail-feedback > div {
      flex: 1;
      min-width: 220px;
    }

    .detail-feedback__title {
      font-weight: var(--weight-semibold);
    }

    .detail-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-5);
    }

    .detail-layout--panel {
      grid-template-columns: minmax(0, 1fr) 390px;
      align-items: start;
    }

    .detail-main {
      display: grid;
      gap: var(--space-5);
      min-width: 0;
    }

    .detail-side {
      position: sticky;
      top: calc(var(--header-height) + var(--space-4));
      padding: var(--space-5);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }

    .detail-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: var(--space-4);
      margin: 0;
    }

    .detail-meta__wide {
      grid-column: 1 / -1;
    }

    .detail-meta dt {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .detail-meta dd {
      margin: 6px 0 0;
      color: var(--text);
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      overflow-wrap: anywhere;
    }

    .detail-meta__date {
      font-variant-numeric: tabular-nums;
      font-weight: var(--weight-medium);
    }

    .credit-body {
      display: grid;
      gap: var(--space-5);
    }

    .credit-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: var(--space-4);
      margin: 0;
    }

    .credit-stats dt {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .credit-stats dd {
      margin: 6px 0 0;
      font-size: var(--text-xl);
      font-weight: var(--weight-bold);
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.01em;
    }

    .credit-stats__warning {
      color: var(--warning-700);
    }

    .credit-stats__danger {
      color: var(--danger-700);
    }

    .credit-meter {
      display: grid;
      gap: 8px;
      max-width: 640px;
    }

    .credit-meter__track {
      height: 10px;
      overflow: hidden;
      background: var(--surface-muted);
      border: 1px solid var(--border);
      border-radius: var(--radius-pill);
    }

    .credit-meter__fill {
      display: block;
      height: 100%;
      background: var(--gradient-brand);
      border-radius: inherit;
      transition: width var(--transition);
    }

    .credit-meter__fill--warning {
      background: linear-gradient(90deg, var(--warning-500), var(--warning-700));
    }

    .credit-meter__fill--danger {
      background: linear-gradient(90deg, #d4574c, var(--danger-700));
    }

    .credit-meter__caption {
      color: var(--text-muted);
      font-size: var(--text-xs);
    }

    .credit-note {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 12px;
      background: var(--info-100);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--info-700);
      font-size: var(--text-xs);
      line-height: 1.5;
    }

    .credit-note--warning {
      background: var(--warning-100);
      color: var(--warning-700);
    }

    @media (max-width: 1240px) {
      .detail-layout--panel {
        grid-template-columns: minmax(0, 1fr);
      }

      .detail-side {
        position: static;
      }
    }
  `,
})
export class CustomerDetailComponent implements OnInit {
  private static readonly SKELETON_ROWS = Array.from({ length: 5 });

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly customers = inject(CustomerService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  private customerId = 0;

  protected readonly skeletonRows = CustomerDetailComponent.SKELETON_ROWS;
  protected readonly customer = signal<Customer | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly activePanel = signal<DetailPanel | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly savingCredit = signal(false);
  protected readonly creditError = signal<string | null>(null);

  protected readonly confirmingStatus = signal(false);
  protected readonly statusLoading = signal(false);

  protected readonly canWrite = computed(() => this.auth.canAccess(['ADMIN', 'SELLER']));

  protected readonly canManageCredit = computed(() => this.auth.canAccess(['ADMIN']));

  protected readonly canManageStatus = computed(() => this.auth.canAccess(['ADMIN']));

  protected readonly headerTitle = computed(() => this.customer()?.legalName ?? 'Cliente');

  protected readonly headerSubtitle = computed(() => {
    const customer = this.customer();

    if (customer === null) {
      return 'Detalle del cliente';
    }

    return `${customerTypeLabel(customer.customerType)} · ${documentSummary(customer)}`;
  });

  ngOnInit(): void {
    const raw = this.route.snapshot.paramMap.get('id');
    const id = raw === null ? Number.NaN : Number(raw);

    if (!Number.isInteger(id) || id <= 0) {
      void this.router.navigate(['/customers']);
      return;
    }

    this.customerId = id;
    this.load();
  }

  protected formatMoney(value: number): string {
    return formatMoney(value);
  }

  protected formatDateTime(value: string | null): string {
    return formatDateTime(value);
  }

  protected customerTypeLabel(type: Customer['customerType']): string {
    return customerTypeLabel(type);
  }

  protected documentSummary(customer: Customer): string {
    return documentSummary(customer);
  }

  protected creditLimitLabel(customer: Customer): string {
    return creditLimitLabel(customer);
  }

  protected creditDaysLabel(customer: Customer): string {
    return creditDaysLabel(customer);
  }

  protected creditStatusLabel(customer: Customer): string {
    return creditStatusLabel(customer);
  }

  protected creditTone(customer: Customer) {
    return creditTone(customer);
  }

  protected availableCredit(customer: Customer): number {
    return availableCredit(customer);
  }

  protected usagePercent(customer: Customer): number {
    return creditUsagePercent(customer);
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.customers.getById(this.customerId).subscribe({
      next: (customer) => {
        this.customer.set(customer);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el cliente. Verifica que exista y vuelve a intentarlo.');
        this.loading.set(false);
      },
    });
  }

  protected startEdit(): void {
    this.formError.set(null);
    this.activePanel.set('edit');
  }

  protected startCredit(): void {
    this.creditError.set(null);
    this.activePanel.set('credit');
  }

  protected closePanel(): void {
    this.activePanel.set(null);
    this.formError.set(null);
    this.creditError.set(null);
  }

  protected saveCustomer(value: CustomerFormValue): void {
    const customer = this.customer();

    if (customer === null) {
      return;
    }

    this.saving.set(true);
    this.formError.set(null);

    this.customers
      .update(customer.id, value, {
        creditLimit: customer.creditLimit,
        creditDays: customer.creditDays,
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.customer.set(updated);
          this.closePanel();
          this.toast.success('Cliente actualizado', updated.legalName);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.formError.set(
            readApiError(error, 'No se pudo guardar el cliente. Revisa los datos.'),
          );
        },
      });
  }

  protected saveCredit(value: CreditFormValue): void {
    const customer = this.customer();

    if (customer === null) {
      return;
    }

    this.savingCredit.set(true);
    this.creditError.set(null);

    this.customers.changeCredit(customer.id, value).subscribe({
      next: (updated) => {
        this.savingCredit.set(false);
        this.customer.set(updated);
        this.closePanel();
        this.toast.success('Condiciones de crédito actualizadas', updated.legalName);
      },
      error: (error: unknown) => {
        this.savingCredit.set(false);
        this.creditError.set(
          readApiError(error, 'No se pudieron actualizar las condiciones de crédito.'),
        );
      },
    });
  }

  protected requestStatusChange(): void {
    this.confirmingStatus.set(true);
  }

  protected changeStatus(customer: Customer): void {
    this.statusLoading.set(true);

    this.customers.changeStatus(customer.id, !customer.isActive).subscribe({
      next: () => {
        this.statusLoading.set(false);
        this.confirmingStatus.set(false);
        this.toast.success(
          customer.isActive ? 'Cliente desactivado' : 'Cliente activado',
          customer.legalName,
        );
        this.load();
      },
      error: (error: unknown) => {
        this.statusLoading.set(false);
        this.toast.error(
          'No se pudo cambiar el estado',
          readApiError(error, 'Intenta nuevamente.'),
        );
      },
    });
  }
}
