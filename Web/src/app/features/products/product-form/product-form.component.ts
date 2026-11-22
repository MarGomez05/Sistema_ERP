import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import {
  ProductDetail,
  ProductFormValue,
  ProductModelOption,
  ProductModelReference,
  ProductSelectOption,
  productModelLabel,
} from '../product.model';

const trimmedRequired: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim().length > 0 ? null : { required: true };

function ensureCurrent(
  options: readonly ProductSelectOption[],
  current: ProductSelectOption | null,
): ProductSelectOption[] {
  if (current === null || options.some((option) => option.id === current.id)) {
    return [...options];
  }

  return [...options, { ...current, inactive: true }];
}

// Formulario de alta y edición de productos (contrato 5.1).
@Component({
  selector: 'app-product-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  template: `
    <form class="product-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <header class="product-form__header">
        <div>
          <p class="product-form__eyebrow">
            {{ record() === null ? 'Nuevo registro' : 'Edición' }}
          </p>
          <h2 class="product-form__title">
            {{ record() === null ? 'Nuevo producto' : 'Editar producto' }}
          </h2>
        </div>
        <button
          type="button"
          class="product-form__close"
          aria-label="Cerrar formulario"
          (click)="cancelled.emit()"
        >
          <app-icon name="close" [size]="18" />
        </button>
      </header>

      @if (error(); as message) {
        <p class="product-form__error" role="alert">
          <app-icon name="alertCircle" [size]="16" />
          {{ message }}
        </p>
      }

      <div class="product-form__grid">
        <div class="field">
          <label class="field__label" for="product-code">
            Código <span class="field__required" aria-hidden="true">*</span>
          </label>
          <input
            id="product-code"
            class="field__control"
            type="text"
            formControlName="code"
            maxlength="50"
            placeholder="Ej. CLV-001"
            [class.is-invalid]="errorFor('code') !== null"
          />
          @if (errorFor('code'); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          } @else {
            <p class="field__hint">Código único del producto en el inventario.</p>
          }
        </div>

        <div class="field">
          <label class="field__label" for="product-name">
            Nombre <span class="field__required" aria-hidden="true">*</span>
          </label>
          <input
            id="product-name"
            class="field__control"
            type="text"
            formControlName="name"
            maxlength="150"
            placeholder="Ej. Clavo de acero 2 pulgadas"
            [class.is-invalid]="errorFor('name') !== null"
          />
          @if (errorFor('name'); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          }
        </div>

        <div class="field">
          <label class="field__label" for="product-category">
            Categoría <span class="field__required" aria-hidden="true">*</span>
          </label>
          <select
            id="product-category"
            class="field__control"
            formControlName="categoryId"
            [class.is-invalid]="errorFor('categoryId') !== null"
          >
            <option [ngValue]="null" disabled>Selecciona una categoría</option>
            @for (option of categoryOptions(); track option.id) {
              <option [ngValue]="option.id">{{ optionLabel(option) }}</option>
            }
          </select>
          @if (errorFor('categoryId'); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          }
        </div>

        <div class="field">
          <label class="field__label" for="product-type">
            Tipo de producto <span class="field__required" aria-hidden="true">*</span>
          </label>
          <select
            id="product-type"
            class="field__control"
            formControlName="productTypeId"
            [class.is-invalid]="errorFor('productTypeId') !== null"
          >
            <option [ngValue]="null" disabled>Selecciona un tipo</option>
            @for (option of typeOptions(); track option.id) {
              <option [ngValue]="option.id">{{ optionLabel(option) }}</option>
            }
          </select>
          @if (errorFor('productTypeId'); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          }
        </div>

        <div class="field">
          <label class="field__label" for="product-model">Modelo</label>
          <select id="product-model" class="field__control" formControlName="productModelId">
            <option [ngValue]="null">Sin modelo</option>
            @for (option of modelOptions(); track option.id) {
              <option [ngValue]="option.id">{{ modelOptionLabel(option) }}</option>
            }
          </select>
          <p class="field__hint">Opcional. Solo se muestran modelos activos.</p>
        </div>

        <div class="field">
          <label class="field__label" for="product-description">Descripción</label>
          <textarea
            id="product-description"
            class="field__control"
            rows="3"
            formControlName="description"
            maxlength="255"
            placeholder="Descripción opcional del producto"
            [class.is-invalid]="errorFor('description') !== null"
          ></textarea>
          @if (errorFor('description'); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          }
        </div>

        <label class="product-form__check">
          <input type="checkbox" formControlName="requiresExpiration" />
          <span>
            <strong>Requiere vencimiento</strong>
            <small>
              Actívalo si los lotes del producto deben registrar fecha de vencimiento. No se puede
              desactivar si el producto ya tiene lotes activos.
            </small>
          </span>
        </label>
      </div>

      <footer class="product-form__footer">
        <button
          appButton
          type="button"
          variant="secondary"
          [disabled]="saving()"
          (click)="cancelled.emit()"
        >
          Cancelar
        </button>
        <button appButton type="submit" [loading]="saving()">
          <app-icon name="checkCircle" [size]="16" />
          {{ record() === null ? 'Crear producto' : 'Guardar cambios' }}
        </button>
      </footer>
    </form>
  `,
  styles: `
    :host {
      display: block;
    }

    .product-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .product-form__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--border);
    }

    .product-form__eyebrow {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .product-form__title {
      margin-top: 4px;
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
    }

    .product-form__close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      color: var(--text-subtle);
      transition:
        background var(--transition-fast),
        color var(--transition-fast),
        border-color var(--transition-fast);
    }

    .product-form__close:hover {
      background: var(--surface-hover);
      border-color: var(--border);
      color: var(--text);
    }

    .product-form__error {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px 14px;
      background: var(--danger-100);
      border: 1px solid var(--danger-border);
      border-radius: var(--radius-md);
      color: var(--danger-700);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
    }

    .product-form__grid {
      display: grid;
      gap: var(--space-4);
    }

    .product-form__check {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px;
      background: var(--surface-muted);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      cursor: pointer;
    }

    .product-form__check input {
      width: 18px;
      height: 18px;
      margin-top: 2px;
      accent-color: var(--brand-500);
    }

    .product-form__check strong {
      display: block;
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    .product-form__check small {
      display: block;
      margin-top: 2px;
      color: var(--text-muted);
      font-size: var(--text-xs);
      line-height: 1.5;
    }

    .product-form__footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-3);
      padding-top: var(--space-4);
      border-top: 1px solid var(--border);
    }
  `,
})
export class ProductFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly record = input<ProductDetail | null>(null);
  readonly categories = input<readonly ProductSelectOption[]>([]);
  readonly productTypes = input<readonly ProductSelectOption[]>([]);
  readonly models = input<readonly ProductModelOption[]>([]);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly submitted = output<ProductFormValue>();
  readonly cancelled = output<void>();

  protected readonly form = this.formBuilder.group({
    code: this.formBuilder.nonNullable.control('', [trimmedRequired, Validators.maxLength(50)]),
    name: this.formBuilder.nonNullable.control('', [trimmedRequired, Validators.maxLength(150)]),
    description: this.formBuilder.nonNullable.control('', [Validators.maxLength(255)]),
    categoryId: this.formBuilder.control<number | null>(null, [Validators.required]),
    productTypeId: this.formBuilder.control<number | null>(null, [Validators.required]),
    productModelId: this.formBuilder.control<number | null>(null),
    requiresExpiration: this.formBuilder.nonNullable.control(false),
  });

  protected readonly categoryOptions = computed(() =>
    ensureCurrent(this.categories(), this.record()?.category ?? null),
  );

  protected readonly typeOptions = computed(() =>
    ensureCurrent(this.productTypes(), this.record()?.productType ?? null),
  );

  protected readonly modelOptions = computed<ProductModelOption[]>(() => {
    const current = this.record()?.productModel ?? null;
    const options = this.models();

    if (current === null || options.some((option) => option.id === current.id)) {
      return [...options];
    }

    return [...options, this.currentModel(current)];
  });

  constructor() {
    effect(() => this.patch(this.record()));
  }

  protected optionLabel(option: ProductSelectOption): string {
    return option.inactive === true ? `${option.name} (inactivo)` : option.name;
  }

  protected modelOptionLabel(option: ProductModelOption): string {
    const label = productModelLabel(option);
    return option.inactive === true ? `${label} (inactivo)` : label;
  }

  protected errorFor(
    field: 'code' | 'name' | 'description' | 'categoryId' | 'productTypeId',
  ): string | null {
    const control = this.form.controls[field];

    if (!control.invalid || (!control.touched && !control.dirty)) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (control.hasError('maxlength')) {
      return field === 'description'
        ? 'La descripción no puede superar los 255 caracteres.'
        : 'El valor supera la longitud permitida.';
    }

    return 'Revisa este campo.';
  }

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();

    this.submitted.emit({
      code: raw.code,
      name: raw.name,
      description: raw.description.trim().length === 0 ? null : raw.description,
      categoryId: raw.categoryId,
      productTypeId: raw.productTypeId,
      productModelId: raw.productModelId,
      requiresExpiration: raw.requiresExpiration,
    });
  }

  private patch(record: ProductDetail | null): void {
    this.form.reset({
      code: record?.code ?? '',
      name: record?.name ?? '',
      description: record?.description ?? '',
      categoryId: record?.category?.id ?? null,
      productTypeId: record?.productType?.id ?? null,
      productModelId: record?.productModel?.id ?? null,
      requiresExpiration: record?.requiresExpiration ?? false,
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private currentModel(model: ProductModelReference): ProductModelOption {
    return {
      id: model.id,
      name: model.name,
      brand: model.brand ?? null,
      inactive: true,
    };
  }
}
