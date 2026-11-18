import { Routes } from '@angular/router';

export const CUSTOMERS_ROUTES: Routes = [
  {
    path: '',
    title: 'Clientes',
    loadComponent: () =>
      import('./customers.component').then((module) => module.CustomersComponent),
  },
  {
    path: ':id',
    title: 'Detalle del cliente',
    loadComponent: () =>
      import('./customer-detail/customer-detail.component').then(
        (module) => module.CustomerDetailComponent,
      ),
  },
];
