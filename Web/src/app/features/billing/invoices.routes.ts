import { Routes } from '@angular/router';

export const INVOICES_ROUTES: Routes = [
  {
    path: '',
    title: 'Facturación',
    loadComponent: () => import('./invoices.component').then((module) => module.InvoicesComponent),
  },
  {
    path: ':id',
    title: 'Detalle de la factura',
    loadComponent: () =>
      import('./invoice-detail/invoice-detail.component').then(
        (module) => module.InvoiceDetailComponent,
      ),
  },
];
