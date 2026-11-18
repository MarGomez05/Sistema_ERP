import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { readApiError } from '@core/http/api-error';
import { ToastService } from '@core/ui/toast.service';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { ProductFormComponent } from '../product-form/product-form.component';
import { ProductPresentationFormComponent } from '../product-presentation-form/product-presentation-form.component';
import { ProductPricePanelComponent } from '../product-price-panel/product-price-panel.component';
import {
  PriceFormValue,
  ProductDetail,
  ProductFormValue,
  ProductModelOption,
  ProductPresentation,
  ProductPresentationFormValue,
  ProductPresentationOption,
  ProductPriceHistoryItem,
  ProductSelectOption,
  formatMoney,
  formatQuantity,
  pendingImages,
  stockStatusLabel,
  stockStatusTone,
} from '../product.model';
import { ProductService } from '../product.service';

type DetailPanel = 'product' | 'presentation' | 'price';

// Detalle del producto y gestión de sus presentaciones (contrato 5.1 y 5.2).
@Component({
  selector: 'app-product-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    IconComponent,
    PageHeaderComponent,
    ProductFormComponent,
    ProductPresentationFormComponent,
    ProductPricePanelComponent,
    RouterLink,
    SkeletonComponent,
  ],
  template: `
    <app-page-header [title]="headerTitle()" [subtitle]="headerSubtitle()">
      <div actions class="detail-actions">
        <a appButton variant="secondary" [routerLink]="['/products']">
          <app-icon name="arrowLeft" [size]="16" />
          Volver
        </a>
        <button appButton type="button" variant="secondary" [loading]="loading()" (click)="load()">
          <app-icon name="refresh" [size]="16" />
          Actualizar
        </button>

        @if (product(); as current) {
          @if (canWrite()) {
            @if (confirmingStatus()) {
              <span class="detail-confirm">¿Desactivar producto?</span>
              <button
                appButton
                type="button"
                size="sm"
                variant="danger"
                [loading]="statusLoading()"
                (click)="changeStatus(current)"
              >
                Sí, desactivar
              </button>
              <button
                appButton
                type="button"
                size="sm"
                variant="ghost"
                (click)="confirmingStatus.set(false)"
              >
                Cancelar
              </button>
            } @else {
              <button appButton type="button" variant="secondary" (click)="startEditProduct()">
                <app-icon name="edit" [size]="16" />
                Editar producto
              </button>
              <button
                appButton
                type="button"
                variant="secondary"
                [loading]="statusLoading()"
                (click)="requestStatusChange(current)"
              >
                <app-icon name="power" [size]="16" />
                {{ current.isActive ? 'Desactivar' : 'Activar' }}
              </button>
            }
          }
        }
      </div>
    </app-page-header>

    @if (loading() && product() === null) {
      <div class="panel detail-skeleton" aria-hidden="true">
        <app-skeleton height="18px" />
        <app-skeleton height="18px" width="70%" />
        <app-skeleton height="150px" />
      </div>
    } @else if (error(); as message) {
      <div class="panel detail-feedback" role="alert">
        <app-icon name="alertCircle" [size]="20" />
        <div>
          <p class="detail-feedback__title">No se pudo cargar el producto</p>
          <p>{{ message }}</p>
        </div>
        <button appButton type="button" size="sm" variant="secondary" (click)="load()">
          Reintentar
        </button>
      </div>
    } @else if (product(); as current) {
      <div class="detail-layout" [class.detail-layout--panel]="activePanel() !== null">
        <div class="detail-main">
          <section class="panel detail-overview" aria-labelledby="overview-title">
            <div class="panel__header">
              <div>
                <h2 id="overview-title" class="panel__title">Información general</h2>
                <p class="panel__subtitle">Datos del producto y su clasificación.</p>
              </div>
              <app-badge [tone]="current.isActive ? 'success' : 'neutral'" [dot]="true">
                {{ current.isActive ? 'Activo' : 'Inactivo' }}
              </app-badge>
            </div>

            <div class="panel__body detail-overview__body">
              <p class="detail-overview__description">
                {{ current.description ?? 'Sin descripción registrada.' }}
              </p>

              <dl class="detail-meta">
                <div>
                  <dt>Código</dt>
                  <dd>{{ current.code }}</dd>
                </div>
                <div>
                  <dt>Categoría</dt>
                  <dd>{{ current.category?.name ?? '—' }}</dd>
                </div>
                <div>
                  <dt>Tipo</dt>
                  <dd>{{ current.productType?.name ?? '—' }}</dd>
                </div>
                <div>
                  <dt>Modelo</dt>
                  <dd>{{ modelLabel(current) }}</dd>
                </div>
                <div>
                  <dt>Vencimiento</dt>
                  <dd>
                    <app-badge [tone]="current.requiresExpiration ? 'warning' : 'neutral'">
                      {{ current.requiresExpiration ? 'Requiere' : 'No requiere' }}
                    </app-badge>
                  </dd>
                </div>
                <div>
                  <dt>Imágenes</dt>
                  <dd>{{ imageSummary(current) }}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section class="panel presentations-panel" aria-labelledby="presentations-title">
            <div class="panel__header">
              <div>
                <h2 id="presentations-title" class="panel__title">Presentaciones</h2>
                <p class="panel__subtitle">
                  Existencias, stock mínimo, precio vigente y espacio para la imagen.
                </p>
              </div>
              <div class="toolbar">
                <app-badge tone="neutral">{{ presentationCount(current) }}</app-badge>
                @if (canWrite()) {
                  <button appButton type="button" (click)="startCreatePresentation()">
                    <app-icon name="plus" [size]="16" />
                    Agregar presentación
                  </button>
                }
              </div>
            </div>

            <div class="panel__body">
              @if (current.presentations.length === 0) {
                <app-empty-state
                  icon="package"
                  title="Sin presentaciones"
                  description="Agrega la primera presentación para poder registrar precios y lotes del producto."
                >
                  @if (canWrite()) {
                    <button appButton type="button" (click)="startCreatePresentation()">
                      <app-icon name="plus" [size]="16" />
                      Agregar presentación
                    </button>
                  }
                </app-empty-state>
              } @else {
                <div class="presentation-grid">
                  @for (presentation of current.presentations; track presentation.id) {
                    <article
                      class="presentation-card"
                      [class.presentation-card--inactive]="!presentation.isActive"
                    >
                      <div class="presentation-card__media">
                        @if (hasImage(presentation)) {
                          <img
                            [src]="presentation.imageUrl"
                            [alt]="imageAlt(presentation, current)"
                            loading="lazy"
                            (error)="markImageFailed(presentation.id)"
                          />
                        } @else {
                          <div class="presentation-card__placeholder">
                            <app-icon name="image" [size]="28" />
                            <span>Imagen pendiente</span>
                            <small>Espacio reservado</small>
                          </div>
                        }
                      </div>

                      <div class="presentation-card__body">
                        <div class="presentation-card__top">
                          <div>
                            <h3 class="presentation-card__title">
                              {{ presentation.presentation.name }}
                            </h3>
                            <p class="presentation-card__subtitle">
                              {{ formatQuantity(presentation.presentation.quantity) }}
                              {{ presentation.presentation.measureUnit }}
                            </p>
                          </div>
                          <app-badge
                            [tone]="presentation.isActive ? 'success' : 'neutral'"
                            [dot]="true"
                          >
                            {{ presentation.isActive ? 'Activa' : 'Inactiva' }}
                          </app-badge>
                        </div>

                        <p class="presentation-card__code">{{ presentation.code }}</p>

                        <dl class="presentation-card__meta">
                          <div>
                            <dt>Existencia</dt>
                            <dd>{{ formatQuantity(presentation.stock) }}</dd>
                          </div>
                          <div>
                            <dt>Mínimo</dt>
                            <dd>{{ formatQuantity(presentation.minStock) }}</dd>
                          </div>
                          <div>
                            <dt>Precio vigente</dt>
                            <dd>
                              @if (presentation.currentPrice === null) {
                                <span class="presentation-card__no-price">Sin precio</span>
                              } @else {
                                {{ formatMoney(presentation.currentPrice) }}
                              }
                            </dd>
                          </div>
                        </dl>

                        <footer class="presentation-card__footer">
                          <app-badge [tone]="stockTone(presentation)" [dot]="true">
                            {{ stockLabel(presentation) }}
                          </app-badge>

                          @if (canWrite()) {
                            <div class="presentation-card__actions">
                              @if (confirmingPresentationId() === presentation.id) {
                                <span class="presentation-card__confirm">¿Desactivar?</span>
                                <button
                                  appButton
                                  type="button"
                                  size="sm"
                                  variant="danger"
                                  [loading]="presentationStatusLoadingId() === presentation.id"
                                  (click)="changePresentationStatus(presentation)"
                                >
                                  Sí
                                </button>
                                <button
                                  appButton
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  (click)="confirmingPresentationId.set(null)"
                                >
                                  No
                                </button>
                              } @else {
                                @if (canManagePrices()) {
                                  <button
                                    appButton
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    (click)="startPriceChange(presentation)"
                                  >
                                    <app-icon name="trendingUp" [size]="15" />
                                    Precio
                                  </button>
                                }
                                <button
                                  appButton
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  (click)="startEditPresentation(presentation)"
                                >
                                  <app-icon name="edit" [size]="15" />
                                  Editar
                                </button>
                                <button
                                  appButton
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  [loading]="presentationStatusLoadingId() === presentation.id"
                                  (click)="requestPresentationStatusChange(presentation)"
                                >
                                  <app-icon name="power" [size]="15" />
                                  {{ presentation.isActive ? 'Desactivar' : 'Activar' }}
                                </button>
                              }
                            </div>
                          }
                        </footer>
                      </div>
                    </article>
                  }
                </div>
              }
            </div>
          </section>
        </div>

        @if (activePanel() !== null) {
          <aside class="detail-side" aria-label="Panel de edición del producto">
            @if (activePanel() === 'product') {
              <app-product-form
                [record]="current"
                [categories]="categories()"
                [productTypes]="productTypes()"
                [models]="models()"
                [saving]="savingProduct()"
                [error]="productFormError()"
                (submitted)="saveProduct($event)"
                (cancelled)="closePanel()"
              />
            } @else if (activePanel() === 'presentation') {
              <app-product-presentation-form
                [record]="editingPresentation()"
                [presentations]="availablePresentations()"
                [saving]="savingPresentation()"
                [error]="presentationFormError()"
                (submitted)="savePresentation($event)"
                (cancelled)="closePanel()"
              />
            } @else if (pricePresentation(); as priced) {
              <app-product-price-panel
                [record]="priced"
                [history]="priceHistory()"
                [historyLoading]="priceHistoryLoading()"
                [historyError]="priceHistoryError()"
                [saving]="savingPrice()"
                [error]="priceFormError()"
                (submitted)="savePrice($event)"
                (cancelled)="closePanel()"
                (historyRetry)="loadPriceHistory(priced.id)"
              />
            }
          </aside>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .detail-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
    }

    .detail-confirm {
      color: var(--danger-700);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
    }

    .detail-skeleton {
      display: grid;
      gap: 16px;
      padding: 24px 22px;
    }

    .detail-feedback {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 14px;
      padding: 20px 22px;
      color: var(--danger-700);
      font-size: var(--text-sm);
    }

    .detail-feedback > div {
      flex: 1;
      min-width: 220px;
    }

    .detail-feedback__title {
      font-weight: var(--weight-semibold);
    }

    .detail-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-5);
    }

    .detail-layout--panel {
      grid-template-columns: minmax(0, 1fr) 390px;
      align-items: start;
    }

    .detail-main {
      display: grid;
      gap: var(--space-5);
      min-width: 0;
    }

    .detail-side {
      position: sticky;
      top: calc(var(--header-height) + var(--space-4));
      padding: var(--space-5);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }

    .detail-overview__body {
      display: grid;
      gap: var(--space-5);
    }

    .detail-overview__description {
      max-width: 780px;
      color: var(--text-muted);
      font-size: var(--text-sm);
      line-height: 1.65;
    }

    .detail-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: var(--space-4);
      margin: 0;
      padding-top: var(--space-4);
      border-top: 1px solid var(--border);
    }

    .detail-meta dt {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .detail-meta dd {
      margin: 6px 0 0;
      color: var(--text);
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    .presentation-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: var(--space-4);
    }

    .presentation-card {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xs);
      transition:
        border-color var(--transition-fast),
        box-shadow var(--transition-fast);
    }

    .presentation-card:hover {
      border-color: var(--brand-200);
      box-shadow: var(--shadow-sm);
    }

    .presentation-card--inactive {
      background: var(--surface-muted);
    }

    .presentation-card__media {
      aspect-ratio: 16 / 9;
      overflow: hidden;
      background: var(--surface-muted);
      border-bottom: 1px solid var(--border);
    }

    .presentation-card__media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .presentation-card__placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      height: 100%;
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .presentation-card__placeholder span {
      font-weight: var(--weight-semibold);
    }

    .presentation-card__placeholder small {
      color: var(--text-subtle);
      font-size: 0.6875rem;
    }

    .presentation-card__body {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 10px;
      padding: var(--space-4);
    }

    .presentation-card__top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
    }

    .presentation-card__title {
      font-size: var(--text-base);
      font-weight: var(--weight-semibold);
    }

    .presentation-card__subtitle {
      margin-top: 2px;
      color: var(--text-muted);
      font-size: var(--text-xs);
    }

    .presentation-card__code {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-family: var(--font-mono, monospace);
    }

    .presentation-card__meta {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-3);
      margin: 0;
      padding: 10px 0;
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
    }

    .presentation-card__meta dt {
      color: var(--text-subtle);
      font-size: 0.6875rem;
      font-weight: var(--weight-semibold);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .presentation-card__meta dd {
      margin: 4px 0 0;
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      font-variant-numeric: tabular-nums;
    }

    .presentation-card__no-price {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
    }

    .presentation-card__footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      margin-top: auto;
    }

    .presentation-card__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 2px;
    }

    .presentation-card__confirm {
      color: var(--danger-700);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
    }

    @media (max-width: 1240px) {
      .detail-layout--panel {
        grid-template-columns: minmax(0, 1fr);
      }

      .detail-side {
        position: static;
      }
    }

    @media (max-width: 640px) {
      .presentation-card__meta {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `,
})
export class ProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly products = inject(ProductService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  private productId = 0;

  protected readonly product = signal<ProductDetail | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly categories = signal<ProductSelectOption[]>([]);
  protected readonly productTypes = signal<ProductSelectOption[]>([]);
  protected readonly models = signal<ProductModelOption[]>([]);
  protected readonly presentationOptions = signal<ProductPresentationOption[]>([]);

  protected readonly activePanel = signal<DetailPanel | null>(null);
  protected readonly editingPresentation = signal<ProductPresentation | null>(null);

  protected readonly savingProduct = signal(false);
  protected readonly productFormError = signal<string | null>(null);

  protected readonly savingPresentation = signal(false);
  protected readonly presentationFormError = signal<string | null>(null);

  protected readonly pricePresentation = signal<ProductPresentation | null>(null);
  protected readonly priceHistory = signal<ProductPriceHistoryItem[]>([]);
  protected readonly priceHistoryLoading = signal(false);
  protected readonly priceHistoryError = signal<string | null>(null);
  protected readonly savingPrice = signal(false);
  protected readonly priceFormError = signal<string | null>(null);

  protected readonly confirmingStatus = signal(false);
  protected readonly statusLoading = signal(false);

  protected readonly confirmingPresentationId = signal<number | null>(null);
  protected readonly presentationStatusLoadingId = signal<number | null>(null);

  protected readonly failedImages = signal<ReadonlySet<number>>(new Set<number>());

  protected readonly canWrite = computed(() => this.auth.canAccess(['ADMIN', 'WAREHOUSE']));

  protected readonly canManagePrices = computed(() => this.auth.canAccess(['ADMIN']));

  protected readonly headerTitle = computed(() => this.product()?.name ?? 'Producto');

  protected readonly headerSubtitle = computed(() => {
    const product = this.product();
    return product === null ? 'Detalle del producto' : `Código ${product.code}`;
  });

  protected readonly availablePresentations = computed(() => {
    const used = new Set(
      (this.product()?.presentations ?? []).map((presentation) => presentation.presentation.id),
    );

    return this.presentationOptions().filter((option) => !used.has(option.id));
  });

  ngOnInit(): void {
    const raw = this.route.snapshot.paramMap.get('id');
    const id = Number(raw);

    if (!Number.isInteger(id) || id <= 0) {
      this.toast.warning('Producto no válido', 'Selecciona un producto del listado.');
      void this.router.navigate(['/products']);
      return;
    }

    this.productId = id;
    this.loadOptions();
    this.load();
  }

  protected load(): void {
    if (this.productId === 0) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.products.getById(this.productId).subscribe({
      next: (product) => {
        this.product.set(product);

        const priced = this.pricePresentation();

        if (priced !== null) {
          this.pricePresentation.set(
            product.presentations.find((item) => item.id === priced.id) ?? null,
          );
        }

        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el detalle del producto. Intenta nuevamente.');
        this.loading.set(false);
      },
    });
  }

  protected modelLabel(product: ProductDetail): string {
    if (product.productModel === null) {
      return '—';
    }

    const brand = product.productModel.brand;
    return brand === null || brand === undefined
      ? product.productModel.name
      : `${product.productModel.name} · ${brand.name}`;
  }

  protected presentationCount(product: ProductDetail): string {
    const total = product.presentations.length;
    return `${total} ${total === 1 ? 'presentación' : 'presentaciones'}`;
  }

  protected imageSummary(product: ProductDetail): string {
    const missing = pendingImages(product.presentations);

    if (product.presentations.length === 0) {
      return 'Sin presentaciones';
    }

    return missing === 0 ? 'Completas' : `${missing} pendientes`;
  }

  protected formatQuantity(value: number): string {
    return formatQuantity(value);
  }

  protected formatMoney(value: number): string {
    return formatMoney(value);
  }

  protected stockLabel(presentation: ProductPresentation): string {
    return stockStatusLabel(presentation.stockStatus);
  }

  protected stockTone(presentation: ProductPresentation) {
    return stockStatusTone(presentation.stockStatus);
  }

  protected hasImage(presentation: ProductPresentation): boolean {
    return (
      presentation.imageUrl !== null &&
      presentation.imageUrl.trim().length > 0 &&
      !this.failedImages().has(presentation.id)
    );
  }

  protected imageAlt(presentation: ProductPresentation, product: ProductDetail): string {
    return presentation.imageAlt ?? `${presentation.presentation.name} de ${product.name}`;
  }

  protected markImageFailed(presentationId: number): void {
    this.failedImages.update((current) => {
      const next = new Set(current);
      next.add(presentationId);
      return next;
    });
  }

  protected startEditProduct(): void {
    this.productFormError.set(null);
    this.activePanel.set('product');
  }

  protected startCreatePresentation(): void {
    this.editingPresentation.set(null);
    this.presentationFormError.set(null);
    this.activePanel.set('presentation');
  }

  protected startEditPresentation(presentation: ProductPresentation): void {
    this.editingPresentation.set(presentation);
    this.presentationFormError.set(null);
    this.activePanel.set('presentation');
  }

  protected startPriceChange(presentation: ProductPresentation): void {
    this.pricePresentation.set(presentation);
    this.priceFormError.set(null);
    this.priceHistory.set([]);
    this.activePanel.set('price');
    this.loadPriceHistory(presentation.id);
  }

  protected loadPriceHistory(presentationId: number): void {
    this.priceHistoryLoading.set(true);
    this.priceHistoryError.set(null);

    this.products.getPriceHistory(this.productId, presentationId).subscribe({
      next: (history) => {
        this.priceHistory.set(history);
        this.priceHistoryLoading.set(false);
      },
      error: () => {
        this.priceHistoryError.set('No se pudo cargar el historial de precios.');
        this.priceHistoryLoading.set(false);
      },
    });
  }

  protected closePanel(): void {
    this.activePanel.set(null);
    this.editingPresentation.set(null);
    this.productFormError.set(null);
    this.presentationFormError.set(null);
    this.pricePresentation.set(null);
    this.priceHistory.set([]);
    this.priceHistoryError.set(null);
    this.priceFormError.set(null);
  }

  protected saveProduct(value: ProductFormValue): void {
    this.savingProduct.set(true);
    this.productFormError.set(null);

    this.products.update(this.productId, value).subscribe({
      next: (product) => {
        this.savingProduct.set(false);
        this.product.set(product);
        this.toast.success('Producto actualizado', `${product.code} · ${product.name}`);
        this.closePanel();
      },
      error: (error: unknown) => {
        this.savingProduct.set(false);
        this.productFormError.set(
          readApiError(
            error,
            'No se pudo guardar el producto. Revisa los datos e inténtalo de nuevo.',
          ),
        );
      },
    });
  }

  protected savePresentation(value: ProductPresentationFormValue): void {
    const editing = this.editingPresentation();

    this.savingPresentation.set(true);
    this.presentationFormError.set(null);

    const request =
      editing === null
        ? this.products.createPresentation(this.productId, value)
        : this.products.updatePresentation(this.productId, editing.id, value);

    request.subscribe({
      next: (presentation) => {
        this.savingPresentation.set(false);
        this.toast.success(
          editing === null ? 'Presentación agregada' : 'Presentación actualizada',
          presentation.code,
        );
        this.closePanel();
        this.load();
      },
      error: (error: unknown) => {
        this.savingPresentation.set(false);
        this.presentationFormError.set(
          readApiError(error, 'No se pudo guardar la presentación. Revisa los datos.'),
        );
      },
    });
  }

  protected savePrice(value: PriceFormValue): void {
    const priced = this.pricePresentation();

    if (priced === null) {
      return;
    }

    this.savingPrice.set(true);
    this.priceFormError.set(null);

    this.products.changePrice(this.productId, priced.id, value).subscribe({
      next: (price) => {
        this.savingPrice.set(false);
        this.toast.success(
          'Precio actualizado',
          `${priced.code} · ${formatMoney(price.price)} vigente`,
        );
        this.load();
        this.loadPriceHistory(priced.id);
      },
      error: (error: unknown) => {
        this.savingPrice.set(false);
        this.priceFormError.set(
          readApiError(
            error,
            'No se pudo cambiar el precio. Verifica el valor e inténtalo de nuevo.',
          ),
        );
      },
    });
  }

  protected requestStatusChange(product: ProductDetail): void {
    if (product.isActive) {
      this.confirmingStatus.set(true);
      return;
    }

    this.changeStatus(product);
  }

  protected changeStatus(product: ProductDetail): void {
    const next = !product.isActive;

    this.statusLoading.set(true);

    this.products.changeStatus(product.id, next).subscribe({
      next: () => {
        this.statusLoading.set(false);
        this.confirmingStatus.set(false);
        this.toast.success(
          next ? 'Producto activado' : 'Producto desactivado',
          `${product.code} · ${product.name}`,
        );
        this.load();
      },
      error: (error: unknown) => {
        this.statusLoading.set(false);
        this.confirmingStatus.set(false);
        this.toast.error(
          'No se pudo cambiar el estado',
          readApiError(error, 'Revisa las dependencias del producto.'),
        );
      },
    });
  }

  protected requestPresentationStatusChange(presentation: ProductPresentation): void {
    if (presentation.isActive) {
      this.confirmingPresentationId.set(presentation.id);
      return;
    }

    this.changePresentationStatus(presentation);
  }

  protected changePresentationStatus(presentation: ProductPresentation): void {
    const next = !presentation.isActive;

    this.presentationStatusLoadingId.set(presentation.id);

    this.products.changePresentationStatus(this.productId, presentation.id, next).subscribe({
      next: () => {
        this.presentationStatusLoadingId.set(null);
        this.confirmingPresentationId.set(null);
        this.toast.success(
          next ? 'Presentación activada' : 'Presentación desactivada',
          presentation.code,
        );
        this.load();
      },
      error: (error: unknown) => {
        this.presentationStatusLoadingId.set(null);
        this.confirmingPresentationId.set(null);
        this.toast.error(
          'No se pudo cambiar el estado',
          readApiError(error, 'Revisa las dependencias de la presentación.'),
        );
      },
    });
  }

  private loadOptions(): void {
    this.products.getCategoryOptions().subscribe({
      next: (options) => this.categories.set(options),
      error: () => this.categories.set([]),
    });

    this.products.getTypeOptions().subscribe({
      next: (options) => this.productTypes.set(options),
      error: () => this.productTypes.set([]),
    });

    this.products.getModelOptions().subscribe({
      next: (options) => this.models.set(options),
      error: () => this.models.set([]),
    });

    this.products.getPresentationOptions().subscribe({
      next: (options) => this.presentationOptions.set(options),
      error: () => this.presentationOptions.set([]),
    });
  }
}
