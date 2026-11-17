import { describe, expect, it } from 'vitest';

import {
  CATALOGS,
  CatalogColumn,
  CatalogRecord,
  columnValue,
  findCatalog,
  toPayload,
} from './catalog.model';

describe('CATALOGS', () => {
  it('define los seis catálogos con endpoint propio y columnas', () => {
    expect(CATALOGS.map((catalog) => catalog.key)).toEqual([
      'categories',
      'product-types',
      'brands',
      'models',
      'measure-units',
      'presentations',
    ]);

    for (const catalog of CATALOGS) {
      expect(catalog.endpoint).toBe(catalog.key);
      expect(catalog.columns.length).toBeGreaterThan(0);
      expect(catalog.fields.some((field) => field.key === 'name')).toBe(true);
    }
  });

  it('solo modelos y presentaciones exponen filtro de relación', () => {
    expect(findCatalog('models').filter?.param).toBe('brandId');
    expect(findCatalog('presentations').filter?.param).toBe('measureUnitId');
    expect(findCatalog('brands').filter).toBeUndefined();
  });
});

describe('toPayload', () => {
  it('normaliza nombre y descripción para categorías y tipos', () => {
    expect(
      toPayload('categories', { name: '  Herramientas ', description: '  Uso general ' }),
    ).toEqual({
      name: 'Herramientas',
      description: 'Uso general',
    });

    expect(toPayload('product-types', { name: 'Materia prima', description: '   ' })).toEqual({
      name: 'Materia prima',
      description: null,
    });
  });

  it('envía solo el nombre en marcas', () => {
    expect(toPayload('brands', { name: '  Cemento Nacional ' })).toEqual({
      name: 'Cemento Nacional',
    });
  });

  it('incluye la marca en los modelos', () => {
    expect(toPayload('models', { name: 'Premium', brandId: 4 })).toEqual({
      name: 'Premium',
      brandId: 4,
    });
  });

  it('incluye nombre y código en unidades de medida', () => {
    expect(toPayload('measure-units', { name: ' Libra ', code: ' lb ' })).toEqual({
      name: 'Libra',
      code: 'lb',
    });
  });

  it('incluye unidad y cantidad numérica en presentaciones', () => {
    expect(
      toPayload('presentations', { name: 'Caja 25 lb', measureUnitId: 2, quantity: 25.5 }),
    ).toEqual({
      name: 'Caja 25 lb',
      measureUnitId: 2,
      quantity: 25.5,
    });
  });
});

describe('columnValue', () => {
  const record: CatalogRecord = {
    id: 8,
    name: 'Caja 25 lb',
    measureUnit: { id: 2, name: 'Libra', code: 'lb' },
    quantity: 25,
    isActive: true,
  };

  function column(key: CatalogColumn['key']): CatalogColumn {
    return { key, label: key };
  }

  it('compone la unidad de medida con su código', () => {
    expect(columnValue(record, column('measureUnit'))).toBe('Libra · lb');
  });

  it('formatea la cantidad y deja guion cuando falta el dato', () => {
    expect(columnValue(record, column('quantity'))).toBe('25');
    expect(columnValue({ id: 1, name: 'Otro', isActive: true }, column('quantity'))).toBe('—');
  });

  it('usa guion cuando no hay descripción', () => {
    expect(columnValue(record, column('description'))).toBe('—');
  });
});
