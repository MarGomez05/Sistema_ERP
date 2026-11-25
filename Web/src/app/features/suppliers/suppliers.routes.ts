import { Routes } from '@angular/router';

export const SUPPLIERS_ROUTES: Routes = [
  {
    path: '',
    title: 'Proveedores',
    loadComponent: () =>
      import('./suppliers.component').then((module) => module.SuppliersComponent),
  },
];
