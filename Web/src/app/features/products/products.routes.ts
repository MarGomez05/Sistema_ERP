import { Routes } from '@angular/router';

export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    title: 'Productos',
    loadComponent: () => import('./products.component').then((module) => module.ProductsComponent),
  },
  {
    path: ':id',
    title: 'Detalle del producto',
    loadComponent: () =>
      import('./product-detail/product-detail.component').then(
        (module) => module.ProductDetailComponent,
      ),
  },
];
