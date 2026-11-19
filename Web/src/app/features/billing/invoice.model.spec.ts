import { describe, expect, it } from 'vitest';

import {
  CreditNoteFormValue,
  Invoice,
  InvoiceSummary,
  PaymentFormValue,
  canCreateInvoice,
  canIssueCreditNote,
  canRegisterPayment,
  invoiceBalance,
  invoicePaymentMethodLabel,
  invoiceStatusLabel,
  invoiceStatusTone,
  invoiceTypeLabel,
  isCreditNote,
  isInvoiceOverdue,
  isInvoicePaid,
  toCreditNotePayload,
  toInvoicePayload,
  toPaymentPayload,
} from './invoice.model';

function summary(overrides: Partial<InvoiceSummary> = {}): InvoiceSummary {
  return {
    id: 40,
    invoiceNumber: 'CCF-2026-000040',
    invoiceType: 'CCF',
    status: 'ISSUED',
    issueDate: '2026-11-13',
    dueDate: '2026-12-13',
    saleId: 101,
    customerId: 8,
    customerName: 'Agroservicio El Progreso, S.A.',
    paymentCondition: 'CREDIT',
    subtotal: 100,
    discountTotal: 0,
    taxTotal: 13,
    total: 113,
    paidTotal: 0,
    balance: 113,
    ...overrides,
  };
}

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    ...summary(),
    controlNumber: 'A-001234',
    relatedInvoiceId: null,
    relatedInvoiceNumber: null,
    customerDocumentType: 'NIT',
    customerDocumentNumber: '0614-123456-101-2',
    customerNit: '0614-123456-101-2',
    customerNrc: '123456-7',
    customerAddress: 'San Salvador',
    customerEmail: 'cobros@progreso.com',
    notes: null,
    details: [],
    cancelledAt: null,
    cancelReason: null,
    ...overrides,
  };
}

describe('etiquetas de facturación', () => {
  it('traduce tipos, estados y métodos de pago', () => {
    expect(invoiceTypeLabel('CONSUMER')).toBe('Consumidor final');
    expect(invoiceTypeLabel('CCF')).toBe('Comprobante de crédito fiscal');
    expect(invoiceTypeLabel('CREDIT_NOTE')).toBe('Nota de crédito');
    expect(invoiceStatusLabel('DRAFT')).toBe('Borrador');
    expect(invoiceStatusLabel('ISSUED')).toBe('Emitida');
    expect(invoiceStatusLabel('CANCELLED')).toBe('Cancelada');
    expect(invoicePaymentMethodLabel('CHECK')).toBe('Cheque');
    expect(invoicePaymentMethodLabel('TRANSFER')).toBe('Transferencia');
  });

  it('asigna un tono por estado', () => {
    expect(invoiceStatusTone('DRAFT')).toBe('warning');
    expect(invoiceStatusTone('ISSUED')).toBe('success');
    expect(invoiceStatusTone('CANCELLED')).toBe('danger');
  });
});

describe('saldos y vencimientos', () => {
  it('calcula el saldo sin negativos y redondeado a dos decimales', () => {
    expect(invoiceBalance({ total: 113, paidTotal: 50 })).toBe(63);
    expect(invoiceBalance({ total: 113.005, paidTotal: 0 })).toBe(113.01);
    expect(invoiceBalance({ total: 100, paidTotal: 120 })).toBe(0);
  });

  it('marca como pagada solo cuando lo pagado cubre el total', () => {
    expect(isInvoicePaid({ total: 113, paidTotal: 113 })).toBe(true);
    expect(isInvoicePaid({ total: 113, paidTotal: 112.99 })).toBe(false);
  });

  it('detecta notas de crédito', () => {
    expect(isCreditNote({ invoiceType: 'CREDIT_NOTE' })).toBe(true);
    expect(isCreditNote({ invoiceType: 'CCF' })).toBe(false);
  });

  it('solo marca vencidas las facturas emitidas con saldo y fecha pasada', () => {
    expect(isInvoiceOverdue(summary(), '2026-12-14')).toBe(true);
    expect(isInvoiceOverdue(summary(), '2026-12-13')).toBe(false);
    expect(isInvoiceOverdue(summary({ paidTotal: 113, balance: 0 }), '2026-12-14')).toBe(false);
    expect(isInvoiceOverdue(summary({ status: 'CANCELLED' }), '2026-12-14')).toBe(false);
    expect(isInvoiceOverdue(summary({ dueDate: null }), '2026-12-14')).toBe(false);
  });
});

describe('permisos de facturación', () => {
  it('solo permite facturar ventas confirmadas a roles con escritura', () => {
    expect(canCreateInvoice('CONFIRMED', true)).toBe(true);
    expect(canCreateInvoice('CONFIRMED', false)).toBe(false);
    expect(canCreateInvoice('DRAFT', true)).toBe(false);
    expect(canCreateInvoice('CANCELLED', true)).toBe(false);
    expect(canCreateInvoice('CONFIRMED', true, 40)).toBe(false);
  });

  it('permite pagos solo sobre facturas emitidas con saldo', () => {
    expect(canRegisterPayment(invoice(), true)).toBe(true);
    expect(canRegisterPayment(invoice(), false)).toBe(false);
    expect(canRegisterPayment(invoice({ status: 'CANCELLED' }), true)).toBe(false);
    expect(canRegisterPayment(invoice({ paidTotal: 113 }), true)).toBe(false);
    expect(canRegisterPayment(invoice({ invoiceType: 'CREDIT_NOTE' }), true)).toBe(false);
  });

  it('reserva la nota de crédito para ADMIN sobre facturas emitidas', () => {
    expect(canIssueCreditNote(invoice(), true)).toBe(true);
    expect(canIssueCreditNote(invoice(), false)).toBe(false);
    expect(canIssueCreditNote(invoice({ status: 'CANCELLED' }), true)).toBe(false);
    expect(canIssueCreditNote(invoice({ invoiceType: 'CREDIT_NOTE' }), true)).toBe(false);
  });
});

describe('payloads de facturación', () => {
  it('arma la factura con la condición de pago de la venta y textos recortados', () => {
    expect(
      toInvoicePayload(
        101,
        { invoiceType: 'CCF', controlNumber: '  A-001234  ', notes: '  Entregar copia  ' },
        'CREDIT',
      ),
    ).toEqual({
      saleId: 101,
      invoiceType: 'CCF',
      controlNumber: 'A-001234',
      paymentCondition: 'CREDIT',
      notes: 'Entregar copia',
    });

    expect(
      toInvoicePayload(101, { invoiceType: 'CONSUMER', controlNumber: '   ', notes: '' }, 'CASH'),
    ).toEqual({
      saleId: 101,
      invoiceType: 'CONSUMER',
      controlNumber: null,
      paymentCondition: 'CASH',
      notes: null,
    });
  });

  it('normaliza el pago y redondea el monto', () => {
    const value: PaymentFormValue = {
      paymentDate: '2026-11-18',
      amount: 50.555,
      paymentMethod: 'TRANSFER',
      reference: '  REF-01  ',
      notes: '   ',
    };

    expect(toPaymentPayload(value)).toEqual({
      paymentDate: '2026-11-18',
      amount: 50.56,
      paymentMethod: 'TRANSFER',
      reference: 'REF-01',
      notes: null,
    });
  });

  it('exige motivo recortado y devolución de stock explícita en la nota de crédito', () => {
    const value: CreditNoteFormValue = { reason: '  Devolución completa  ', returnStock: true };

    expect(toCreditNotePayload(value)).toEqual({
      reason: 'Devolución completa',
      returnStock: true,
    });
  });
});
