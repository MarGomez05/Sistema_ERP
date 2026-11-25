import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { PageResponse } from '@core/models/api.model';
import { environment } from '@env/environment';
import {
  Supplier,
  SupplierFormValue,
  SupplierOption,
  SupplierQuery,
  toSupplierPayload,
} from './supplier.model';

// Acceso HTTP a proveedores, su estado y sus opciones para combos (contrato 6).
@Injectable({ providedIn: 'root' })
export class SupplierService {
  private readonly http = inject(HttpClient);

  private readonly suppliersUrl = `${environment.apiBaseUrl}/suppliers`;

  list(query: SupplierQuery): Observable<PageResponse<Supplier>> {
    let params = new HttpParams().set('page', query.page).set('size', query.size);

    const search = query.search.trim();

    if (search.length > 0) {
      params = params.set('search', search);
    }

    if (query.isActive !== null) {
      params = params.set('isActive', query.isActive);
    }

    return this.http.get<PageResponse<Supplier>>(this.suppliersUrl, { params });
  }

  getById(id: number): Observable<Supplier> {
    return this.http.get<Supplier>(`${this.suppliersUrl}/${id}`);
  }

  findOptions(): Observable<SupplierOption[]> {
    return this.http.get<SupplierOption[]>(`${this.suppliersUrl}/options`);
  }

  create(value: SupplierFormValue): Observable<Supplier> {
    return this.http.post<Supplier>(this.suppliersUrl, toSupplierPayload(value));
  }

  update(id: number, value: SupplierFormValue): Observable<Supplier> {
    return this.http.put<Supplier>(`${this.suppliersUrl}/${id}`, toSupplierPayload(value));
  }

  changeStatus(id: number, isActive: boolean): Observable<void> {
    return this.http.patch<void>(`${this.suppliersUrl}/${id}/status`, { isActive });
  }
}
