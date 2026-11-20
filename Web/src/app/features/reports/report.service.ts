import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  ReceivablesReport,
  ReportGroupBy,
  SalesReport,
  StockExportFormat,
  StockReport,
  TopProductsReport,
} from './report.model';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = `${environment.apiBaseUrl}/reports`;

  getSales(from: string, to: string, groupBy: ReportGroupBy): Observable<SalesReport> {
    const params = new HttpParams().set('from', from).set('to', to).set('groupBy', groupBy);

    return this.http.get<SalesReport>(`${this.baseUrl}/sales`, { params });
  }

  getReceivables(asOf: string): Observable<ReceivablesReport> {
    const params = new HttpParams().set('asOf', asOf);

    return this.http.get<ReceivablesReport>(`${this.baseUrl}/receivables`, { params });
  }

  getTopProducts(from: string, to: string, limit: number): Observable<TopProductsReport> {
    const params = new HttpParams().set('from', from).set('to', to).set('limit', limit);

    return this.http.get<TopProductsReport>(`${this.baseUrl}/top-products`, { params });
  }

  getStock(categoryId: number | null): Observable<StockReport> {
    let params = new HttpParams();

    if (categoryId !== null) {
      params = params.set('categoryId', categoryId);
    }

    return this.http.get<StockReport>(`${this.baseUrl}/stock`, { params });
  }

  downloadStockExport(format: StockExportFormat, categoryId: number | null): Observable<Blob> {
    let params = new HttpParams().set('format', format);

    if (categoryId !== null) {
      params = params.set('categoryId', categoryId);
    }

    return this.http.get(`${this.baseUrl}/stock/export`, {
      params,
      responseType: 'blob',
    });
  }
}
