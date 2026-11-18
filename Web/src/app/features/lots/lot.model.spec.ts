import { describe, expect, it } from 'vitest';

import {
  LotFormValue,
  ProductLot,
  daysToExpireLabel,
  expirationLabel,
  expirationTone,
  formatDate,
  lastCostFor,
  lotCostLabel,
  lotQuantityLabel,
  lotUnitCostLabel,
  parseLocalDate,
  toLotPayload,
} from './lot.model';

function lot(overrides: Partial<ProductLot> = {}): ProductLot {
  return {
    id: 1,
    lotNumber: 'L-2026-045',
    product: { id: 8, code: 'CEM-010', name: 'Cemento gris' },
    presentation: { productPresentationId: 21, name: 'Bulto 42.5 kg' },
    supplier: { id: 3, tradeName: 'Distribuidora Nacional' },
    invoiceNumber: 'F-001234',
    invoiceDate: '2026-11-10',
    entryDate: '2026-11-11',
    expirationDate: '2027-05-20',
    daysToExpire: 184,
    expirationSeverity: 'NONE',
    receivedQuantity: 120,
    availableQuantity: 95,
    notes: null,
    isActive: true,
    ...overrides,
  };
}

const formValue: LotFormValue = {
  productPresentationId: 21,
  supplierId: 3,
  invoiceNumber: '  F-001234 ',
  invoiceDate: '2026-11-10',
  lotNumber: '  L-2026-045 ',
  receivedQuantity: 120.456,
  unitCost: 18.555,
  expirationDate: '   ',
  notes: '  Ingreso de prueba ',
};

describe('toLotPayload', () => {
  it('recorta textos y redondea cantidades y costos a dos decimales', () => {
    expect(toLotPayload(formValue)).toEqual({
      productPresentationId: 21,
      supplierId: 3,
      invoiceNumber: 'F-001234',
      invoiceDate: '2026-11-10',
      lotNumber: 'L-2026-045',
      receivedQuantity: 120.46,
      unitCost: 18.56,
      expirationDate: null,
      notes: 'Ingreso de prueba',
    });
  });

  it('convierte en null el vencimiento y las notas vacías', () => {
    const payload = toLotPayload({ ...formValue, expirationDate: '', notes: '   ' });

    expect(payload.expirationDate).toBeNull();
    expect(payload.notes).toBeNull();
  });

  it('usa cero cuando faltan valores numéricos u opcionales', () => {
    const payload = toLotPayload({
      ...formValue,
      productPresentationId: null,
      supplierId: null,
      receivedQuantity: null,
      unitCost: null,
    });

    expect(payload.productPresentationId).toBe(0);
    expect(payload.supplierId).toBe(0);
    expect(payload.receivedQuantity).toBe(0);
    expect(payload.unitCost).toBe(0);
  });
});

describe('fechas locales', () => {
  it('interpreta la fecha ISO sin desplazar el día por zona horaria', () => {
    const date = parseLocalDate('2027-01-01');

    expect(date?.getFullYear()).toBe(2027);
    expect(date?.getMonth()).toBe(0);
    expect(date?.getDate()).toBe(1);
  });

  it('formatea la fecha del contrato y tolera valores vacíos o inválidos', () => {
    const formatted = formatDate('2027-05-20');

    expect(formatted).not.toBe('—');
    expect(formatted).toContain('2027');
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('   ')).toBe('—');
    expect(formatDate('no-es-fecha')).toBe('—');
  });
});

describe('severidad de vencimiento', () => {
  it('traduce la severidad del backend', () => {
    expect(expirationLabel('EXPIRED')).toBe('Vencido');
    expect(expirationLabel('RED')).toBe('Vence en 15 días o menos');
    expect(expirationLabel('YELLOW')).toBe('Vence en 16 a 30 días');
    expect(expirationLabel('NONE')).toBe('Sin alerta');
  });

  it('asigna el tono visual de cada severidad', () => {
    expect(expirationTone('EXPIRED')).toBe('danger');
    expect(expirationTone('RED')).toBe('danger');
    expect(expirationTone('YELLOW')).toBe('warning');
    expect(expirationTone('NONE')).toBe('neutral');
  });
});

describe('daysToExpireLabel', () => {
  it('describe días restantes en singular y plural', () => {
    expect(daysToExpireLabel(lot({ daysToExpire: 1 }))).toBe('Vence en 1 día');
    expect(daysToExpireLabel(lot({ daysToExpire: 16 }))).toBe('Vence en 16 días');
    expect(daysToExpireLabel(lot({ daysToExpire: 0 }))).toBe('Vence hoy');
  });

  it('describe los vencidos y los lotes sin fecha', () => {
    expect(daysToExpireLabel(lot({ daysToExpire: -1 }))).toBe('Vencido hace 1 día');
    expect(daysToExpireLabel(lot({ daysToExpire: -7 }))).toBe('Vencido hace 7 días');
    expect(daysToExpireLabel(lot({ daysToExpire: null }))).toBe('Sin vencimiento');
  });
});

describe('etiquetas de lote', () => {
  it('muestra la cantidad disponible frente a la recibida', () => {
    expect(lotQuantityLabel(lot())).toBe('95 de 120');
  });

  it('oculta los costos cuando el perfil no puede verlos', () => {
    expect(lotUnitCostLabel(lot())).toBe('—');
    expect(lotCostLabel(lot())).toBe('—');
  });

  it('formatea los costos cuando la API los entrega', () => {
    expect(lotUnitCostLabel(lot({ unitCost: 18.5 }))).toBe('$18.50');
    expect(lotCostLabel(lot({ totalCost: 2220 }))).toBe('$2,220.00');
  });
});

describe('lastCostFor', () => {
  const costs = [
    {
      productPresentationId: 21,
      presentationName: 'Bulto 42.5 kg',
      lastUnitCost: 18.5,
      lotId: 9,
      entryDate: '2026-11-11',
    },
  ];

  it('encuentra el último costo de la presentación elegida', () => {
    expect(lastCostFor(costs, 21)?.lastUnitCost).toBe(18.5);
  });

  it('devuelve null sin presentación o cuando no hay coincidencia', () => {
    expect(lastCostFor(costs, null)).toBeNull();
    expect(lastCostFor(costs, 99)).toBeNull();
  });
});
