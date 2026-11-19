import { formatMoney, formatQuantity } from '@features/products/product.model';
import { formatDate, parseLocalDate, todayIso } from '@shared/util/date.util';

export { formatDate, parseLocalDate, todayIso };

export type ExpirationSeverity = 'EXPIRED' | 'RED' | 'YELLOW' | 'NONE';

export type ExpirationTone = 'danger' | 'warning' | 'neutral';

export interface LotProduct {
  id: number;
  code: string;
  name: string;
}

export interface LotPresentation {
  productPresentationId: number;
  name: string;
}

export interface LotSupplier {
  id: number;
  tradeName: string;
}

// Lote tal como lo devuelve la API. unitCost y totalCost solo llegan para
// ADMIN y PURCHASING; WAREHOUSE recibe la misma forma sin esos campos.
export interface ProductLot {
  id: number;
  lotNumber: string;
  product: LotProduct;
  presentation: LotPresentation;
  supplier: LotSupplier;
  invoiceNumber: string;
  invoiceDate: string;
  entryDate: string;
  expirationDate: string | null;
  daysToExpire: number | null;
  expirationSeverity: ExpirationSeverity;
  receivedQuantity: number;
  availableQuantity: number;
  notes: string | null;
  isActive: boolean;
  unitCost?: number;
  totalCost?: number;
}

export interface LotQuery {
  productId: number | null;
  supplierId: number | null;
  invoiceNumber: string;
  onlyAvailable: boolean;
  page: number;
  size: number;
}

export interface LotFormValue {
  productPresentationId: number | null;
  supplierId: number | null;
  invoiceNumber: string;
  invoiceDate: string;
  lotNumber: string;
  receivedQuantity: number | null;
  unitCost: number | null;
  expirationDate: string;
  notes: string;
}

export interface LotPayload {
  productPresentationId: number;
  supplierId: number;
  invoiceNumber: string;
  invoiceDate: string;
  lotNumber: string;
  receivedQuantity: number;
  unitCost: number;
  expirationDate: string | null;
  notes: string | null;
}

export interface LastCostItem {
  productPresentationId: number;
  presentationName: string;
  lastUnitCost: number;
  lotId: number;
  entryDate: string;
}

export interface SupplierOption {
  id: number;
  name: string;
}

function optionalText(value: string | null | undefined): string | null {
  const text = value?.trim() ?? '';
  return text.length === 0 ? null : text;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toLotPayload(value: LotFormValue): LotPayload {
  return {
    productPresentationId: value.productPresentationId ?? 0,
    supplierId: value.supplierId ?? 0,
    invoiceNumber: value.invoiceNumber.trim(),
    invoiceDate: value.invoiceDate,
    lotNumber: value.lotNumber.trim(),
    receivedQuantity: roundMoney(value.receivedQuantity ?? 0),
    unitCost: roundMoney(value.unitCost ?? 0),
    expirationDate: optionalText(value.expirationDate),
    notes: optionalText(value.notes),
  };
}

export function expirationLabel(severity: ExpirationSeverity): string {
  switch (severity) {
    case 'EXPIRED':
      return 'Vencido';
    case 'RED':
      return 'Vence en 15 días o menos';
    case 'YELLOW':
      return 'Vence en 16 a 30 días';
    case 'NONE':
      return 'Sin alerta';
  }
}

export function expirationTone(severity: ExpirationSeverity): ExpirationTone {
  switch (severity) {
    case 'EXPIRED':
    case 'RED':
      return 'danger';
    case 'YELLOW':
      return 'warning';
    case 'NONE':
      return 'neutral';
  }
}

export function daysToExpireLabel(lot: ProductLot): string {
  if (lot.daysToExpire === null) {
    return 'Sin vencimiento';
  }

  if (lot.daysToExpire < 0) {
    const days = Math.abs(lot.daysToExpire);
    return `Vencido hace ${days} ${days === 1 ? 'día' : 'días'}`;
  }

  if (lot.daysToExpire === 0) {
    return 'Vence hoy';
  }

  return `Vence en ${lot.daysToExpire} ${lot.daysToExpire === 1 ? 'día' : 'días'}`;
}

export function lotQuantityLabel(lot: ProductLot): string {
  return `${formatQuantity(lot.availableQuantity)} de ${formatQuantity(lot.receivedQuantity)}`;
}

export function lotCostLabel(lot: ProductLot): string {
  return lot.totalCost === undefined ? '—' : formatMoney(lot.totalCost);
}

export function lotUnitCostLabel(lot: ProductLot): string {
  return lot.unitCost === undefined ? '—' : formatMoney(lot.unitCost);
}

export function lastCostFor(
  costs: readonly LastCostItem[],
  productPresentationId: number | null,
): LastCostItem | null {
  if (productPresentationId === null) {
    return null;
  }

  return costs.find((cost) => cost.productPresentationId === productPresentationId) ?? null;
}
