import { IconName } from '@shared/ui/icon/icon.component';

// Catálogos de inventario expuestos por la API (contrato 4).
export type CatalogKey =
  'categories' | 'product-types' | 'brands' | 'models' | 'measure-units' | 'presentations';

export type CatalogOptionKey = 'brands' | 'measure-units';

export type CatalogFieldKey =
  'name' | 'description' | 'code' | 'quantity' | 'brandId' | 'measureUnitId';

export type CatalogFieldType = 'text' | 'textarea' | 'number' | 'select';

export type CatalogColumnKey =
  'name' | 'description' | 'code' | 'quantity' | 'brand' | 'measureUnit';

export interface CatalogRelation {
  id: number;
  name: string;
  code?: string;
}

export interface CatalogRecord {
  id: number;
  name: string;
  description?: string | null;
  code?: string | null;
  quantity?: number | null;
  brand?: CatalogRelation | null;
  measureUnit?: CatalogRelation | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CatalogOption {
  id: number;
  name: string;
  code?: string;
}

export interface CatalogField {
  key: CatalogFieldKey;
  label: string;
  type: CatalogFieldType;
  required?: boolean;
  maxLength?: number;
  min?: number;
  step?: string;
  placeholder?: string;
  hint?: string;
  optionsKey?: CatalogOptionKey;
}

export interface CatalogColumn {
  key: CatalogColumnKey;
  label: string;
  numeric?: boolean;
  muted?: boolean;
}

export interface CatalogFilter {
  param: 'brandId' | 'measureUnitId';
  label: string;
  optionsKey: CatalogOptionKey;
}

export interface CatalogConfig {
  key: CatalogKey;
  label: string;
  singular: string;
  description: string;
  icon: IconName;
  endpoint: string;
  searchPlaceholder: string;
  emptyDescription: string;
  fields: readonly CatalogField[];
  columns: readonly CatalogColumn[];
  filter?: CatalogFilter;
}

export interface CatalogQuery {
  search: string;
  isActive: boolean | null;
  relationId: number | null;
  page: number;
  size: number;
}

export interface CatalogFormValue {
  name: string;
  description?: string | null;
  code?: string | null;
  quantity?: number | null;
  brandId?: number | null;
  measureUnitId?: number | null;
}

export type CatalogPayload = Record<string, string | number | boolean | null>;

const QUANTITY_FORMAT = new Intl.NumberFormat('es-MX', {
  maximumFractionDigits: 2,
});

const NAME_FIELD: CatalogField = {
  key: 'name',
  label: 'Nombre',
  type: 'text',
  required: true,
  maxLength: 100,
  placeholder: 'Nombre del registro',
};

// Configuración única que dirige listado, filtros y formulario de cada catálogo.
export const CATALOGS: readonly CatalogConfig[] = [
  {
    key: 'categories',
    label: 'Categorías',
    singular: 'categoría',
    description: 'Agrupa los productos por su uso o familia comercial.',
    icon: 'tag',
    endpoint: 'categories',
    searchPlaceholder: 'Buscar categoría por nombre',
    emptyDescription: 'Aún no hay categorías registradas.',
    fields: [
      { ...NAME_FIELD, placeholder: 'Ej. Herramientas' },
      {
        key: 'description',
        label: 'Descripción',
        type: 'textarea',
        maxLength: 255,
        placeholder: 'Descripción opcional de la categoría',
      },
    ],
    columns: [
      { key: 'name', label: 'Nombre' },
      { key: 'description', label: 'Descripción', muted: true },
    ],
  },
  {
    key: 'product-types',
    label: 'Tipos de producto',
    singular: 'tipo de producto',
    description: 'Clasifica los productos según su naturaleza o manejo.',
    icon: 'layers',
    endpoint: 'product-types',
    searchPlaceholder: 'Buscar tipo por nombre',
    emptyDescription: 'Aún no hay tipos de producto registrados.',
    fields: [
      { ...NAME_FIELD, placeholder: 'Ej. Materia prima' },
      {
        key: 'description',
        label: 'Descripción',
        type: 'textarea',
        maxLength: 255,
        placeholder: 'Descripción opcional del tipo',
      },
    ],
    columns: [
      { key: 'name', label: 'Nombre' },
      { key: 'description', label: 'Descripción', muted: true },
    ],
  },
  {
    key: 'brands',
    label: 'Marcas',
    singular: 'marca',
    description: 'Identifica el fabricante o la marca de los productos.',
    icon: 'package',
    endpoint: 'brands',
    searchPlaceholder: 'Buscar marca por nombre',
    emptyDescription: 'Aún no hay marcas registradas.',
    fields: [{ ...NAME_FIELD, placeholder: 'Ej. Cemento Nacional' }],
    columns: [{ key: 'name', label: 'Nombre' }],
  },
  {
    key: 'models',
    label: 'Modelos',
    singular: 'modelo',
    description: 'Relaciona cada modelo con su marca correspondiente.',
    icon: 'database',
    endpoint: 'models',
    searchPlaceholder: 'Buscar modelo por nombre',
    emptyDescription: 'Aún no hay modelos registrados.',
    fields: [
      {
        key: 'brandId',
        label: 'Marca',
        type: 'select',
        required: true,
        optionsKey: 'brands',
        hint: 'Solo se muestran marcas activas.',
      },
      { ...NAME_FIELD, placeholder: 'Ej. Premium 50 kg' },
    ],
    columns: [
      { key: 'name', label: 'Modelo' },
      { key: 'brand', label: 'Marca', muted: true },
    ],
    filter: {
      param: 'brandId',
      label: 'Marca',
      optionsKey: 'brands',
    },
  },
  {
    key: 'measure-units',
    label: 'Unidades de medida',
    singular: 'unidad de medida',
    description: 'Define las unidades con las que se mide el inventario.',
    icon: 'ruler',
    endpoint: 'measure-units',
    searchPlaceholder: 'Buscar unidad por nombre o código',
    emptyDescription: 'Aún no hay unidades de medida registradas.',
    fields: [
      {
        key: 'name',
        label: 'Nombre',
        type: 'text',
        required: true,
        maxLength: 50,
        placeholder: 'Ej. Libra',
      },
      {
        key: 'code',
        label: 'Código',
        type: 'text',
        required: true,
        maxLength: 10,
        placeholder: 'Ej. lb',
        hint: 'Máximo 10 caracteres.',
      },
    ],
    columns: [
      { key: 'name', label: 'Nombre' },
      { key: 'code', label: 'Código', muted: true },
    ],
  },
  {
    key: 'presentations',
    label: 'Presentaciones',
    singular: 'presentación',
    description: 'Define cómo se agrupa y vende cada producto.',
    icon: 'package',
    endpoint: 'presentations',
    searchPlaceholder: 'Buscar presentación por nombre',
    emptyDescription: 'Aún no hay presentaciones registradas.',
    fields: [
      {
        key: 'name',
        label: 'Nombre',
        type: 'text',
        required: true,
        maxLength: 100,
        placeholder: 'Ej. Caja de 25 libras',
      },
      {
        key: 'measureUnitId',
        label: 'Unidad de medida',
        type: 'select',
        required: true,
        optionsKey: 'measure-units',
        hint: 'Solo se muestran unidades activas.',
      },
      {
        key: 'quantity',
        label: 'Cantidad',
        type: 'number',
        required: true,
        min: 0.01,
        step: '0.01',
        placeholder: '0.00',
        hint: 'Cantidad contenida en la presentación.',
      },
    ],
    columns: [
      { key: 'name', label: 'Presentación' },
      { key: 'measureUnit', label: 'Unidad', muted: true },
      { key: 'quantity', label: 'Cantidad', numeric: true },
    ],
    filter: {
      param: 'measureUnitId',
      label: 'Unidad de medida',
      optionsKey: 'measure-units',
    },
  },
];

export function findCatalog(key: CatalogKey): CatalogConfig {
  const catalog = CATALOGS.find((item) => item.key === key);

  if (catalog === undefined) {
    throw new Error(`Catálogo no configurado: ${key}`);
  }

  return catalog;
}

function cleanText(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function optionalText(value: string | null | undefined): string | null {
  const text = cleanText(value);
  return text.length === 0 ? null : text;
}

// Traduce el formulario a los nombres de campo que espera cada endpoint.
export function toPayload(key: CatalogKey, value: CatalogFormValue): CatalogPayload {
  const name = cleanText(value.name);

  switch (key) {
    case 'categories':
    case 'product-types':
      return { name, description: optionalText(value.description) };
    case 'brands':
      return { name };
    case 'models':
      return { name, brandId: value.brandId ?? 0 };
    case 'measure-units':
      return { name, code: cleanText(value.code) };
    case 'presentations':
      return {
        name,
        measureUnitId: value.measureUnitId ?? 0,
        quantity: value.quantity ?? 0,
      };
  }
}

// Valor visible de una columna del listado genérico.
export function columnValue(record: CatalogRecord, column: CatalogColumn): string {
  switch (column.key) {
    case 'name':
      return record.name;
    case 'description':
      return cleanText(record.description) || '—';
    case 'code':
      return cleanText(record.code) || '—';
    case 'brand':
      return record.brand?.name ?? '—';
    case 'measureUnit':
      return record.measureUnit === null || record.measureUnit === undefined
        ? '—'
        : `${record.measureUnit.name} · ${record.measureUnit.code ?? '—'}`;
    case 'quantity':
      return record.quantity === null || record.quantity === undefined
        ? '—'
        : QUANTITY_FORMAT.format(record.quantity);
  }
}
