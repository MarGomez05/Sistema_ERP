import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastService, ToastTone } from '@core/ui/toast.service';
import { IconComponent, IconName } from '@shared/ui/icon/icon.component';

const TONE_ICONS: Record<ToastTone, IconName> = {
  success: 'checkCircle',
  danger: 'alertCircle',
  warning: 'alertTriangle',
  info: 'info',
};

@Component({
  selector: 'app-toast-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="toasts" role="status" aria-live="polite">
      @for (toast of toasts.items(); track toast.id) {
        <div
          class="toast"
          [class.toast--success]="toast.tone === 'success'"
          [class.toast--danger]="toast.tone === 'danger'"
          [class.toast--warning]="toast.tone === 'warning'"
        >
          <span class="toast__icon">
            <app-icon [name]="iconFor(toast.tone)" [size]="18" />
          </span>
          <div class="toast__content">
            <p class="toast__title">{{ toast.title }}</p>
            @if (toast.message) {
              <p class="toast__message">{{ toast.message }}</p>
            }
          </div>
          <button
            type="button"
            class="toast__close"
            aria-label="Cerrar notificación"
            (click)="toasts.dismiss(toast.id)"
          >
            <app-icon name="close" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: min(380px, calc(100vw - 36px));
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 16px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-left: 4px solid var(--brand-400);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-md);
      pointer-events: auto;
      animation: rise var(--transition) both;
    }

    .toast--success {
      border-left-color: var(--success-500);
    }

    .toast--danger {
      border-left-color: var(--danger-500);
    }

    .toast--warning {
      border-left-color: var(--warning-500);
    }

    .toast__icon {
      display: inline-flex;
      margin-top: 1px;
      color: var(--brand-500);
    }

    .toast--success .toast__icon {
      color: var(--success-500);
    }

    .toast--danger .toast__icon {
      color: var(--danger-500);
    }

    .toast--warning .toast__icon {
      color: var(--warning-500);
    }

    .toast__content {
      flex: 1;
      min-width: 0;
    }

    .toast__title {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    .toast__message {
      margin-top: 2px;
      color: var(--text-muted);
      font-size: var(--text-xs);
      line-height: 1.45;
    }

    .toast__close {
      display: inline-flex;
      padding: 4px;
      background: transparent;
      border: 0;
      border-radius: var(--radius-sm);
      color: var(--text-subtle);
      transition:
        background var(--transition-fast),
        color var(--transition-fast);
    }

    .toast__close:hover {
      background: var(--surface-hover);
      color: var(--text);
    }

    @media (max-width: 640px) {
      .toasts {
        top: 12px;
        right: 12px;
        width: calc(100vw - 24px);
      }
    }
  `,
})
export class ToastContainerComponent {
  protected readonly toasts = inject(ToastService);

  protected iconFor(tone: ToastTone): IconName {
    return TONE_ICONS[tone];
  }
}
