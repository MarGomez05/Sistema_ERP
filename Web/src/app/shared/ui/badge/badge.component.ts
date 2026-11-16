import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (dot()) {
      <span class="badge__dot" aria-hidden="true"></span>
    }
    <ng-content />
  `,
  host: {
    class: 'badge',
    '[class.badge--brand]': 'tone() === "brand"',
    '[class.badge--success]': 'tone() === "success"',
    '[class.badge--warning]': 'tone() === "warning"',
    '[class.badge--danger]': 'tone() === "danger"',
    '[class.badge--info]': 'tone() === "info"',
  },
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: var(--radius-pill);
      background: var(--surface-muted);
      color: var(--text-muted);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      line-height: 1.4;
      white-space: nowrap;
    }

    .badge--brand {
      background: var(--brand-100);
      color: var(--brand-700);
    }

    .badge--success {
      background: var(--success-100);
      color: var(--success-700);
    }

    .badge--warning {
      background: var(--warning-100);
      color: var(--warning-700);
    }

    .badge--danger {
      background: var(--danger-100);
      color: var(--danger-700);
    }

    .badge--info {
      background: var(--info-100);
      color: var(--info-700);
    }

    .badge__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }
  `,
})
export class BadgeComponent {
  readonly tone = input<BadgeTone>('neutral');
  readonly dot = input(false);
}
