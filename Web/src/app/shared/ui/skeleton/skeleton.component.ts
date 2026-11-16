import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  host: {
    class: 'skeleton',
    '[style.width]': 'width()',
    '[style.height]': 'height()',
    '[style.border-radius]': 'circle() ? "50%" : radius()',
    '[attr.aria-hidden]': 'true',
  },
  styles: `
    :host {
      display: block;
      background: linear-gradient(
        90deg,
        var(--surface-muted) 25%,
        #eef3f8 37%,
        var(--surface-muted) 63%
      );
      background-size: 400% 100%;
      animation: shimmer 1400ms ease infinite;
    }

    @keyframes shimmer {
      0% {
        background-position: 100% 50%;
      }
      100% {
        background-position: 0 50%;
      }
    }
  `,
})
export class SkeletonComponent {
  readonly width = input('100%');
  readonly height = input('14px');
  readonly radius = input('var(--radius-sm)');
  readonly circle = input(false);
}
