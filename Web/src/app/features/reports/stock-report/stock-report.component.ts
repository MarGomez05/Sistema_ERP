import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import { readApiError } from '@core/http/api-error';
import { ToastService } from '@core/ui/toast.service';
import { ProductService } from '@features/products/product.service';
import { ProductSelectOption, formatMoney } from '@features/products/product.model';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { StatCardComponent } from '@shared/ui/stat-card/stat-card.component';
import { formatDate } from '@shared/util/date.util';
import {
  StockExportFormat,
  StockReport,
  StockReportRow,
  formatQuantity,
  stockExportFilename,
} from '../report.model';
import { ReportService } from '../report.service';

@Component({
  selector: 'app-stock-report',
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
      <label class="report-filter report-filter--wide">
        <span class="report-filter__label">Categoría</span>
        <select
          class="field__control"
          [value]="categoryId() ?? ''"
          (change)="onCategoryChange($event)"
        >
          <option value="">Todas las categorías</option>
          @for (category of categories(); track category.id) {
            <option [value]="category.id">{{ category.name }}</option>
          }
        </select>
      </label>

      <label class="report-filter report-filter--wide">
        <span class="report-filter__label">Buscar producto</span>
        <input
          class="field__control"
          type="search"
          placeholder="Código o nombre"
          [value]="search()"
          (input)="onSearchChange($event)"
        />
      </label>

      <button appButton type="button" variant="secondary" [loading]="loading()" (click)="load()">
        <app-icon name="refresh" [size]="16" />
        Actualizar
      </button>

      <button
        appButton
        type="button"
        variant="secondary"
        [loading]="exporting() === 'PDF'"
        [disabled]="report() === null || exporting() !== null"
        (click)="download('PDF')"
      >
        <app-icon name="download" [size]="16" />
        PDF
      </button>

      <button
        appButton
        type="button"
        variant="secondary"
        [loading]="exporting() === 'XLSX'"
        [disabled]="report() === null || exporting() !== null"
        (click)="download('XLSX')"
      >
        <app-icon name="download" [size]="16" />
        Excel
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
        <app-skeleton height="280px" />
      </div>
    } @else if (report(); as data) {
      <section class="kpi-grid" aria-label="Resumen de existencias">
        <app-stat-card
          label="Presentaciones"
          icon="package"
          tone="brand"
          [value]="data.totalPresentations.toString()"
          [hint]="'Generado el ' + formatDate(data.generatedAt)"
        />
        <app-stat-card
          label="Bajo stock"
          icon="alertTriangle"
          tone="warning"
          [value]="data.lowStockPresentations.toString()"
          hint="Stock vendible bajo el mínimo"
        />
        <app-stat-card
          label="Categoría"
          icon="tag"
          tone="info"
          [value]="data.categoryName"
          hint="Filtro aplicado al reporte"
        />
      </section>

      <article class="panel report-panel" aria-labelledby="stock-report-title">
        <div class="panel__header">
          <div>
            <h2 id="stock-report-title" class="panel__title">Existencias por presentación</h2>
            <p class="panel__subtitle">
              Existencia física, stock vendible (excluye lotes vencidos) y precio vigente.
            </p>
          </div>
          <app-badge tone="neutral">{{ rows().length }} filas</app-badge>
        </div>

        @if (rows().length === 0) {
          <app-empty-state
            icon="package"
            title="Sin existencias que mostrar"
            description="No hay presentaciones activas para el filtro seleccionado."
          />
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">Código</th>
                  <th scope="col">Producto</th>
                  <th scope="col">Presentación</th>
                  <th scope="col" class="is-numeric">Física</th>
                  <th scope="col" class="is-numeric">Vendible</th>
                  <th scope="col" class="is-numeric">Mínimo</th>
                  <th scope="col" class="is-numeric">Precio</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (item of rows(); track item.productPresentationId) {
                  <tr>
                    <td class="report-code">{{ item.productCode }}</td>
                    <td class="is-strong">{{ item.productName }}</td>
                    <td>{{ item.presentationName }}</td>
                    <td class="is-numeric">{{ formatQuantity(item.physicalStock) }}</td>
                    <td class="is-numeric">{{ formatQuantity(item.sellableStock) }}</td>
                    <td class="is-numeric">{{ formatQuantity(item.minStock) }}</td>
                    <td class="is-numeric">
                      @if (item.currentPrice === null) {
                        <span class="report-muted">Sin precio</span>
                      } @else {
                        {{ formatMoney(item.currentPrice) }}
                      }
                    </td>
                    <td>
                      <app-badge [tone]="item.lowStock ? 'danger' : 'success'">
                        {{ item.lowStock ? 'Bajo stock' : 'Disponible' }}
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

    .report-filter--wide {
      flex: 0 1 230px;
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

    .report-muted {
      color: var(--text-muted);
    }
  `,
})
export class StockReportComponent implements OnInit {
  private readonly reports = inject(ReportService);
  private readonly products = inject(ProductService);
  private readonly toast = inject(ToastService);
  private readonly documentRef = inject(DOCUMENT);

  protected readonly categoryId = signal<number | null>(null);
  protected readonly search = signal('');

  protected readonly categories = signal<ProductSelectOption[]>([]);

  protected readonly loading = signal(false);
  protected readonly exporting = signal<StockExportFormat | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly report = signal<StockReport | null>(null);

  protected readonly rows = computed<StockReportRow[]>(() => {
    const data = this.report();
    const term = this.search().trim().toLowerCase();

    if (data === null) {
      return [];
    }

    if (term.length === 0) {
      return data.rows;
    }

    return data.rows.filter(
      (row) =>
        row.productCode.toLowerCase().includes(term) ||
        row.productName.toLowerCase().includes(term) ||
        row.presentationName.toLowerCase().includes(term),
    );
  });

  ngOnInit(): void {
    this.products.getCategoryOptions().subscribe({
      next: (options) => this.categories.set(options),
      error: () => this.categories.set([]),
    });

    this.load();
  }

  protected onCategoryChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;

    this.categoryId.set(value.length === 0 ? null : Number(value));
    this.load();
  }

  protected onSearchChange(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.reports.getStock(this.categoryId()).subscribe({
      next: (data) => {
        this.report.set(data);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(
          readApiError(error, 'No se pudo generar el reporte de existencias. Intenta nuevamente.'),
        );
      },
    });
  }

  protected download(format: StockExportFormat): void {
    const data = this.report();

    if (data === null) {
      return;
    }

    this.exporting.set(format);

    this.reports.downloadStockExport(format, this.categoryId()).subscribe({
      next: (blob) => {
        this.exporting.set(null);

        const url = URL.createObjectURL(blob);
        const link = this.documentRef.createElement('a');

        link.href = url;
        link.download = stockExportFilename(format, data.generatedAt);
        link.style.display = 'none';
        this.documentRef.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        this.toast.success(
          'Reporte descargado',
          `Se generó el archivo ${format === 'PDF' ? 'PDF' : 'Excel'} de existencias.`,
        );
      },
      error: (error: unknown) => {
        this.exporting.set(null);
        this.toast.error(
          'No se pudo descargar el reporte',
          readApiError(error, 'Verifica el filtro seleccionado e intenta nuevamente.'),
        );
      },
    });
  }

  protected readonly formatMoney = formatMoney;
  protected readonly formatQuantity = formatQuantity;
  protected readonly formatDate = formatDate;
}
