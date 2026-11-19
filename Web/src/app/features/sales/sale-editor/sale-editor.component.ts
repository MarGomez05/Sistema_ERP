import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { readApiError } from '@core/http/api-error';
import { ToastService } from '@core/ui/toast.service';
import { Customer, CustomerOption } from '@features/customers/customer.model';
import { CustomerService } from '@features/customers/customer.service';
import {
  ProductDetail,
  ProductListItem,
  ProductPresentation,
  formatMoney,
  formatQuantity,
  stockStatusTone,
} from '@features/products/product.model';
import { ProductService } from '@features/products/product.service';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import {
  PAYMENT_CONDITION_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PaymentCondition,
  PaymentMethod,
  SaleFormValue,
  canEditSale,
  creditIssue,
  estimatedDiscountTotal,
  estimatedTotal,
  lineGross,
  lineTotal,
} from '../sale.model';
import { SaleService } from '../sale.service';

export interface EditorLine {
  productPresentationId: number;
  productId: number;
  productCode: string;
  productName: string;
  presentationName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  stock: number | null;
}

// Alta y edición de ventas en borrador con líneas por presentación (contrato 11).
@Component({
  selector: 'app-sale-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    ButtonComponent,
    IconComponent,
    PageHeaderComponent,
    ReactiveFormsModule,
    RouterLink,
    SkeletonComponent,
  ],
  template: `
    <app-page-header [title]="headerTitle()" [subtitle]="headerSubtitle()">
      <div actions class="editor-actions">
        <a appButton variant="secondary" [routerLink]="backLink()">
          <app-icon name="arrowLeft" [size]="16" />
          Volver
        </a>
      </div>
    </app-page-header>

    @if (loading()) {
      <div class="panel editor-skeleton" aria-hidden="true">
        @for (row of skeletonRows; track $index) {
          <app-skeleton height="22px" />
        }
      </div>
    } @else if (error(); as message) {
      <div class="panel editor-feedback" role="alert">
        <app-icon name="alertCircle" [size]="20" />
        <div>
          <p class="editor-feedback__title">No se pudo cargar la venta</p>
          <p>{{ message }}</p>
        </div>
        <button appButton type="button" size="sm" variant="secondary" (click)="retryLoad()">
          Reintentar
        </button>
      </div>
    } @else {
      <form class="editor-layout" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <div class="editor-main">
          <section class="panel" aria-labelledby="sale-general-title">
            <div class="panel__header">
              <div>
                <h2 id="sale-general-title" class="panel__title">Datos generales</h2>
                <p class="panel__subtitle">Cliente, condición de pago y notas de la venta.</p>
              </div>
            </div>

            <div class="panel__body editor-fields">
              <div class="field">
                <label class="field__label" for="sale-customer">Cliente</label>
                <select id="sale-customer" class="field__control" formControlName="customerId">
                  <option [ngValue]="null">Consumidor final</option>
                  @for (customer of customers(); track customer.id) {
                    <option [ngValue]="customer.id">{{ customer.name }}</option>
                  }
                </select>
                @if (customersError(); as message) {
                  <p class="field__error" role="alert">
                    {{ message }}
                    <button type="button" class="editor-inline-link" (click)="loadCustomers()">
                      Reintentar
                    </button>
                  </p>
                } @else {
                  <p class="field__hint">
                    Opcional. Las ventas a crédito requieren un cliente registrado.
                  </p>
                }
              </div>

              <div class="field">
                <label class="field__label" for="sale-condition">
                  Condición de pago <span class="field__required" aria-hidden="true">*</span>
                </label>
                <select
                  id="sale-condition"
                  class="field__control"
                  formControlName="paymentCondition"
                >
                  @for (option of conditionOptions; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </div>

              <div class="field">
                <label class="field__label" for="sale-method">Método de pago</label>
                <select id="sale-method" class="field__control" formControlName="paymentMethod">
                  <option [ngValue]="null">Sin especificar</option>
                  @for (option of methodOptions; track option.value) {
                    <option [ngValue]="option.value">{{ option.label }}</option>
                  }
                </select>
              </div>

              <div class="field editor-fields__wide">
                <label class="field__label" for="sale-notes">Notas</label>
                <textarea
                  id="sale-notes"
                  class="field__control"
                  rows="2"
                  formControlName="notes"
                  maxlength="255"
                  placeholder="Referencia, observaciones o datos de entrega"
                ></textarea>
                <p class="field__hint">Máximo 255 caracteres.</p>
              </div>

              @if (creditCustomer(); as customer) {
                <div class="credit-summary editor-fields__wide">
                  <div class="credit-summary__header">
                    <span class="credit-summary__title">
                      <app-icon name="creditCard" [size]="16" />
                      Crédito de {{ customer.legalName }}
                    </span>
                    <button type="button" class="editor-inline-link" (click)="openCustomer()">
                      Ver cliente
                    </button>
                  </div>
                  <dl class="credit-summary__stats">
                    <div>
                      <dt>Límite</dt>
                      <dd>{{ formatMoney(customer.creditLimit) }}</dd>
                    </div>
                    <div>
                      <dt>Saldo pendiente</dt>
                      <dd>{{ formatMoney(customer.outstandingBalance) }}</dd>
                    </div>
                    <div>
                      <dt>Disponible</dt>
                      <dd>
                        {{ formatMoney(customer.creditLimit - customer.outstandingBalance) }}
                      </dd>
                    </div>
                    <div>
                      <dt>Días</dt>
                      <dd>{{ customer.creditDays }}</dd>
                    </div>
                  </dl>
                </div>
              }

              @if (creditWarning(); as message) {
                <p class="editor-warning editor-fields__wide" role="status">
                  <app-icon name="alertTriangle" [size]="16" />
                  {{ message }}
                </p>
              }
            </div>
          </section>

          <section class="panel" aria-labelledby="sale-products-title">
            <div class="panel__header">
              <div>
                <h2 id="sale-products-title" class="panel__title">Productos</h2>
                <p class="panel__subtitle">
                  Busca un producto y agrega sus presentaciones con precio vigente.
                </p>
              </div>
            </div>

            <div class="panel__body editor-products">
              <div class="editor-search">
                <app-icon name="search" [size]="17" />
                <input
                  class="field__control editor-search__input"
                  type="search"
                  [value]="searchTerm()"
                  placeholder="Buscar por código o nombre"
                  aria-label="Buscar producto por código o nombre"
                  (input)="onSearchInput($event)"
                  (keydown.enter)="searchProducts(); $event.preventDefault()"
                />
                <button
                  appButton
                  type="button"
                  variant="secondary"
                  [loading]="searching()"
                  (click)="searchProducts()"
                >
                  Buscar
                </button>
              </div>

              @if (searchError(); as message) {
                <p class="field__error" role="alert">{{ message }}</p>
              } @else if (searching()) {
                <div class="editor-results editor-results--loading" aria-hidden="true">
                  <app-skeleton height="18px" />
                  <app-skeleton height="18px" />
                </div>
              } @else if (searchResults().length > 0) {
                <ul class="editor-results" aria-label="Resultados de productos">
                  @for (product of searchResults(); track product.id) {
                    <li>
                      <button
                        type="button"
                        class="editor-result"
                        [class.editor-result--active]="selectedProduct()?.id === product.id"
                        (click)="selectProduct(product.id)"
                      >
                        <span class="editor-result__icon">
                          <app-icon name="package" [size]="17" />
                        </span>
                        <span class="editor-result__text">
                          <span class="editor-result__name">{{ product.name }}</span>
                          <span class="editor-result__meta">
                            {{ product.code }} · {{ product.categoryName }}
                          </span>
                        </span>
                        <app-icon name="chevronRight" [size]="16" />
                      </button>
                    </li>
                  }
                </ul>
              } @else if (searchPerformed()) {
                <p class="editor-empty">No se encontraron productos activos con ese criterio.</p>
              }

              @if (productError(); as message) {
                <p class="field__error" role="alert">{{ message }}</p>
              }

              @if (loadingProduct()) {
                <div class="editor-selected editor-selected--loading" aria-hidden="true">
                  <app-skeleton height="20px" />
                  <app-skeleton height="48px" />
                </div>
              } @else if (selectedProduct(); as product) {
                <div class="editor-selected">
                  <div class="editor-selected__header">
                    <div>
                      <p class="editor-selected__eyebrow">Presentaciones disponibles</p>
                      <h3 class="editor-selected__title">{{ product.name }}</h3>
                      <p class="editor-selected__meta">
                        {{ product.code }} ·
                        {{ product.isActive ? 'Producto activo' : 'Producto inactivo' }}
                      </p>
                    </div>
                    <button
                      type="button"
                      class="editor-icon-button"
                      aria-label="Cerrar presentaciones"
                      (click)="closeProduct()"
                    >
                      <app-icon name="close" [size]="16" />
                    </button>
                  </div>

                  @if (product.presentations.length === 0) {
                    <p class="editor-empty">El producto no tiene presentaciones registradas.</p>
                  } @else {
                    <ul class="presentation-list">
                      @for (presentation of product.presentations; track presentation.id) {
                        <li class="presentation-row">
                          <div class="presentation-row__text">
                            <span class="presentation-row__name">
                              {{ presentation.presentation.name }}
                            </span>
                            <span class="presentation-row__meta">
                              Contiene {{ formatQuantity(presentation.presentation.quantity) }}
                              {{ presentation.presentation.measureUnit }}
                            </span>
                          </div>
                          <div class="presentation-row__price">
                            @if (presentation.currentPrice !== null) {
                              <span>{{ formatMoney(presentation.currentPrice) }}</span>
                              <span class="presentation-row__meta">Precio vigente</span>
                            } @else {
                              <span class="presentation-row__missing">Sin precio vigente</span>
                            }
                          </div>
                          <div class="presentation-row__stock">
                            <app-badge [tone]="stockStatusTone(presentation.stockStatus)">
                              {{ formatQuantity(presentation.stock) }} disponibles
                            </app-badge>
                          </div>
                          <button
                            appButton
                            type="button"
                            size="sm"
                            variant="secondary"
                            [disabled]="
                              presentation.currentPrice === null || presentation.stock <= 0
                            "
                            (click)="addPresentation(presentation)"
                          >
                            <app-icon name="plus" [size]="15" />
                            Agregar
                          </button>
                        </li>
                      }
                    </ul>
                  }
                </div>
              }
            </div>
          </section>

          <section class="panel" aria-labelledby="sale-lines-title">
            <div class="panel__header">
              <div>
                <h2 id="sale-lines-title" class="panel__title">Líneas de la venta</h2>
                <p class="panel__subtitle">
                  Ajusta cantidad y descuento. El precio se toma del catálogo y no se modifica.
                </p>
              </div>
              <app-badge tone="neutral">{{ lines().length }} líneas</app-badge>
            </div>

            <div class="panel__body panel__body--flush">
              @if (lines().length === 0) {
                <p class="editor-empty editor-empty--boxed">
                  <app-icon name="cart" [size]="18" />
                  Agrega al menos una presentación para registrar la venta.
                </p>
              } @else {
                <div class="table-wrap">
                  <table class="table lines-table">
                    <thead>
                      <tr>
                        <th scope="col">Producto</th>
                        <th scope="col">Cantidad</th>
                        <th scope="col">Precio</th>
                        <th scope="col">Descuento</th>
                        <th scope="col" class="is-numeric">Total</th>
                        <th scope="col">
                          <span class="u-sr-only">Acciones</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (line of lines(); track line.productPresentationId; let index = $index) {
                        <tr>
                          <td>
                            <span class="lines-product">{{ line.productName }}</span>
                            <span class="lines-meta">
                              {{ line.productCode }} · {{ line.presentationName }}
                            </span>
                            @if (line.stock !== null) {
                              <span class="lines-meta">
                                Stock disponible: {{ formatQuantity(line.stock) }}
                              </span>
                            }
                            @if (lineIssue(line); as message) {
                              <span class="lines-error" role="alert">{{ message }}</span>
                            }
                          </td>
                          <td>
                            <input
                              class="field__control lines-input"
                              type="number"
                              min="0.01"
                              step="0.01"
                              [value]="line.quantity"
                              [attr.aria-label]="'Cantidad de ' + line.productName"
                              (input)="updateLine(index, 'quantity', $event)"
                            />
                          </td>
                          <td>
                            <span class="lines-price">
                              <app-icon name="lock" [size]="13" />
                              {{ formatMoney(line.unitPrice) }}
                            </span>
                            <span class="lines-meta">Precio vigente</span>
                          </td>
                          <td>
                            <input
                              class="field__control lines-input"
                              type="number"
                              min="0"
                              step="0.01"
                              [value]="line.discount"
                              [attr.aria-label]="'Descuento de ' + line.productName"
                              (input)="updateLine(index, 'discount', $event)"
                            />
                          </td>
                          <td class="is-numeric">
                            <span class="lines-total">
                              {{
                                formatMoney(lineTotal(line.quantity, line.unitPrice, line.discount))
                              }}
                            </span>
                          </td>
                          <td>
                            <button
                              appButton
                              type="button"
                              size="sm"
                              variant="ghost"
                              [attr.aria-label]="'Quitar ' + line.productName"
                              (click)="removeLine(index)"
                            >
                              <app-icon name="close" [size]="15" />
                            </button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </section>
        </div>

        <aside class="editor-side" aria-label="Resumen de la venta">
          <h2 class="editor-side__title">Resumen</h2>

          <dl class="editor-totals">
            <div>
              <dt>Líneas</dt>
              <dd>{{ lines().length }}</dd>
            </div>
            <div>
              <dt>Descuentos</dt>
              <dd>{{ formatMoney(totalDiscount()) }}</dd>
            </div>
            <div class="editor-totals__grand">
              <dt>Total</dt>
              <dd>{{ formatMoney(total()) }}</dd>
            </div>
          </dl>

          <p class="editor-side__note">
            <app-icon name="info" [size]="15" />
            El total incluye IVA. El servidor recalcula la base imponible y el IVA al guardar.
          </p>

          @if (formError(); as message) {
            <p class="editor-error" role="alert">
              <app-icon name="alertCircle" [size]="16" />
              {{ message }}
            </p>
          }

          <button appButton type="submit" class="editor-submit" [loading]="saving()">
            <app-icon name="checkCircle" [size]="16" />
            {{ editId() === null ? 'Crear venta' : 'Guardar cambios' }}
          </button>

          <a appButton variant="secondary" class="editor-cancel" [routerLink]="backLink()">
            Cancelar
          </a>
        </aside>
      </form>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .editor-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .editor-skeleton {
      display: grid;
      gap: 16px;
      padding: 24px 22px;
    }

    .editor-feedback {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 14px;
      padding: 20px 22px;
      color: var(--danger-700);
      font-size: var(--text-sm);
    }

    .editor-feedback__title {
      font-weight: var(--weight-semibold);
    }

    .editor-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      align-items: start;
      gap: var(--space-5);
    }

    .editor-main {
      display: grid;
      gap: var(--space-5);
      min-width: 0;
    }

    .editor-fields {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-4);
    }

    .editor-fields__wide {
      grid-column: 1 / -1;
    }

    .credit-summary {
      padding: 12px 14px;
      background: var(--surface-muted);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
    }

    .credit-summary__header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 10px;
    }

    .credit-summary__title {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    .credit-summary__stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--space-3);
      margin: 0;
    }

    .credit-summary__stats dt {
      color: var(--text-subtle);
      font-size: 0.6875rem;
      font-weight: var(--weight-semibold);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .credit-summary__stats dd {
      margin: 3px 0 0;
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      font-variant-numeric: tabular-nums;
    }

    .editor-warning {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 12px;
      background: var(--warning-100);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--warning-700);
      font-size: var(--text-xs);
      line-height: 1.5;
    }

    .editor-inline-link {
      background: none;
      border: 0;
      padding: 0;
      color: var(--brand-700);
      font-size: inherit;
      font-weight: var(--weight-semibold);
      text-decoration: underline;
      text-underline-offset: 2px;
      cursor: pointer;
    }

    .editor-products {
      display: grid;
      gap: var(--space-4);
    }

    .editor-search {
      position: relative;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
    }

    .editor-search app-icon {
      position: absolute;
      top: 22px;
      left: 12px;
      color: var(--text-subtle);
      transform: translateY(-50%);
      pointer-events: none;
    }

    .editor-search__input {
      flex: 1 1 240px;
      padding-left: 38px;
    }

    .editor-results {
      display: grid;
      gap: 4px;
      max-height: 240px;
      margin: 0;
      padding: 4px;
      overflow-y: auto;
      list-style: none;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
    }

    .editor-results--loading {
      padding: 12px;
      gap: 12px;
    }

    .editor-result {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 9px 10px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      color: var(--text);
      text-align: left;
      cursor: pointer;
      transition:
        background var(--transition-fast),
        border-color var(--transition-fast);
    }

    .editor-result:hover,
    .editor-result--active {
      background: var(--gradient-soft);
      border-color: var(--brand-200);
    }

    .editor-result__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: var(--brand-100);
      border-radius: var(--radius-sm);
      color: var(--brand-700);
    }

    .editor-result__text {
      display: grid;
      flex: 1;
      min-width: 0;
    }

    .editor-result__name {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    .editor-result__meta {
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .editor-empty {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-subtle);
      font-size: var(--text-sm);
    }

    .editor-empty--boxed {
      padding: 20px 22px;
    }

    .editor-selected {
      display: grid;
      gap: var(--space-3);
      padding: 14px 16px;
      background: var(--surface-muted);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
    }

    .editor-selected--loading {
      padding: 16px;
    }

    .editor-selected__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
    }

    .editor-selected__eyebrow {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .editor-selected__title {
      margin-top: 3px;
      font-size: var(--text-base);
      font-weight: var(--weight-semibold);
    }

    .editor-selected__meta {
      margin-top: 2px;
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .editor-icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      color: var(--text-subtle);
      cursor: pointer;
    }

    .editor-icon-button:hover {
      background: var(--brand-100);
      border-color: var(--brand-200);
      color: var(--brand-700);
    }

    .presentation-list {
      display: grid;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .presentation-row {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 0.9fr) auto;
      align-items: center;
      gap: var(--space-3);
      padding: 9px 10px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
    }

    .presentation-row__text,
    .presentation-row__price {
      display: grid;
    }

    .presentation-row__name {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    .presentation-row__meta {
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .presentation-row__missing {
      color: var(--danger-700);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
    }

    .presentation-row__price > span:first-child {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      font-variant-numeric: tabular-nums;
    }

    .lines-table {
      min-width: 860px;
    }

    .lines-table th,
    .lines-table td {
      vertical-align: top;
    }

    .lines-product {
      display: block;
      font-weight: var(--weight-semibold);
    }

    .lines-meta {
      display: block;
      margin-top: 2px;
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .lines-error {
      display: block;
      margin-top: 4px;
      color: var(--danger-700);
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
    }

    .lines-input {
      width: 108px;
      min-height: 40px;
      font-variant-numeric: tabular-nums;
    }

    .lines-total {
      font-weight: var(--weight-semibold);
      font-variant-numeric: tabular-nums;
    }

    .lines-price {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: var(--weight-semibold);
      font-variant-numeric: tabular-nums;
    }

    .editor-side {
      position: sticky;
      top: calc(var(--header-height) + var(--space-4));
      display: grid;
      gap: var(--space-4);
      padding: var(--space-5);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }

    .editor-side__title {
      font-size: var(--text-base);
      font-weight: var(--weight-semibold);
    }

    .editor-totals {
      display: grid;
      gap: 10px;
      margin: 0;
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--border);
    }

    .editor-totals > div {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--space-3);
    }

    .editor-totals dt {
      color: var(--text-muted);
      font-size: var(--text-sm);
    }

    .editor-totals dd {
      margin: 0;
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      font-variant-numeric: tabular-nums;
    }

    .editor-totals__grand {
      padding-top: 10px;
      border-top: 1px dashed var(--border);
    }

    .editor-totals__grand dt {
      color: var(--text);
      font-weight: var(--weight-semibold);
    }

    .editor-totals__grand dd {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      letter-spacing: -0.02em;
    }

    .editor-side__note {
      display: flex;
      align-items: flex-start;
      gap: 7px;
      padding: 9px 10px;
      background: var(--info-100);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--info-700);
      font-size: var(--text-xs);
      line-height: 1.5;
    }

    .editor-error {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 12px;
      background: var(--danger-100);
      border: 1px solid #f0cdca;
      border-radius: var(--radius-md);
      color: var(--danger-700);
      font-size: var(--text-xs);
      line-height: 1.5;
    }

    .editor-submit {
      width: 100%;
    }

    .editor-cancel {
      justify-content: center;
    }

    @media (max-width: 1100px) {
      .editor-layout {
        grid-template-columns: minmax(0, 1fr);
      }

      .editor-side {
        position: static;
      }

      .editor-fields {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 760px) {
      .editor-fields {
        grid-template-columns: minmax(0, 1fr);
      }

      .credit-summary__stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .presentation-row {
        grid-template-columns: minmax(0, 1fr) auto;
      }

      .presentation-row__price,
      .presentation-row__stock {
        grid-column: 1 / 2;
      }
    }
  `,
})
export class SaleEditorComponent implements OnInit {
  private static readonly SKELETON_ROWS = Array.from({ length: 4 });

  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sales = inject(SaleService);
  private readonly products = inject(ProductService);
  private readonly customersService = inject(CustomerService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  private creditRequest = 0;
  private requestedId: number | null = null;

  protected readonly skeletonRows = SaleEditorComponent.SKELETON_ROWS;
  protected readonly conditionOptions = PAYMENT_CONDITION_OPTIONS;
  protected readonly methodOptions = PAYMENT_METHOD_OPTIONS;

  protected readonly editId = signal<number | null>(null);
  protected readonly saleNumber = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly customers = signal<CustomerOption[]>([]);
  protected readonly customersError = signal<string | null>(null);
  protected readonly creditCustomer = signal<Customer | null>(null);
  protected readonly condition = signal<PaymentCondition>('CASH');

  protected readonly lines = signal<EditorLine[]>([]);

  protected readonly searchTerm = signal('');
  protected readonly searchResults = signal<ProductListItem[]>([]);
  protected readonly searching = signal(false);
  protected readonly searchPerformed = signal(false);
  protected readonly searchError = signal<string | null>(null);

  protected readonly selectedProduct = signal<ProductDetail | null>(null);
  protected readonly loadingProduct = signal(false);
  protected readonly productError = signal<string | null>(null);

  protected readonly total = computed(() => estimatedTotal(this.lines()));
  protected readonly totalDiscount = computed(() => estimatedDiscountTotal(this.lines()));

  protected readonly headerTitle = computed(() => {
    const number = this.saleNumber();
    return number === null ? 'Nueva venta' : `Editar ${number}`;
  });

  protected readonly headerSubtitle = computed(() =>
    this.editId() === null
      ? 'Registra el cliente, las presentaciones y la condición de pago. La venta se guarda como borrador.'
      : 'Solo las ventas en borrador pueden editarse. Al guardar se recalculan los totales.',
  );

  protected readonly backLink = computed<readonly unknown[]>(() => {
    const id = this.editId();
    return id === null ? ['/sales'] : ['/sales', id];
  });

  protected readonly creditWarning = computed(() => {
    if (this.condition() !== 'CREDIT') {
      return null;
    }

    const customer = this.creditCustomer();

    if (customer === null) {
      return 'Una venta a crédito requiere un cliente registrado.';
    }

    return creditIssue(customer, this.total());
  });

  protected readonly form = this.formBuilder.group({
    customerId: this.formBuilder.control<number | null>(null),
    paymentCondition: this.formBuilder.nonNullable.control<PaymentCondition>('CASH', [
      Validators.required,
    ]),
    paymentMethod: this.formBuilder.control<PaymentMethod | null>('CASH'),
    notes: this.formBuilder.nonNullable.control('', [Validators.maxLength(255)]),
  });

  constructor() {
    this.form.controls.customerId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((customerId) => this.handleCustomerChange(customerId));

    this.form.controls.paymentCondition.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((condition) => this.condition.set(condition));
  }

  ngOnInit(): void {
    this.loadCustomers();
    this.searchProducts();

    const raw = this.route.snapshot.paramMap.get('id');

    if (raw === null) {
      return;
    }

    const id = Number(raw);

    if (!Number.isInteger(id) || id <= 0) {
      void this.router.navigate(['/sales']);
      return;
    }

    this.requestedId = id;
    this.loadSale(id);
  }

  protected retryLoad(): void {
    if (this.requestedId !== null) {
      this.loadSale(this.requestedId);
    }
  }

  protected formatMoney(value: number): string {
    return formatMoney(value);
  }

  protected formatQuantity(value: number): string {
    return formatQuantity(value);
  }

  protected stockStatusTone(status: ProductPresentation['stockStatus']) {
    return stockStatusTone(status);
  }

  protected lineTotal(quantity: number, unitPrice: number, discount: number): number {
    return lineTotal(quantity, unitPrice, discount);
  }

  protected lineIssue(line: EditorLine): string | null {
    if (line.quantity <= 0) {
      return 'La cantidad debe ser mayor que cero.';
    }

    if (line.unitPrice <= 0) {
      return 'El precio debe ser mayor que cero.';
    }

    if (line.discount < 0) {
      return 'El descuento no puede ser negativo.';
    }

    if (line.discount > lineGross(line.quantity, line.unitPrice)) {
      return 'El descuento supera el importe de la línea.';
    }

    return null;
  }

  protected onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected searchProducts(): void {
    this.searching.set(true);
    this.searchError.set(null);

    this.products
      .list({
        search: this.searchTerm(),
        categoryId: null,
        productTypeId: null,
        isActive: true,
        page: 0,
        size: 8,
      })
      .subscribe({
        next: (response) => {
          this.searchResults.set(response.content);
          this.searching.set(false);
          this.searchPerformed.set(true);
        },
        error: () => {
          this.searching.set(false);
          this.searchPerformed.set(true);
          this.searchError.set('No se pudo buscar productos. Intenta nuevamente.');
        },
      });
  }

  protected selectProduct(id: number): void {
    this.loadingProduct.set(true);
    this.productError.set(null);

    this.products.getById(id).subscribe({
      next: (product) => {
        this.selectedProduct.set(product);
        this.loadingProduct.set(false);
      },
      error: () => {
        this.loadingProduct.set(false);
        this.productError.set('No se pudo cargar el detalle del producto.');
      },
    });
  }

  protected closeProduct(): void {
    this.selectedProduct.set(null);
    this.productError.set(null);
  }

  protected openCustomer(): void {
    const customer = this.creditCustomer();

    if (customer !== null) {
      void this.router.navigate(['/customers', customer.id]);
    }
  }

  protected addPresentation(presentation: ProductPresentation): void {
    const product = this.selectedProduct();

    if (product === null || presentation.currentPrice === null) {
      return;
    }

    if (this.lines().some((line) => line.productPresentationId === presentation.id)) {
      this.toast.warning(
        'Presentación ya agregada',
        'Ajusta la cantidad de la línea existente en lugar de duplicarla.',
      );
      return;
    }

    this.lines.update((lines) => [
      ...lines,
      {
        productPresentationId: presentation.id,
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        presentationName: presentation.presentation.name,
        quantity: 1,
        unitPrice: presentation.currentPrice ?? 0,
        discount: 0,
        stock: presentation.stock,
      },
    ]);

    this.toast.success('Línea agregada', `${product.name} · ${presentation.presentation.name}`);
  }

  protected removeLine(index: number): void {
    this.lines.update((lines) => lines.filter((_, position) => position !== index));
  }

  protected updateLine(index: number, field: 'quantity' | 'discount', event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const parsed = Number(raw);
    const value = Number.isFinite(parsed) ? parsed : 0;

    this.lines.update((lines) =>
      lines.map((line, position) => (position === index ? { ...line, [field]: value } : line)),
    );
  }

  protected save(): void {
    this.form.markAllAsTouched();
    this.formError.set(null);

    if (this.form.invalid) {
      this.formError.set('Revisa los datos generales de la venta.');
      return;
    }

    const lines = this.lines();

    if (lines.length === 0) {
      this.formError.set('Agrega al menos una presentación a la venta.');
      return;
    }

    const issue = lines.map((line) => this.lineIssue(line)).find((message) => message !== null);

    if (issue !== undefined && issue !== null) {
      this.formError.set(issue);
      return;
    }

    const raw = this.form.getRawValue();

    if (raw.paymentCondition === 'CREDIT' && raw.customerId === null) {
      this.formError.set('Selecciona un cliente para una venta a crédito.');
      return;
    }

    const value: SaleFormValue = {
      customerId: raw.customerId,
      paymentCondition: raw.paymentCondition,
      paymentMethod: raw.paymentMethod,
      notes: raw.notes,
      lines: lines.map((line) => ({
        productPresentationId: line.productPresentationId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: line.discount,
      })),
    };

    this.saving.set(true);

    const id = this.editId();
    const request = id === null ? this.sales.create(value) : this.sales.update(id, value);

    request.subscribe({
      next: (sale) => {
        this.saving.set(false);
        this.toast.success(
          id === null ? 'Venta creada' : 'Venta actualizada',
          `${sale.saleNumber} · ${formatMoney(sale.total)}`,
        );
        void this.router.navigate(['/sales', sale.id]);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(readApiError(error, 'No se pudo guardar la venta. Revisa los datos.'));
      },
    });
  }

  protected loadCustomers(): void {
    this.customersError.set(null);

    this.customersService.findOptions().subscribe({
      next: (options) => this.customers.set(options),
      error: () => this.customersError.set('No se pudieron cargar los clientes.'),
    });
  }

  private loadSale(id: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.sales.getById(id).subscribe({
      next: (sale) => {
        this.loading.set(false);

        const isAdmin = this.auth.canAccess(['ADMIN']);
        const userId = this.auth.user()?.id ?? null;

        if (!canEditSale(sale, userId, isAdmin)) {
          this.toast.warning(
            'Venta no editable',
            'Solo las ventas en borrador propias o administradas pueden editarse.',
          );
          void this.router.navigate(['/sales', sale.id]);
          return;
        }

        this.editId.set(sale.id);
        this.saleNumber.set(sale.saleNumber);
        this.condition.set(sale.paymentCondition);
        this.lines.set(
          sale.details.map((detail) => ({
            productPresentationId: detail.productPresentationId,
            productId: detail.productId,
            productCode: detail.productCode,
            productName: detail.productName,
            presentationName: detail.presentationName,
            quantity: detail.quantity,
            unitPrice: detail.unitPrice,
            discount: detail.discount,
            stock: null,
          })),
        );

        this.form.reset({
          customerId: sale.customer?.id ?? null,
          paymentCondition: sale.paymentCondition,
          paymentMethod: sale.paymentMethod,
          notes: sale.notes ?? '',
        });
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar la venta. Verifica que exista y vuelve a intentarlo.');
      },
    });
  }

  private handleCustomerChange(customerId: number | null): void {
    if (customerId === null) {
      this.creditRequest += 1;
      this.creditCustomer.set(null);
      return;
    }

    const request = ++this.creditRequest;

    this.customersService.getById(customerId).subscribe({
      next: (customer) => {
        if (request === this.creditRequest) {
          this.creditCustomer.set(customer);
        }
      },
      error: () => {
        if (request === this.creditRequest) {
          this.creditCustomer.set(null);
        }
      },
    });
  }
}
