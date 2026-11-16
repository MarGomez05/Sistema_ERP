import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { authInterceptor } from './auth.interceptor';
import { AuthService, loginErrorMessage } from './auth.service';
import { LoginResponse } from './auth.model';

const LOGIN_RESPONSE: LoginResponse = {
  accessToken: 'token-123',
  tokenType: 'Bearer',
  expiresIn: 3600,
  user: {
    id: 1,
    username: 'admin',
    fullName: 'Ana Admin',
    role: 'ADMIN',
  },
};

describe('AuthService', () => {
  let http: HttpTestingController;

  function createService(): AuthService {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpTestingController);

    return TestBed.inject(AuthService);
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('inicia sesión y persiste el token y el usuario', () => {
    const service = createService();

    service.login({ username: 'admin', password: 'secreto' }).subscribe();

    const request = http.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      username: 'admin',
      password: 'secreto',
    });

    request.flush(LOGIN_RESPONSE);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.user()?.fullName).toBe('Ana Admin');
    expect(service.token()).toBe('token-123');
    expect(localStorage.getItem('tamachihua.session')).toContain('token-123');
  });

  it('adjunta el token a las llamadas autenticadas', () => {
    const service = createService();
    const httpClient = TestBed.inject(HttpClient);

    service.login({ username: 'admin', password: 'secreto' }).subscribe();
    http.expectOne('/api/auth/login').flush(LOGIN_RESPONSE);

    httpClient.get('/api/dashboard/summary').subscribe();

    const request = http.expectOne('/api/dashboard/summary');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-123');
    request.flush({});
  });

  it('no adjunta token cuando no hay sesión', () => {
    createService();

    TestBed.inject(HttpClient).get('/api/dashboard/summary').subscribe();

    const request = http.expectOne('/api/dashboard/summary');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('descarta una sesión expirada al restaurar', async () => {
    localStorage.setItem(
      'tamachihua.session',
      JSON.stringify({
        token: 'viejo',
        expiresAt: Date.now() - 1000,
        user: LOGIN_RESPONSE.user,
      }),
    );

    const service = createService();

    await service.restoreSession();

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('tamachihua.session')).toBeNull();
  });
});

describe('loginErrorMessage', () => {
  it('explica credenciales inválidas con un 401', () => {
    const message = loginErrorMessage(new HttpErrorResponse({ status: 401 }));

    expect(message).toContain('Usuario o contraseña incorrectos');
  });

  it('explica la restricción de rol con un 403', () => {
    const message = loginErrorMessage(new HttpErrorResponse({ status: 403 }));

    expect(message).toContain('no tiene permiso');
  });

  it('indica la falta de conexión con el servidor', () => {
    const message = loginErrorMessage(new HttpErrorResponse({ status: 0 }));

    expect(message).toContain('No se pudo conectar');
  });

  it('usa el mensaje del backend cuando está disponible', () => {
    const message = loginErrorMessage(
      new HttpErrorResponse({
        status: 400,
        error: { message: 'El usuario es obligatorio' },
      }),
    );

    expect(message).toBe('El usuario es obligatorio');
  });

  it('entrega un mensaje genérico ante errores sin detalle', () => {
    const message = loginErrorMessage(new HttpErrorResponse({ status: 500 }));

    expect(message).toContain('No se pudo iniciar sesión');
  });
});
