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
  styles: `
    .app-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 42px;
      padding: 0 20px;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.01em;
      line-height: 1;
      text-decoration: none;
      white-space: nowrap;
      transition:
        background-color var(--transition-fast),
        background-position var(--transition),
        border-color var(--transition-fast),
        box-shadow var(--transition-fast),
        color var(--transition-fast),
        transform var(--transition-fast);
    }

    .app-button:focus-visible {
      outline: 2px solid var(--brand-400);
      outline-offset: 2px;
    }

    .app-button:active:not(.app-button--loading) {
      transform: translateY(0) scale(0.99);
    }

    .app-button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      filter: saturate(0.65);
      transform: none;
      box-shadow: none;
    }

    .app-button--primary {
      background-image: var(--gradient-brand);
      background-position: 0% 50%;
      background-size: 160% 160%;
      border-color: transparent;
      color: var(--text-inverse);
      box-shadow:
        var(--shadow-brand),
        inset 0 1px 0 rgba(255, 255, 255, 0.24);
      text-shadow: 0 1px 1px rgba(4, 48, 85, 0.18);
    }

    .app-button--primary:hover:not(.app-button--loading):not(:disabled) {
      background-position: 100% 50%;
      box-shadow:
        var(--shadow-brand-strong),
        inset 0 1px 0 rgba(255, 255, 255, 0.28);
      transform: translateY(-1px);
    }

    .app-button--secondary {
      background:
        linear-gradient(var(--surface), var(--surface)) padding-box,
        linear-gradient(135deg, var(--brand-200) 0%, var(--accent-200) 100%) border-box;
      border-color: transparent;
      color: var(--brand-700);
      box-shadow: var(--shadow-xs);
    }

    .app-button--secondary:hover:not(.app-button--loading):not(:disabled) {
      background:
        var(--gradient-soft) padding-box,
        linear-gradient(135deg, var(--brand-400) 0%, var(--accent-500) 100%) border-box;
      box-shadow: 0 8px 18px -10px rgba(8, 115, 196, 0.45);
      transform: translateY(-1px);
    }

    .app-button--ghost {
      background: transparent;
      color: var(--text-muted);
    }

    .app-button--ghost:hover:not(.app-button--loading):not(:disabled) {
      background: var(--gradient-soft);
      color: var(--brand-700);
    }

    .app-button--danger {
      background-image: var(--gradient-danger);
      background-position: 0% 50%;
      background-size: 160% 160%;
      border-color: transparent;
      color: var(--text-inverse);
      box-shadow:
        0 8px 18px -8px rgba(159, 47, 40, 0.55),
        inset 0 1px 0 rgba(255, 255, 255, 0.18);
    }

    .app-button--danger:hover:not(.app-button--loading):not(:disabled) {
      background-position: 100% 50%;
      box-shadow:
        0 14px 26px -10px rgba(159, 47, 40, 0.62),
        inset 0 1px 0 rgba(255, 255, 255, 0.22);
      transform: translateY(-1px);
    }

    .app-button--sm {
      min-height: 36px;
      padding: 0 14px;
      border-radius: 10px;
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

    @media (prefers-reduced-motion: reduce) {
      .app-button,
      .app-button--primary:hover,
      .app-button--secondary:hover,
      .app-button--danger:hover {
        transform: none;
        transition: none;
      }
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
