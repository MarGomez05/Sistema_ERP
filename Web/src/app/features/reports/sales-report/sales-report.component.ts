import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import { readApiError } from '@core/http/api-error';
import { formatMoney } from '@features/products/product.model';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { ColumnChartComponent } from '@shared/ui/charts/column-chart/column-chart.component';
import { ColumnChartItem } from '@shared/ui/charts/chart.model';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { StatCardComponent } from '@shared/ui/stat-card/stat-card.component';
import { formatDate, todayIso } from '@shared/util/date.util';
import { REPORT_GROUP_OPTIONS, ReportGroupBy, SalesReport } from '../report.model';
import { ReportService } from '../report.service';

function monthStart(): string {
  const today = todayIso();
  return `${today.slice(0, 7)}-01`;
}

@Component({
  selector: 'app-sales-report',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    ButtonComponent,
    ColumnChartComponent,
    EmptyStateComponent,
    IconComponent,
    SkeletonComponent,
    StatCardComponent,
  ],
  template: `
    <section class="panel report-filters">
      <label class="report-filter">
        <span class="report-filter__label">Desde</span>
        <input
          class="field__control"
          type="date"
          [value]="from()"
          (change)="onFromChange($event)"
        />
      </label>

      <label class="report-filter">
        <span class="report-filter__label">Hasta</span>
        <input class="field__control" type="date" [value]="to()" (change)="onToChange($event)" />
      </label>

      <label class="report-filter">
        <span class="report-filter__label">Agrupar</span>
        <select class="field__control" [value]="groupBy()" (change)="onGroupChange($event)">
          @for (option of groupOptions; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </label>

      <button appButton type="button" variant="secondary" [loading]="loading()" (click)="load()">
        <app-icon name="search" [size]="16" />
        Generar
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
        <app-skeleton height="240px" />
      </div>
    } @else if (report(); as data) {
      <section class="kpi-grid" aria-label="Resumen de ventas">
        <app-stat-card
          label="Ventas"
          icon="cart"
          tone="brand"
          [value]="data.salesCount.toString()"
          [hint]="'Del ' + formatDate(data.from) + ' al ' + formatDate(data.to)"
        />
        <app-stat-card
          label="Subtotal"
          icon="trendingUp"
          tone="info"
          [value]="formatMoney(data.subtotal)"
          hint="Antes de descuentos e IVA"
        />
        <app-stat-card
          label="Descuentos"
          icon="tag"
          tone="warning"
          [value]="formatMoney(data.discountTotal)"
          hint="Aplicados en el período"
        />
        <app-stat-card
          label="IVA"
          icon="receipt"
          tone="neutral"
          [value]="formatMoney(data.taxTotal)"
          hint="Impuesto trasladado"
        />
        <app-stat-card
          label="Total vendido"
          icon="creditCard"
          tone="success"
          [value]="formatMoney(data.total)"
          hint="Solo ventas confirmadas"
        />
      </section>

      <article class="panel report-panel" aria-labelledby="sales-chart-title">
        <div class="panel__header">
          <div>
            <h2 id="sales-chart-title" class="panel__title">Ventas por período</h2>
            <p class="panel__subtitle">
              Cantidad de ventas confirmadas en cada {{ groupLabel(data.groupBy) }}.
            </p>
          </div>
          <app-badge tone="brand">{{ data.series.length }} períodos</app-badge>
        </div>

        <div class="panel__body">
          @if (columns().length === 0) {
            <app-empty-state
              icon="cart"
              title="Sin ventas en el período"
              description="No se encontraron ventas confirmadas para las fechas seleccionadas."
            />
          } @else {
            <app-column-chart
              [columns]="columns()"
              caption="Altura proporcional al número de ventas confirmadas."
              ariaLabel="Ventas confirmadas por período"
            />
          }
        </div>
      </article>

      @if (data.series.length > 0) {
        <div class="table-wrap panel">
          <table class="table">
            <thead>
              <tr>
                <th scope="col">Período</th>
                <th scope="col" class="is-numeric">Ventas</th>
                <th scope="col" class="is-numeric">Total</th>
                <th scope="col" class="is-numeric">Ticket promedio</th>
              </tr>
            </thead>
            <tbody>
              @for (period of data.series; track period.period) {
                <tr>
                  <td class="is-strong">{{ period.label }}</td>
                  <td class="is-numeric">{{ period.salesCount }}</td>
                  <td class="is-numeric is-strong">{{ formatMoney(period.total) }}</td>
                  <td class="is-numeric">
                    {{ formatMoney(averageTicket(period.salesCount, period.total)) }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
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

    .report-panel {
      margin: 0;
    }
  `,
})
export class SalesReportComponent implements OnInit {
  private readonly reports = inject(ReportService);

  protected readonly groupOptions = REPORT_GROUP_OPTIONS;

  protected readonly from = signal(monthStart());
  protected readonly to = signal(todayIso());
  protected readonly groupBy = signal<ReportGroupBy>('DAY');

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly report = signal<SalesReport | null>(null);

  protected readonly columns = computed<ColumnChartItem[]>(() => {
    const data = this.report();

    if (data === null) {
      return [];
    }

    return data.series.map((period) => ({
      key: period.period,
      label: period.label,
      value: period.salesCount,
      tone: 'brand' as const,
    }));
  });

  ngOnInit(): void {
    this.load();
  }

  protected onFromChange(event: Event): void {
    this.from.set((event.target as HTMLInputElement).value);
  }

  protected onToChange(event: Event): void {
    this.to.set((event.target as HTMLInputElement).value);
  }

  protected onGroupChange(event: Event): void {
    this.groupBy.set((event.target as HTMLSelectElement).value as ReportGroupBy);
  }

  protected load(): void {
    if (this.from().length === 0 || this.to().length === 0) {
      this.error.set('Selecciona un rango de fechas válido.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.reports.getSales(this.from(), this.to(), this.groupBy()).subscribe({
      next: (data) => {
        this.report.set(data);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(
          readApiError(error, 'No se pudo generar el reporte de ventas. Intenta nuevamente.'),
        );
      },
    });
  }

  protected groupLabel(groupBy: ReportGroupBy): string {
    return groupBy === 'MONTH' ? 'mes' : 'día';
  }

  protected averageTicket(count: number, total: number): number | null {
    return count === 0 ? null : total / count;
  }

  protected readonly formatMoney = formatMoney;
  protected readonly formatDate = formatDate;
}
