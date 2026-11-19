import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { readApiError } from '@core/http/api-error';
import { ToastService } from '@core/ui/toast.service';
import { InvoiceService } from '@features/billing/invoice.service';
import {
  ISSUED_INVOICE_TYPE_OPTIONS,
  Invoice,
  IssuedInvoiceType,
  canCreateInvoice,
} from '@features/billing/invoice.model';
import { formatDateTime, formatMoney, formatQuantity } from '@features/products/product.model';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import {
  Sale,
  canCancelSale,
  canConfirmSale,
  canEditSale,
  isFullyPaid,
  paymentConditionLabel,
  paymentMethodLabel,
  pendingAmount,
  saleStatusLabel,
  saleStatusTone,
} from '../sale.model';
import { SaleService } from '../sale.service';

// Detalle de una venta con líneas, totales, confirmación y cancelación (contrato 11).
@Component({
  selector: 'app-sale-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    ButtonComponent,
    IconComponent,
    PageHeaderComponent,
    ReactiveFormsModule,
    RouterLink,
    SkeletonComponent,
  ],
  template: `
    <app-page-header [title]="headerTitle()" [subtitle]="headerSubtitle()">
      <div actions class="detail-actions">
        <a appButton variant="secondary" [routerLink]="['/sales']">
          <app-icon name="arrowLeft" [size]="16" />
          Volver
        </a>
        <button appButton type="button" variant="secondary" [loading]="loading()" (click)="load()">
          <app-icon name="refresh" [size]="16" />
          Actualizar
        </button>

        @if (sale(); as current) {
          @if (canEdit(current)) {
            <a appButton variant="secondary" [routerLink]="['/sales', current.id, 'edit']">
              <app-icon name="edit" [size]="16" />
              Editar
            </a>
          }

          @if (canConfirm(current)) {
            @if (confirming()) {
              <span class="detail-confirm">¿Confirmar y descontar stock?</span>
              <button
                appButton
                type="button"
                size="sm"
                [loading]="confirmingAction()"
                (click)="confirmSale(current)"
              >
                Sí, confirmar
              </button>
              <button
                appButton
                type="button"
                size="sm"
                variant="ghost"
                [disabled]="confirmingAction()"
                (click)="confirming.set(false)"
              >
                Cancelar
              </button>
            } @else {
              <button appButton type="button" (click)="confirming.set(true)">
                <app-icon name="checkCircle" [size]="16" />
                Confirmar venta
              </button>
            }
          }

          @if (canInvoice(current) && !invoiceOpen() && issuedInvoice() === null) {
            <button appButton type="button" (click)="openInvoice(current)">
              <app-icon name="receipt" [size]="16" />
              Facturar
            </button>
          }

          @if (canCancel(current)) {
            <button appButton type="button" variant="danger" (click)="openCancel()">
              <app-icon name="close" [size]="16" />
              Cancelar venta
            </button>
          }
        }
      </div>
    </app-page-header>

    @if (loading() && sale() === null) {
      <div class="panel detail-skeleton" aria-hidden="true">
        @for (row of skeletonRows; track $index) {
          <app-skeleton height="22px" />
        }
      </div>
    } @else if (error(); as message) {
      <div class="panel detail-feedback" role="alert">
        <app-icon name="alertCircle" [size]="20" />
        <div>
          <p class="detail-feedback__title">No se pudo cargar la venta</p>
          <p>{{ message }}</p>
        </div>
        <button appButton type="button" size="sm" variant="secondary" (click)="load()">
          Reintentar
        </button>
      </div>
    } @else if (sale(); as current) {
      <div class="detail-layout" [class.detail-layout--panel]="cancelOpen() || invoiceOpen()">
        <div class="detail-main">
          <section class="panel" aria-labelledby="sale-overview-title">
            <div class="panel__header">
              <div>
                <h2 id="sale-overview-title" class="panel__title">Información de la venta</h2>
                <p class="panel__subtitle">Cliente, vendedor y condiciones registradas.</p>
              </div>
              <app-badge [tone]="statusTone(current)">{{ statusLabel(current) }}</app-badge>
            </div>

            <div class="panel__body">
              <dl class="detail-meta">
                <div>
                  <dt>Número</dt>
                  <dd class="detail-meta__sale">{{ current.saleNumber }}</dd>
                </div>
                <div>
                  <dt>Fecha</dt>
                  <dd class="detail-meta__date">{{ formatDateTime(current.saleDate) }}</dd>
                </div>
                <div>
                  <dt>Cliente</dt>
                  <dd>
                    @if (current.customer; as customer) {
                      <a class="detail-link" [routerLink]="['/customers', customer.id]">
                        {{ customer.legalName }}
                      </a>
                    } @else {
                      Consumidor final
                    }
                  </dd>
                </div>
                <div>
                  <dt>Vendedor</dt>
                  <dd>{{ current.seller.fullName }}</dd>
                </div>
                <div>
                  <dt>Condición de pago</dt>
                  <dd>{{ conditionLabel(current) }}</dd>
                </div>
                <div>
                  <dt>Método de pago</dt>
                  <dd>{{ methodLabel(current) }}</dd>
                </div>
                <div class="detail-meta__wide">
                  <dt>Notas</dt>
                  <dd>{{ current.notes ?? 'Sin notas registradas.' }}</dd>
                </div>

                @if (current.status === 'CANCELLED') {
                  <div>
                    <dt>Cancelada el</dt>
                    <dd class="detail-meta__date">{{ formatDateTime(current.cancelledAt) }}</dd>
                  </div>
                  <div class="detail-meta__wide">
                    <dt>Motivo de cancelación</dt>
                    <dd>{{ current.cancelReason ?? 'Sin motivo registrado.' }}</dd>
                  </div>
                }
              </dl>
            </div>
          </section>

          <section class="panel" aria-labelledby="sale-lines-title">
            <div class="panel__header">
              <div>
                <h2 id="sale-lines-title" class="panel__title">Líneas de la venta</h2>
                <p class="panel__subtitle">
                  Precios con IVA incluido; la base y el IVA los calcula el servidor.
                </p>
              </div>
              <app-badge tone="neutral">{{ current.details.length }} líneas</app-badge>
            </div>

            <div class="panel__body panel__body--flush">
              <div class="table-wrap">
                <table class="table detail-lines">
                  <thead>
                    <tr>
                      <th scope="col">Producto</th>
                      <th scope="col" class="is-numeric">Cantidad</th>
                      <th scope="col" class="is-numeric">Precio</th>
                      <th scope="col" class="is-numeric">Descuento</th>
                      <th scope="col" class="is-numeric">IVA</th>
                      <th scope="col" class="is-numeric">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (line of current.details; track line.id) {
                      <tr>
                        <td>
                          <span class="detail-line__name">{{ line.productName }}</span>
                          <span class="detail-line__meta">
                            {{ line.productCode }} · {{ line.presentationName }}
                          </span>
                        </td>
                        <td class="is-numeric">{{ formatQuantity(line.quantity) }}</td>
                        <td class="is-numeric">{{ formatMoney(line.unitPrice) }}</td>
                        <td class="is-numeric">{{ formatMoney(line.discount) }}</td>
                        <td class="is-numeric">
                          {{ formatMoney(line.taxAmount) }}
                          <span class="detail-line__meta">{{ line.taxRate }} %</span>
                        </td>
                        <td class="is-numeric">
                          <span class="detail-line__total">{{ formatMoney(line.lineTotal) }}</span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        <aside class="detail-side" aria-label="Totales y acciones de la venta">
          <section class="totals-card" aria-labelledby="sale-totals-title">
            <h2 id="sale-totals-title" class="totals-card__title">Totales</h2>

            <dl class="totals-list">
              <div>
                <dt>Subtotal</dt>
                <dd>{{ formatMoney(current.subtotal) }}</dd>
              </div>
              <div>
                <dt>Descuentos</dt>
                <dd>{{ formatMoney(current.discountTotal) }}</dd>
              </div>
              <div>
                <dt>IVA</dt>
                <dd>{{ formatMoney(current.taxTotal) }}</dd>
              </div>
              <div class="totals-list__grand">
                <dt>Total</dt>
                <dd>{{ formatMoney(current.total) }}</dd>
              </div>
              <div>
                <dt>Pagado</dt>
                <dd>{{ formatMoney(current.paidTotal) }}</dd>
              </div>
              <div>
                <dt>Saldo pendiente</dt>
                <dd [class.totals-list__pending]="!isPaid(current)">
                  {{ formatMoney(pendingOf(current)) }}
                </dd>
              </div>
            </dl>

            @if (isPaid(current)) {
              <p class="totals-note totals-note--success">
                <app-icon name="checkCircle" [size]="15" />
                Venta pagada en su totalidad.
              </p>
            } @else {
              <p class="totals-note">
                <app-icon name="info" [size]="15" />
                Los pagos y la factura se gestionan en el módulo de facturación.
              </p>
            }

            @if (current.status === 'DRAFT') {
              <p class="totals-note totals-note--warning">
                <app-icon name="alertTriangle" [size]="15" />
                La venta está en borrador: el stock se descuenta al confirmarla.
              </p>
            }
          </section>

          @if (issuedInvoice(); as invoice) {
            <section class="invoice-card invoice-card--success" aria-labelledby="sale-invoice-done">
              <h2 id="sale-invoice-done" class="invoice-card__title">Factura emitida</h2>
              <p class="invoice-card__text">
                {{ invoice.invoiceNumber }} por {{ formatMoney(invoice.total) }}. Los pagos se
                registran desde el detalle de la factura.
              </p>
              <div class="invoice-card__actions">
                <a appButton [routerLink]="['/invoices', invoice.id]">
                  <app-icon name="receipt" [size]="16" />
                  Ver factura
                </a>
              </div>
            </section>
          }

          @if (invoiceOpen()) {
            <section class="invoice-card" aria-labelledby="sale-invoice-title">
              <h2 id="sale-invoice-title" class="invoice-card__title">Emitir factura</h2>
              <p class="invoice-card__text">
                La factura se genera desde {{ current.saleNumber }} con condición
                {{ conditionLabel(current) }}; cliente, líneas y totales quedan congelados.
              </p>

              @if (invoiceError(); as message) {
                <p class="invoice-card__error" role="alert">
                  <app-icon name="alertCircle" [size]="15" />
                  {{ message }}
                </p>
              }

              <form [formGroup]="invoiceForm" (ngSubmit)="issueInvoice(current)" novalidate>
                <div class="field">
                  <label class="field__label" for="sale-invoice-type">
                    Tipo de factura <span class="field__required" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="sale-invoice-type"
                    class="field__control"
                    formControlName="invoiceType"
                  >
                    @for (option of invoiceTypes; track option.value) {
                      <option [value]="option.value">{{ option.label }}</option>
                    }
                  </select>
                  <p class="field__hint">{{ invoiceTypeHint(current) }}</p>
                </div>

                <div class="field">
                  <label class="field__label" for="sale-invoice-control">Número de control</label>
                  <input
                    id="sale-invoice-control"
                    class="field__control"
                    type="text"
                    formControlName="controlNumber"
                    maxlength="30"
                    placeholder="Opcional, máximo 30 caracteres"
                  />
                  <p class="field__hint">Si se usa, debe ser único en el sistema.</p>
                </div>

                <div class="field">
                  <label class="field__label" for="sale-invoice-notes">Notas</label>
                  <textarea
                    id="sale-invoice-notes"
                    class="field__control"
                    rows="2"
                    formControlName="notes"
                    maxlength="255"
                    placeholder="Opcional, máximo 255 caracteres"
                  ></textarea>
                </div>

                @if (current.paymentCondition === 'CREDIT') {
                  <p class="invoice-card__note">
                    <app-icon name="clock" [size]="15" />
                    El vencimiento se calcula con los días de crédito del cliente.
                  </p>
                }

                <div class="invoice-card__actions">
                  <button
                    appButton
                    type="button"
                    variant="secondary"
                    [disabled]="invoiceSaving()"
                    (click)="closeInvoice()"
                  >
                    Volver
                  </button>
                  <button
                    appButton
                    type="submit"
                    [loading]="invoiceSaving()"
                    [disabled]="
                      invoiceForm.controls.invoiceType.value === 'CCF' && current.customer === null
                    "
                  >
                    <app-icon name="receipt" [size]="16" />
                    Emitir factura
                  </button>
                </div>
              </form>
            </section>
          }

          @if (cancelOpen()) {
            <section class="cancel-card" aria-labelledby="sale-cancel-title">
              <h2 id="sale-cancel-title" class="cancel-card__title">Cancelar venta</h2>
              <p class="cancel-card__text">
                La cancelación es irreversible. Si la venta está confirmada, el stock vuelve a los
                lotes de origen.
              </p>

              @if (cancelError(); as message) {
                <p class="cancel-card__error" role="alert">
                  <app-icon name="alertCircle" [size]="15" />
                  {{ message }}
                </p>
              }

              <form [formGroup]="cancelForm" (ngSubmit)="cancelSale(current)" novalidate>
                <div class="field">
                  <label class="field__label" for="sale-cancel-reason">Motivo</label>
                  <textarea
                    id="sale-cancel-reason"
                    class="field__control"
                    rows="3"
                    formControlName="reason"
                    maxlength="255"
                    placeholder="Opcional, máximo 255 caracteres"
                  ></textarea>
                  <p class="field__hint">Opcional. Se guarda en el historial de la venta.</p>
                </div>

                <div class="cancel-card__actions">
                  <button
                    appButton
                    type="button"
                    variant="secondary"
                    [disabled]="cancelLoading()"
                    (click)="closeCancel()"
                  >
                    Volver
                  </button>
                  <button appButton type="submit" variant="danger" [loading]="cancelLoading()">
                    Confirmar cancelación
                  </button>
                </div>
              </form>
            </section>
          }
        </aside>
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
      grid-template-columns: minmax(0, 1fr) 360px;
      align-items: start;
    }

    .detail-main {
      display: grid;
      gap: var(--space-5);
      min-width: 0;
    }

    .detail-side {
      display: grid;
      gap: var(--space-4);
      min-width: 0;
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
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      overflow-wrap: anywhere;
    }

    .detail-meta__sale,
    .detail-meta__date {
      font-variant-numeric: tabular-nums;
    }

    .detail-link {
      color: var(--brand-700);
      text-decoration: none;
    }

    .detail-link:hover {
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .detail-lines {
      min-width: 760px;
    }

    .detail-line__name {
      display: block;
      font-weight: var(--weight-semibold);
    }

    .detail-line__meta {
      display: block;
      margin-top: 2px;
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .detail-line__total {
      font-weight: var(--weight-semibold);
      font-variant-numeric: tabular-nums;
    }

    .totals-card {
      padding: var(--space-5);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }

    .totals-card__title {
      margin-bottom: var(--space-4);
      font-size: var(--text-base);
      font-weight: var(--weight-semibold);
    }

    .totals-list {
      display: grid;
      gap: 10px;
      margin: 0 0 var(--space-4);
      padding: 0 0 var(--space-4);
      border-bottom: 1px solid var(--border);
    }

    .totals-list > div {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--space-3);
    }

    .totals-list dt {
      color: var(--text-muted);
      font-size: var(--text-sm);
    }

    .totals-list dd {
      margin: 0;
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      font-variant-numeric: tabular-nums;
    }

    .totals-list__grand {
      padding: 10px 0;
      border-top: 1px dashed var(--border);
      border-bottom: 1px dashed var(--border);
    }

    .totals-list__grand dt {
      color: var(--text);
      font-weight: var(--weight-semibold);
    }

    .totals-list__grand dd {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      letter-spacing: -0.02em;
    }

    .totals-list__pending {
      color: var(--warning-700);
    }

    .totals-note {
      display: flex;
      align-items: flex-start;
      gap: 7px;
      margin-top: 10px;
      padding: 9px 10px;
      background: var(--info-100);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--info-700);
      font-size: var(--text-xs);
      line-height: 1.5;
    }

    .totals-note--success {
      background: var(--success-100);
      color: var(--success-700);
    }

    .totals-note--warning {
      background: var(--warning-100);
      color: var(--warning-700);
    }

    .invoice-card {
      padding: var(--space-5);
      background: var(--surface);
      border: 1px solid var(--brand-200);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }

    .invoice-card--success {
      border-color: var(--success-100);
    }

    .invoice-card__title {
      font-size: var(--text-base);
      font-weight: var(--weight-semibold);
      color: var(--brand-700);
    }

    .invoice-card--success .invoice-card__title {
      color: var(--success-700);
    }

    .invoice-card__text {
      margin-top: 6px;
      color: var(--text-muted);
      font-size: var(--text-xs);
      line-height: 1.55;
    }

    .invoice-card__error {
      display: flex;
      align-items: flex-start;
      gap: 7px;
      margin-top: 10px;
      padding: 9px 10px;
      background: var(--danger-100);
      border-radius: var(--radius-sm);
      color: var(--danger-700);
      font-size: var(--text-xs);
      line-height: 1.5;
    }

    .invoice-card__note {
      display: flex;
      align-items: flex-start;
      gap: 7px;
      padding: 9px 10px;
      background: var(--warning-100);
      border-radius: var(--radius-sm);
      color: var(--warning-700);
      font-size: var(--text-xs);
      line-height: 1.5;
    }

    .invoice-card form {
      display: grid;
      gap: var(--space-4);
      margin-top: var(--space-4);
    }

    .invoice-card__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-2);
      margin-top: var(--space-4);
    }

    .cancel-card {
      padding: var(--space-5);
      background: var(--surface);
      border: 1px solid #f0cdca;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }

    .cancel-card__title {
      font-size: var(--text-base);
      font-weight: var(--weight-semibold);
      color: var(--danger-700);
    }

    .cancel-card__text {
      margin-top: 6px;
      color: var(--text-muted);
      font-size: var(--text-xs);
      line-height: 1.55;
    }

    .cancel-card__error {
      display: flex;
      align-items: flex-start;
      gap: 7px;
      margin-top: 10px;
      padding: 9px 10px;
      background: var(--danger-100);
      border-radius: var(--radius-sm);
      color: var(--danger-700);
      font-size: var(--text-xs);
      line-height: 1.5;
    }

    .cancel-card form {
      display: grid;
      gap: var(--space-4);
      margin-top: var(--space-4);
    }

    .cancel-card__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-2);
    }

    @media (max-width: 1100px) {
      .detail-layout--panel {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class SaleDetailComponent implements OnInit {
  private static readonly SKELETON_ROWS = Array.from({ length: 5 });

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sales = inject(SaleService);
  private readonly invoicesService = inject(InvoiceService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly formBuilder = inject(FormBuilder);

  private saleId = 0;

  protected readonly skeletonRows = SaleDetailComponent.SKELETON_ROWS;
  protected readonly sale = signal<Sale | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly confirming = signal(false);
  protected readonly confirmingAction = signal(false);

  protected readonly cancelOpen = signal(false);
  protected readonly cancelError = signal<string | null>(null);
  protected readonly cancelLoading = signal(false);

  protected readonly cancelForm = this.formBuilder.nonNullable.group({
    reason: ['', [Validators.maxLength(255)]],
  });

  protected readonly invoiceTypes = ISSUED_INVOICE_TYPE_OPTIONS;
  protected readonly invoiceOpen = signal(false);
  protected readonly invoiceSaving = signal(false);
  protected readonly invoiceError = signal<string | null>(null);
  protected readonly issuedInvoice = signal<Invoice | null>(null);

  protected readonly invoiceForm = this.formBuilder.nonNullable.group({
    invoiceType: this.formBuilder.nonNullable.control<IssuedInvoiceType>('CONSUMER', [
      Validators.required,
    ]),
    controlNumber: ['', [Validators.maxLength(30)]],
    notes: ['', [Validators.maxLength(255)]],
  });

  protected readonly headerTitle = computed(() => this.sale()?.saleNumber ?? 'Venta');

  protected readonly headerSubtitle = computed(() => {
    const sale = this.sale();

    if (sale === null) {
      return 'Detalle de la venta';
    }

    return `${saleStatusLabel(sale.status)} · ${formatDateTime(sale.saleDate)} · ${sale.customer?.legalName ?? 'Consumidor final'}`;
  });

  ngOnInit(): void {
    const raw = this.route.snapshot.paramMap.get('id');
    const id = raw === null ? Number.NaN : Number(raw);

    if (!Number.isInteger(id) || id <= 0) {
      void this.router.navigate(['/sales']);
      return;
    }

    this.saleId = id;
    this.load();
  }

  protected formatMoney(value: number): string {
    return formatMoney(value);
  }

  protected formatQuantity(value: number): string {
    return formatQuantity(value);
  }

  protected formatDateTime(value: string | null): string {
    return formatDateTime(value);
  }

  protected statusLabel(sale: Sale): string {
    return saleStatusLabel(sale.status);
  }

  protected statusTone(sale: Sale) {
    return saleStatusTone(sale.status);
  }

  protected conditionLabel(sale: Sale): string {
    return paymentConditionLabel(sale.paymentCondition);
  }

  protected methodLabel(sale: Sale): string {
    return paymentMethodLabel(sale.paymentMethod);
  }

  protected pendingOf(sale: Sale): number {
    return pendingAmount(sale);
  }

  protected isPaid(sale: Sale): boolean {
    return isFullyPaid(sale);
  }

  protected canEdit(sale: Sale): boolean {
    return canEditSale(sale, this.auth.user()?.id ?? null, this.auth.canAccess(['ADMIN']));
  }

  protected canConfirm(sale: Sale): boolean {
    return canConfirmSale(sale, this.auth.user()?.id ?? null, this.auth.canAccess(['ADMIN']));
  }

  protected canCancel(sale: Sale): boolean {
    return canCancelSale(sale, this.auth.canAccess(['ADMIN']));
  }

  protected canInvoice(sale: Sale): boolean {
    return canCreateInvoice(sale.status, this.auth.canAccess(['ADMIN', 'SELLER']));
  }

  protected invoiceTypeHint(sale: Sale): string {
    if (this.invoiceForm.controls.invoiceType.value !== 'CCF') {
      return 'Permitido con o sin cliente registrado.';
    }

    return sale.customer === null
      ? 'El CCF requiere un cliente registrado; esta venta no tiene uno.'
      : 'Requiere un cliente registrado con datos fiscales.';
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.sales.getById(this.saleId).subscribe({
      next: (sale) => {
        this.sale.set(sale);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la venta. Verifica que exista y vuelve a intentarlo.');
        this.loading.set(false);
      },
    });
  }

  protected confirmSale(sale: Sale): void {
    this.confirmingAction.set(true);

    this.sales.confirm(sale.id).subscribe({
      next: (updated) => {
        this.confirmingAction.set(false);
        this.confirming.set(false);
        this.sale.set(updated);
        this.toast.success(
          'Venta confirmada',
          `${updated.saleNumber} descontó stock de los lotes.`,
        );
      },
      error: (error: unknown) => {
        this.confirmingAction.set(false);
        this.toast.error(
          'No se pudo confirmar la venta',
          readApiError(error, 'Revisa el stock disponible e intenta nuevamente.'),
        );
      },
    });
  }

  protected openCancel(): void {
    this.cancelError.set(null);
    this.cancelForm.reset({ reason: '' });
    this.cancelOpen.set(true);
  }

  protected closeCancel(): void {
    this.cancelOpen.set(false);
    this.cancelError.set(null);
  }

  protected cancelSale(sale: Sale): void {
    this.cancelForm.markAllAsTouched();

    if (this.cancelForm.invalid) {
      return;
    }

    this.cancelLoading.set(true);
    this.cancelError.set(null);

    this.sales.cancel(sale.id, this.cancelForm.getRawValue().reason).subscribe({
      next: (updated) => {
        this.cancelLoading.set(false);
        this.cancelOpen.set(false);
        this.sale.set(updated);
        this.toast.success('Venta cancelada', updated.saleNumber);
      },
      error: (error: unknown) => {
        this.cancelLoading.set(false);
        this.cancelError.set(
          readApiError(error, 'No se pudo cancelar la venta. Intenta nuevamente.'),
        );
      },
    });
  }

  protected openInvoice(sale: Sale): void {
    this.invoiceError.set(null);
    this.invoiceForm.reset({
      invoiceType: sale.customer === null ? 'CONSUMER' : 'CCF',
      controlNumber: '',
      notes: '',
    });
    this.invoiceForm.markAsPristine();
    this.invoiceForm.markAsUntouched();
    this.invoiceOpen.set(true);
  }

  protected closeInvoice(): void {
    this.invoiceOpen.set(false);
    this.invoiceError.set(null);
  }

  protected issueInvoice(sale: Sale): void {
    this.invoiceForm.markAllAsTouched();

    if (this.invoiceForm.invalid) {
      return;
    }

    const raw = this.invoiceForm.getRawValue();

    if (raw.invoiceType === 'CCF' && sale.customer === null) {
      this.invoiceError.set('La factura CCF requiere un cliente registrado en la venta.');
      return;
    }

    this.invoiceSaving.set(true);
    this.invoiceError.set(null);

    this.invoicesService.create(sale.id, raw, sale.paymentCondition).subscribe({
      next: (invoice) => {
        this.invoiceSaving.set(false);
        this.invoiceOpen.set(false);
        this.issuedInvoice.set(invoice);
        this.toast.success(
          'Factura emitida',
          `${invoice.invoiceNumber} se generó desde ${sale.saleNumber}.`,
        );
      },
      error: (error: unknown) => {
        this.invoiceSaving.set(false);
        this.invoiceError.set(
          readApiError(
            error,
            'No se pudo emitir la factura. Verifica que la venta esté confirmada y sin factura previa.',
          ),
        );
      },
    });
  }
}
