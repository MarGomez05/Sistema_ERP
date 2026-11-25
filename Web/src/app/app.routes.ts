import { Routes } from '@angular/router';

import { authGuard } from '@core/auth/auth.guard';
import { guestGuard } from '@core/auth/auth.guard';
import { roleGuard } from '@core/auth/role.guard';
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
      {
        path: 'catalogs',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'WAREHOUSE', 'PURCHASING'] },
        loadChildren: () =>
          import('@features/catalogs/catalogs.routes').then((module) => module.CATALOGS_ROUTES),
      },
      {
        path: 'products',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'WAREHOUSE', 'PURCHASING'] },
        loadChildren: () =>
          import('@features/products/products.routes').then((module) => module.PRODUCTS_ROUTES),
      },
      {
        path: 'lots',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'WAREHOUSE', 'PURCHASING'] },
        loadChildren: () =>
          import('@features/lots/lots.routes').then((module) => module.LOTS_ROUTES),
      },
      {
        path: 'customers',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'PURCHASING', 'SELLER'] },
        loadChildren: () =>
          import('@features/customers/customers.routes').then((module) => module.CUSTOMERS_ROUTES),
      },
      {
        path: 'suppliers',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'PURCHASING'] },
        loadChildren: () =>
          import('@features/suppliers/suppliers.routes').then((module) => module.SUPPLIERS_ROUTES),
      },
      {
        path: 'sales',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'WAREHOUSE', 'PURCHASING', 'SELLER'] },
        loadChildren: () =>
          import('@features/sales/sales.routes').then((module) => module.SALES_ROUTES),
      },
      {
        path: 'invoices',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'PURCHASING', 'SELLER'] },
        loadChildren: () =>
          import('@features/billing/invoices.routes').then((module) => module.INVOICES_ROUTES),
      },
      {
        path: 'reports',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'WAREHOUSE', 'PURCHASING', 'SELLER'] },
        loadChildren: () =>
          import('@features/reports/reports.routes').then((module) => module.REPORTS_ROUTES),
      },
      {
        path: 'users',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        loadChildren: () =>
          import('@features/users/users.routes').then((module) => module.USERS_ROUTES),
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
