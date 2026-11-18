import { Routes } from '@angular/router';

import { roleGuard } from '@core/auth/role.guard';

export const SALES_ROUTES: Routes = [
  {
    path: '',
    title: 'Ventas',
    loadComponent: () => import('./sales.component').then((module) => module.SalesComponent),
  },
  {
    path: 'new',
    title: 'Nueva venta',
    canActivate: [roleGuard],
    data: { roles: ['ADMIN', 'SELLER'] },
    loadComponent: () =>
      import('./sale-editor/sale-editor.component').then((module) => module.SaleEditorComponent),
  },
  {
    path: ':id/edit',
    title: 'Editar venta',
    canActivate: [roleGuard],
    data: { roles: ['ADMIN', 'SELLER'] },
    loadComponent: () =>
      import('./sale-editor/sale-editor.component').then((module) => module.SaleEditorComponent),
  },
  {
    path: ':id',
    title: 'Detalle de la venta',
    loadComponent: () =>
      import('./sale-detail/sale-detail.component').then((module) => module.SaleDetailComponent),
  },
];
