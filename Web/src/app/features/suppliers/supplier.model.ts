// Proveedor tal como lo devuelve la API (contrato 6).
export interface Supplier {
  id: number;
  tradeName: string;
  legalName: string;
  nit: string;
  nrc: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  creditDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Opción para los combos del panel: {id, name}.
export interface SupplierOption {
  id: number;
  name: string;
}

export interface SupplierQuery {
  search: string;
  isActive: boolean | null;
  page: number;
  size: number;
}

export interface SupplierFormValue {
  tradeName: string;
  legalName: string;
  nit: string;
  nrc: string;
  address: string;
  phone: string;
  email: string;
  creditDays: number | null;
}

export interface SupplierPayload {
  tradeName: string;
  legalName: string;
  nit: string;
  nrc: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  creditDays: number;
}

export const NIT_PATTERN = /^(\d{4}-\d{6}-\d{3}-\d|\d{8}-\d)$/;
export const NRC_PATTERN = /^$|^\d{1,7}-\d$/;
export const PHONE_PATTERN = /^$|^[0-9 +-]+$/;

function optionalText(value: string | null | undefined): string | null {
  const text = value?.trim() ?? '';
  return text.length === 0 ? null : text;
}

export function toSupplierPayload(value: SupplierFormValue): SupplierPayload {
  return {
    tradeName: value.tradeName.trim(),
    legalName: value.legalName.trim(),
    nit: value.nit.trim(),
    nrc: optionalText(value.nrc),
    address: optionalText(value.address),
    phone: optionalText(value.phone),
    email: optionalText(value.email),
    creditDays: Math.max(0, Math.trunc(value.creditDays ?? 0)),
  };
}

export function creditDaysLabel(days: number): string {
  if (days <= 0) {
    return 'Contado';
  }

  return `${days} ${days === 1 ? 'día' : 'días'}`;
}

export function supplierContactSummary(supplier: Supplier): string {
  const parts = [optionalText(supplier.phone), optionalText(supplier.email)].filter(
    (part): part is string => part !== null,
  );

  return parts.length === 0 ? 'Sin contacto' : parts.join(' · ');
}
