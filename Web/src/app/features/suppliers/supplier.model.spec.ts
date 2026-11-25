import { describe, expect, it } from 'vitest';

import {
  Supplier,
  SupplierFormValue,
  creditDaysLabel,
  supplierContactSummary,
  toSupplierPayload,
} from './supplier.model';

function supplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id: 3,
    tradeName: 'Ferretería La Central',
    legalName: 'Ferretería La Central, S.A. de C.V.',
    nit: '0614-120588-101-3',
    nrc: '12345-6',
    address: 'Km 5 Carretera a Santa Tecla',
    phone: '2222-1010',
    email: 'ventas@lacentral.com.sv',
    creditDays: 30,
    isActive: true,
    createdAt: '2026-04-01T08:00:00',
    updatedAt: '2026-04-01T08:00:00',
    ...overrides,
  };
}

const formValue: SupplierFormValue = {
  tradeName: '  Ferretería La Central  ',
  legalName: '  Ferretería La Central, S.A. de C.V. ',
  nit: ' 0614-120588-101-3 ',
  nrc: ' 12345-6 ',
  address: '  Km 5 Carretera a Santa Tecla ',
  phone: ' 2222-1010 ',
  email: ' ventas@lacentral.com.sv ',
  creditDays: 30.9,
};

describe('toSupplierPayload', () => {
  it('recorta textos y trunca los días de crédito', () => {
    expect(toSupplierPayload(formValue)).toEqual({
      tradeName: 'Ferretería La Central',
      legalName: 'Ferretería La Central, S.A. de C.V.',
      nit: '0614-120588-101-3',
      nrc: '12345-6',
      address: 'Km 5 Carretera a Santa Tecla',
      phone: '2222-1010',
      email: 'ventas@lacentral.com.sv',
      creditDays: 30,
    });
  });

  it('convierte en null los campos opcionales vacíos', () => {
    const payload = toSupplierPayload({
      ...formValue,
      nrc: '',
      address: '   ',
      phone: '',
      email: ' ',
    });

    expect(payload.nrc).toBeNull();
    expect(payload.address).toBeNull();
    expect(payload.phone).toBeNull();
    expect(payload.email).toBeNull();
  });

  it('normaliza días de crédito negativos o sin valor', () => {
    expect(toSupplierPayload({ ...formValue, creditDays: -5 }).creditDays).toBe(0);
    expect(toSupplierPayload({ ...formValue, creditDays: null }).creditDays).toBe(0);
  });
});

describe('creditDaysLabel', () => {
  it('describe contado y días de crédito', () => {
    expect(creditDaysLabel(0)).toBe('Contado');
    expect(creditDaysLabel(1)).toBe('1 día');
    expect(creditDaysLabel(30)).toBe('30 días');
  });
});

describe('supplierContactSummary', () => {
  it('compone teléfono y correo', () => {
    expect(supplierContactSummary(supplier())).toBe('2222-1010 · ventas@lacentral.com.sv');
  });

  it('omite los datos faltantes e indica cuando no hay contacto', () => {
    expect(supplierContactSummary(supplier({ phone: null }))).toBe('ventas@lacentral.com.sv');
    expect(supplierContactSummary(supplier({ email: '   ' }))).toBe('2222-1010');
    expect(supplierContactSummary(supplier({ phone: null, email: null }))).toBe('Sin contacto');
  });
});
