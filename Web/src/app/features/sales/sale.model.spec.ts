import { describe, expect, it } from 'vitest';

import {
  PaymentCondition,
  Sale,
  SaleFormValue,
  canCancelSale,
  canConfirmSale,
  canEditSale,
  creditIssue,
  estimatedDiscountTotal,
  estimatedTotal,
  isFullyPaid,
  lineGross,
  lineTotal,
  paymentConditionLabel,
  paymentMethodLabel,
  pendingAmount,
  saleStatusLabel,
  saleStatusTone,
  toSalePayload,
} from './sale.model';

function sale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: 101,
    saleNumber: 'V-2026-000101',
    status: 'DRAFT',
    saleDate: '2026-11-17T10:15:00',
    customer: { id: 8, legalName: 'Agroservicio El Progreso, S.A.' },
    seller: { id: 3, fullName: 'Juan Pérez' },
    paymentCondition: 'CASH',
    paymentMethod: 'CASH',
    subtotal: 100,
    discountTotal: 0,
    taxTotal: 13,
    total: 113,
    paidTotal: 0,
    invoiceId: null,
    invoiceNumber: null,
    notes: null,
    details: [],
    cancelledAt: null,
    cancelReason: null,
    ...overrides,
  };
}

const formValue: SaleFormValue = {
  customerId: 8,
  paymentCondition: 'CREDIT',
  paymentMethod: 'TRANSFER',
  notes: '  Entregar en bodega  ',
  lines: [
    {
      productPresentationId: 31,
      quantity: 2.345,
      unitPrice: 22.605,
      discount: 10.555,
    },
    {
      productPresentationId: 32,
      quantity: 1,
      unitPrice: 5,
      discount: -3,
    },
  ],
};

describe('toSalePayload', () => {
  it('recorta notas, redondea importes y conserva el cliente', () => {
    const payload = toSalePayload(formValue);

    expect(payload.customerId).toBe(8);
    expect(payload.paymentCondition).toBe('CREDIT');
    expect(payload.paymentMethod).toBe('TRANSFER');
    expect(payload.notes).toBe('Entregar en bodega');
    expect(payload.details).toEqual([
      {
        productPresentationId: 31,
        quantity: 2.35,
        unitPrice: 22.61,
        discount: 10.56,
      },
      {
        productPresentationId: 32,
        quantity: 1,
        unitPrice: 5,
        discount: 0,
      },
    ]);
  });

  it('convierte notas vacías en null y admite consumidor final', () => {
    const payload = toSalePayload({
      ...formValue,
      customerId: null,
      notes: '   ',
      paymentMethod: null,
    });

    expect(payload.customerId).toBeNull();
    expect(payload.notes).toBeNull();
    expect(payload.paymentMethod).toBeNull();
  });
});

describe('cálculo de líneas y totales', () => {
  it('calcula el importe bruto y aplica el descuento', () => {
    expect(lineGross(5, 22.6)).toBe(113);
    expect(lineTotal(5, 22.6, 13)).toBe(100);
  });

  it('no permite que el descuento genere importes negativos', () => {
    expect(lineTotal(1, 10, 25)).toBe(0);
  });

  it('suma los totales de las líneas con redondeo a dos decimales', () => {
    const lines = [
      { quantity: 1.5, unitPrice: 10.333, discount: 0 },
      { quantity: 2, unitPrice: 5.555, discount: 1.11 },
    ];

    expect(estimatedTotal(lines)).toBe(25.5);
    expect(estimatedDiscountTotal(lines)).toBe(1.11);
  });

  it('devuelve cero cuando no hay líneas', () => {
    expect(estimatedTotal([])).toBe(0);
    expect(estimatedDiscountTotal([])).toBe(0);
  });
});

describe('etiquetas y estados', () => {
  it('traduce el estado y su tono', () => {
    expect(saleStatusLabel('DRAFT')).toBe('Borrador');
    expect(saleStatusLabel('CONFIRMED')).toBe('Confirmada');
    expect(saleStatusLabel('CANCELLED')).toBe('Cancelada');

    expect(saleStatusTone('DRAFT')).toBe('warning');
    expect(saleStatusTone('CONFIRMED')).toBe('success');
    expect(saleStatusTone('CANCELLED')).toBe('danger');
  });

  it('traduce la condición y el método de pago', () => {
    expect(paymentConditionLabel('CASH')).toBe('Contado');
    expect(paymentConditionLabel('CREDIT')).toBe('Crédito');
    expect(paymentMethodLabel('CASH')).toBe('Efectivo');
    expect(paymentMethodLabel('CARD')).toBe('Tarjeta');
    expect(paymentMethodLabel('TRANSFER')).toBe('Transferencia');
    expect(paymentMethodLabel('OTHER')).toBe('Otro');
    expect(paymentMethodLabel(null)).toBe('Sin especificar');
  });
});

describe('saldo de la venta', () => {
  it('calcula el pendiente y detecta el pago completo', () => {
    expect(pendingAmount(sale({ total: 113, paidTotal: 13 }))).toBe(100);
    expect(pendingAmount(sale({ total: 113, paidTotal: 150 }))).toBe(0);
    expect(isFullyPaid(sale({ total: 113, paidTotal: 113 }))).toBe(true);
    expect(isFullyPaid(sale({ total: 113, paidTotal: 0 }))).toBe(false);
  });
});

describe('permisos sobre la venta', () => {
  it('permite editar y confirmar solo borradores propios o como ADMIN', () => {
    const draft = sale();

    expect(canEditSale(draft, 3, false)).toBe(true);
    expect(canEditSale(draft, 9, false)).toBe(false);
    expect(canEditSale(draft, null, false)).toBe(false);
    expect(canEditSale(draft, 9, true)).toBe(true);

    expect(canConfirmSale(draft, 3, false)).toBe(true);
    expect(canConfirmSale(sale({ status: 'CONFIRMED' }), 3, true)).toBe(false);
  });

  it('permite cancelar solo a ADMIN y cuando no está cancelada', () => {
    expect(canCancelSale(sale(), true)).toBe(true);
    expect(canCancelSale(sale(), false)).toBe(false);
    expect(canCancelSale(sale({ status: 'CANCELLED' }), true)).toBe(false);
  });
});

describe('validación visual del crédito', () => {
  const customer = {
    creditLimit: 5000,
    creditDays: 30,
    outstandingBalance: 4200,
  };

  it('no advierte sin cliente ni con disponibilidad suficiente', () => {
    expect(creditIssue(null, 1000)).toBeNull();
    expect(creditIssue(customer, 800)).toBeNull();
  });

  it('advierte cuando el cliente no tiene días de crédito', () => {
    expect(creditIssue({ ...customer, creditDays: 0 }, 100)).toBe(
      'El cliente no tiene días de crédito configurados.',
    );
  });

  it('advierte cuando la venta supera el crédito disponible', () => {
    expect(creditIssue(customer, 801)).toBe('La venta supera el crédito disponible ($800.00).');
  });
});

describe('condiciones del contrato', () => {
  it('mantiene las condiciones de pago admitidas', () => {
    const conditions: PaymentCondition[] = ['CASH', 'CREDIT'];

    expect(conditions.map((condition) => paymentConditionLabel(condition))).toEqual([
      'Contado',
      'Crédito',
    ]);
  });
});
