import { Routes } from '@angular/router';

export const CATALOGS_ROUTES: Routes = [
  {
    path: '',
    title: 'Catálogos',
    loadComponent: () => import('./catalogs.component').then((module) => module.CatalogsComponent),
  },
];
