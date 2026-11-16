// Configuración del cliente web. La API se consume por ruta relativa:
// en desarrollo el proxy de Angular la redirige al backend local.
export const environment = {
  appName: 'TAMACHIHUA ERP',
  version: '0.1.0',
  apiBaseUrl: '/api',
  sessionStorageKey: 'tamachihua.session',
} as const;
