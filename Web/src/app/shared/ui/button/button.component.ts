import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

@Component({
  selector: 'button[appButton], a[appButton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <span class="app-button__spinner" aria-hidden="true"></span>
    }
    <span class="app-button__label"><ng-content /></span>
  `,
  host: {
    class: 'app-button',
    '[class.app-button--primary]': 'variant() === "primary"',
    '[class.app-button--sm]': 'size() === "sm"',
    '[class.app-button--secondary]': 'variant() === "secondary"',
    '[class.app-button--ghost]': 'variant() === "ghost"',
    '[class.app-button--danger]': 'variant() === "danger"',
    '[class.app-button--loading]': 'loading()',
    '[class.app-button--block]': 'block()',
    '[attr.aria-busy]': 'loading() ? "true" : null',
    '[attr.aria-disabled]': 'loading() ? "true" : null',
    '(click)': 'blockInteraction($event)',
    '(keydown)': 'blockInteraction($event)',
  },
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly loading = input(false);
  readonly block = input(false);

  protected readonly isBusy = computed(() => this.loading());

  protected blockInteraction(event: Event): void {
    if (this.isBusy()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
}
