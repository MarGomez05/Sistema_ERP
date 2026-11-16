import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { PageResponse } from '@core/models/api.model';
import { environment } from '@env/environment';
import { DashboardSummary, ExpiringLotItem, LowStockItem } from './dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = `${environment.apiBaseUrl}/dashboard`;

  getSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.baseUrl}/summary`);
  }

  getLowStock(page: number, size: number): Observable<PageResponse<LowStockItem>> {
    const params = new HttpParams().set('page', page).set('size', size);

    return this.http.get<PageResponse<LowStockItem>>(`${this.baseUrl}/low-stock`, { params });
  }

  getExpiringLots(): Observable<ExpiringLotItem[]> {
    return this.http.get<ExpiringLotItem[]>(`${this.baseUrl}/expiring-lots`);
  }
}
