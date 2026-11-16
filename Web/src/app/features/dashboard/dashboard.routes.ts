import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    title: 'Panel general',
    loadComponent: () =>
      import('./dashboard.component').then((module) => module.DashboardComponent),
  },
];
