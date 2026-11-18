import { formatMoney } from '@features/products/product.model';

export type SaleStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export type PaymentCondition = 'CASH' | 'CREDIT';

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';

export type SaleTone = 'neutral' | 'warning' | 'success' | 'danger';

export interface SaleCustomer {
  id: number;
  legalName: string;
}

export interface SaleSeller {
  id: number;
  fullName: string;
}

// Línea de venta tal como la devuelve la API (contrato 11).
export interface SaleLine {
  id: number;
  productPresentationId: number;
  productId: number;
  productCode: string;
  productName: string;
  presentationName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  lineSubtotal: number;
  lineTotal: number;
}

// Fila del listado paginado de ventas.
export interface SaleSummary {
  id: number;
  saleNumber: string;
  status: SaleStatus;
  saleDate: string;
  customerId: number | null;
  customerName: string;
  sellerId: number;
  sellerName: string;
  paymentCondition: PaymentCondition;
  paymentMethod: PaymentMethod | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  paidTotal: number;
}

// Venta completa con líneas, notas y datos de cancelación.
export interface Sale {
  id: number;
  saleNumber: string;
  status: SaleStatus;
  saleDate: string;
  customer: SaleCustomer | null;
  seller: SaleSeller;
  paymentCondition: PaymentCondition;
  paymentMethod: PaymentMethod | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  paidTotal: number;
  notes: string | null;
  details: SaleLine[];
  cancelledAt: string | null;
  cancelReason: string | null;
}

export interface SaleQuery {
  from: string;
  to: string;
  customerId: number | null;
  status: SaleStatus | null;
  page: number;
  size: number;
}

export interface SaleLineFormValue {
  productPresentationId: number;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export interface SaleFormValue {
  customerId: number | null;
  paymentCondition: PaymentCondition;
  paymentMethod: PaymentMethod | null;
  notes: string;
  lines: SaleLineFormValue[];
}

export interface SaleDetailPayload {
  productPresentationId: number;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export interface SalePayload {
  customerId: number | null;
  paymentCondition: PaymentCondition;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  details: SaleDetailPayload[];
}

export const SALE_STATUS_OPTIONS: readonly { value: SaleStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'CONFIRMED', label: 'Confirmada' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

export const PAYMENT_CONDITION_OPTIONS: readonly { value: PaymentCondition; label: string }[] = [
  { value: 'CASH', label: 'Contado' },
  { value: 'CREDIT', label: 'Crédito' },
];

export const PAYMENT_METHOD_OPTIONS: readonly { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'OTHER', label: 'Otro' },
];

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function optionalText(value: string | null | undefined): string | null {
  const text = value?.trim() ?? '';
  return text.length === 0 ? null : text;
}

export function saleStatusLabel(status: SaleStatus): string {
  return SALE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function saleStatusTone(status: SaleStatus): SaleTone {
  switch (status) {
    case 'DRAFT':
      return 'warning';
    case 'CONFIRMED':
      return 'success';
    case 'CANCELLED':
      return 'danger';
  }
}

export function paymentConditionLabel(condition: PaymentCondition): string {
  return PAYMENT_CONDITION_OPTIONS.find((option) => option.value === condition)?.label ?? condition;
}

export function paymentMethodLabel(method: PaymentMethod | null): string {
  if (method === null) {
    return 'Sin especificar';
  }

  return PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label ?? method;
}

// Importe bruto de la línea: cantidad × precio. El precio incluye IVA (D-02).
export function lineGross(quantity: number, unitPrice: number): number {
  return roundMoney(Math.max(0, quantity) * Math.max(0, unitPrice));
}

// Total de la línea tras el descuento en moneda.
export function lineTotal(quantity: number, unitPrice: number, discount: number): number {
  return roundMoney(Math.max(0, lineGross(quantity, unitPrice) - Math.max(0, discount)));
}

// Total estimado de la venta en el editor. El servidor recalcula la base y el IVA.
export function estimatedTotal(
  lines: readonly { quantity: number; unitPrice: number; discount: number }[],
): number {
  const total = lines.reduce(
    (sum, line) => sum + lineTotal(line.quantity, line.unitPrice, line.discount),
    0,
  );

  return roundMoney(total);
}

export function estimatedDiscountTotal(
  lines: readonly { quantity: number; unitPrice: number; discount: number }[],
): number {
  return roundMoney(lines.reduce((sum, line) => sum + Math.max(0, line.discount), 0));
}

export function toSalePayload(value: SaleFormValue): SalePayload {
  return {
    customerId: value.customerId,
    paymentCondition: value.paymentCondition,
    paymentMethod: value.paymentMethod,
    notes: optionalText(value.notes),
    details: value.lines.map((line) => ({
      productPresentationId: line.productPresentationId,
      quantity: roundMoney(Math.max(0, line.quantity)),
      unitPrice: roundMoney(Math.max(0, line.unitPrice)),
      discount: roundMoney(Math.max(0, line.discount)),
    })),
  };
}

export function pendingAmount(sale: Pick<Sale, 'total' | 'paidTotal'>): number {
  return roundMoney(Math.max(0, sale.total - sale.paidTotal));
}

export function isFullyPaid(sale: Pick<Sale, 'total' | 'paidTotal'>): boolean {
  return sale.paidTotal >= sale.total;
}

export function canEditSale(
  sale: Pick<Sale, 'status' | 'seller'>,
  userId: number | null,
  isAdmin: boolean,
): boolean {
  return sale.status === 'DRAFT' && (isAdmin || (userId !== null && sale.seller.id === userId));
}

export function canConfirmSale(
  sale: Pick<Sale, 'status' | 'seller'>,
  userId: number | null,
  isAdmin: boolean,
): boolean {
  return sale.status === 'DRAFT' && (isAdmin || (userId !== null && sale.seller.id === userId));
}

export function canCancelSale(sale: Pick<Sale, 'status'>, isAdmin: boolean): boolean {
  return isAdmin && sale.status !== 'CANCELLED';
}

// Motivo por el que una venta a crédito no podría confirmarse. Es una ayuda visual:
// la validación definitiva la hace el backend al confirmar.
export function creditIssue(
  customer: { creditLimit: number; creditDays: number; outstandingBalance: number } | null,
  total: number,
): string | null {
  if (customer === null) {
    return null;
  }

  if (customer.creditDays <= 0) {
    return 'El cliente no tiene días de crédito configurados.';
  }

  const available = roundMoney(customer.creditLimit - customer.outstandingBalance);

  if (total > available) {
    return `La venta supera el crédito disponible (${formatMoney(available)}).`;
  }

  return null;
}
