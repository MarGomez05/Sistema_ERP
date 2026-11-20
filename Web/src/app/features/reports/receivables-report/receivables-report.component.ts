import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { readApiError } from '@core/http/api-error';
import { formatMoney } from '@features/products/product.model';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { StatCardComponent } from '@shared/ui/stat-card/stat-card.component';
import { formatDate, todayIso } from '@shared/util/date.util';
import { ReceivablesReport, reportBucketLabel, reportBucketTone } from '../report.model';
import { ReportService } from '../report.service';

@Component({
  selector: 'app-receivables-report',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    IconComponent,
    RouterLink,
    SkeletonComponent,
    StatCardComponent,
  ],
  template: `
    <section class="panel report-filters">
      <label class="report-filter">
        <span class="report-filter__label">Corte</span>
        <input
          class="field__control"
          type="date"
          [value]="asOf()"
          (change)="onDateChange($event)"
        />
      </label>

      <button appButton type="button" variant="secondary" [loading]="loading()" (click)="load()">
        <app-icon name="refresh" [size]="16" />
        Actualizar
      </button>
    </section>

    @if (error(); as message) {
      <div class="report-feedback" role="alert">
        <app-icon name="alertCircle" [size]="18" />
        <p>{{ message }}</p>
        <button appButton type="button" size="sm" variant="secondary" (click)="load()">
          Reintentar
        </button>
      </div>
    } @else if (loading() && report() === null) {
      <div class="report-skeleton" aria-hidden="true">
        <app-skeleton height="96px" />
        <app-skeleton height="220px" />
      </div>
    } @else if (report(); as data) {
      <section class="kpi-grid" aria-label="Resumen de cuentas por cobrar">
        <app-stat-card
          label="Saldo pendiente"
          icon="creditCard"
          tone="brand"
          [value]="formatMoney(data.totalOutstanding)"
          [hint]="data.invoiceCount + ' facturas con saldo'"
        />
        <app-stat-card
          label="Vencido"
          icon="alertTriangle"
          tone="danger"
          [value]="formatMoney(data.overdueOutstanding)"
          hint="Requiere gestión de cobro"
        />
        <app-stat-card
          label="Al día"
          icon="checkCircle"
          tone="success"
          [value]="formatMoney(data.currentOutstanding)"
          hint="Aún dentro del plazo"
        />
        <app-stat-card
          label="Clientes"
          icon="users"
          tone="info"
          [value]="data.customerCount.toString()"
          [hint]="'Corte al ' + formatDate(data.asOf)"
        />
      </section>

      <article class="panel report-panel" aria-labelledby="aging-title">
        <div class="panel__header">
          <div>
            <h2 id="aging-title" class="panel__title">Antigüedad de la deuda</h2>
            <p class="panel__subtitle">Distribución del saldo pendiente según los días vencidos.</p>
          </div>
        </div>

        <div class="panel__body">
          <div class="aging-grid">
            @for (bucket of data.buckets; track bucket.key) {
              <div class="aging-card">
                <div class="aging-card__top">
                  <span class="aging-card__label">{{ bucket.label }}</span>
                  <app-badge [tone]="bucketTone(bucket.key)" [dot]="true">
                    {{ bucket.invoiceCount }}
                  </app-badge>
                </div>
                <span class="aging-card__amount u-numeric">{{ formatMoney(bucket.amount) }}</span>
                <span class="aging-card__share"
                  >{{ share(bucket.amount, data.totalOutstanding) }} del saldo</span
                >
              </div>
            }
          </div>
        </div>
      </article>

      <article class="panel report-panel" aria-labelledby="receivables-title">
        <div class="panel__header">
          <div>
            <h2 id="receivables-title" class="panel__title">Facturas con saldo</h2>
            <p class="panel__subtitle">Ordenadas de mayor a menor antigüedad de vencimiento.</p>
          </div>
          <app-badge tone="neutral">{{ data.invoices.length }} documentos</app-badge>
        </div>

        @if (data.invoices.length === 0) {
          <app-empty-state
            icon="checkCircle"
            title="Sin cuentas por cobrar"
            description="Todas las facturas emitidas hasta el corte están pagadas."
          />
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">Factura</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Emisión</th>
                  <th scope="col">Vencimiento</th>
                  <th scope="col" class="is-numeric">Total</th>
                  <th scope="col" class="is-numeric">Pagado</th>
                  <th scope="col" class="is-numeric">Saldo</th>
                  <th scope="col">Tramo</th>
                </tr>
              </thead>
              <tbody>
                @for (item of data.invoices; track item.invoiceId) {
                  <tr>
                    <td>
                      <a class="report-link" [routerLink]="['/invoices', item.invoiceId]">
                        {{ item.invoiceNumber }}
                      </a>
                    </td>
                    <td>{{ item.customerName }}</td>
                    <td>{{ formatDate(item.issueDate) }}</td>
                    <td>
                      @if (item.dueDate === null) {
                        <span class="report-muted">Contado</span>
                      } @else {
                        {{ formatDate(item.dueDate) }}
                        @if (item.daysOverdue > 0) {
                          <span class="report-days">{{ item.daysOverdue }} días</span>
                        }
                      }
                    </td>
                    <td class="is-numeric">{{ formatMoney(item.total) }}</td>
                    <td class="is-numeric">{{ formatMoney(item.paidTotal) }}</td>
                    <td class="is-numeric is-strong">{{ formatMoney(item.balance) }}</td>
                    <td>
                      <app-badge [tone]="bucketTone(item.bucket)">
                        {{ bucketLabel(item.bucket) }}
                      </app-badge>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </article>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--space-5);
    }

    .report-filters {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--space-3);
      padding: 16px 22px;
    }

    .report-filter {
      display: grid;
      flex: 0 1 180px;
      gap: 4px;
    }

    .report-filter__label {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .report-feedback {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
      padding: 14px 18px;
      background: var(--danger-50);
      border: 1px solid var(--danger-200);
      border-radius: var(--radius-lg);
      color: var(--danger-700);
      font-size: var(--text-sm);
    }

    .report-feedback p {
      flex: 1 1 240px;
    }

    .report-skeleton {
      display: grid;
      gap: var(--space-4);
    }

    .aging-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: var(--space-3);
    }

    .aging-card {
      display: grid;
      gap: 6px;
      padding: 14px 16px;
      background: var(--surface-muted);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
    }

    .aging-card__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
    }

    .aging-card__label {
      color: var(--text-muted);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      text-transform: uppercase;
    }

    .aging-card__amount {
      color: var(--text);
      font-size: var(--text-lg);
      font-weight: var(--weight-bold);
    }

    .aging-card__share {
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .report-link {
      color: var(--brand-600);
      font-weight: var(--weight-semibold);
    }

    .report-link:hover {
      text-decoration: underline;
    }

    .report-muted {
      color: var(--text-muted);
    }

    .report-days {
      display: block;
      color: var(--danger-600);
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
    }
  `,
})
export class ReceivablesReportComponent implements OnInit {
  private readonly reports = inject(ReportService);

  protected readonly asOf = signal(todayIso());
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly report = signal<ReceivablesReport | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected onDateChange(event: Event): void {
    this.asOf.set((event.target as HTMLInputElement).value);
  }

  protected load(): void {
    if (this.asOf().length === 0) {
      this.error.set('Selecciona una fecha de corte válida.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.reports.getReceivables(this.asOf()).subscribe({
      next: (data) => {
        this.report.set(data);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(
          readApiError(
            error,
            'No se pudo generar el reporte de cuentas por cobrar. Intenta nuevamente.',
          ),
        );
      },
    });
  }

  protected share(amount: number, total: number): string {
    if (total <= 0) {
      return '0%';
    }

    return `${Math.round((amount / total) * 100)}%`;
  }

  protected bucketLabel(bucket: string): string {
    return reportBucketLabel(bucket);
  }

  protected bucketTone(bucket: string): 'success' | 'warning' | 'danger' {
    return reportBucketTone(bucket);
  }

  protected readonly formatMoney = formatMoney;
  protected readonly formatDate = formatDate;
}
