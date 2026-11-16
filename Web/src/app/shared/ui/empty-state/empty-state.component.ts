import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent, IconName } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="empty-state">
      <span class="empty-state__icon">
        <app-icon [name]="icon()" [size]="24" />
      </span>
      <h3 class="empty-state__title">{{ title() }}</h3>
      <p class="empty-state__description">{{ description() }}</p>
      <ng-content />
    </div>
  `,
  styles: `
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 42px 24px;
      text-align: center;
    }

    .empty-state__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      margin-bottom: 4px;
      border-radius: var(--radius-lg);
      background: var(--brand-50);
      color: var(--brand-500);
    }

    .empty-state__title {
      font-size: var(--text-base);
      font-weight: var(--weight-semibold);
    }

    .empty-state__description {
      max-width: 420px;
      color: var(--text-muted);
      font-size: var(--text-sm);
    }
  `,
})
export class EmptyStateComponent {
  readonly icon = input<IconName>('info');
  readonly title = input.required<string>();
  readonly description = input('');
}
