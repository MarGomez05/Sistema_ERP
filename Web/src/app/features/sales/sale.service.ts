import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { PageResponse } from '@core/models/api.model';
import { environment } from '@env/environment';
import { Sale, SaleFormValue, SaleQuery, SaleSummary, toSalePayload } from './sale.model';

// Acceso HTTP a ventas: listado, detalle, alta, edición, confirmación y cancelación (contrato 11).
@Injectable({ providedIn: 'root' })
export class SaleService {
  private readonly http = inject(HttpClient);

  private readonly salesUrl = `${environment.apiBaseUrl}/sales`;

  list(query: SaleQuery): Observable<PageResponse<SaleSummary>> {
    let params = new HttpParams().set('page', query.page).set('size', query.size);

    if (query.from.length > 0) {
      params = params.set('from', query.from);
    }

    if (query.to.length > 0) {
      params = params.set('to', query.to);
    }

    if (query.customerId !== null) {
      params = params.set('customerId', query.customerId);
    }

    if (query.status !== null) {
      params = params.set('status', query.status);
    }

    return this.http.get<PageResponse<SaleSummary>>(this.salesUrl, { params });
  }

  getById(id: number): Observable<Sale> {
    return this.http.get<Sale>(`${this.salesUrl}/${id}`);
  }

  create(value: SaleFormValue): Observable<Sale> {
    return this.http.post<Sale>(this.salesUrl, toSalePayload(value));
  }

  update(id: number, value: SaleFormValue): Observable<Sale> {
    return this.http.put<Sale>(`${this.salesUrl}/${id}`, toSalePayload(value));
  }

  confirm(id: number): Observable<Sale> {
    return this.http.post<Sale>(`${this.salesUrl}/${id}/confirm`, {});
  }

  cancel(id: number, reason: string): Observable<Sale> {
    return this.http.post<Sale>(`${this.salesUrl}/${id}/cancel`, {
      reason: reason.trim().length === 0 ? null : reason.trim(),
    });
  }
}
