import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { AuthService } from './auth.service';

// Exige sesión válida y recuerda la ruta solicitada.
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  const redirect = state.url !== '/' ? state.url : undefined;

  return router.createUrlTree(['/login'], {
    queryParams: redirect !== undefined ? { redirect } : undefined,
  });
};

// Evita que un usuario autenticado vuelva a ver el login.
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};
