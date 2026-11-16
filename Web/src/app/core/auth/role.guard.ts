import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { ToastService } from '@core/ui/toast.service';
import { AuthService } from './auth.service';
import { RoleCode } from './auth.model';

// Restringe una ruta a los roles indicados en `data.roles`.
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const roles = route.data['roles'] as readonly RoleCode[] | undefined;

  if (auth.canAccess(roles)) {
    return true;
  }

  toast.warning('Acceso restringido', 'No tienes permisos para ver esta sección.');

  return router.createUrlTree(['/dashboard']);
};
