import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '@env/environment';
import { AuthService } from './auth.service';

// Adjunta el token a las llamadas a la API. El login queda fuera.
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthService).token();

  const isApiRequest = request.url.startsWith(environment.apiBaseUrl);
  const isLogin = request.url.endsWith('/auth/login');

  if (token === null || !isApiRequest || isLogin) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
