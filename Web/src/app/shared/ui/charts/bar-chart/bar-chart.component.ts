import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { StockBarItem } from '../chart.model';

interface StockBarRow extends StockBarItem {
  referencePercent: number;
  currentPercent: number;
  missingPercent: number;
}

// Barras comparativas de stock actual frente al mínimo por presentación.
@Component({
  selector: 'app-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bars">
      <div class="bars__legend" aria-hidden="true">
        <span class="bars__legend-item">
          <span class="bars__swatch bars__swatch--current"></span>
          Stock actual
        </span>
        <span class="bars__legend-item">
          <span class="bars__swatch bars__swatch--minimum"></span>
          Mínimo
        </span>
        <span class="bars__legend-item">
          <span class="bars__swatch bars__swatch--missing"></span>
          Faltante
        </span>
      </div>

      <ul class="bars__list">
        @for (row of rows(); track row.key; let index = $index) {
          <li class="bars__item">
            <div class="bars__head">
              <div class="bars__text">
                <p class="bars__title">{{ row.title }}</p>
                <p class="bars__subtitle">{{ row.subtitle }}</p>
              </div>
              <div class="bars__values">
                <span
                  >Actual <strong>{{ row.currentLabel }}</strong></span
                >
                <span
                  >Mín. <strong>{{ row.minimumLabel }}</strong></span
                >
                <span class="bars__missing-label">
                  Falta <strong>{{ row.missingLabel }}</strong>
                </span>
              </div>
            </div>

            <div class="bars__track" aria-hidden="true">
              <span
                class="bars__minimum"
                [style.width.%]="row.referencePercent"
                [style.animation-delay.ms]="index * 40"
              ></span>
              <span
                class="bars__current"
                [style.width.%]="row.currentPercent"
                [style.animation-delay.ms]="index * 40"
              ></span>
              <span
                class="bars__missing"
                [style.width.%]="row.missingPercent"
                [style.left.%]="row.currentPercent"
                [style.animation-delay.ms]="index * 40"
              ></span>
            </div>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .bars {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .bars__legend {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 20px;
    }

    .bars__legend-item {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: var(--text-muted);
      font-size: var(--text-xs);
    }

    .bars__swatch {
      width: 10px;
      height: 10px;
      border-radius: 3px;
    }

    .bars__swatch--current {
      background: var(--brand-500);
    }

    .bars__swatch--minimum {
      background: var(--brand-100);
      border: 1px solid var(--brand-200);
    }

    .bars__swatch--missing {
      background: var(--danger-500);
    }

    .bars__list {
      display: grid;
      gap: 16px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .bars__head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 8px 16px;
      margin-bottom: 7px;
    }

    .bars__text {
      min-width: 0;
    }

    .bars__title {
      overflow: hidden;
      color: var(--text);
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .bars__subtitle {
      overflow: hidden;
      margin-top: 1px;
      color: var(--text-subtle);
      font-size: var(--text-xs);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .bars__values {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 14px;
      color: var(--text-muted);
      font-size: var(--text-xs);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .bars__values strong {
      color: var(--text);
      font-weight: var(--weight-semibold);
    }

    .bars__missing-label strong {
      color: var(--danger-700);
    }

    .bars__track {
      position: relative;
      width: 100%;
      height: 12px;
      background: var(--surface-muted);
      border-radius: var(--radius-pill);
      overflow: hidden;
    }

    .bars__minimum,
    .bars__current,
    .bars__missing {
      position: absolute;
      top: 0;
      bottom: 0;
      display: block;
      border-radius: var(--radius-pill);
      transform-origin: left center;
      animation: bar-grow var(--transition-slow) both;
      transition: width var(--transition-slow);
    }

    .bars__minimum {
      left: 0;
      background: var(--brand-100);
      border: 1px solid var(--brand-200);
    }

    .bars__current {
      left: 0;
      background: linear-gradient(90deg, var(--brand-500), var(--brand-400));
    }

    .bars__missing {
      background: linear-gradient(90deg, var(--danger-500), #d9695f);
    }

    @keyframes bar-grow {
      from {
        transform: scaleX(0);
        opacity: 0.5;
      }
      to {
        transform: scaleX(1);
        opacity: 1;
      }
    }

    @media (max-width: 560px) {
      .bars__title,
      .bars__subtitle {
        white-space: normal;
      }
    }
  `,
})
export class BarChartComponent {
  readonly items = input.required<readonly StockBarItem[]>();

  protected readonly rows = computed<StockBarRow[]>(() => {
    const maxReference = this.items().reduce((max, item) => Math.max(max, item.minimum), 0);

    return this.items().map((item) => {
      const missing = Math.max(item.minimum - item.current, 0);
      const scale = maxReference === 0 ? 0 : 100 / maxReference;

      return {
        ...item,
        missing,
        referencePercent: item.minimum * scale,
        currentPercent: item.current * scale,
        missingPercent: missing * scale,
      };
    });
  });
}
