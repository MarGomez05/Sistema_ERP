import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { IconComponent } from '@shared/ui/icon/icon.component';

// Paginación reutilizable para listados del ERP.
@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="pager">
      <p class="pager__summary">
        Mostrando
        <strong>{{ rangeStart() }}–{{ rangeEnd() }}</strong>
        de <strong>{{ totalElements() }}</strong> registros
      </p>

      <div class="pager__actions">
        <button
          type="button"
          class="pager__button"
          aria-label="Página anterior"
          [disabled]="disabled() || page() === 0"
          (click)="goTo(page() - 1)"
        >
          <app-icon name="chevronLeft" [size]="16" />
          Anterior
        </button>

        <span class="pager__page"> Página {{ page() + 1 }} de {{ totalPages() }} </span>

        <button
          type="button"
          class="pager__button"
          aria-label="Página siguiente"
          [disabled]="disabled() || page() >= totalPages() - 1"
          (click)="goTo(page() + 1)"
        >
          Siguiente
          <app-icon name="chevronRight" [size]="16" />
        </button>
      </div>
    </div>
  `,
  styles: `
    .pager {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: 14px 22px;
      border-top: 1px solid var(--border);
    }

    .pager__summary {
      color: var(--text-muted);
      font-size: var(--text-xs);
      font-variant-numeric: tabular-nums;
    }

    .pager__summary strong {
      color: var(--text);
      font-weight: var(--weight-semibold);
    }

    .pager__actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .pager__button {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      min-height: 34px;
      padding: 0 12px;
      background:
        linear-gradient(var(--surface), var(--surface)) padding-box,
        linear-gradient(135deg, var(--brand-200) 0%, var(--accent-200) 100%) border-box;
      border: 1px solid transparent;
      border-radius: 10px;
      color: var(--text-muted);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      transition:
        background var(--transition-fast),
        border-color var(--transition-fast),
        color var(--transition-fast),
        box-shadow var(--transition-fast),
        transform var(--transition-fast);
    }

    .pager__button:hover:not(:disabled) {
      background:
        var(--gradient-soft) padding-box,
        linear-gradient(135deg, var(--brand-400) 0%, var(--accent-500) 100%) border-box;
      box-shadow: 0 6px 14px -10px rgba(8, 115, 196, 0.55);
      color: var(--brand-700);
      transform: translateY(-1px);
    }

    .pager__button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .pager__page {
      color: var(--text-muted);
      font-size: var(--text-xs);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    @media (max-width: 560px) {
      .pager {
        justify-content: center;
      }
    }
  `,
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalElements = input.required<number>();
  readonly size = input(10);
  readonly disabled = input(false);

  readonly pageChange = output<number>();

  protected readonly rangeStart = computed(() =>
    this.totalElements() === 0 ? 0 : this.page() * this.size() + 1,
  );

  protected readonly rangeEnd = computed(() =>
    Math.min((this.page() + 1) * this.size(), this.totalElements()),
  );

  protected goTo(page: number): void {
    if (page < 0 || page > this.totalPages() - 1 || page === this.page()) {
      return;
    }

    this.pageChange.emit(page);
  }
}
