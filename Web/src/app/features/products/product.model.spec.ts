import { describe, expect, it } from 'vitest';

import {
  ProductListItem,
  ProductPresentation,
  ProductPresentationFormValue,
  formatMoney,
  formatQuantity,
  hiddenStockCount,
  pendingImages,
  presentationOptionLabel,
  productModelLabel,
  stockStatusLabel,
  stockStatusTone,
  toPresentationCreatePayload,
  toPresentationUpdatePayload,
  toProductPayload,
  visibleStock,
} from './product.model';

function stockByPresentation(count: number): ProductListItem['stockByPresentation'] {
  return Array.from({ length: count }, (_, index) => ({
    productPresentationId: index + 1,
    presentationName: `Presentación ${index + 1}`,
    stock: index * 10,
    stockStatus: 'OK' as const,
  }));
}

function presentation(overrides: Partial<ProductPresentation> = {}): ProductPresentation {
  return {
    id: 1,
    code: 'CLV-001-CJ',
    presentation: { id: 3, name: 'Caja', measureUnit: 'Unidad', quantity: 25 },
    minStock: 5,
    currentPrice: 18.5,
    stock: 40,
    stockStatus: 'OK',
    imageUrl: null,
    imageAlt: null,
    isActive: true,
    ...overrides,
  };
}

describe('toProductPayload', () => {
  it('recorta textos y convierte la descripción vacía en null', () => {
    expect(
      toProductPayload({
        code: '  CLV-001  ',
        name: '  Clavo de acero  ',
        description: '   ',
        categoryId: 4,
        productTypeId: 2,
        productModelId: null,
        requiresExpiration: false,
      }),
    ).toEqual({
      code: 'CLV-001',
      name: 'Clavo de acero',
      description: null,
      categoryId: 4,
      productTypeId: 2,
      productModelId: null,
      requiresExpiration: false,
    });
  });

  it('conserva descripción y modelo cuando están presentes', () => {
    expect(
      toProductPayload({
        code: 'CEM-010',
        name: 'Cemento gris',
        description: '  Bulto de 42.5 kg ',
        categoryId: 7,
        productTypeId: 3,
        productModelId: 9,
        requiresExpiration: true,
      }),
    ).toEqual({
      code: 'CEM-010',
      name: 'Cemento gris',
      description: 'Bulto de 42.5 kg',
      categoryId: 7,
      productTypeId: 3,
      productModelId: 9,
      requiresExpiration: true,
    });
  });
});

describe('payloads de presentación', () => {
  const value: ProductPresentationFormValue = {
    presentationId: 5,
    code: '  CLV-001-CJ ',
    minStock: 12.5,
    imageUrl: '  /media/clavos.jpg ',
    imageAlt: '  Caja de clavos ',
  };

  it('incluye la presentación base al crear', () => {
    expect(toPresentationCreatePayload(value)).toEqual({
      presentationId: 5,
      code: 'CLV-001-CJ',
      minStock: 12.5,
      imageUrl: '/media/clavos.jpg',
      imageAlt: 'Caja de clavos',
    });
  });

  it('omite la presentación base al actualizar y envía la imagen vigente', () => {
    expect(toPresentationUpdatePayload(value)).toEqual({
      code: 'CLV-001-CJ',
      minStock: 12.5,
      imageUrl: '/media/clavos.jpg',
      imageAlt: 'Caja de clavos',
    });
  });

  it('envía null cuando la imagen o el texto alternativo quedan vacíos', () => {
    const payload = toPresentationUpdatePayload({
      presentationId: null,
      code: 'CLV-001-CJ',
      minStock: null,
      imageUrl: '   ',
      imageAlt: '',
    });

    expect(payload.imageUrl).toBeNull();
    expect(payload.imageAlt).toBeNull();
    expect(payload.minStock).toBe(0);
  });
});

describe('formatos', () => {
  it('formatea cantidades con dos decimales como máximo', () => {
    expect(formatQuantity(1234.5)).toBe('1,234.5');
    expect(formatQuantity(null)).toBe('—');
    expect(formatQuantity(undefined)).toBe('—');
  });

  it('formatea dinero en dólares con dos decimales', () => {
    expect(formatMoney(18.5)).toBe('$18.50');
    expect(formatMoney(null)).toBe('—');
  });
});

describe('estados de stock', () => {
  it('traduce y colorea cada estado', () => {
    expect(stockStatusLabel('OUT')).toBe('Agotado');
    expect(stockStatusLabel('LOW')).toBe('Bajo stock');
    expect(stockStatusLabel('OK')).toBe('Disponible');

    expect(stockStatusTone('OUT')).toBe('danger');
    expect(stockStatusTone('LOW')).toBe('warning');
    expect(stockStatusTone('OK')).toBe('success');
  });

  it('limita las existencias visibles e informa las restantes', () => {
    const item: ProductListItem = {
      id: 1,
      code: 'CLV-001',
      name: 'Clavo de acero',
      categoryName: 'Ferretería',
      productTypeName: 'Terminado',
      requiresExpiration: false,
      isActive: true,
      stockByPresentation: stockByPresentation(4),
    };

    expect(visibleStock(item)).toHaveLength(2);
    expect(visibleStock(item).map((stock) => stock.productPresentationId)).toEqual([1, 2]);
    expect(hiddenStockCount(item)).toBe(2);
  });

  it('no informa ocultos cuando caben todos', () => {
    const item: ProductListItem = {
      id: 2,
      code: 'CEM-010',
      name: 'Cemento gris',
      categoryName: 'Construcción',
      productTypeName: 'Materia prima',
      requiresExpiration: true,
      isActive: true,
      stockByPresentation: stockByPresentation(2),
    };

    expect(visibleStock(item)).toHaveLength(2);
    expect(hiddenStockCount(item)).toBe(0);
  });
});

describe('etiquetas', () => {
  it('compone la presentación base con su unidad', () => {
    expect(
      presentationOptionLabel({
        id: 3,
        name: 'Caja',
        quantity: 25,
        measureUnit: { id: 1, name: 'Unidad', code: 'UND' },
      }),
    ).toBe('Caja · 25 UND');
  });

  it('agrega la marca al modelo cuando existe', () => {
    expect(productModelLabel({ id: 1, name: 'Premium', brand: { id: 2, name: 'Nacional' } })).toBe(
      'Premium · Nacional',
    );
    expect(productModelLabel({ id: 1, name: 'Premium', brand: null })).toBe('Premium');
  });
});

describe('pendingImages', () => {
  it('cuenta solo las presentaciones sin URL de imagen', () => {
    expect(pendingImages([presentation(), presentation({ id: 2, imageUrl: '/media/a.jpg' })])).toBe(
      1,
    );
    expect(
      pendingImages([
        presentation({ id: 3, imageUrl: '/media/a.jpg' }),
        presentation({ id: 4, imageUrl: 'https://cdn.local/b.jpg' }),
      ]),
    ).toBe(0);
  });

  it('devuelve cero cuando no hay presentaciones', () => {
    expect(pendingImages([])).toBe(0);
  });
});
