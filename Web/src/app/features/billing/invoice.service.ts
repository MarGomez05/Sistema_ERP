import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { PageResponse } from '@core/models/api.model';
import { environment } from '@env/environment';
import { PaymentCondition } from '@features/sales/sale.model';
import {
  CreditNoteFormValue,
  Invoice,
  InvoiceCreateValue,
  InvoicePayment,
  InvoiceQuery,
  InvoiceSummary,
  PaymentFormValue,
  toCreditNotePayload,
  toInvoicePayload,
  toPaymentPayload,
} from './invoice.model';

// Acceso HTTP a facturas, pagos y notas de crédito (contrato 12).
@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly http = inject(HttpClient);

  private readonly invoicesUrl = `${environment.apiBaseUrl}/invoices`;

  list(query: InvoiceQuery): Observable<PageResponse<InvoiceSummary>> {
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

    if (query.invoiceType !== null) {
      params = params.set('invoiceType', query.invoiceType);
    }

    if (query.status !== null) {
      params = params.set('status', query.status);
    }

    return this.http.get<PageResponse<InvoiceSummary>>(this.invoicesUrl, { params });
  }

  getById(id: number): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.invoicesUrl}/${id}`);
  }

  create(
    saleId: number,
    value: InvoiceCreateValue,
    paymentCondition: PaymentCondition,
  ): Observable<Invoice> {
    return this.http.post<Invoice>(
      this.invoicesUrl,
      toInvoicePayload(saleId, value, paymentCondition),
    );
  }

  addPayment(id: number, value: PaymentFormValue): Observable<InvoicePayment> {
    return this.http.post<InvoicePayment>(
      `${this.invoicesUrl}/${id}/payments`,
      toPaymentPayload(value),
    );
  }

  findPayments(id: number): Observable<InvoicePayment[]> {
    return this.http.get<InvoicePayment[]>(`${this.invoicesUrl}/${id}/payments`);
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.invoicesUrl}/${id}/pdf`, { responseType: 'blob' });
  }

  issueCreditNote(id: number, value: CreditNoteFormValue): Observable<Invoice> {
    return this.http.post<Invoice>(
      `${this.invoicesUrl}/${id}/credit-note`,
      toCreditNotePayload(value),
    );
  }
}
