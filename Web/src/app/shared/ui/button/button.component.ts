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
  styles: `
    .app-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 42px;
      padding: 0 18px;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      line-height: 1;
      text-decoration: none;
      white-space: nowrap;
      transition:
        background var(--transition-fast),
        border-color var(--transition-fast),
        color var(--transition-fast),
        box-shadow var(--transition-fast),
        transform var(--transition-fast);
    }

    .app-button:active:not(.app-button--loading) {
      transform: translateY(1px);
    }

    .app-button--primary {
      background: var(--brand-500);
      border-color: var(--brand-500);
      color: var(--text-inverse);
      box-shadow: 0 6px 16px rgba(8, 115, 196, 0.22);
    }

    .app-button--primary:hover:not(.app-button--loading) {
      background: var(--brand-600);
      border-color: var(--brand-600);
    }

    .app-button--secondary {
      background: var(--surface);
      border-color: var(--border-strong);
      color: var(--text);
      box-shadow: var(--shadow-xs);
    }

    .app-button--secondary:hover:not(.app-button--loading) {
      border-color: var(--brand-300);
      color: var(--brand-700);
    }

    .app-button--ghost {
      background: transparent;
      color: var(--text-muted);
    }

    .app-button--ghost:hover:not(.app-button--loading) {
      background: var(--surface-hover);
      color: var(--brand-700);
    }

    .app-button--danger {
      background: var(--danger-500);
      border-color: var(--danger-500);
      color: var(--text-inverse);
    }

    .app-button--danger:hover:not(.app-button--loading) {
      background: var(--danger-700);
      border-color: var(--danger-700);
    }

    .app-button--sm {
      min-height: 36px;
      padding: 0 12px;
      font-size: var(--text-xs);
    }

    .app-button--block {
      width: 100%;
    }

    .app-button--loading {
      pointer-events: none;
      opacity: 0.82;
      cursor: progress;
    }

    .app-button__label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .app-button__spinner {
      width: 15px;
      height: 15px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 700ms linear infinite;
    }
  `,
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
