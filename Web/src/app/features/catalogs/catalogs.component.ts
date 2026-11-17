import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  signal,
  viewChildren,
} from '@angular/core';

import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { CatalogManagerComponent } from './catalog-manager/catalog-manager.component';
import { CATALOGS, CatalogKey, findCatalog } from './catalog.model';

// Página única con pestañas para los seis catálogos de inventario.
@Component({
  selector: 'app-catalogs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CatalogManagerComponent, IconComponent, PageHeaderComponent],
  template: `
    <app-page-header
      title="Catálogos"
      subtitle="Administra las categorías, tipos de producto, marcas, modelos, unidades de medida y presentaciones que alimentan el inventario."
    />

    <section class="catalog-tabs" role="tablist" aria-label="Catálogos de inventario">
      @for (catalog of catalogs; track catalog.key; let index = $index) {
        <button
          #tab
          type="button"
          role="tab"
          class="catalog-tab"
          [id]="'catalog-tab-' + catalog.key"
          [attr.aria-selected]="activeKey() === catalog.key"
          [attr.aria-controls]="activeKey() === catalog.key ? 'catalog-panel-' + catalog.key : null"
          [attr.tabindex]="activeKey() === catalog.key ? 0 : -1"
          [class.catalog-tab--active]="activeKey() === catalog.key"
          (click)="select(catalog.key)"
          (keydown)="onTabKeydown($event, index)"
        >
          <app-icon [name]="catalog.icon" [size]="17" />
          {{ catalog.label }}
        </button>
      }
    </section>

    @for (catalog of activeCatalogs(); track catalog.key) {
      <section
        class="panel catalog-shell"
        role="tabpanel"
        [id]="'catalog-panel-' + catalog.key"
        [attr.aria-labelledby]="'catalog-tab-' + catalog.key"
      >
        <app-catalog-manager [config]="catalog" />
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .catalog-tabs {
      display: flex;
      gap: 6px;
      padding: 6px;
      margin-bottom: var(--space-4);
      overflow-x: auto;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xs);
    }

    .catalog-tab {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      gap: 8px;
      min-height: 40px;
      padding: 0 14px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      color: var(--text-muted);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      white-space: nowrap;
      transition:
        background var(--transition-fast),
        border-color var(--transition-fast),
        color var(--transition-fast);
    }

    .catalog-tab:hover {
      background: var(--surface-hover);
      color: var(--brand-700);
    }

    .catalog-tab--active {
      background: var(--brand-50);
      border-color: var(--brand-200);
      color: var(--brand-700);
      font-weight: var(--weight-semibold);
    }

    .catalog-shell {
      overflow: hidden;
    }
  `,
})
export class CatalogsComponent {
  protected readonly catalogs = CATALOGS;

  protected readonly activeKey = signal<CatalogKey>('categories');

  protected readonly activeCatalogs = computed(() => [findCatalog(this.activeKey())]);

  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tab');

  protected select(key: CatalogKey): void {
    this.activeKey.set(key);
  }

  protected onTabKeydown(event: KeyboardEvent, index: number): void {
    const last = CATALOGS.length - 1;
    let next: number;

    switch (event.key) {
      case 'ArrowRight':
        next = index === last ? 0 : index + 1;
        break;
      case 'ArrowLeft':
        next = index === 0 ? last : index - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.select(CATALOGS[next].key);
    this.tabButtons()[next]?.nativeElement.focus();
  }
}
