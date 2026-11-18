import { Routes } from '@angular/router';

export const LOTS_ROUTES: Routes = [
  {
    path: '',
    title: 'Lotes',
    loadComponent: () => import('./lots.component').then((module) => module.LotsComponent),
  },
];
