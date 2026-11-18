import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { PageResponse } from '@core/models/api.model';
import { environment } from '@env/environment';
import {
  CreditFormValue,
  Customer,
  CustomerCredit,
  CustomerFormValue,
  CustomerOption,
  CustomerQuery,
  toCreditPayload,
  toCustomerPayload,
} from './customer.model';

// Acceso HTTP a clientes, estado y condiciones de crédito (contrato 10).
@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);

  private readonly customersUrl = `${environment.apiBaseUrl}/customers`;

  list(query: CustomerQuery): Observable<PageResponse<Customer>> {
    let params = new HttpParams().set('page', query.page).set('size', query.size);

    const search = query.search.trim();

    if (search.length > 0) {
      params = params.set('search', search);
    }

    if (query.documentType !== null) {
      params = params.set('documentType', query.documentType);
    }

    if (query.isActive !== null) {
      params = params.set('isActive', query.isActive);
    }

    return this.http.get<PageResponse<Customer>>(this.customersUrl, { params });
  }

  getById(id: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.customersUrl}/${id}`);
  }

  findOptions(): Observable<CustomerOption[]> {
    return this.http.get<CustomerOption[]>(`${this.customersUrl}/options`);
  }

  create(value: CustomerFormValue, credit: CustomerCredit): Observable<Customer> {
    return this.http.post<Customer>(this.customersUrl, toCustomerPayload(value, credit));
  }

  update(id: number, value: CustomerFormValue, credit: CustomerCredit): Observable<Customer> {
    return this.http.put<Customer>(`${this.customersUrl}/${id}`, toCustomerPayload(value, credit));
  }

  changeStatus(id: number, isActive: boolean): Observable<void> {
    return this.http.patch<void>(`${this.customersUrl}/${id}/status`, { isActive });
  }

  changeCredit(id: number, value: CreditFormValue): Observable<Customer> {
    return this.http.patch<Customer>(`${this.customersUrl}/${id}/credit`, toCreditPayload(value));
  }
}
