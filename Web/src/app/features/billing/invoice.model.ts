import { PaymentCondition } from '@features/sales/sale.model';

export type InvoiceType = 'CONSUMER' | 'CCF' | 'CREDIT_NOTE';

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'CANCELLED';

export type InvoicePaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK' | 'OTHER';

export type IssuedInvoiceType = 'CONSUMER' | 'CCF';

export type InvoiceTone = 'neutral' | 'warning' | 'success' | 'danger';

// Línea facturada con snapshot inmutable del producto (contrato 12.1).
export interface InvoiceLine {
  id: number;
  productPresentationId: number | null;
  productCode: string;
  productName: string;
  presentationCode: string | null;
  presentationName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  lineSubtotal: number;
  lineTotal: number;
}

// Fila del listado paginado de facturas.
export interface InvoiceSummary {
  id: number;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  saleId: number | null;
  customerId: number | null;
  customerName: string;
  paymentCondition: PaymentCondition;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  paidTotal: number;
  balance: number;
}

// Factura o nota de crédito completa con snapshot del cliente y líneas.
export interface Invoice {
  id: number;
  invoiceNumber: string;
  controlNumber: string | null;
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  saleId: number | null;
  customerId: number | null;
  relatedInvoiceId: number | null;
  relatedInvoiceNumber: string | null;
  paymentCondition: PaymentCondition;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  paidTotal: number;
  balance: number;
  customerName: string;
  customerDocumentType: string | null;
  customerDocumentNumber: string | null;
  customerNit: string | null;
  customerNrc: string | null;
  customerAddress: string | null;
  customerEmail: string | null;
  notes: string | null;
  details: InvoiceLine[];
  cancelledAt: string | null;
  cancelReason: string | null;
}

// Pago registrado sobre una factura (contrato 12.2).
export interface InvoicePayment {
  id: number;
  invoiceId: number;
  paymentDate: string;
  amount: number;
  paymentMethod: InvoicePaymentMethod;
  reference: string | null;
  notes: string | null;
  userId: number;
  userName: string;
  createdAt: string;
}

export interface InvoiceQuery {
  from: string;
  to: string;
  customerId: number | null;
  invoiceType: InvoiceType | null;
  status: InvoiceStatus | null;
  page: number;
  size: number;
}

export interface InvoiceCreateValue {
  invoiceType: IssuedInvoiceType;
  controlNumber: string;
  notes: string;
}

export interface InvoiceCreatePayload {
  saleId: number;
  invoiceType: IssuedInvoiceType;
  controlNumber: string | null;
  paymentCondition: PaymentCondition;
  notes: string | null;
}

export interface PaymentFormValue {
  paymentDate: string;
  amount: number | null;
  paymentMethod: InvoicePaymentMethod;
  reference: string;
  notes: string;
}

export interface PaymentPayload {
  paymentDate: string;
  amount: number;
  paymentMethod: InvoicePaymentMethod;
  reference: string | null;
  notes: string | null;
}

export interface CreditNoteFormValue {
  reason: string;
  returnStock: boolean;
}

export interface CreditNotePayload {
  reason: string;
  returnStock: boolean;
}

export const INVOICE_TYPE_OPTIONS: readonly { value: InvoiceType; label: string }[] = [
  { value: 'CONSUMER', label: 'Consumidor final' },
  { value: 'CCF', label: 'Comprobante de crédito fiscal' },
  { value: 'CREDIT_NOTE', label: 'Nota de crédito' },
];

export const ISSUED_INVOICE_TYPE_OPTIONS: readonly {
  value: IssuedInvoiceType;
  label: string;
  hint: string;
}[] = [
  {
    value: 'CONSUMER',
    label: 'Consumidor final',
    hint: 'Permitido con o sin cliente registrado.',
  },
  {
    value: 'CCF',
    label: 'Comprobante de crédito fiscal',
    hint: 'Requiere un cliente registrado con datos fiscales.',
  },
];

export const INVOICE_STATUS_OPTIONS: readonly { value: InvoiceStatus; label: string }[] = [
  { value: 'ISSUED', label: 'Emitida' },
  { value: 'CANCELLED', label: 'Cancelada' },
  { value: 'DRAFT', label: 'Borrador' },
];

export const INVOICE_PAYMENT_METHOD_OPTIONS: readonly {
  value: InvoicePaymentMethod;
  label: string;
}[] = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'CHECK', label: 'Cheque' },
  { value: 'OTHER', label: 'Otro' },
];

function optionalText(value: string | null | undefined): string | null {
  const text = value?.trim() ?? '';
  return text.length === 0 ? null : text;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function invoiceTypeLabel(type: InvoiceType): string {
  return INVOICE_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function invoiceStatusLabel(status: InvoiceStatus): string {
  return INVOICE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function invoiceStatusTone(status: InvoiceStatus): InvoiceTone {
  switch (status) {
    case 'DRAFT':
      return 'warning';
    case 'ISSUED':
      return 'success';
    case 'CANCELLED':
      return 'danger';
  }
}

export function invoicePaymentMethodLabel(method: InvoicePaymentMethod): string {
  return INVOICE_PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label ?? method;
}

export function invoiceBalance(invoice: Pick<InvoiceSummary, 'total' | 'paidTotal'>): number {
  return roundMoney(Math.max(0, invoice.total - invoice.paidTotal));
}

export function isInvoicePaid(invoice: Pick<InvoiceSummary, 'total' | 'paidTotal'>): boolean {
  return invoice.paidTotal >= invoice.total;
}

export function isCreditNote(invoice: Pick<InvoiceSummary, 'invoiceType'>): boolean {
  return invoice.invoiceType === 'CREDIT_NOTE';
}

// Vencimiento calculado en el cliente: el estado del backend no cambia al vencer.
export function isInvoiceOverdue(
  invoice: Pick<InvoiceSummary, 'status' | 'dueDate' | 'balance' | 'total' | 'paidTotal'>,
  today: string,
): boolean {
  if (invoice.status !== 'ISSUED' || invoice.dueDate === null) {
    return false;
  }

  return invoiceBalance(invoice) > 0 && invoice.dueDate < today;
}

export function canCreateInvoice(saleStatus: string, canWrite: boolean): boolean {
  return canWrite && saleStatus === 'CONFIRMED';
}

export function canRegisterPayment(
  invoice: Pick<Invoice, 'status' | 'invoiceType' | 'total' | 'paidTotal'>,
  canWrite: boolean,
): boolean {
  return (
    canWrite && invoice.status === 'ISSUED' && !isCreditNote(invoice) && !isInvoicePaid(invoice)
  );
}

export function canIssueCreditNote(
  invoice: Pick<Invoice, 'status' | 'invoiceType'>,
  isAdmin: boolean,
): boolean {
  return isAdmin && invoice.status === 'ISSUED' && !isCreditNote(invoice);
}

export function toInvoicePayload(
  saleId: number,
  value: InvoiceCreateValue,
  paymentCondition: PaymentCondition,
): InvoiceCreatePayload {
  return {
    saleId,
    invoiceType: value.invoiceType,
    controlNumber: optionalText(value.controlNumber),
    paymentCondition,
    notes: optionalText(value.notes),
  };
}

export function toPaymentPayload(value: PaymentFormValue): PaymentPayload {
  return {
    paymentDate: value.paymentDate,
    amount: roundMoney(Math.max(0, value.amount ?? 0)),
    paymentMethod: value.paymentMethod,
    reference: optionalText(value.reference),
    notes: optionalText(value.notes),
  };
}

export function toCreditNotePayload(value: CreditNoteFormValue): CreditNotePayload {
  return {
    reason: value.reason.trim(),
    returnStock: value.returnStock,
  };
}
