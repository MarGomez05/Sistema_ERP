import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { environment } from '@env/environment';
import { AuthUser, LoginRequest, LoginResponse, RoleCode, StoredSession } from './auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly sessionState = signal<StoredSession | null>(this.readSession());

  readonly session = this.sessionState.asReadonly();
  readonly user = computed<AuthUser | null>(() => this.sessionState()?.user ?? null);
  readonly isAuthenticated = computed(() => {
    const session = this.sessionState();
    return session !== null && session.expiresAt > Date.now();
  });

  login(credentials: LoginRequest): Observable<AuthUser> {
    return this.http.post<LoginResponse>(`${environment.apiBaseUrl}/auth/login`, credentials).pipe(
      tap((response) => this.persist(response)),
      map((response) => response.user),
    );
  }

  // Valida la sesión guardada al iniciar la aplicación.
  restoreSession(): Promise<void> {
    const session = this.sessionState();

    if (session === null) {
      return Promise.resolve();
    }

    if (session.expiresAt <= Date.now()) {
      this.clear();
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.http
        .get<AuthUser>(`${environment.apiBaseUrl}/auth/me`)
        .pipe(
          catchError((error: HttpErrorResponse) => {
            if (error.status === 401 || error.status === 403) {
              this.clear();
            }
            return of(null);
          }),
        )
        .subscribe((user) => {
          if (user !== null) {
            this.save(session.token, user);
          }
          resolve();
        });
    });
  }

  logout(): void {
    this.clear();
    void this.router.navigate(['/login']);
  }

  canAccess(roles: readonly RoleCode[] | undefined): boolean {
    const role = this.user()?.role;

    if (role === undefined) {
      return false;
    }

    return roles === undefined || roles.length === 0 || roles.includes(role);
  }

  token(): string | null {
    return this.isAuthenticated() ? (this.sessionState()?.token ?? null) : null;
  }

  private persist(response: LoginResponse): void {
    this.save(response.accessToken, response.user, response.expiresIn);
  }

  private save(token: string, user: AuthUser, expiresInSeconds?: number): void {
    const current = this.sessionState();
    const expiresAt =
      expiresInSeconds !== undefined
        ? Date.now() + expiresInSeconds * 1000
        : (current?.expiresAt ?? Date.now() + 8 * 60 * 60 * 1000);

    const session: StoredSession = { token, user, expiresAt };

    this.sessionState.set(session);
    this.writeSession(session);
  }

  private clear(): void {
    this.sessionState.set(null);
    this.removeSession();
  }

  private readSession(): StoredSession | null {
    try {
      const raw = localStorage.getItem(environment.sessionStorageKey);

      if (raw === null) {
        return null;
      }

      const parsed = JSON.parse(raw) as Partial<StoredSession>;

      if (
        typeof parsed.token !== 'string' ||
        typeof parsed.expiresAt !== 'number' ||
        parsed.user === undefined
      ) {
        this.removeSession();
        return null;
      }

      return parsed as StoredSession;
    } catch {
      this.removeSession();
      return null;
    }
  }

  private writeSession(session: StoredSession): void {
    try {
      localStorage.setItem(environment.sessionStorageKey, JSON.stringify(session));
    } catch {
      // Si el almacenamiento no está disponible, la sesión queda solo en memoria.
    }
  }

  private removeSession(): void {
    try {
      localStorage.removeItem(environment.sessionStorageKey);
    } catch {
      // Sin almacenamiento disponible: nada que limpiar.
    }
  }
}

export function loginErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 401) {
    return 'Usuario o contraseña incorrectos. Verifica tus credenciales.';
  }

  if (error.status === 403) {
    return 'Tu rol no tiene permiso para ingresar al panel.';
  }

  if (error.status === 0) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión.';
  }

  const payload = error.error as { message?: string } | null;

  return payload?.message ?? 'No se pudo iniciar sesión. Intenta de nuevo.';
}
