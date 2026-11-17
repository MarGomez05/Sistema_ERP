export type StockStatus = 'OUT' | 'LOW' | 'OK';

export type StockTone = 'danger' | 'warning' | 'success';

export interface ProductStockByPresentation {
  productPresentationId: number;
  presentationName: string;
  stock: number;
  stockStatus: StockStatus;
}

export interface ProductListItem {
  id: number;
  code: string;
  name: string;
  categoryName: string;
  productTypeName: string;
  requiresExpiration: boolean;
  isActive: boolean;
  stockByPresentation: ProductStockByPresentation[];
}

export interface ProductSelectOption {
  id: number;
  name: string;
  inactive?: boolean;
}

export interface ProductModelOption extends ProductSelectOption {
  brand?: ProductSelectOption | null;
}

export interface ProductPresentationOption {
  id: number;
  name: string;
  quantity: number;
  measureUnit: {
    id: number;
    name: string;
    code: string;
  };
}

export interface ProductReference {
  id: number;
  name: string;
}

export interface ProductModelReference extends ProductReference {
  brand?: ProductReference | null;
}

export interface ProductPresentation {
  id: number;
  code: string;
  presentation: {
    id: number;
    name: string;
    measureUnit: string;
    quantity: number;
  };
  minStock: number;
  currentPrice: number | null;
  stock: number;
  stockStatus: StockStatus;
  imageUrl: string | null;
  imageAlt: string | null;
  isActive: boolean;
}

export interface ProductDetail {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: ProductReference | null;
  productType: ProductReference | null;
  productModel: ProductModelReference | null;
  requiresExpiration: boolean;
  isActive: boolean;
  presentations: ProductPresentation[];
}

export interface ProductQuery {
  search: string;
  categoryId: number | null;
  productTypeId: number | null;
  isActive: boolean | null;
  page: number;
  size: number;
}

export interface ProductFormValue {
  code: string;
  name: string;
  description: string | null;
  categoryId: number | null;
  productTypeId: number | null;
  productModelId: number | null;
  requiresExpiration: boolean;
}

export interface ProductPayload {
  code: string;
  name: string;
  description: string | null;
  categoryId: number;
  productTypeId: number;
  productModelId: number | null;
  requiresExpiration: boolean;
}

export interface ProductPresentationFormValue {
  presentationId: number | null;
  code: string;
  minStock: number | null;
  imageUrl: string | null;
  imageAlt: string | null;
}

export interface ProductPresentationCreatePayload {
  presentationId: number;
  code: string;
  minStock: number;
  imageUrl: string | null;
  imageAlt: string | null;
}

export interface ProductPresentationUpdatePayload {
  code: string;
  minStock: number;
  imageUrl: string | null;
  imageAlt: string | null;
}

const QUANTITY_FORMAT = new Intl.NumberFormat('es-SV', {
  maximumFractionDigits: 2,
});

const MONEY_FORMAT = new Intl.NumberFormat('es-SV', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function optionalText(value: string | null | undefined): string | null {
  const text = value?.trim() ?? '';
  return text.length === 0 ? null : text;
}

export function toProductPayload(value: ProductFormValue): ProductPayload {
  return {
    code: value.code.trim(),
    name: value.name.trim(),
    description: optionalText(value.description),
    categoryId: value.categoryId ?? 0,
    productTypeId: value.productTypeId ?? 0,
    productModelId: value.productModelId,
    requiresExpiration: value.requiresExpiration,
  };
}

export function toPresentationCreatePayload(
  value: ProductPresentationFormValue,
): ProductPresentationCreatePayload {
  return {
    presentationId: value.presentationId ?? 0,
    code: value.code.trim(),
    minStock: value.minStock ?? 0,
    imageUrl: optionalText(value.imageUrl),
    imageAlt: optionalText(value.imageAlt),
  };
}

export function toPresentationUpdatePayload(
  value: ProductPresentationFormValue,
): ProductPresentationUpdatePayload {
  return {
    code: value.code.trim(),
    minStock: value.minStock ?? 0,
    imageUrl: optionalText(value.imageUrl),
    imageAlt: optionalText(value.imageAlt),
  };
}

export function formatQuantity(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : QUANTITY_FORMAT.format(value);
}

export function formatMoney(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : MONEY_FORMAT.format(value);
}

export function stockStatusLabel(status: StockStatus): string {
  switch (status) {
    case 'OUT':
      return 'Agotado';
    case 'LOW':
      return 'Bajo stock';
    case 'OK':
      return 'Disponible';
  }
}

export function stockStatusTone(status: StockStatus): StockTone {
  switch (status) {
    case 'OUT':
      return 'danger';
    case 'LOW':
      return 'warning';
    case 'OK':
      return 'success';
  }
}

export function presentationOptionLabel(option: ProductPresentationOption): string {
  return `${option.name} · ${formatQuantity(option.quantity)} ${option.measureUnit.code}`;
}

export function productModelLabel(option: ProductModelOption): string {
  return option.brand === null || option.brand === undefined
    ? option.name
    : `${option.name} · ${option.brand.name}`;
}

export function visibleStock(
  item: ProductListItem,
  limit = 2,
): readonly ProductStockByPresentation[] {
  return item.stockByPresentation.slice(0, limit);
}

export function hiddenStockCount(item: ProductListItem, limit = 2): number {
  return Math.max(item.stockByPresentation.length - limit, 0);
}

export function pendingImages(presentations: readonly ProductPresentation[]): number {
  return presentations.filter((presentation) => presentation.imageUrl === null).length;
}
