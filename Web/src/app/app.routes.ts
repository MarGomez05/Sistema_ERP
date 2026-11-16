import { Routes } from '@angular/router';

import { authGuard } from '@core/auth/auth.guard';
import { guestGuard } from '@core/auth/auth.guard';
import { ShellComponent } from '@layout/shell/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión · TAMACHIHUA ERP',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('@features/auth/login/login.component').then((module) => module.LoginComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        title: 'Panel general',
        loadChildren: () =>
          import('@features/dashboard/dashboard.routes').then((module) => module.DASHBOARD_ROUTES),
      },
    ],
  },
  {
    path: '**',
    title: 'Página no encontrada · TAMACHIHUA ERP',
    loadComponent: () =>
      import('@features/errors/not-found.component').then((module) => module.NotFoundComponent),
  },
];
