import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { AuthService } from '@core/auth/auth.service';
import { RoleCode } from '@core/auth/auth.model';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { ReceivablesReportComponent } from './receivables-report/receivables-report.component';
import { ReportTab } from './report.model';
import { SalesReportComponent } from './sales-report/sales-report.component';
import { StockReportComponent } from './stock-report/stock-report.component';
import { TopProductsReportComponent } from './top-products-report/top-products-report.component';

interface ReportTabItem {
  id: ReportTab;
  label: string;
  hint: string;
  roles: readonly RoleCode[];
}

const TABS: readonly ReportTabItem[] = [
  {
    id: 'sales',
    label: 'Ventas por período',
    hint: 'Totales, descuentos e IVA de ventas confirmadas.',
    roles: ['ADMIN', 'PURCHASING', 'SELLER'],
  },
  {
    id: 'receivables',
    label: 'Cuentas por cobrar',
    hint: 'Saldos pendientes y antigüedad de la deuda.',
    roles: ['ADMIN', 'PURCHASING', 'SELLER'],
  },
  {
    id: 'top-products',
    label: 'Productos más vendidos',
    hint: 'Ranking por cantidad e importe vendido.',
    roles: ['ADMIN', 'PURCHASING', 'SELLER'],
  },
  {
    id: 'stock',
    label: 'Existencias',
    hint: 'Stock físico, vendible y exportación a PDF o Excel.',
    roles: ['ADMIN', 'WAREHOUSE', 'PURCHASING'],
  },
];

@Component({
  selector: 'app-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    ReceivablesReportComponent,
    SalesReportComponent,
    StockReportComponent,
    TopProductsReportComponent,
  ],
  template: `
    <app-page-header
      title="Reportes"
      subtitle="Analiza las ventas, la cobranza y el inventario, y exporta las existencias para compartirlas."
    />

    <nav class="report-tabs" role="tablist" aria-label="Reportes disponibles">
      @for (tab of visibleTabs(); track tab.id) {
        <button
          class="report-tab"
          type="button"
          role="tab"
          [attr.aria-selected]="active() === tab.id"
          [class.report-tab--active]="active() === tab.id"
          (click)="select(tab.id)"
        >
          <span class="report-tab__label">{{ tab.label }}</span>
          <span class="report-tab__hint">{{ tab.hint }}</span>
        </button>
      }
    </nav>

    @switch (active()) {
      @case ('sales') {
        <app-sales-report />
      }
      @case ('receivables') {
        <app-receivables-report />
      }
      @case ('top-products') {
        <app-top-products-report />
      }
      @case ('stock') {
        <app-stock-report />
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .report-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-bottom: var(--space-5);
      padding: 6px;
      background: var(--surface-muted);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
    }

    .report-tab {
      display: grid;
      flex: 1 1 200px;
      gap: 2px;
      padding: 12px 16px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      color: var(--text-muted);
      text-align: left;
      transition:
        background var(--transition-fast),
        color var(--transition-fast),
        border-color var(--transition-fast);
    }

    .report-tab:hover {
      background: var(--surface);
      color: var(--text);
    }

    .report-tab--active {
      background: var(--surface);
      border-color: var(--border-strong);
      box-shadow: var(--shadow-sm);
      color: var(--text);
    }

    .report-tab__label {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    .report-tab__hint {
      font-size: var(--text-xs);
      color: var(--text-subtle);
    }
  `,
})
export class ReportsComponent {
  private readonly auth = inject(AuthService);

  protected readonly tabs = TABS;

  protected readonly visibleTabs = computed(() =>
    TABS.filter((tab) => this.auth.canAccess(tab.roles)),
  );

  protected readonly active = signal<ReportTab>(this.visibleTabs()[0]?.id ?? 'stock');

  protected select(tab: ReportTab): void {
    this.active.set(tab);
  }
}
