import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { ToastService } from '@core/ui/toast.service';
import { AuthService } from '@core/auth/auth.service';

// Traduce errores HTTP en mensajes comprensibles y cierra la sesión si expiró.
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const injector = inject(Injector);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const isLogin = request.url.endsWith('/auth/login');

      if (isLogin) {
        return throwError(() => error);
      }

      const toast = injector.get(ToastService);
      const auth = injector.get(AuthService);

      if (error.status === 401) {
        toast.warning('Sesión expirada', 'Inicia sesión nuevamente.');
        auth.logout();
      } else if (error.status === 403) {
        toast.error('Acceso restringido', 'Tu rol no tiene permiso para esta operación.');
      } else if (error.status === 0) {
        toast.error('Sin conexión', 'No se pudo contactar al servidor. Revisa tu red.');
      } else if (error.status >= 500) {
        toast.error('Error del servidor', 'Ocurrió un problema inesperado. Intenta de nuevo.');
      }

      return throwError(() => error);
    }),
  );
};
