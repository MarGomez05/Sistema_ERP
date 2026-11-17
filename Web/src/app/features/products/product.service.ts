import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { PageResponse } from '@core/models/api.model';
import { environment } from '@env/environment';
import {
  ProductDetail,
  ProductFormValue,
  ProductListItem,
  ProductModelOption,
  ProductPresentation,
  ProductPresentationFormValue,
  ProductPresentationOption,
  ProductQuery,
  ProductSelectOption,
  toPresentationCreatePayload,
  toPresentationUpdatePayload,
  toProductPayload,
} from './product.model';

interface NamedOptionResponse {
  id: number;
  name: string;
}

interface ModelOptionResponse extends NamedOptionResponse {
  brand?: NamedOptionResponse | null;
}

interface PresentationOptionResponse extends NamedOptionResponse {
  quantity: number;
  measureUnit: {
    id: number;
    name: string;
    code: string;
  };
}

// Acceso HTTP a productos y a las presentaciones de cada producto (contrato 5.1 y 5.2).
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);

  private readonly productsUrl = `${environment.apiBaseUrl}/products`;
  private readonly catalogUrl = `${environment.apiBaseUrl}`;

  list(query: ProductQuery): Observable<PageResponse<ProductListItem>> {
    let params = new HttpParams().set('page', query.page).set('size', query.size);

    const search = query.search.trim();

    if (search.length > 0) {
      params = params.set('search', search);
    }

    if (query.categoryId !== null) {
      params = params.set('categoryId', query.categoryId);
    }

    if (query.productTypeId !== null) {
      params = params.set('productTypeId', query.productTypeId);
    }

    if (query.isActive !== null) {
      params = params.set('isActive', query.isActive);
    }

    return this.http.get<PageResponse<ProductListItem>>(this.productsUrl, { params });
  }

  getById(id: number): Observable<ProductDetail> {
    return this.http.get<ProductDetail>(`${this.productsUrl}/${id}`);
  }

  create(value: ProductFormValue): Observable<ProductDetail> {
    return this.http.post<ProductDetail>(this.productsUrl, toProductPayload(value));
  }

  update(id: number, value: ProductFormValue): Observable<ProductDetail> {
    return this.http.put<ProductDetail>(`${this.productsUrl}/${id}`, toProductPayload(value));
  }

  changeStatus(id: number, isActive: boolean): Observable<void> {
    return this.http.patch<void>(`${this.productsUrl}/${id}/status`, { isActive });
  }

  getCategoryOptions(): Observable<ProductSelectOption[]> {
    return this.http
      .get<NamedOptionResponse[]>(`${this.catalogUrl}/categories/options`)
      .pipe(map((items) => items.map((item) => ({ id: item.id, name: item.name }))));
  }

  getTypeOptions(): Observable<ProductSelectOption[]> {
    return this.http
      .get<NamedOptionResponse[]>(`${this.catalogUrl}/product-types/options`)
      .pipe(map((items) => items.map((item) => ({ id: item.id, name: item.name }))));
  }

  getModelOptions(): Observable<ProductModelOption[]> {
    return this.http.get<ModelOptionResponse[]>(`${this.catalogUrl}/models/options`).pipe(
      map((items) =>
        items.map((item) => ({
          id: item.id,
          name: item.name,
          brand: item.brand ?? null,
        })),
      ),
    );
  }

  getPresentationOptions(): Observable<ProductPresentationOption[]> {
    return this.http
      .get<PresentationOptionResponse[]>(`${this.catalogUrl}/presentations/options`)
      .pipe(
        map((items) =>
          items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            measureUnit: item.measureUnit,
          })),
        ),
      );
  }

  getPresentations(productId: number): Observable<ProductPresentation[]> {
    return this.http.get<ProductPresentation[]>(`${this.productsUrl}/${productId}/presentations`);
  }

  createPresentation(
    productId: number,
    value: ProductPresentationFormValue,
  ): Observable<ProductPresentation> {
    return this.http.post<ProductPresentation>(
      `${this.productsUrl}/${productId}/presentations`,
      toPresentationCreatePayload(value),
    );
  }

  updatePresentation(
    productId: number,
    presentationId: number,
    value: ProductPresentationFormValue,
  ): Observable<ProductPresentation> {
    return this.http.put<ProductPresentation>(
      `${this.productsUrl}/${productId}/presentations/${presentationId}`,
      toPresentationUpdatePayload(value),
    );
  }

  changePresentationStatus(
    productId: number,
    presentationId: number,
    isActive: boolean,
  ): Observable<void> {
    return this.http.patch<void>(
      `${this.productsUrl}/${productId}/presentations/${presentationId}/status`,
      { isActive },
    );
  }
}
