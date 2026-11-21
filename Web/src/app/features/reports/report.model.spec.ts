import { describe, expect, it } from 'vitest';

import {
  formatQuantity,
  reportBucketLabel,
  reportBucketTone,
  stockExportFilename,
} from './report.model';

describe('etiquetas del reporte de cuentas por cobrar', () => {
  it('traduce los tramos de antigüedad', () => {
    expect(reportBucketLabel('CURRENT')).toBe('Al día');
    expect(reportBucketLabel('D1_30')).toBe('1 a 30 días');
    expect(reportBucketLabel('D31_60')).toBe('31 a 60 días');
    expect(reportBucketLabel('D61_90')).toBe('61 a 90 días');
    expect(reportBucketLabel('D90_PLUS')).toBe('Más de 90 días');
  });

  it('conserva un tramo desconocido', () => {
    expect(reportBucketLabel('OTRO')).toBe('OTRO');
  });

  it('asigna un tono según el vencimiento', () => {
    expect(reportBucketTone('CURRENT')).toBe('success');
    expect(reportBucketTone('D1_30')).toBe('warning');
    expect(reportBucketTone('D31_60')).toBe('danger');
    expect(reportBucketTone('D90_PLUS')).toBe('danger');
  });
});

describe('exportación de existencias', () => {
  it('construye el nombre del archivo según el formato', () => {
    expect(stockExportFilename('PDF', '2026-11-20')).toBe('existencias-2026-11-20.pdf');
    expect(stockExportFilename('XLSX', '2026-11-20')).toBe('existencias-2026-11-20.xlsx');
  });
});

describe('formato de cantidades', () => {
  it('usa dos decimales y muestra un guion sin dato', () => {
    expect(formatQuantity(120)).toContain('120');
    expect(formatQuantity(null)).toBe('—');
    expect(formatQuantity(undefined)).toBe('—');
  });
});
