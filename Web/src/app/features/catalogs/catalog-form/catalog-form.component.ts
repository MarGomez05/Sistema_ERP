import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import {
  CatalogConfig,
  CatalogField,
  CatalogFieldKey,
  CatalogFormValue,
  CatalogOption,
  CatalogOptionKey,
  CatalogRecord,
} from '../catalog.model';

// Formulario reutilizable para los seis catálogos de inventario.
@Component({
  selector: 'app-catalog-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  template: `
    @if (form(); as form) {
      <form class="catalog-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <header class="catalog-form__header">
          <div>
            <p class="catalog-form__eyebrow">
              {{ record() === null ? 'Nuevo registro' : 'Edición' }}
            </p>
            <h2 class="catalog-form__title">{{ title() }}</h2>
          </div>
          <button
            type="button"
            class="catalog-form__close"
            aria-label="Cerrar formulario"
            (click)="cancelled.emit()"
          >
            <app-icon name="close" [size]="18" />
          </button>
        </header>

        @if (error(); as message) {
          <p class="catalog-form__error" role="alert">
            <app-icon name="alertCircle" [size]="16" />
            {{ message }}
          </p>
        }

        <div class="catalog-form__fields">
          @for (field of config().fields; track field.key) {
            <div class="field">
              <label class="field__label" [attr.for]="controlId(field)">
                {{ field.label }}
                @if (field.required) {
                  <span class="field__required" aria-hidden="true">*</span>
                }
              </label>

              @switch (field.type) {
                @case ('textarea') {
                  <textarea
                    class="field__control"
                    [id]="controlId(field)"
                    rows="3"
                    [formControl]="control(field.key)"
                    [attr.maxlength]="field.maxLength"
                    [attr.placeholder]="field.placeholder"
                    [class.is-invalid]="fieldError(field) !== null"
                  ></textarea>
                }
                @case ('select') {
                  <select
                    class="field__control"
                    [id]="controlId(field)"
                    [formControl]="control(field.key)"
                    [class.is-invalid]="fieldError(field) !== null"
                  >
                    <option [ngValue]="null" disabled>Selecciona una opción</option>
                    @for (option of optionsFor(field); track option.id) {
                      <option [ngValue]="option.id">{{ optionLabel(option) }}</option>
                    } @empty {
                      <option [ngValue]="null" disabled>Sin opciones disponibles</option>
                    }
                  </select>
                }
                @case ('number') {
                  <input
                    class="field__control"
                    type="number"
                    [id]="controlId(field)"
                    [formControl]="control(field.key)"
                    [attr.min]="field.min"
                    [attr.step]="field.step"
                    [attr.placeholder]="field.placeholder"
                    [class.is-invalid]="fieldError(field) !== null"
                  />
                }
                @default {
                  <input
                    class="field__control"
                    type="text"
                    [id]="controlId(field)"
                    [formControl]="control(field.key)"
                    [attr.maxlength]="field.maxLength"
                    [attr.placeholder]="field.placeholder"
                    [class.is-invalid]="fieldError(field) !== null"
                  />
                }
              }

              @if (fieldError(field); as message) {
                <p class="field__error" role="alert">{{ message }}</p>
              } @else if (field.hint) {
                <p class="field__hint">{{ field.hint }}</p>
              }
            </div>
          }
        </div>

        <footer class="catalog-form__footer">
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
            {{ record() === null ? 'Crear' : 'Guardar cambios' }}
          </button>
        </footer>
      </form>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .catalog-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .catalog-form__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--border);
    }

    .catalog-form__eyebrow {
      color: var(--text-subtle);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .catalog-form__title {
      margin-top: 4px;
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
    }

    .catalog-form__close {
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

    .catalog-form__close:hover {
      background: var(--surface-hover);
      border-color: var(--border);
      color: var(--text);
    }

    .catalog-form__error {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px 14px;
      background: var(--danger-100);
      border: 1px solid #f0cdca;
      border-radius: var(--radius-md);
      color: var(--danger-700);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
    }

    .catalog-form__fields {
      display: grid;
      gap: var(--space-4);
    }

    .catalog-form__footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-3);
      padding-top: var(--space-4);
      border-top: 1px solid var(--border);
    }
  `,
})
export class CatalogFormComponent implements OnInit {
  readonly config = input.required<CatalogConfig>();
  readonly record = input<CatalogRecord | null>(null);
  readonly selectOptions = input<Partial<Record<CatalogOptionKey, readonly CatalogOption[]>>>({});
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly submitted = output<CatalogFormValue>();
  readonly cancelled = output<void>();

  protected readonly form = signal<FormGroup | null>(null);

  protected readonly title = computed(() =>
    this.record() === null ? `Nueva ${this.config().singular}` : `Editar ${this.config().singular}`,
  );

  constructor() {
    // Refresca los valores cuando el panel cambia de registro sin recrearse.
    effect(() => {
      const form = this.form();
      const record = this.record();

      if (form === null) {
        return;
      }

      this.reset(form, record);
    });
  }

  ngOnInit(): void {
    const controls: Record<string, FormControl> = {};

    for (const field of this.config().fields) {
      controls[field.key] = new FormControl(this.initialValue(field, this.record()), {
        nonNullable: false,
        validators: this.validatorsFor(field),
      });
    }

    this.form.set(new FormGroup(controls));
  }

  protected control(key: CatalogFieldKey): FormControl {
    return this.form()?.get(key) as FormControl;
  }

  protected controlId(field: CatalogField): string {
    return `catalog-${field.key}`;
  }

  protected optionsFor(field: CatalogField): readonly CatalogOption[] {
    if (field.optionsKey === undefined) {
      return [];
    }

    return this.selectOptions()[field.optionsKey] ?? [];
  }

  protected optionLabel(option: CatalogOption): string {
    return option.code === undefined ? option.name : `${option.name} (${option.code})`;
  }

  protected fieldError(field: CatalogField): string | null {
    const control = this.form()?.get(field.key);

    if (control === null || control === undefined || !control.invalid) {
      return null;
    }

    if (!control.touched && !control.dirty) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (control.hasError('maxlength')) {
      return `Máximo ${field.maxLength ?? 0} caracteres.`;
    }

    if (control.hasError('min')) {
      return field.key === 'quantity'
        ? 'La cantidad debe ser mayor que 0.'
        : `El valor debe ser mayor o igual a ${field.min ?? 0}.`;
    }

    return 'Revisa este campo.';
  }

  protected submit(): void {
    const form = this.form();

    if (form === null) {
      return;
    }

    form.markAllAsTouched();

    if (form.invalid) {
      return;
    }

    const raw = form.getRawValue() as Record<string, unknown>;

    this.submitted.emit({
      name: this.text(raw['name']),
      description: this.optionalText(raw['description']),
      code: this.optionalText(raw['code']),
      quantity: this.optionalNumber(raw['quantity']),
      brandId: this.optionalNumber(raw['brandId']),
      measureUnitId: this.optionalNumber(raw['measureUnitId']),
    });
  }

  private reset(form: FormGroup, record: CatalogRecord | null): void {
    for (const field of this.config().fields) {
      form.get(field.key)?.reset(this.initialValue(field, record));
    }

    form.markAsPristine();
    form.markAsUntouched();
  }

  private initialValue(field: CatalogField, record: CatalogRecord | null): string | number | null {
    if (record === null) {
      return field.type === 'number' || field.type === 'select' ? null : '';
    }

    switch (field.key) {
      case 'name':
        return record.name;
      case 'description':
        return record.description ?? '';
      case 'code':
        return record.code ?? '';
      case 'quantity':
        return record.quantity ?? null;
      case 'brandId':
        return record.brand?.id ?? null;
      case 'measureUnitId':
        return record.measureUnit?.id ?? null;
      default:
        return null;
    }
  }

  private validatorsFor(field: CatalogField): ValidatorFn[] {
    const validators: ValidatorFn[] = [];

    if (field.required) {
      validators.push(this.requiredValidator(field));
    }

    if (field.maxLength !== undefined) {
      validators.push(Validators.maxLength(field.maxLength));
    }

    if (field.type === 'number') {
      validators.push(Validators.min(field.min ?? 0));
    }

    return validators;
  }

  private requiredValidator(field: CatalogField): ValidatorFn {
    return (control): ValidationErrors | null => {
      const value: unknown = control.value;

      if (field.type === 'text' || field.type === 'textarea') {
        return typeof value === 'string' && value.trim().length > 0 ? null : { required: true };
      }

      return value === null || value === undefined || value === '' ? { required: true } : null;
    };
  }

  private text(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private optionalText(value: unknown): string | null {
    const text = this.text(value).trim();
    return text.length === 0 ? null : text;
  }

  private optionalNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }
}
