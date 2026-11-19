import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { readApiError } from '@core/http/api-error';
import { ToastService } from '@core/ui/toast.service';
import { formatDateTime, formatMoney, formatQuantity } from '@features/products/product.model';
import { paymentConditionLabel } from '@features/sales/sale.model';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { formatDate, todayIso } from '@shared/util/date.util';
import { CreditNoteFormComponent } from '../credit-note-form/credit-note-form.component';
import {
  CreditNoteFormValue,
  Invoice,
  InvoicePayment,
  PaymentFormValue,
  canIssueCreditNote,
  canRegisterPayment,
  invoicePaymentMethodLabel,
  invoiceStatusLabel,
  invoiceStatusTone,
  invoiceTypeLabel,
  isCreditNote,
  isInvoiceOverdue,
  isInvoicePaid,
} from '../invoice.model';
import { InvoiceService } from '../invoice.service';
import { PaymentFormComponent } from '../payment-form/payment-form.component';

type DetailPanel = 'payment' | 'creditNote';

// Detalle de factura con snapshot, líneas, pagos e historial de cobranza (contrato 12).
@Component({
  selector: 'app-invoice-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    ButtonComponent,
    CreditNoteFormComponent,
    IconComponent,
    PageHeaderComponent,
    PaymentFormComponent,
    RouterLink,
    SkeletonComponent,
  ],
  template: `
    <app-page-header [title]="headerTitle()" [subtitle]="headerSubtitle()">
      <div actions class="detail-actions">
        <a appButton variant="secondary" [routerLink]="['/invoices']">
          <app-icon name="arrowLeft" [size]="16" />
          Volver
        </a>
        <button appButton type="button" variant="secondary" [loading]="loading()" (click)="load()">
          <app-icon name="refresh" [size]="16" />
          Actualizar
        </button>

        @if (invoice(); as current) {
          @if (current.saleId !== null) {
            <a appButton variant="secondary" [routerLink]="['/sales', current.saleId]">
              <app-icon name="cart" [size]="16" />
              Ver venta
            </a>
          }

          <button
            appButton
            type="button"
            variant="secondary"
            [loading]="pdfLoading()"
            (click)="downloadPdf(current)"
          >
            <app-icon name="download" [size]="16" />
            Descargar PDF
          </button>

          @if (canPay(current) && activePanel() === null) {
            <button appButton type="button" (click)="openPayment()">
              <app-icon name="creditCard" [size]="16" />
              Registrar pago
            </button>
          }

          @if (canCredit(current) && activePanel() === null) {
            <button appButton type="button" variant="danger" (click)="openCreditNote()">
              <app-icon name="receipt" [size]="16" />
              Nota de crédito
            </button>
          }
        }
      </div>
    </app-page-header>

    @if (loading() && invoice() === null) {
      <div class="panel detail-skeleton" aria-hidden="true">
        @for (row of skeletonRows; track $index) {
          <app-skeleton height="22px" />
        }
      </div>
    } @else if (error(); as message) {
      <div class="panel detail-feedback" role="alert">
        <app-icon name="alertCircle" [size]="20" />
        <div>
          <p class="detail-feedback__title">No se pudo cargar la factura</p>
          <p>{{ message }}</p>
        </div>
        <button appButton type="button" size="sm" variant="secondary" (click)="load()">
          Reintentar
        </button>
      </div>
    } @else if (invoice(); as current) {
      <div class="detail-layout" [class.detail-layout--panel]="activePanel() !== null">
        <div class="detail-main">
          <section class="panel" aria-labelledby="invoice-overview-title">
            <div class="panel__header">
              <div>
                <h2 id="invoice-overview-title" class="panel__title">Información del documento</h2>
                <p class="panel__subtitle">Datos fiscales congelados al momento de la emisión.</p>
              </div>
              <app-badge [tone]="statusTone(current)">{{ statusLabel(current) }}</app-badge>
            </div>

            <div class="panel__body">
              <dl class="detail-meta">
                <div>
                  <dt>Tipo</dt>
                  <dd>{{ typeLabel(current) }}</dd>
                </div>
                <div>
                  <dt>Número de control</dt>
                  <dd class="detail-meta__code">{{ current.controlNumber ?? 'Sin registrar' }}</dd>
                </div>
                <div>
                  <dt>Fecha de emisión</dt>
                  <dd class="detail-meta__code">{{ formatDate(current.issueDate) }}</dd>
                </div>
                <div>
                  <dt>Vencimiento</dt>
                  <dd class="detail-meta__code">{{ dueLabel(current) }}</dd>
                </div>
                <div>
                  <dt>Condición de pago</dt>
                  <dd>{{ conditionLabel(current) }}</dd>
                </div>
                <div>
                  <dt>Cliente</dt>
                  <dd>
                    @if (current.customerId !== null) {
                      <a class="detail-link" [routerLink]="['/customers', current.customerId]">
                        {{ current.customerName }}
                      </a>
                    } @else {
                      {{ current.customerName }}
                    }
                  </dd>
                </div>
                <div>
                  <dt>Documento</dt>
                  <dd>{{ documentLabel(current) }}</dd>
                </div>
                <div>
                  <dt>NIT</dt>
                  <dd class="detail-meta__code">{{ current.customerNit ?? '—' }}</dd>
                </div>
                <div>
                  <dt>NRC</dt>
                  <dd class="detail-meta__code">{{ current.customerNrc ?? '—' }}</dd>
                </div>
                <div>
                  <dt>Correo</dt>
                  <dd>{{ current.customerEmail ?? '—' }}</dd>
                </div>
                <div class="detail-meta__wide">
                  <dt>Dirección</dt>
                  <dd>{{ current.customerAddress ?? 'Sin dirección registrada.' }}</dd>
                </div>
                <div class="detail-meta__wide">
                  <dt>Notas</dt>
                  <dd>{{ current.notes ?? 'Sin notas registradas.' }}</dd>
                </div>

                @if (current.relatedInvoiceId !== null) {
                  <div class="detail-meta__wide">
                    <dt>Factura relacionada</dt>
                    <dd>
                      <a class="detail-link" [routerLink]="['/invoices', current.relatedInvoiceId]">
                        {{ current.relatedInvoiceNumber }}
                      </a>
                    </dd>
                  </div>
                }

                @if (current.status === 'CANCELLED') {
                  <div>
                    <dt>Cancelada el</dt>
                    <dd class="detail-meta__code">{{ formatDateTime(current.cancelledAt) }}</dd>
                  </div>
                  <div class="detail-meta__wide">
                    <dt>Motivo de cancelación</dt>
                    <dd>{{ current.cancelReason ?? 'Sin motivo registrado.' }}</dd>
                  </div>
                }
              </dl>
            </div>
          </section>

          <section class="panel" aria-labelledby="invoice-lines-title">
            <div class="panel__header">
              <div>
                <h2 id="invoice-lines-title" class="panel__title">Líneas facturadas</h2>
                <p class="panel__subtitle">Snapshot inmutable de productos y precios.</p>
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

          <section class="panel" aria-labelledby="invoice-payments-title">
            <div class="panel__header">
              <div>
                <h2 id="invoice-payments-title" class="panel__title">Historial de pagos</h2>
                <p class="panel__subtitle">Cobros registrados sobre este documento.</p>
              </div>
              <app-badge tone="neutral">{{ payments().length }} pagos</app-badge>
            </div>

            <div class="panel__body panel__body--flush">
              @if (paymentsError(); as message) {
                <p class="payments-feedback" role="alert">
                  <app-icon name="alertCircle" [size]="16" />
                  {{ message }}
                </p>
              } @else if (payments().length === 0) {
                <p class="payments-empty">
                  <app-icon name="info" [size]="16" />
                  Todavía no hay pagos registrados para esta factura.
                </p>
              } @else {
                <div class="table-wrap">
                  <table class="table detail-payments">
                    <thead>
                      <tr>
                        <th scope="col">Fecha</th>
                        <th scope="col">Método</th>
                        <th scope="col">Referencia</th>
                        <th scope="col">Registrado por</th>
                        <th scope="col" class="is-numeric">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (payment of payments(); track payment.id) {
                        <tr>
                          <td class="detail-meta__code">{{ formatDate(payment.paymentDate) }}</td>
                          <td>{{ methodLabel(payment) }}</td>
                          <td>{{ payment.reference ?? '—' }}</td>
                          <td>
                            <span>{{ payment.userName }}</span>
                            <span class="detail-line__meta">
                              {{ formatDateTime(payment.createdAt) }}
                            </span>
                          </td>
                          <td class="is-numeric">
                            <span class="detail-line__total">
                              {{ formatMoney(payment.amount) }}
                            </span>
                          </td>
                        </tr>
                        @if (payment.notes !== null) {
                          <tr class="detail-payments__note">
                            <td colspan="5">{{ payment.notes }}</td>
                          </tr>
                        }
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </section>
        </div>

        <aside class="detail-side" aria-label="Totales y acciones de la factura">
          <section class="totals-card" aria-labelledby="invoice-totals-title">
            <h2 id="invoice-totals-title" class="totals-card__title">Totales</h2>

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
                <dd [class.totals-list__pending]="current.balance > 0">
                  {{ formatMoney(current.balance) }}
                </dd>
              </div>
            </dl>

            @if (isCreditNote(current)) {
              <p class="totals-note">
                <app-icon name="info" [size]="15" />
                Nota de crédito que anula la factura
                {{ current.relatedInvoiceNumber ?? 'relacionada' }}.
              </p>
            } @else if (current.status === 'CANCELLED') {
              <p class="totals-note totals-note--danger">
                <app-icon name="alertCircle" [size]="15" />
                Documento cancelado; no admite pagos ni nuevas notas de crédito.
              </p>
            } @else if (paid(current)) {
              <p class="totals-note totals-note--success">
                <app-icon name="checkCircle" [size]="15" />
                Factura pagada en su totalidad.
              </p>
            } @else if (overdue(current)) {
              <p class="totals-note totals-note--danger">
                <app-icon name="alertTriangle" [size]="15" />
                Factura vencida con saldo pendiente.
              </p>
            } @else if (current.paymentCondition === 'CREDIT') {
              <p class="totals-note totals-note--warning">
                <app-icon name="clock" [size]="15" />
                El vencimiento se calcula con los días de crédito del cliente.
              </p>
            } @else {
              <p class="totals-note">
                <app-icon name="info" [size]="15" />
                Factura de contado pendiente de pago.
              </p>
            }
          </section>

          @if (activePanel() === 'payment') {
            <section class="panel panel--form" aria-label="Registrar pago">
              <app-payment-form
                [invoice]="current"
                [saving]="paymentSaving()"
                [error]="paymentError()"
                (submitted)="submitPayment($event)"
                (cancelled)="closePanel()"
              />
            </section>
          }

          @if (activePanel() === 'creditNote') {
            <section class="panel panel--form" aria-label="Emitir nota de crédito">
              <app-credit-note-form
                [invoice]="current"
                [saving]="creditNoteSaving()"
                [error]="creditNoteError()"
                (submitted)="submitCreditNote($event)"
                (cancelled)="closePanel()"
              />
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
      grid-template-columns: minmax(0, 1fr) 380px;
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

    .detail-meta__code {
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

    .detail-payments {
      min-width: 720px;
    }

    .detail-payments__note td {
      padding-top: 0;
      color: var(--text-muted);
      font-size: var(--text-xs);
      font-style: italic;
    }

    .payments-empty,
    .payments-feedback {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 22px;
      color: var(--text-muted);
      font-size: var(--text-sm);
    }

    .payments-feedback {
      color: var(--danger-700);
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

    .totals-note--danger {
      background: var(--danger-100);
      color: var(--danger-700);
    }

    .panel--form {
      padding: var(--space-5);
    }

    @media (max-width: 1100px) {
      .detail-layout--panel {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class InvoiceDetailComponent implements OnInit {
  private static readonly SKELETON_ROWS = Array.from({ length: 5 });

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly invoices = inject(InvoiceService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly documentRef = inject(DOCUMENT);

  private invoiceId = 0;

  protected readonly skeletonRows = InvoiceDetailComponent.SKELETON_ROWS;
  protected readonly invoice = signal<Invoice | null>(null);
  protected readonly payments = signal<InvoicePayment[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly paymentsError = signal<string | null>(null);

  protected readonly activePanel = signal<DetailPanel | null>(null);
  protected readonly pdfLoading = signal(false);
  protected readonly paymentSaving = signal(false);
  protected readonly paymentError = signal<string | null>(null);
  protected readonly creditNoteSaving = signal(false);
  protected readonly creditNoteError = signal<string | null>(null);

  protected readonly canWrite = computed(() => this.auth.canAccess(['ADMIN', 'SELLER']));
  protected readonly isAdmin = computed(() => this.auth.canAccess(['ADMIN']));

  protected readonly headerTitle = computed(() => this.invoice()?.invoiceNumber ?? 'Factura');

  protected readonly headerSubtitle = computed(() => {
    const invoice = this.invoice();

    if (invoice === null) {
      return 'Detalle de la factura';
    }

    return `${invoiceTypeLabel(invoice.invoiceType)} · ${invoiceStatusLabel(invoice.status)} · ${invoice.customerName}`;
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const raw = params.get('id');
      const id = raw === null ? Number.NaN : Number(raw);

      if (!Number.isInteger(id) || id <= 0) {
        void this.router.navigate(['/invoices']);
        return;
      }

      this.invoiceId = id;
      this.invoice.set(null);
      this.payments.set([]);
      this.paymentsError.set(null);
      this.closePanel();
      this.load();
    });
  }

  protected formatMoney(value: number): string {
    return formatMoney(value);
  }

  protected formatQuantity(value: number): string {
    return formatQuantity(value);
  }

  protected formatDate(value: string | null): string {
    return formatDate(value);
  }

  protected formatDateTime(value: string | null): string {
    return formatDateTime(value);
  }

  protected typeLabel(invoice: Invoice): string {
    return invoiceTypeLabel(invoice.invoiceType);
  }

  protected statusLabel(invoice: Invoice): string {
    return invoiceStatusLabel(invoice.status);
  }

  protected statusTone(invoice: Invoice) {
    return invoiceStatusTone(invoice.status);
  }

  protected conditionLabel(invoice: Invoice): string {
    return paymentConditionLabel(invoice.paymentCondition);
  }

  protected methodLabel(payment: InvoicePayment): string {
    return invoicePaymentMethodLabel(payment.paymentMethod);
  }

  protected documentLabel(invoice: Invoice): string {
    const type = invoice.customerDocumentType?.trim() ?? '';
    const number = invoice.customerDocumentNumber?.trim() ?? '';

    if (number.length === 0) {
      return type.length === 0 ? '—' : type;
    }

    return type.length === 0 ? number : `${type} · ${number}`;
  }

  protected dueLabel(invoice: Invoice): string {
    return invoice.dueDate === null ? 'Contado' : formatDate(invoice.dueDate);
  }

  protected isCreditNote(invoice: Invoice): boolean {
    return isCreditNote(invoice);
  }

  protected paid(invoice: Invoice): boolean {
    return isInvoicePaid(invoice);
  }

  protected overdue(invoice: Invoice): boolean {
    return isInvoiceOverdue(invoice, todayIso());
  }

  protected canPay(invoice: Invoice): boolean {
    return canRegisterPayment(invoice, this.canWrite());
  }

  protected canCredit(invoice: Invoice): boolean {
    return canIssueCreditNote(invoice, this.isAdmin());
  }

  protected downloadPdf(invoice: Invoice): void {
    this.pdfLoading.set(true);

    this.invoices.downloadPdf(invoice.id).subscribe({
      next: (blob) => {
        this.pdfLoading.set(false);

        const url = URL.createObjectURL(blob);
        const link = this.documentRef.createElement('a');

        link.href = url;
        link.download = `${invoice.invoiceNumber.replace(/[^A-Za-z0-9._-]/g, '-')}.pdf`;
        link.style.display = 'none';
        this.documentRef.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: (error: unknown) => {
        this.pdfLoading.set(false);
        this.toast.error(
          'No se pudo descargar el PDF',
          readApiError(error, 'Verifica que la factura exista e intenta nuevamente.'),
        );
      },
    });
  }

  protected openPayment(): void {
    this.paymentError.set(null);
    this.creditNoteError.set(null);
    this.activePanel.set('payment');
  }

  protected openCreditNote(): void {
    this.paymentError.set(null);
    this.creditNoteError.set(null);
    this.activePanel.set('creditNote');
  }

  protected closePanel(): void {
    this.activePanel.set(null);
    this.paymentError.set(null);
    this.creditNoteError.set(null);
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.invoices.getById(this.invoiceId).subscribe({
      next: (invoice) => {
        this.invoice.set(invoice);
        this.loading.set(false);
        this.loadPayments(invoice.id);
      },
      error: () => {
        this.error.set('No se pudo cargar la factura. Verifica que exista y vuelve a intentarlo.');
        this.loading.set(false);
      },
    });
  }

  protected submitPayment(value: PaymentFormValue): void {
    this.paymentSaving.set(true);
    this.paymentError.set(null);

    this.invoices.addPayment(this.invoiceId, value).subscribe({
      next: (payment) => {
        this.paymentSaving.set(false);
        this.activePanel.set(null);
        this.toast.success(
          'Pago registrado',
          `${formatMoney(payment.amount)} aplicados a la factura.`,
        );
        this.load();
      },
      error: (error: unknown) => {
        this.paymentSaving.set(false);
        this.paymentError.set(
          readApiError(
            error,
            'No se pudo registrar el pago. Revisa el saldo e intenta nuevamente.',
          ),
        );
      },
    });
  }

  protected submitCreditNote(value: CreditNoteFormValue): void {
    this.creditNoteSaving.set(true);
    this.creditNoteError.set(null);

    this.invoices.issueCreditNote(this.invoiceId, value).subscribe({
      next: (creditNote) => {
        this.creditNoteSaving.set(false);
        this.toast.success(
          'Nota de crédito emitida',
          `${creditNote.invoiceNumber} anuló la factura original.`,
        );
        void this.router.navigate(['/invoices', creditNote.id], { replaceUrl: true });
      },
      error: (error: unknown) => {
        this.creditNoteSaving.set(false);
        this.creditNoteError.set(
          readApiError(error, 'No se pudo emitir la nota de crédito. Intenta nuevamente.'),
        );
      },
    });
  }

  private loadPayments(invoiceId: number): void {
    this.paymentsError.set(null);

    this.invoices.findPayments(invoiceId).subscribe({
      next: (payments) => this.payments.set(payments),
      error: () => {
        this.payments.set([]);
        this.paymentsError.set('No se pudo cargar el historial de pagos.');
      },
    });
  }
}
