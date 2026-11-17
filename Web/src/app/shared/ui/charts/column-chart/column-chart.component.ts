import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ColumnChartItem } from '../chart.model';

// Columnas verticales para comparar conteos entre rangos.
@Component({
  selector: 'app-column-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="columns" role="img" [attr.aria-label]="ariaLabel()">
      @for (column of normalized(); track column.key) {
        <div class="columns__item">
          <div class="columns__area">
            <span class="columns__value">{{ column.value }}</span>
            <span
              class="columns__bar"
              [class]="'columns__bar columns__bar--' + column.tone"
              [style.height.%]="column.percent"
            ></span>
          </div>
          <span class="columns__label">{{ column.label }}</span>
        </div>
      }
    </div>

    <p class="columns__caption">{{ caption() }}</p>
  `,
  styles: `
    :host {
      display: block;
    }

    .columns {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      min-height: 190px;
      padding: 8px 4px 0;
      border-bottom: 1px solid var(--border);
      animation: fade var(--transition-slow) both;
    }

    .columns__item {
      display: flex;
      flex: 1;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .columns__area {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      width: 100%;
      height: 150px;
    }

    .columns__value {
      color: var(--text);
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      font-variant-numeric: tabular-nums;
    }

    .columns__bar {
      width: min(46px, 76%);
      min-height: 4px;
      border-radius: 8px 8px 3px 3px;
      transform-origin: bottom;
      animation: column-grow var(--transition-slow) both;
      transition: height var(--transition-slow);
    }

    @keyframes column-grow {
      from {
        transform: scaleY(0);
        opacity: 0.4;
      }
      to {
        transform: scaleY(1);
        opacity: 1;
      }
    }

    .columns__bar--brand {
      background: linear-gradient(180deg, var(--brand-400), var(--brand-600));
    }

    .columns__bar--success {
      background: linear-gradient(180deg, var(--success-500), var(--success-700));
    }

    .columns__bar--warning {
      background: linear-gradient(180deg, var(--warning-500), var(--warning-700));
    }

    .columns__bar--danger {
      background: linear-gradient(180deg, var(--danger-500), var(--danger-700));
    }

    .columns__bar--info {
      background: linear-gradient(180deg, var(--info-500), var(--info-700));
    }

    .columns__bar--neutral {
      background: var(--text-subtle);
    }

    .columns__label {
      overflow: hidden;
      max-width: 100%;
      color: var(--text-muted);
      font-size: 0.6875rem;
      font-weight: var(--weight-medium);
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .columns__caption {
      margin-top: 12px;
      color: var(--text-subtle);
      font-size: var(--text-xs);
      text-align: center;
    }
  `,
})
export class ColumnChartComponent {
  readonly columns = input.required<readonly ColumnChartItem[]>();
  readonly ariaLabel = input('Distribución por rango');
  readonly caption = input('');

  protected readonly maxValue = computed(() =>
    this.columns().reduce((max, column) => Math.max(max, column.value), 0),
  );

  protected readonly normalized = computed(() => {
    const max = this.maxValue();

    return this.columns().map((column) => ({
      ...column,
      percent: max === 0 ? 0 : (column.value / max) * 100,
    }));
  });
}
