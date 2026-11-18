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
})
export class BadgeComponent {
  readonly tone = input<BadgeTone>('neutral');
  readonly dot = input(false);
}
