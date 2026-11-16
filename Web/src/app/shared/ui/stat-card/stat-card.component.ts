import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent, IconName } from '@shared/ui/icon/icon.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';

export type StatTone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

@Component({
  selector: 'app-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, SkeletonComponent],
  template: `
    <div
      class="stat"
      [class.stat--brand]="tone() === 'brand'"
      [class.stat--success]="tone() === 'success'"
      [class.stat--warning]="tone() === 'warning'"
      [class.stat--danger]="tone() === 'danger'"
      [class.stat--info]="tone() === 'info'"
    >
      <div class="stat__top">
        <span class="stat__label">{{ label() }}</span>
        <span class="stat__icon">
          <app-icon [name]="icon()" [size]="18" />
        </span>
      </div>

      @if (loading()) {
        <app-skeleton width="64px" height="30px" />
      } @else {
        <span class="stat__value u-numeric">{{ value() }}</span>
      }

      @if (hint()) {
        <span class="stat__hint">{{ hint() }}</span>
      }
    </div>
  `,
  styles: `
    .stat {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 20px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xs);
      transition:
        box-shadow var(--transition),
        transform var(--transition),
        border-color var(--transition);
    }

    .stat:hover {
      border-color: var(--brand-200);
      box-shadow: var(--shadow-sm);
      transform: translateY(-2px);
    }

    .stat__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .stat__label {
      color: var(--text-muted);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
    }

    .stat__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: var(--radius-md);
      background: var(--brand-50);
      color: var(--brand-500);
    }

    .stat__value {
      font-size: var(--text-3xl);
      font-weight: var(--weight-bold);
      letter-spacing: -0.03em;
      line-height: 1;
    }

    .stat__hint {
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .stat--success .stat__icon {
      background: var(--success-100);
      color: var(--success-700);
    }

    .stat--warning .stat__icon {
      background: var(--warning-100);
      color: var(--warning-700);
    }

    .stat--danger .stat__icon {
      background: var(--danger-100);
      color: var(--danger-700);
    }

    .stat--info .stat__icon {
      background: var(--info-100);
      color: var(--info-700);
    }

    .stat--neutral .stat__icon {
      background: var(--surface-muted);
      color: var(--text-muted);
    }
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly icon = input<IconName>('package');
  readonly tone = input<StatTone>('brand');
  readonly hint = input('');
  readonly loading = input(false);
}
