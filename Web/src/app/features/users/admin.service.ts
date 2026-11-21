import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { PageResponse } from '@core/models/api.model';
import { environment } from '@env/environment';
import {
  Role,
  RoleFormValue,
  RoleOption,
  UserFormValue,
  UserQuery,
  UserRecord,
  toCreateRolePayload,
  toCreateUserPayload,
  toUpdateRolePayload,
  toUpdateUserPayload,
} from './admin.model';

// Acceso HTTP a usuarios y roles del panel (solo ADMIN).
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  private readonly usersUrl = `${environment.apiBaseUrl}/users`;
  private readonly rolesUrl = `${environment.apiBaseUrl}/roles`;

  listUsers(query: UserQuery): Observable<PageResponse<UserRecord>> {
    let params = new HttpParams().set('page', query.page).set('size', query.size);

    const search = query.search.trim();

    if (search.length > 0) {
      params = params.set('search', search);
    }

    if (query.roleId !== null) {
      params = params.set('roleId', query.roleId);
    }

    if (query.isActive !== null) {
      params = params.set('isActive', query.isActive);
    }

    return this.http.get<PageResponse<UserRecord>>(this.usersUrl, { params });
  }

  createUser(value: UserFormValue): Observable<UserRecord> {
    return this.http.post<UserRecord>(this.usersUrl, toCreateUserPayload(value));
  }

  updateUser(id: number, value: UserFormValue): Observable<UserRecord> {
    return this.http.put<UserRecord>(`${this.usersUrl}/${id}`, toUpdateUserPayload(value));
  }

  changeUserStatus(id: number, isActive: boolean): Observable<void> {
    return this.http.patch<void>(`${this.usersUrl}/${id}/status`, { isActive });
  }

  listRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(this.rolesUrl);
  }

  roleOptions(): Observable<RoleOption[]> {
    return this.http.get<RoleOption[]>(`${this.rolesUrl}/options`);
  }

  createRole(value: RoleFormValue): Observable<Role> {
    return this.http.post<Role>(this.rolesUrl, toCreateRolePayload(value));
  }

  updateRole(id: number, value: RoleFormValue): Observable<Role> {
    return this.http.put<Role>(`${this.rolesUrl}/${id}`, toUpdateRolePayload(value));
  }

  changeRoleStatus(id: number, isActive: boolean): Observable<void> {
    return this.http.patch<void>(`${this.rolesUrl}/${id}/status`, { isActive });
  }
}
