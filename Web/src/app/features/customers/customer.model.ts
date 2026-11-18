import { formatMoney } from '@features/products/product.model';

export type CustomerType = 'NATURAL' | 'BUSINESS';

export type DocumentType = 'DUI' | 'NIT' | 'PASSPORT' | 'FOREIGN';

export type CreditTone = 'neutral' | 'success' | 'warning' | 'danger';

export interface CustomerOption {
  id: number;
  name: string;
}

// Cliente tal como lo devuelve la API (contrato 10).
export interface Customer {
  id: number;
  customerType: CustomerType;
  documentType: DocumentType | null;
  documentNumber: string | null;
  legalName: string;
  tradeName: string | null;
  nit: string | null;
  nrc: string | null;
  dui: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  creditLimit: number;
  creditDays: number;
  outstandingBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerQuery {
  search: string;
  documentType: DocumentType | null;
  isActive: boolean | null;
  page: number;
  size: number;
}

export interface CustomerFormValue {
  customerType: CustomerType;
  documentType: DocumentType | null;
  documentNumber: string;
  legalName: string;
  tradeName: string;
  nit: string;
  nrc: string;
  dui: string;
  address: string;
  phone: string;
  email: string;
}

export interface CustomerCredit {
  creditLimit: number;
  creditDays: number;
}

export interface CreditFormValue {
  creditLimit: number | null;
  creditDays: number | null;
}

export interface CustomerPayload {
  customerType: CustomerType;
  documentType: DocumentType | null;
  documentNumber: string | null;
  legalName: string;
  tradeName: string | null;
  nit: string | null;
  nrc: string | null;
  dui: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  creditLimit: number;
  creditDays: number;
}

export const CUSTOMER_TYPE_OPTIONS: readonly { value: CustomerType; label: string }[] = [
  { value: 'NATURAL', label: 'Persona natural' },
  { value: 'BUSINESS', label: 'Empresa' },
];

export const DOCUMENT_TYPE_OPTIONS: readonly { value: DocumentType; label: string }[] = [
  { value: 'DUI', label: 'DUI' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PASSPORT', label: 'Pasaporte' },
  { value: 'FOREIGN', label: 'Documento extranjero' },
];

function optionalText(value: string | null | undefined): string | null {
  const text = value?.trim() ?? '';
  return text.length === 0 ? null : text;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function customerTypeLabel(type: CustomerType): string {
  return CUSTOMER_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function documentTypeLabel(type: DocumentType | null): string {
  if (type === null) {
    return 'Sin documento';
  }

  return DOCUMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function toCustomerPayload(
  value: CustomerFormValue,
  credit: CustomerCredit,
): CustomerPayload {
  return {
    customerType: value.customerType,
    documentType: value.documentType,
    documentNumber: optionalText(value.documentNumber),
    legalName: value.legalName.trim(),
    tradeName: optionalText(value.tradeName),
    nit: optionalText(value.nit),
    nrc: optionalText(value.nrc),
    dui: optionalText(value.dui),
    address: optionalText(value.address),
    phone: optionalText(value.phone),
    email: optionalText(value.email),
    creditLimit: roundMoney(Math.max(0, credit.creditLimit)),
    creditDays: Math.max(0, Math.trunc(credit.creditDays)),
  };
}

export function toCreditPayload(value: CreditFormValue): CustomerCredit {
  return {
    creditLimit: roundMoney(Math.max(0, value.creditLimit ?? 0)),
    creditDays: Math.max(0, Math.trunc(value.creditDays ?? 0)),
  };
}

// Documento principal para tablas y encabezados: "NIT · 0614-..." o "Sin documento".
export function documentSummary(customer: Customer): string {
  const type = documentTypeLabel(customer.documentType);
  const number = optionalText(customer.documentNumber);

  return number === null ? type : `${type} · ${number}`;
}

export function availableCredit(customer: Customer): number {
  return roundMoney(customer.creditLimit - customer.outstandingBalance);
}

export function creditUsagePercent(customer: Customer): number {
  if (customer.creditLimit <= 0) {
    return 0;
  }

  const percent = (customer.outstandingBalance / customer.creditLimit) * 100;
  return Math.min(100, Math.max(0, Math.round(percent)));
}

export function creditTone(customer: Customer): CreditTone {
  if (customer.outstandingBalance > 0 && customer.creditLimit <= 0) {
    return 'danger';
  }

  if (customer.creditLimit <= 0) {
    return 'neutral';
  }

  if (customer.outstandingBalance <= 0) {
    return 'success';
  }

  const percent = creditUsagePercent(customer);

  if (percent >= 100) {
    return 'danger';
  }

  return percent >= 80 ? 'warning' : 'success';
}

export function creditStatusLabel(customer: Customer): string {
  if (customer.outstandingBalance > 0 && customer.creditLimit <= 0) {
    return 'Saldo sin línea de crédito';
  }

  if (customer.creditLimit <= 0) {
    return 'Sin línea de crédito';
  }

  if (customer.outstandingBalance <= 0) {
    return 'Sin saldo pendiente';
  }

  const percent = creditUsagePercent(customer);

  if (percent >= 100) {
    return 'Límite excedido';
  }

  return percent >= 80 ? 'Cerca del límite' : 'Crédito disponible';
}

export function creditLimitLabel(customer: Customer): string {
  return customer.creditLimit <= 0 ? 'Sin crédito' : formatMoney(customer.creditLimit);
}

export function creditDaysLabel(customer: Customer): string {
  return customer.creditDays === 0
    ? 'Contado'
    : `${customer.creditDays} ${customer.creditDays === 1 ? 'día' : 'días'}`;
}
