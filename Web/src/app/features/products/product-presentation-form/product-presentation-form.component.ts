import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import {
  ProductPresentation,
  ProductPresentationFormValue,
  ProductPresentationOption,
  formatQuantity,
  presentationOptionLabel,
} from '../product.model';

const IMAGE_URL_PATTERN = /^\s*$|^(https?:\/\/\S+|\/\S+)$/;

// Alta y edición de una presentación del producto (contrato 5.2).
// La tarjeta del detalle reserva el espacio de la imagen y aquí se guarda su URL.
@Component({
  selector: 'app-product-presentation-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  template: `
    <form class="presentation-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <header class="presentation-form__header">
        <div>
          <p class="presentation-form__eyebrow">
            {{ record() === null ? 'Nuevo registro' : 'Edición' }}
          </p>
          <h2 class="presentation-form__title">
            {{ record() === null ? 'Agregar presentación' : 'Editar presentación' }}
          </h2>
        </div>
        <button
          type="button"
          class="presentation-form__close"
          aria-label="Cerrar formulario"
          (click)="cancelled.emit()"
        >
          <app-icon name="close" [size]="18" />
        </button>
      </header>

      @if (error(); as message) {
        <p class="presentation-form__error" role="alert">
          <app-icon name="alertCircle" [size]="16" />
          {{ message }}
        </p>
      }

      <div class="presentation-form__grid">
        @if (record(); as current) {
          <div class="presentation-form__base">
            <span class="presentation-form__base-label">Presentación base</span>
            <strong>{{ current.presentation.name }}</strong>
            <span class="presentation-form__base-meta">
              {{ formatQuantity(current.presentation.quantity) }}
              {{ current.presentation.measureUnit }}
            </span>
          </div>
        } @else {
          <div class="field">
            <label class="field__label" for="presentation-base">
              Presentación <span class="field__required" aria-hidden="true">*</span>
            </label>
            <select
              id="presentation-base"
              class="field__control"
              formControlName="presentationId"
              [class.is-invalid]="presentationError() !== null"
            >
              <option [ngValue]="null" disabled>Selecciona una presentación</option>
              @for (option of presentations(); track option.id) {
                <option [ngValue]="option.id">{{ optionLabel(option) }}</option>
              } @empty {
                <option [ngValue]="null" disabled>Sin presentaciones disponibles</option>
              }
            </select>
            @if (presentationError(); as message) {
              <p class="field__error" role="alert">{{ message }}</p>
            } @else {
              <p class="field__hint">Solo se muestran presentaciones activas sin asignar.</p>
            }
          </div>
        }

        <div class="field">
          <label class="field__label" for="presentation-code">
            Código <span class="field__required" aria-hidden="true">*</span>
          </label>
          <input
            id="presentation-code"
            class="field__control"
            type="text"
            formControlName="code"
            maxlength="50"
            placeholder="Ej. CLV-001-CJ"
            [class.is-invalid]="codeError() !== null"
          />
          @if (codeError(); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          } @else {
            <p class="field__hint">Código único de la presentación del producto.</p>
          }
        </div>

        <div class="field">
          <label class="field__label" for="presentation-min-stock">
            Stock mínimo <span class="field__required" aria-hidden="true">*</span>
          </label>
          <input
            id="presentation-min-stock"
            class="field__control"
            type="number"
            formControlName="minStock"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            [class.is-invalid]="minStockError() !== null"
          />
          @if (minStockError(); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          } @else {
            <p class="field__hint">Cantidad mínima antes de generar una alerta de reposición.</p>
          }
        </div>

        <div class="presentation-form__image">
          <div class="presentation-form__image-copy">
            <p class="presentation-form__image-title">Imagen de la presentación</p>
            <p class="presentation-form__image-text">
              Espacio reservado para la imagen. Por ahora se guarda la URL o ruta relativa; la
              subida de archivos se incorporará después.
            </p>
          </div>

          <div class="presentation-form__preview">
            @if (previewUrl() !== null && !previewFailed()) {
              <img
                [src]="previewUrl()"
                [alt]="previewAlt()"
                loading="lazy"
                (error)="previewFailed.set(true)"
              />
            } @else {
              <div class="presentation-form__placeholder">
                <app-icon name="image" [size]="26" />
                <span>Sin imagen</span>
              </div>
            }
          </div>
        </div>

        <div class="field">
          <label class="field__label" for="presentation-image-url">URL de la imagen</label>
          <input
            id="presentation-image-url"
            class="field__control"
            type="text"
            formControlName="imageUrl"
            maxlength="500"
            placeholder="/media/products/presentacion.jpg"
            [class.is-invalid]="imageUrlError() !== null"
            (input)="previewFailed.set(false)"
          />
          @if (imageUrlError(); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          } @else {
            <p class="field__hint">Opcional. Usa http(s) o una ruta relativa que empiece con /.</p>
          }
        </div>

        <div class="field">
          <label class="field__label" for="presentation-image-alt">Texto alternativo</label>
          <input
            id="presentation-image-alt"
            class="field__control"
            type="text"
            formControlName="imageAlt"
            maxlength="150"
            placeholder="Ej. Caja de clavos de 25 libras"
            [class.is-invalid]="imageAltError() !== null"
          />
          @if (imageAltError(); as message) {
            <p class="field__error" role="alert">{{ message }}</p>
          } @else {
            <p class="field__hint">Describe la imagen para accesibilidad.</p>
          }
        </div>
      </div>

      <footer class="presentation-form__footer">
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
          {{ record() === null ? 'Agregar presentación' : 'Guardar cambios' }}
        </button>
      </footer>
    </form>
  `,
  styles: `
    :host {
      display: block;
    }

    .presentation-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .presentation-form__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--border);
    }

    .presentation-form__eyebrow {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .presentation-form__title {
      margin-top: 4px;
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
    }

    .presentation-form__close {
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

    .presentation-form__close:hover {
      background: var(--surface-hover);
      border-color: var(--border);
      color: var(--text);
    }

    .presentation-form__error {
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

    .presentation-form__grid {
      display: grid;
      gap: var(--space-4);
    }

    .presentation-form__base {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 12px 14px;
      background: var(--brand-50);
      border: 1px solid var(--brand-100);
      border-radius: var(--radius-md);
    }

    .presentation-form__base-label {
      color: var(--brand-700);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .presentation-form__base strong {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    .presentation-form__base-meta {
      color: var(--text-muted);
      font-size: var(--text-xs);
    }

    .presentation-form__image {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 132px;
      gap: var(--space-3);
      padding: 14px;
      background: var(--surface-muted);
      border: 1px dashed var(--border-strong);
      border-radius: var(--radius-md);
    }

    .presentation-form__image-title {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    .presentation-form__image-text {
      margin-top: 4px;
      color: var(--text-muted);
      font-size: var(--text-xs);
      line-height: 1.5;
    }

    .presentation-form__preview {
      display: flex;
      align-items: center;
      justify-content: center;
      aspect-ratio: 1;
      overflow: hidden;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
    }

    .presentation-form__preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .presentation-form__placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      color: var(--text-subtle);
      font-size: var(--text-xs);
    }

    .presentation-form__footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-3);
      padding-top: var(--space-4);
      border-top: 1px solid var(--border);
    }

    @media (max-width: 520px) {
      .presentation-form__image {
        grid-template-columns: minmax(0, 1fr);
      }

      .presentation-form__preview {
        width: 132px;
      }
    }
  `,
})
export class ProductPresentationFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly record = input<ProductPresentation | null>(null);
  readonly presentations = input<readonly ProductPresentationOption[]>([]);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly submitted = output<ProductPresentationFormValue>();
  readonly cancelled = output<void>();

  protected readonly previewFailed = signal(false);

  protected readonly form = this.formBuilder.group({
    presentationId: this.formBuilder.control<number | null>(null),
    code: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(50)]),
    minStock: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
    ]),
    imageUrl: this.formBuilder.nonNullable.control('', [
      Validators.maxLength(500),
      Validators.pattern(IMAGE_URL_PATTERN),
    ]),
    imageAlt: this.formBuilder.nonNullable.control('', [Validators.maxLength(150)]),
  });

  constructor() {
    effect(() => this.patch(this.record()));
  }

  protected optionLabel(option: ProductPresentationOption): string {
    return presentationOptionLabel(option);
  }

  protected formatQuantity(value: number): string {
    return formatQuantity(value);
  }

  protected presentationError(): string | null {
    const control = this.form.controls.presentationId;

    return control.invalid && control.touched ? 'Selecciona una presentación.' : null;
  }

  protected codeError(): string | null {
    const control = this.form.controls.code;

    if (!control.invalid || (!control.touched && !control.dirty)) {
      return null;
    }

    return control.hasError('required')
      ? 'El código es obligatorio.'
      : 'El código no puede superar los 50 caracteres.';
  }

  protected minStockError(): string | null {
    const control = this.form.controls.minStock;

    if (!control.invalid || (!control.touched && !control.dirty)) {
      return null;
    }

    return control.hasError('required')
      ? 'El stock mínimo es obligatorio.'
      : 'El stock mínimo debe ser mayor que 0.';
  }

  protected imageUrlError(): string | null {
    const control = this.form.controls.imageUrl;

    if (!control.invalid || (!control.touched && !control.dirty)) {
      return null;
    }

    return control.hasError('maxlength')
      ? 'La URL no puede superar los 500 caracteres.'
      : 'Usa una URL http(s) o una ruta relativa que empiece con /.';
  }

  protected imageAltError(): string | null {
    const control = this.form.controls.imageAlt;

    return control.invalid && control.touched
      ? 'El texto alternativo no puede superar los 150 caracteres.'
      : null;
  }

  protected previewUrl(): string | null {
    const value = this.form.controls.imageUrl.value.trim();
    return value.length === 0 ? null : value;
  }

  protected previewAlt(): string {
    const value = this.form.controls.imageAlt.value.trim();
    return value.length === 0 ? 'Vista previa de la imagen' : value;
  }

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();

    this.submitted.emit({
      presentationId: raw.presentationId,
      code: raw.code,
      minStock: raw.minStock,
      imageUrl: raw.imageUrl.trim().length === 0 ? null : raw.imageUrl,
      imageAlt: raw.imageAlt.trim().length === 0 ? null : raw.imageAlt,
    });
  }

  private patch(record: ProductPresentation | null): void {
    this.previewFailed.set(false);

    this.form.reset({
      presentationId: record?.presentation.id ?? null,
      code: record?.code ?? '',
      minStock: record?.minStock ?? null,
      imageUrl: record?.imageUrl ?? '',
      imageAlt: record?.imageAlt ?? '',
    });

    const baseControl = this.form.controls.presentationId;

    if (record === null) {
      baseControl.setValidators([Validators.required]);
    } else {
      baseControl.clearValidators();
    }

    baseControl.updateValueAndValidity();
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }
}
