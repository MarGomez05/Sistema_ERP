import { RoleCode } from '@core/auth/auth.model';
import { IconName } from '@shared/ui/icon/icon.component';

export interface NavItem {
  label: string;
  icon: IconName;
  route: string;
  roles?: readonly RoleCode[];
}

export interface NavSection {
  label: string;
  items: readonly NavItem[];
}

// Se amplía un módulo por entregable; no se muestran secciones sin funcionalidad.
export const NAV_SECTIONS: readonly NavSection[] = [
  {
    label: 'General',
    items: [
      {
        label: 'Panel general',
        icon: 'dashboard',
        route: '/dashboard',
      },
    ],
  },
  {
    label: 'Inventario',
    items: [
      {
        label: 'Catálogos',
        icon: 'tag',
        route: '/catalogs',
        roles: ['ADMIN', 'WAREHOUSE', 'PURCHASING'],
      },
      {
        label: 'Productos',
        icon: 'package',
        route: '/products',
        roles: ['ADMIN', 'WAREHOUSE', 'PURCHASING'],
      },
      {
        label: 'Lotes',
        icon: 'layers',
        route: '/lots',
        roles: ['ADMIN', 'WAREHOUSE', 'PURCHASING'],
      },
    ],
  },
  {
    label: 'Comercial',
    items: [
      {
        label: 'Clientes',
        icon: 'users',
        route: '/customers',
        roles: ['ADMIN', 'PURCHASING', 'SELLER'],
      },
      {
        label: 'Ventas',
        icon: 'cart',
        route: '/sales',
        roles: ['ADMIN', 'WAREHOUSE', 'PURCHASING', 'SELLER'],
      },
      {
        label: 'Facturación',
        icon: 'receipt',
        route: '/invoices',
        roles: ['ADMIN', 'PURCHASING', 'SELLER'],
      },
      {
        label: 'Reportes',
        icon: 'trendingUp',
        route: '/reports',
        roles: ['ADMIN', 'WAREHOUSE', 'PURCHASING', 'SELLER'],
      },
    ],
  },
];
