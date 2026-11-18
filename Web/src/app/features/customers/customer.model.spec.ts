import { describe, expect, it } from 'vitest';

import {
  Customer,
  CustomerFormValue,
  availableCredit,
  creditDaysLabel,
  creditLimitLabel,
  creditStatusLabel,
  creditTone,
  creditUsagePercent,
  customerTypeLabel,
  documentSummary,
  documentTypeLabel,
  toCreditPayload,
  toCustomerPayload,
} from './customer.model';

function customer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 8,
    customerType: 'BUSINESS',
    documentType: 'NIT',
    documentNumber: '0614-123456-101-2',
    legalName: 'Agroservicio El Progreso, S.A.',
    tradeName: 'El Progreso',
    nit: '0614-123456-101-2',
    nrc: '123456-7',
    dui: null,
    address: 'Santa Tecla',
    phone: '2222-3333',
    email: 'compras@elprogreso.com',
    creditLimit: 5000,
    creditDays: 30,
    outstandingBalance: 1250,
    isActive: true,
    createdAt: '2026-11-17T09:30:00',
    updatedAt: '2026-11-17T09:30:00',
    ...overrides,
  };
}

const formValue: CustomerFormValue = {
  customerType: 'NATURAL',
  documentType: 'DUI',
  documentNumber: '  01234567-8 ',
  legalName: '  Marvin Gómez  ',
  tradeName: '   ',
  nit: '',
  nrc: '123456-7',
  dui: '01234567-8',
  address: '  Santa Tecla ',
  phone: ' 7000-0000 ',
  email: '  marvin@example.com ',
};

describe('toCustomerPayload', () => {
  it('recorta textos y convierte los campos vacíos en null', () => {
    expect(toCustomerPayload(formValue, { creditLimit: 1500.555, creditDays: 30.9 })).toEqual({
      customerType: 'NATURAL',
      documentType: 'DUI',
      documentNumber: '01234567-8',
      legalName: 'Marvin Gómez',
      tradeName: null,
      nit: null,
      nrc: '123456-7',
      dui: '01234567-8',
      address: 'Santa Tecla',
      phone: '7000-0000',
      email: 'marvin@example.com',
      creditLimit: 1500.56,
      creditDays: 30,
    });
  });

  it('convierte en null todos los textos opcionales vacíos', () => {
    const payload = toCustomerPayload(
      {
        ...formValue,
        documentNumber: '',
        tradeName: '',
        nit: '   ',
        nrc: '',
        dui: ' ',
        address: '',
        phone: '',
        email: '',
      },
      { creditLimit: 0, creditDays: 0 },
    );

    expect(payload.documentNumber).toBeNull();
    expect(payload.tradeName).toBeNull();
    expect(payload.nit).toBeNull();
    expect(payload.nrc).toBeNull();
    expect(payload.dui).toBeNull();
    expect(payload.address).toBeNull();
    expect(payload.phone).toBeNull();
    expect(payload.email).toBeNull();
  });

  it('normaliza crédito negativo o con decimales', () => {
    expect(toCustomerPayload(formValue, { creditLimit: -5, creditDays: -3 })).toMatchObject({
      creditLimit: 0,
      creditDays: 0,
    });
  });
});

describe('toCreditPayload', () => {
  it('redondea el límite y trunca los días', () => {
    expect(toCreditPayload({ creditLimit: 1234.567, creditDays: 15.8 })).toEqual({
      creditLimit: 1234.57,
      creditDays: 15,
    });
  });

  it('usa cero cuando los valores no están definidos', () => {
    expect(toCreditPayload({ creditLimit: null, creditDays: null })).toEqual({
      creditLimit: 0,
      creditDays: 0,
    });
  });
});

describe('etiquetas de cliente', () => {
  it('traduce el tipo de cliente', () => {
    expect(customerTypeLabel('NATURAL')).toBe('Persona natural');
    expect(customerTypeLabel('BUSINESS')).toBe('Empresa');
  });

  it('traduce el tipo de documento e indica cuando falta', () => {
    expect(documentTypeLabel('DUI')).toBe('DUI');
    expect(documentTypeLabel('PASSPORT')).toBe('Pasaporte');
    expect(documentTypeLabel('FOREIGN')).toBe('Documento extranjero');
    expect(documentTypeLabel(null)).toBe('Sin documento');
  });

  it('compone el documento principal', () => {
    expect(documentSummary(customer())).toBe('NIT · 0614-123456-101-2');
    expect(documentSummary(customer({ documentNumber: null }))).toBe('NIT');
    expect(documentSummary(customer({ documentType: null, documentNumber: null }))).toBe(
      'Sin documento',
    );
  });
});

describe('crédito y saldo', () => {
  it('calcula el disponible y el porcentaje de uso', () => {
    const item = customer();

    expect(availableCredit(item)).toBe(3750);
    expect(creditUsagePercent(item)).toBe(25);
  });

  it('limita el porcentaje entre 0 y 100', () => {
    expect(creditUsagePercent(customer({ creditLimit: 0, outstandingBalance: 500 }))).toBe(0);
    expect(creditUsagePercent(customer({ creditLimit: 1000, outstandingBalance: 2500 }))).toBe(100);
    expect(creditUsagePercent(customer({ creditLimit: 1000, outstandingBalance: 0 }))).toBe(0);
  });

  it('permite un disponible negativo cuando el saldo supera el límite', () => {
    expect(availableCredit(customer({ creditLimit: 1000, outstandingBalance: 1500 }))).toBe(-500);
  });

  it('asigna el tono según el uso de la línea', () => {
    expect(creditTone(customer({ creditLimit: 0, outstandingBalance: 0 }))).toBe('neutral');
    expect(creditTone(customer({ creditLimit: 0, outstandingBalance: 500 }))).toBe('danger');
    expect(creditTone(customer({ outstandingBalance: 0 }))).toBe('success');
    expect(creditTone(customer({ outstandingBalance: 1200 }))).toBe('success');
    expect(creditTone(customer({ creditLimit: 1000, outstandingBalance: 850 }))).toBe('warning');
    expect(creditTone(customer({ creditLimit: 1000, outstandingBalance: 1000 }))).toBe('danger');
  });

  it('describe el estado del crédito', () => {
    expect(creditStatusLabel(customer({ creditLimit: 0, outstandingBalance: 0 }))).toBe(
      'Sin línea de crédito',
    );
    expect(creditStatusLabel(customer({ creditLimit: 0, outstandingBalance: 500 }))).toBe(
      'Saldo sin línea de crédito',
    );
    expect(creditStatusLabel(customer({ outstandingBalance: 0 }))).toBe('Sin saldo pendiente');
    expect(creditStatusLabel(customer({ creditLimit: 1000, outstandingBalance: 850 }))).toBe(
      'Cerca del límite',
    );
    expect(creditStatusLabel(customer({ creditLimit: 1000, outstandingBalance: 1200 }))).toBe(
      'Límite excedido',
    );
    expect(creditStatusLabel(customer())).toBe('Crédito disponible');
  });

  it('formatea el límite y los días de crédito', () => {
    expect(creditLimitLabel(customer())).toBe('$5,000.00');
    expect(creditLimitLabel(customer({ creditLimit: 0 }))).toBe('Sin crédito');
    expect(creditDaysLabel(customer())).toBe('30 días');
    expect(creditDaysLabel(customer({ creditDays: 1 }))).toBe('1 día');
    expect(creditDaysLabel(customer({ creditDays: 0 }))).toBe('Contado');
  });
});
