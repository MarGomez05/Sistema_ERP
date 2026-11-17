import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { PageResponse } from '@core/models/api.model';
import { environment } from '@env/environment';
import {
  CatalogConfig,
  CatalogFormValue,
  CatalogKey,
  CatalogOption,
  CatalogPayload,
  CatalogQuery,
  CatalogRecord,
  toPayload,
} from './catalog.model';

interface CatalogOptionResponse {
  id: number;
  name: string;
  code?: string;
}

// Acceso HTTP a los seis catálogos de inventario (contrato 4).
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = `${environment.apiBaseUrl}`;

  list(config: CatalogConfig, query: CatalogQuery): Observable<PageResponse<CatalogRecord>> {
    let params = new HttpParams().set('page', query.page).set('size', query.size);

    const search = query.search.trim();

    if (search.length > 0) {
      params = params.set('search', search);
    }

    if (query.isActive !== null) {
      params = params.set('isActive', query.isActive);
    }

    if (config.filter !== undefined && query.relationId !== null) {
      params = params.set(config.filter.param, query.relationId);
    }

    return this.http.get<PageResponse<CatalogRecord>>(`${this.baseUrl}/${config.endpoint}`, {
      params,
    });
  }

  options(key: CatalogKey): Observable<CatalogOption[]> {
    return this.http
      .get<CatalogOptionResponse[]>(`${this.baseUrl}/${key}/options`)
      .pipe(map((items) => items.map((item) => this.toOption(item))));
  }

  create(config: CatalogConfig, value: CatalogFormValue): Observable<CatalogRecord> {
    return this.http.post<CatalogRecord>(
      `${this.baseUrl}/${config.endpoint}`,
      toPayload(config.key, value),
    );
  }

  update(config: CatalogConfig, id: number, value: CatalogFormValue): Observable<CatalogRecord> {
    return this.http.put<CatalogRecord>(
      `${this.baseUrl}/${config.endpoint}/${id}`,
      toPayload(config.key, value),
    );
  }

  changeStatus(config: CatalogConfig, id: number, isActive: boolean): Observable<void> {
    const body: CatalogPayload = { isActive };

    return this.http.patch<void>(`${this.baseUrl}/${config.endpoint}/${id}/status`, body);
  }

  private toOption(item: CatalogOptionResponse): CatalogOption {
    return item.code === undefined
      ? { id: item.id, name: item.name }
      : { id: item.id, name: item.name, code: item.code };
  }
}
