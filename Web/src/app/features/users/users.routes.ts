import { Routes } from '@angular/router';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    title: 'Usuarios y roles',
    loadComponent: () => import('./users.component').then((module) => module.UsersComponent),
  },
];
