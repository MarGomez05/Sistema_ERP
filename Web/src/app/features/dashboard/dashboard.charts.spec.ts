import { describe, expect, it } from 'vitest';

import { buildExpirationBuckets, buildLotDonut, buildStockBars } from './dashboard.charts';
import { DashboardSummary, ExpiringLotItem, LowStockItem } from './dashboard.model';

const SUMMARY: DashboardSummary = {
  activeProducts: 10,
  lowStockProducts: 3,
  activeLots: 12,
  expiringLots: 4,
  expiredLots: 2,
};

function lot(daysRemaining: number): ExpiringLotItem {
  return {
    lotId: daysRemaining + 100,
    productName: 'Producto',
    presentationName: 'Unidad',
    lotNumber: `L-${daysRemaining}`,
    expirationDate: '2026-11-30',
    daysRemaining,
    severity: daysRemaining < 0 ? 'EXPIRED' : 'RED',
    label: daysRemaining < 0 ? 'Vencido' : 'Vence pronto',
  };
}

function lowStock(current: number, minimum: number): LowStockItem {
  return {
    productId: 1,
    productCode: 'P-001',
    productName: 'Cemento',
    presentationName: 'Saco 50 kg',
    currentStock: current,
    minStock: minimum,
    missing: minimum - current,
  };
}

describe('buildLotDonut', () => {
  it('reparte los lotes activos en sin alerta, por vencer y vencidos', () => {
    const segments = buildLotDonut(SUMMARY);

    expect(segments.map((segment) => segment.value)).toEqual([6, 4, 2]);
    expect(segments.map((segment) => segment.tone)).toEqual(['success', 'warning', 'danger']);
  });

  it('devuelve una lista vacía sin resumen o sin lotes activos', () => {
    expect(buildLotDonut(null)).toEqual([]);
    expect(buildLotDonut({ ...SUMMARY, activeLots: 0 })).toEqual([]);
  });

  it('no genera valores negativos si el resumen es inconsistente', () => {
    const segments = buildLotDonut({
      ...SUMMARY,
      activeLots: 3,
      expiringLots: 5,
      expiredLots: 5,
    });

    expect(segments.every((segment) => segment.value >= 0)).toBe(true);
    expect(segments.reduce((sum, segment) => sum + segment.value, 0)).toBe(3);
  });
});

describe('buildExpirationBuckets', () => {
  it('agrupa por vencidos, 0–7, 8–15 y 16–30 días', () => {
    const buckets = buildExpirationBuckets([
      lot(-1),
      lot(0),
      lot(7),
      lot(8),
      lot(15),
      lot(16),
      lot(30),
    ]);

    expect(buckets.map((bucket) => bucket.value)).toEqual([1, 2, 2, 2]);
  });

  it('devuelve los cuatro rangos en cero sin lotes', () => {
    const buckets = buildExpirationBuckets([]);

    expect(buckets).toHaveLength(4);
    expect(buckets.every((bucket) => bucket.value === 0)).toBe(true);
  });
});

describe('buildStockBars', () => {
  it('calcula el faltante y conserva los datos de la presentación', () => {
    const [bar] = buildStockBars([lowStock(4, 10)]);

    expect(bar?.title).toBe('Cemento');
    expect(bar?.subtitle).toBe('P-001 · Saco 50 kg');
    expect(bar?.missing).toBe(6);
  });

  it('no reporta faltante cuando el stock alcanza el mínimo', () => {
    const [bar] = buildStockBars([lowStock(10, 10)]);

    expect(bar?.missing).toBe(0);
  });
});
