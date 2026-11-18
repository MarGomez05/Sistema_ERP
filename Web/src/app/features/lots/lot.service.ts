import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { PageResponse } from '@core/models/api.model';
import { environment } from '@env/environment';
import {
  LastCostItem,
  LotFormValue,
  LotQuery,
  ProductLot,
  SupplierOption,
  toLotPayload,
} from './lot.model';

// Acceso HTTP a lotes, último costo y proveedores para el alta (contrato 7).
@Injectable({ providedIn: 'root' })
export class LotService {
  private readonly http = inject(HttpClient);

  private readonly lotsUrl = `${environment.apiBaseUrl}/lots`;

  list(query: LotQuery): Observable<PageResponse<ProductLot>> {
    let params = new HttpParams().set('page', query.page).set('size', query.size);

    if (query.productId !== null) {
      params = params.set('productId', query.productId);
    }

    if (query.supplierId !== null) {
      params = params.set('supplierId', query.supplierId);
    }

    const invoiceNumber = query.invoiceNumber.trim();

    if (invoiceNumber.length > 0) {
      params = params.set('invoiceNumber', invoiceNumber);
    }

    if (query.onlyAvailable) {
      params = params.set('onlyAvailable', true);
    }

    return this.http.get<PageResponse<ProductLot>>(this.lotsUrl, { params });
  }

  getById(id: number): Observable<ProductLot> {
    return this.http.get<ProductLot>(`${this.lotsUrl}/${id}`);
  }

  create(value: LotFormValue): Observable<ProductLot> {
    return this.http.post<ProductLot>(this.lotsUrl, toLotPayload(value));
  }

  updateAvailableQuantity(id: number, availableQuantity: number): Observable<void> {
    return this.http.patch<void>(`${this.lotsUrl}/${id}/available-quantity`, { availableQuantity });
  }

  getLastCosts(productId: number): Observable<LastCostItem[]> {
    return this.http.get<LastCostItem[]>(
      `${environment.apiBaseUrl}/products/${productId}/last-cost`,
    );
  }

  getSupplierOptions(): Observable<SupplierOption[]> {
    return this.http.get<SupplierOption[]>(`${environment.apiBaseUrl}/suppliers/options`);
  }
}
