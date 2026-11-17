import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import { AuthService } from '@core/auth/auth.service';
import { ROLE_LABELS } from '@core/auth/auth.model';
import { BadgeComponent, BadgeTone } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { BarChartComponent } from '@shared/ui/charts/bar-chart/bar-chart.component';
import { ColumnChartComponent } from '@shared/ui/charts/column-chart/column-chart.component';
import { DonutChartComponent } from '@shared/ui/charts/donut-chart/donut-chart.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { PaginationComponent } from '@shared/ui/pagination/pagination.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { StatCardComponent } from '@shared/ui/stat-card/stat-card.component';
import { StockBarItem } from '@shared/ui/charts/chart.model';
import {
  DashboardSummary,
  ExpirationSeverity,
  ExpiringLotItem,
  LowStockItem,
} from './dashboard.model';
import { DashboardService } from './dashboard.service';
import { PageResponse } from '@core/models/api.model';
import { buildExpirationBuckets, buildLotDonut, buildStockBars } from './dashboard.charts';

const LOW_STOCK_PAGE_SIZE = 10;

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BarChartComponent,
    BadgeComponent,
    ButtonComponent,
    ColumnChartComponent,
    DonutChartComponent,
    EmptyStateComponent,
    IconComponent,
    PageHeaderComponent,
    PaginationComponent,
    SkeletonComponent,
    StatCardComponent,
  ],
  template: `
    <app-page-header [title]="'Panel general'" [subtitle]="subtitle()">
      @if (!isSeller()) {
        <button
          actions
          appButton
          type="button"
          variant="secondary"
          [loading]="refreshing()"
          (click)="refresh()"
        >
          <app-icon name="refresh" [size]="16" />
          Actualizar
        </button>
      }
    </app-page-header>

    <!-- Rol de ventas: aún no hay módulos habilitados para su perfil. -->
    @if (isSeller()) {
      <section class="panel welcome">
        <div class="welcome__icon">
          <app-icon name="user" [size]="26" />
        </div>
        <div class="welcome__content">
          <p class="welcome__eyebrow">{{ today() }}</p>
          <h2 class="welcome__title">{{ greeting() }}, {{ firstName() }}</h2>
          <p class="welcome__text">
            Tu cuenta está activa y tu sesión se inició correctamente. Los indicadores de inventario
            están reservados para los perfiles de administración y bodega.
          </p>
          <p class="welcome__text">
            El módulo de ventas se habilitará en un próximo entregable del sistema.
          </p>

          <dl class="welcome__meta">
            <div>
              <dt>Usuario</dt>
              <dd>{{ username() }}</dd>
            </div>
            <div>
              <dt>Perfil</dt>
              <dd>
                <app-badge tone="brand" [dot]="true">{{ roleLabel() }}</app-badge>
              </dd>
            </div>
          </dl>
        </div>
      </section>
    }

    @if (!isSeller()) {
      <!-- Indicadores generales (ADMIN y WAREHOUSE) -->
      @if (canSeeSummary()) {
        @if (summaryError()) {
          <div class="inline-alert" role="alert">
            <app-icon name="alertCircle" [size]="18" />
            <p>{{ summaryError() }}</p>
            <button appButton type="button" size="sm" variant="secondary" (click)="loadSummary()">
              Reintentar
            </button>
          </div>
        } @else {
          <section class="kpi-grid" aria-label="Indicadores del inventario">
            <app-stat-card
              label="Productos activos"
              icon="package"
              tone="brand"
              hint="Catálogo vigente"
              [value]="summaryMetric('activeProducts')"
              [loading]="summaryLoading() && summary() === null"
            />
            <app-stat-card
              label="Bajo stock"
              icon="alertTriangle"
              tone="warning"
              hint="Presentaciones bajo el mínimo"
              [value]="summaryMetric('lowStockProducts')"
              [loading]="summaryLoading() && summary() === null"
            />
            <app-stat-card
              label="Lotes activos"
              icon="database"
              tone="info"
              hint="Con existencias disponibles"
              [value]="summaryMetric('activeLots')"
              [loading]="summaryLoading() && summary() === null"
            />
            <app-stat-card
              label="Por vencer"
              icon="clock"
              tone="warning"
              hint="Próximos 30 días"
              [value]="summaryMetric('expiringLots')"
              [loading]="summaryLoading() && summary() === null"
            />
            <app-stat-card
              label="Lotes vencidos"
              icon="calendar"
              tone="danger"
              hint="Requieren revisión"
              [value]="summaryMetric('expiredLots')"
              [loading]="summaryLoading() && summary() === null"
            />
          </section>

          <section class="analytics" aria-label="Análisis del inventario">
            <article class="panel analytics__panel" aria-labelledby="lots-health-title">
              <div class="panel__header">
                <div>
                  <h2 id="lots-health-title" class="panel__title">Estado de los lotes activos</h2>
                  <p class="panel__subtitle">
                    Distribución de los lotes con existencias disponibles.
                  </p>
                </div>
                @if (summary() !== null) {
                  <app-badge tone="info">{{ summaryMetric('activeLots') }} lotes</app-badge>
                }
              </div>

              <div class="panel__body analytics__body">
                @if (summaryLoading() && summary() === null) {
                  <div class="chart-skeleton chart-skeleton--donut">
                    <app-skeleton width="184px" height="184px" radius="50%" />
                    <div class="chart-skeleton__legend">
                      @for (row of skeletonRows; track $index) {
                        <app-skeleton height="12px" />
                      }
                    </div>
                  </div>
                } @else if (donutSegments().length === 0) {
                  <app-empty-state
                    icon="database"
                    title="Sin lotes activos"
                    description="No hay lotes con existencias disponibles para analizar."
                  />
                } @else {
                  <app-donut-chart
                    [segments]="donutSegments()"
                    [centerValue]="summaryMetric('activeLots')"
                    centerCaption="lotes activos"
                    [ariaLabel]="donutAriaLabel()"
                  />
                }
              </div>
            </article>

            <article class="panel analytics__panel" aria-labelledby="expiration-chart-title">
              <div class="panel__header">
                <div>
                  <h2 id="expiration-chart-title" class="panel__title">Vencimientos próximos</h2>
                  <p class="panel__subtitle">
                    Lotes vencidos y con vencimiento dentro de los próximos 30 días.
                  </p>
                </div>
                @if (expirationTotal() > 0) {
                  <app-badge tone="danger" [dot]="true">{{ expirationTotal() }} lotes</app-badge>
                }
              </div>

              <div class="panel__body analytics__body">
                @if (expiringError()) {
                  <div class="inline-alert inline-alert--inline" role="alert">
                    <app-icon name="alertCircle" [size]="18" />
                    <p>{{ expiringError() }}</p>
                    <button
                      appButton
                      type="button"
                      size="sm"
                      variant="secondary"
                      (click)="loadExpiringLots()"
                    >
                      Reintentar
                    </button>
                  </div>
                } @else if (expiringLoading() && expiringLots().length === 0) {
                  <div class="chart-skeleton chart-skeleton--columns">
                    @for (row of skeletonColumns; track $index) {
                      <app-skeleton [width]="row.width" [height]="row.height" />
                    }
                  </div>
                } @else if (expiringLots().length === 0) {
                  <app-empty-state
                    icon="checkCircle"
                    title="Sin vencimientos próximos"
                    description="No hay lotes vencidos ni por vencer en los próximos 30 días."
                  />
                } @else {
                  <app-column-chart
                    [columns]="expirationBuckets()"
                    [ariaLabel]="expirationAriaLabel()"
                    caption="Cantidad de lotes por rango de días."
                  />
                }
              </div>
            </article>
          </section>
        }
      }

      <!-- Bajo stock -->
      @if (canSeeLowStock()) {
        <section class="panel" aria-labelledby="low-stock-title">
          <div class="panel__header">
            <div>
              <h2 id="low-stock-title" class="panel__title">Presentaciones con bajo stock</h2>
              <p class="panel__subtitle">
                Existencias por debajo del mínimo definido para cada presentación.
              </p>
            </div>
            @if (lowStock() !== null) {
              <app-badge tone="warning" [dot]="true"> {{ lowStockTotal() }} en alerta </app-badge>
            }
          </div>

          <div class="panel__body panel__body--flush">
            @if (lowStockError()) {
              <div class="inline-alert inline-alert--flush" role="alert">
                <app-icon name="alertCircle" [size]="18" />
                <p>{{ lowStockError() }}</p>
                <button
                  appButton
                  type="button"
                  size="sm"
                  variant="secondary"
                  (click)="loadLowStock(pageIndex())"
                >
                  Reintentar
                </button>
              </div>
            } @else if (lowStockLoading() && lowStock() === null) {
              <div class="table-skeleton">
                @for (row of skeletonRows; track $index) {
                  <app-skeleton height="18px" />
                }
              </div>
            } @else if (lowStockItems().length === 0) {
              <app-empty-state
                icon="checkCircle"
                title="Sin alertas de bajo stock"
                description="Todas las presentaciones activas tienen existencias suficientes."
              />
            } @else {
              <div class="stock-chart">
                <app-bar-chart [items]="stockBars()" />
              </div>

              <div class="table-wrap">
                <table class="table">
                  <thead>
                    <tr>
                      <th scope="col">Código</th>
                      <th scope="col">Producto</th>
                      <th scope="col">Presentación</th>
                      <th scope="col" class="is-numeric">Stock actual</th>
                      <th scope="col" class="is-numeric">Mínimo</th>
                      <th scope="col" class="is-numeric">Faltante</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (
                      item of lowStockItems();
                      track item.productId + '-' + item.presentationName
                    ) {
                      <tr>
                        <td class="is-muted">{{ item.productCode }}</td>
                        <td class="is-strong">{{ item.productName }}</td>
                        <td>{{ item.presentationName }}</td>
                        <td class="is-numeric">{{ formatQuantity(item.currentStock) }}</td>
                        <td class="is-numeric is-muted">{{ formatQuantity(item.minStock) }}</td>
                        <td class="is-numeric">
                          <app-badge tone="danger">
                            {{ formatQuantity(item.missing) }}
                          </app-badge>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              @if (lowStock(); as page) {
                <app-pagination
                  [page]="page.page"
                  [totalPages]="page.totalPages"
                  [totalElements]="page.totalElements"
                  [size]="page.size"
                  [disabled]="lowStockLoading()"
                  (pageChange)="loadLowStock($event)"
                />
              }
            }
          </div>
        </section>
      }

      <!-- Lotes por vencer -->
      @if (canSeeSummary()) {
        <section class="panel" aria-labelledby="expiring-title">
          <div class="panel__header">
            <div>
              <h2 id="expiring-title" class="panel__title">Lotes vencidos y por vencer</h2>
              <p class="panel__subtitle">
                Lotes con existencias cuya fecha de vencimiento es hoy o dentro de los próximos 30
                días.
              </p>
            </div>
            @if (expiringLots().length > 0) {
              <app-badge tone="danger" [dot]="true"> {{ expiringLots().length }} lotes </app-badge>
            }
          </div>

          <div class="panel__body panel__body--flush">
            @if (expiringError()) {
              <div class="inline-alert inline-alert--flush" role="alert">
                <app-icon name="alertCircle" [size]="18" />
                <p>{{ expiringError() }}</p>
                <button
                  appButton
                  type="button"
                  size="sm"
                  variant="secondary"
                  (click)="loadExpiringLots()"
                >
                  Reintentar
                </button>
              </div>
            } @else if (expiringLoading() && expiringLots().length === 0) {
              <div class="table-skeleton">
                @for (row of skeletonRows; track $index) {
                  <app-skeleton height="18px" />
                }
              </div>
            } @else if (expiringLots().length === 0) {
              <app-empty-state
                icon="checkCircle"
                title="Sin lotes por vencer"
                description="No hay lotes con existencias que venzan en los próximos 30 días."
              />
            } @else {
              <div class="table-wrap">
                <table class="table">
                  <thead>
                    <tr>
                      <th scope="col">Producto</th>
                      <th scope="col">Presentación</th>
                      <th scope="col">Lote</th>
                      <th scope="col">Vencimiento</th>
                      <th scope="col" class="is-numeric">Restante</th>
                      <th scope="col">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (lot of expiringLots(); track lot.lotId) {
                      <tr>
                        <td class="is-strong">{{ lot.productName }}</td>
                        <td>{{ lot.presentationName }}</td>
                        <td class="is-muted">{{ lot.lotNumber }}</td>
                        <td>{{ formatDate(lot.expirationDate) }}</td>
                        <td class="is-numeric" [class.is-danger]="lot.daysRemaining < 0">
                          {{ remainingLabel(lot) }}
                        </td>
                        <td>
                          <app-badge [tone]="severityTone(lot.severity)">
                            {{ lot.label }}
                          </app-badge>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </section>
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: var(--space-4);
      margin-bottom: var(--space-5);
    }

    section.panel {
      margin-bottom: var(--space-5);
    }

    .inline-alert {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding: 16px 18px;
      margin-bottom: var(--space-5);
      background: var(--danger-100);
      border: 1px solid #f0cdca;
      border-radius: var(--radius-lg);
      color: var(--danger-700);
      font-size: var(--text-sm);
    }

    .inline-alert p {
      flex: 1;
      min-width: 200px;
    }

    .inline-alert--flush {
      margin: 0;
      border-radius: 0;
      border-width: 0 0 1px;
    }

    .inline-alert--inline {
      margin: 0;
    }

    .table-skeleton {
      display: grid;
      gap: 14px;
      padding: 24px 22px;
    }

    .is-danger {
      color: var(--danger-700);
      font-weight: var(--weight-semibold);
    }

    /* ---------- Analítica del inventario ---------- */
    .analytics {
      display: grid;
      grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
      gap: var(--space-4);
      margin-bottom: var(--space-5);
    }

    section.analytics__panel {
      display: flex;
      flex-direction: column;
      margin-bottom: 0;
    }

    .analytics__body {
      display: flex;
      flex: 1;
      flex-direction: column;
      justify-content: center;
      min-height: 328px;
    }

    .chart-skeleton {
      width: 100%;
    }

    .chart-skeleton--donut {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 28px;
    }

    .chart-skeleton__legend {
      display: grid;
      flex: 1 1 200px;
      gap: 14px;
      max-width: 320px;
    }

    .chart-skeleton--columns {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      padding: 8px 4px 0;
      border-bottom: 1px solid var(--border);
    }

    .chart-skeleton--columns > * {
      flex: 1 1 0;
      min-width: 0;
    }

    .stock-chart {
      padding: 22px 22px 8px;
      border-bottom: 1px solid var(--border);
    }

    /* ---------- Bienvenida ---------- */
    .welcome {
      display: flex;
      align-items: flex-start;
      gap: 20px;
      padding: 32px;
    }

    .welcome__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: none;
      width: 54px;
      height: 54px;
      background: var(--brand-50);
      border: 1px solid var(--brand-100);
      border-radius: var(--radius-lg);
      color: var(--brand-500);
    }

    .welcome__content {
      min-width: 0;
    }

    .welcome__eyebrow {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .welcome__title {
      margin-top: 6px;
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      letter-spacing: -0.02em;
    }

    .welcome__text {
      max-width: 720px;
      margin-top: 10px;
      color: var(--text-muted);
      font-size: var(--text-sm);
      line-height: 1.6;
    }

    .welcome__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 28px;
      margin: 24px 0 0;
      padding-top: 20px;
      border-top: 1px solid var(--border);
    }

    .welcome__meta dt {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .welcome__meta dd {
      margin: 6px 0 0;
      color: var(--text);
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    .inline-alert app-button {
      flex: none;
    }

    @media (max-width: 1080px) {
      .analytics {
        grid-template-columns: minmax(0, 1fr);
      }

      .analytics__body {
        min-height: 0;
      }
    }

    @media (max-width: 640px) {
      .welcome {
        flex-direction: column;
        padding: 24px;
      }

      .stock-chart {
        padding: 18px 16px 6px;
      }
    }
  `,
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);

  protected readonly role = computed(() => this.auth.user()?.role ?? null);
  protected readonly isSeller = computed(() => this.role() === 'SELLER');
  protected readonly canSeeSummary = computed(
    () => this.role() === 'ADMIN' || this.role() === 'WAREHOUSE',
  );
  protected readonly canSeeLowStock = computed(
    () => this.canSeeSummary() || this.role() === 'PURCHASING',
  );

  protected readonly summary = signal<DashboardSummary | null>(null);
  protected readonly lowStock = signal<PageResponse<LowStockItem> | null>(null);
  protected readonly expiringLots = signal<ExpiringLotItem[]>([]);

  protected readonly summaryLoading = signal(false);
  protected readonly lowStockLoading = signal(false);
  protected readonly expiringLoading = signal(false);

  protected readonly summaryError = signal<string | null>(null);
  protected readonly lowStockError = signal<string | null>(null);
  protected readonly expiringError = signal<string | null>(null);

  protected readonly pageIndex = signal(0);

  protected readonly skeletonRows = Array.from({ length: 4 });

  private readonly numberFormat = new Intl.NumberFormat('es-MX', {
    maximumFractionDigits: 2,
  });

  private readonly dateFormat = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  protected readonly refreshing = computed(
    () => this.summaryLoading() || this.lowStockLoading() || this.expiringLoading(),
  );

  protected readonly firstName = computed(() => {
    const fullName = this.auth.user()?.fullName ?? '';
    return fullName.trim().split(/\s+/)[0] ?? fullName;
  });

  protected readonly username = computed(() => this.auth.user()?.username ?? '');

  protected readonly roleLabel = computed(() => {
    const role = this.role();
    return role === null ? '' : ROLE_LABELS[role];
  });

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Buenos días';
    }

    return hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  });

  protected readonly today = computed(() =>
    new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date()),
  );

  protected readonly subtitle = computed(() => {
    if (this.isSeller()) {
      return 'Bienvenido a TAMACHIHUA ERP.';
    }

    if (this.canSeeSummary()) {
      return 'Resumen del inventario y alertas que requieren atención.';
    }

    if (this.canSeeLowStock()) {
      return 'Alertas de reposición para mantener el inventario disponible.';
    }

    return 'Bienvenido a TAMACHIHUA ERP.';
  });

  protected readonly lowStockItems = computed(() => this.lowStock()?.content ?? []);

  protected readonly lowStockTotal = computed(
    () => this.lowStock()?.totalElements ?? this.summary()?.lowStockProducts ?? 0,
  );

  // Gráficas: los cálculos viven en dashboard.charts.ts y aquí solo se formatean.
  protected readonly donutSegments = computed(() => buildLotDonut(this.summary()));

  protected readonly expirationBuckets = computed(() =>
    buildExpirationBuckets(this.expiringLots()),
  );

  protected readonly expirationTotal = computed(() =>
    this.expirationBuckets().reduce((total, bucket) => total + bucket.value, 0),
  );

  protected readonly stockBars = computed<StockBarItem[]>(() =>
    buildStockBars(this.lowStockItems()).map((bar) => ({
      ...bar,
      currentLabel: this.formatQuantity(bar.current),
      minimumLabel: this.formatQuantity(bar.minimum),
      missingLabel: this.formatQuantity(bar.missing),
    })),
  );

  protected readonly donutAriaLabel = computed(() => {
    const segments = this.donutSegments();

    if (segments.length === 0) {
      return 'Sin lotes activos para analizar.';
    }

    const detail = segments
      .map((segment) => `${segment.label}: ${this.formatQuantity(segment.value)}`)
      .join('. ');

    return `Distribución de lotes activos. ${detail}.`;
  });

  protected readonly expirationAriaLabel = computed(() => {
    const buckets = this.expirationBuckets();

    if (this.expirationTotal() === 0) {
      return 'Sin vencimientos próximos.';
    }

    const detail = buckets
      .map((bucket) => `${bucket.label}: ${this.formatQuantity(bucket.value)}`)
      .join('. ');

    return `Lotes por rango de vencimiento. ${detail}.`;
  });

  protected readonly skeletonColumns = [
    { width: '100%', height: '96px' },
    { width: '100%', height: '140px' },
    { width: '100%', height: '118px' },
    { width: '100%', height: '164px' },
  ];

  ngOnInit(): void {
    this.refresh();
  }

  protected refresh(): void {
    if (this.isSeller()) {
      return;
    }

    this.pageIndex.set(0);
    this.loadSummary();
    this.loadExpiringLots();

    if (this.canSeeLowStock()) {
      this.loadLowStock(0);
    }
  }

  protected loadSummary(): void {
    if (!this.canSeeSummary()) {
      return;
    }

    this.summaryLoading.set(true);
    this.summaryError.set(null);

    this.dashboardService.getSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.summaryLoading.set(false);
      },
      error: () => {
        this.summaryError.set('No se pudieron cargar los indicadores del inventario.');
        this.summaryLoading.set(false);
      },
    });
  }

  protected loadExpiringLots(): void {
    if (!this.canSeeSummary()) {
      return;
    }

    this.expiringLoading.set(true);
    this.expiringError.set(null);

    this.dashboardService.getExpiringLots().subscribe({
      next: (lots) => {
        this.expiringLots.set(lots);
        this.expiringLoading.set(false);
      },
      error: () => {
        this.expiringError.set('No se pudieron cargar los lotes por vencer.');
        this.expiringLoading.set(false);
      },
    });
  }

  protected loadLowStock(page: number): void {
    if (!this.canSeeLowStock()) {
      return;
    }

    this.lowStockLoading.set(true);
    this.lowStockError.set(null);

    this.dashboardService.getLowStock(page, LOW_STOCK_PAGE_SIZE).subscribe({
      next: (response) => {
        this.lowStock.set(response);
        this.pageIndex.set(response.page);
        this.lowStockLoading.set(false);
      },
      error: () => {
        this.lowStockError.set('No se pudo cargar el listado de bajo stock.');
        this.lowStockLoading.set(false);
      },
    });
  }

  protected summaryMetric(key: keyof DashboardSummary): string {
    const summary = this.summary();
    return summary === null ? '—' : this.formatQuantity(summary[key]);
  }

  protected formatQuantity(value: number): string {
    return this.numberFormat.format(value);
  }

  protected formatDate(value: string): string {
    const [year, month, day] = value.split('-').map(Number);

    if (year === undefined || month === undefined || day === undefined) {
      return value;
    }

    return this.dateFormat.format(new Date(year, month - 1, day));
  }

  protected remainingLabel(lot: ExpiringLotItem): string {
    if (lot.daysRemaining < 0) {
      const days = Math.abs(lot.daysRemaining);
      return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
    }

    if (lot.daysRemaining === 0) {
      return 'Vence hoy';
    }

    return `${lot.daysRemaining} ${lot.daysRemaining === 1 ? 'día' : 'días'}`;
  }

  protected severityTone(severity: ExpirationSeverity): BadgeTone {
    switch (severity) {
      case 'EXPIRED':
      case 'RED':
        return 'danger';
      case 'YELLOW':
        return 'warning';
      default:
        return 'neutral';
    }
  }
}
