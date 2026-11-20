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
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { StatCardComponent } from '@shared/ui/stat-card/stat-card.component';
import { formatDate, todayIso } from '@shared/util/date.util';
import { TopProductsReport, formatQuantity } from '../report.model';
import { ReportService } from '../report.service';

const LIMIT_OPTIONS = [5, 10, 20, 50] as const;

function monthStart(): string {
  const today = todayIso();
  return `${today.slice(0, 7)}-01`;
}

@Component({
  selector: 'app-top-products-report',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    ButtonComponent,
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

      <label class="report-filter report-filter--short">
        <span class="report-filter__label">Cantidad</span>
        <select class="field__control" [value]="limit()" (change)="onLimitChange($event)">
          @for (option of limitOptions; track option) {
            <option [value]="option">Top {{ option }}</option>
          }
        </select>
      </label>

      <button appButton type="button" variant="secondary" [loading]="loading()" (click)="load()">
        <app-icon name="trendingUp" [size]="16" />
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
        <app-skeleton height="260px" />
      </div>
    } @else if (report(); as data) {
      <section class="kpi-grid" aria-label="Resumen de productos vendidos">
        <app-stat-card
          label="Productos en el ranking"
          icon="package"
          tone="brand"
          [value]="data.products.length.toString()"
          [hint]="'Del ' + formatDate(data.from) + ' al ' + formatDate(data.to)"
        />
        <app-stat-card
          label="Unidades vendidas"
          icon="cart"
          tone="info"
          [value]="formatQuantity(totalQuantity())"
          hint="Suma de las presentaciones vendidas"
        />
        <app-stat-card
          label="Importe vendido"
          icon="creditCard"
          tone="success"
          [value]="formatMoney(totalAmount())"
          hint="Total de las líneas incluidas"
        />
      </section>

      <article class="panel report-panel" aria-labelledby="top-products-title">
        <div class="panel__header">
          <div>
            <h2 id="top-products-title" class="panel__title">Productos más vendidos</h2>
            <p class="panel__subtitle">
              Ordenados por cantidad vendida en ventas confirmadas. El empate se resuelve por
              importe.
            </p>
          </div>
          <app-badge tone="brand">Top {{ data.products.length }}</app-badge>
        </div>

        @if (data.products.length === 0) {
          <app-empty-state
            icon="package"
            title="Sin productos vendidos"
            description="No hay ventas confirmadas de productos en el rango seleccionado."
          />
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Código</th>
                  <th scope="col">Producto</th>
                  <th scope="col" class="is-numeric">Cantidad</th>
                  <th scope="col" class="is-numeric">Ventas</th>
                  <th scope="col" class="is-numeric">Importe</th>
                  <th scope="col">Participación</th>
                </tr>
              </thead>
              <tbody>
                @for (item of data.products; track item.productId; let index = $index) {
                  <tr>
                    <td class="is-muted">{{ index + 1 }}</td>
                    <td class="report-code">{{ item.productCode }}</td>
                    <td class="is-strong">{{ item.productName }}</td>
                    <td class="is-numeric">{{ formatQuantity(item.quantity) }}</td>
                    <td class="is-numeric">{{ item.salesCount }}</td>
                    <td class="is-numeric is-strong">{{ formatMoney(item.total) }}</td>
                    <td class="report-share">
                      <span class="report-share__bar">
                        <span
                          class="report-share__fill"
                          [style.width.%]="participation(item.quantity)"
                        ></span>
                      </span>
                      <span class="report-share__value">{{ participation(item.quantity) }}%</span>
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

    .report-filter--short {
      flex: 0 1 140px;
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

    .report-code {
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }

    .report-share {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 150px;
    }

    .report-share__bar {
      flex: 1;
      height: 6px;
      background: var(--surface-muted);
      border-radius: 999px;
      overflow: hidden;
    }

    .report-share__fill {
      display: block;
      height: 100%;
      background: linear-gradient(90deg, var(--brand-400), var(--brand-600));
      border-radius: inherit;
    }

    .report-share__value {
      color: var(--text-muted);
      font-size: var(--text-xs);
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class TopProductsReportComponent implements OnInit {
  private readonly reports = inject(ReportService);

  protected readonly limitOptions = LIMIT_OPTIONS;

  protected readonly from = signal(monthStart());
  protected readonly to = signal(todayIso());
  protected readonly limit = signal<number>(10);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly report = signal<TopProductsReport | null>(null);

  protected readonly totalQuantity = computed(
    () => this.report()?.products.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
  );

  protected readonly totalAmount = computed(
    () => this.report()?.products.reduce((sum, item) => sum + item.total, 0) ?? 0,
  );

  private readonly maxQuantity = computed(() =>
    Math.max(1, ...(this.report()?.products.map((item) => item.quantity) ?? [1])),
  );

  ngOnInit(): void {
    this.load();
  }

  protected onFromChange(event: Event): void {
    this.from.set((event.target as HTMLInputElement).value);
  }

  protected onToChange(event: Event): void {
    this.to.set((event.target as HTMLInputElement).value);
  }

  protected onLimitChange(event: Event): void {
    this.limit.set(Number((event.target as HTMLSelectElement).value));
  }

  protected load(): void {
    if (this.from().length === 0 || this.to().length === 0) {
      this.error.set('Selecciona un rango de fechas válido.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.reports.getTopProducts(this.from(), this.to(), this.limit()).subscribe({
      next: (data) => {
        this.report.set(data);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(
          readApiError(
            error,
            'No se pudo generar el reporte de productos más vendidos. Intenta nuevamente.',
          ),
        );
      },
    });
  }

  // Participación relativa al producto líder del ranking.
  protected participation(quantity: number): number {
    return Math.round((quantity / this.maxQuantity()) * 100);
  }

  protected readonly formatMoney = formatMoney;
  protected readonly formatQuantity = formatQuantity;
  protected readonly formatDate = formatDate;
}
