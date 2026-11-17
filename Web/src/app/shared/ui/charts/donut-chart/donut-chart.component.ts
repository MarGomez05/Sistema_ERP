import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { DonutSegment } from '../chart.model';

const VIEW_SIZE = 160;
const RADIUS = 62;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Donut SVG accesible para distribuciones de hasta cuatro categorías.
@Component({
  selector: 'app-donut-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="donut" [style.--donut-size]="size() + 'px'">
      <div class="donut__graphic">
        <svg
          [attr.width]="size()"
          [attr.height]="size()"
          [attr.viewBox]="'0 0 ' + viewSize + ' ' + viewSize"
          role="img"
          [attr.aria-label]="ariaLabel()"
        >
          <circle
            class="donut__track"
            [attr.cx]="viewSize / 2"
            [attr.cy]="viewSize / 2"
            [attr.r]="radius"
            fill="none"
            [attr.stroke-width]="thickness()"
          />

          <g
            [attr.transform]="'rotate(-90 ' + viewSize / 2 + ' ' + viewSize / 2 + ')'"
            fill="none"
            stroke-linecap="butt"
            [attr.stroke-width]="thickness()"
          >
            @for (arc of arcs(); track arc.key) {
              <circle
                class="donut__arc"
                [class]="'donut__arc donut__arc--' + arc.tone"
                [attr.cx]="viewSize / 2"
                [attr.cy]="viewSize / 2"
                [attr.r]="radius"
                [attr.stroke-dasharray]="arc.dasharray"
                [attr.stroke-dashoffset]="arc.offset"
              />
            }
          </g>
        </svg>

        <div class="donut__center" aria-hidden="true">
          <span class="donut__value">{{ centerValue() }}</span>
          <span class="donut__caption">{{ centerCaption() }}</span>
        </div>
      </div>

      <ul class="donut__legend">
        @for (item of legend(); track item.key) {
          <li class="donut__legend-item">
            <span
              class="donut__dot"
              [class]="'donut__dot donut__dot--' + item.tone"
              aria-hidden="true"
            ></span>
            <span class="donut__legend-label">{{ item.label }}</span>
            <strong class="donut__legend-value">{{ item.value }}</strong>
            <span class="donut__legend-percent">{{ item.percentText }}</span>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .donut {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 22px;
    }

    .donut__graphic {
      position: relative;
      width: min(var(--donut-size), 100%);
      aspect-ratio: 1;
      animation: fade var(--transition-slow) both;
    }

    .donut__graphic svg {
      width: 100%;
      height: 100%;
    }

    .donut__track {
      stroke: var(--surface-muted);
    }

    .donut__arc {
      transition:
        stroke-dasharray var(--transition-slow),
        stroke-dashoffset var(--transition-slow);
    }

    .donut__arc--brand {
      stroke: var(--brand-500);
    }

    .donut__arc--success {
      stroke: var(--success-500);
    }

    .donut__arc--warning {
      stroke: var(--warning-500);
    }

    .donut__arc--danger {
      stroke: var(--danger-500);
    }

    .donut__arc--info {
      stroke: var(--info-500);
    }

    .donut__arc--neutral {
      stroke: var(--text-subtle);
    }

    .donut__center {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      pointer-events: none;
    }

    .donut__value {
      color: var(--text);
      font-size: clamp(1.6rem, 3vw, 2rem);
      font-weight: var(--weight-bold);
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.03em;
      line-height: 1;
    }

    .donut__caption {
      color: var(--text-muted);
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
    }

    .donut__legend {
      display: grid;
      gap: 10px;
      width: 100%;
      max-width: 340px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .donut__legend-item {
      display: flex;
      align-items: center;
      gap: 9px;
      font-size: var(--text-sm);
    }

    .donut__dot {
      flex: none;
      width: 9px;
      height: 9px;
      border-radius: 50%;
    }

    .donut__dot--brand {
      background: var(--brand-500);
    }

    .donut__dot--success {
      background: var(--success-500);
    }

    .donut__dot--warning {
      background: var(--warning-500);
    }

    .donut__dot--danger {
      background: var(--danger-500);
    }

    .donut__dot--info {
      background: var(--info-500);
    }

    .donut__dot--neutral {
      background: var(--text-subtle);
    }

    .donut__legend-label {
      flex: 1;
      color: var(--text-muted);
    }

    .donut__legend-value {
      color: var(--text);
      font-weight: var(--weight-semibold);
      font-variant-numeric: tabular-nums;
    }

    .donut__legend-percent {
      min-width: 38px;
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-variant-numeric: tabular-nums;
      text-align: right;
    }
  `,
})
export class DonutChartComponent {
  readonly segments = input.required<readonly DonutSegment[]>();
  readonly size = input(184);
  readonly thickness = input(20);
  readonly centerValue = input('');
  readonly centerCaption = input('');
  readonly ariaLabel = input('Distribución de lotes');

  protected readonly viewSize = VIEW_SIZE;
  protected readonly radius = RADIUS;

  protected readonly total = computed(() =>
    this.segments().reduce((sum, segment) => sum + Math.max(segment.value, 0), 0),
  );

  protected readonly arcs = computed(() => {
    const total = this.total();

    if (total === 0) {
      return [];
    }

    let offset = 0;

    return this.segments()
      .filter((segment) => segment.value > 0)
      .map((segment) => {
        const fraction = Math.max(segment.value, 0) / total;
        const length = fraction * CIRCUMFERENCE;
        const dash = Math.max(length - 3, 0.5);
        const arc = {
          key: segment.key,
          tone: segment.tone,
          dasharray: `${dash} ${CIRCUMFERENCE - dash}`,
          offset: `${-offset}`,
        };

        offset += length;

        return arc;
      });
  });

  protected readonly legend = computed(() => {
    const total = this.total();

    return this.segments().map((segment) => ({
      ...segment,
      percentText: total === 0 ? '0%' : `${Math.round((segment.value / total) * 100)}%`,
    }));
  });
}
