# TAMACHIHUA ERP · Cliente web Angular

Cliente web único del ERP TAMACHIHUA, construido con **Angular 22 standalone**. Consume la API REST de Spring Boot en `/api` y cubre, en esta primera entrega, la **base del frontend**: autenticación real, layout, navegación por rol y panel general con datos del backend.

> Estado: **Fase 7.1 completada** (16/11/2026), con el rediseño visual **7.1.1** (17/11/2026): login editorial asimétrico y gráficas SVG/CSS propias en el panel general. Los módulos de catálogos, clientes, ventas y facturación se incorporan en entregables posteriores.

---

## 1. Stack

| Área | Tecnología |
|---|---|
| Framework | Angular 22 (standalone components, zoneless) |
| Estado | Signals, `computed`, `input()` / `output()` |
| Formularios | Reactive Forms con validaciones |
| HTTP | `HttpClient` + interceptores funcionales |
| Router | Lazy loading por módulo, guards funcionales |
| Estilos | SCSS con tokens de diseño, sin framework CSS |
| Iconografía | SVG propio (`IconComponent`), sin dependencias externas |
| Pruebas | Vitest + `@angular/build:unit-test` |
| Build | `@angular/build:application` |

Requisitos de entorno: **Node.js 24+** y **npm 11+**. El backend debe estar disponible para el flujo completo.

---

## 2. Ejecución

```bash
cd Web
npm ci          # instala dependencias exactas del package-lock
npm start       # ng serve en http://localhost:4200
```

El desarrollo usa `Web/proxy.conf.json`, que redirige `/api` a `http://localhost:8080`:

```json
{
  "/api": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true
  }
}
```

Ventajas:

- No se hardcodean URLs del backend en el código.
- No se depende de CORS en desarrollo.
- En producción basta publicar `dist/tamachihua-web/browser` detrás del mismo dominio o un proxy inverso que enrute `/api` al backend.

### Variables y configuración

`src/environments/environment.ts` concentra los valores del cliente:

```ts
export const environment = {
  appName: 'TAMACHIHUA ERP',
  version: '0.1.0',
  apiBaseUrl: '/api',
  sessionStorageKey: 'tamachihua.session',
} as const;
```

### Comandos

```bash
npm start                     # servidor de desarrollo con proxy
npm run build                 # build de producción
npm test -- --watch=false     # pruebas unitarias
npx ng serve --port 4300      # puerto alternativo
```

---

## 3. Funcionalidad entregada (Fase 7.1)

### Autenticación

- Login real contra `POST /api/auth/login` con `username` (usuario o correo) y `password`.
- Composición editorial asimétrica: panel de marca con corte diagonal, tarjeta de acceso que invade el límite y mini panel ilustrativo (sin cifras ni datos simulados).
- Validaciones de formulario alineadas al backend: campos obligatorios, usuario ≤ 50 caracteres y sin espacios únicamente.
- Mostrar/ocultar contraseña, estado de carga y mensajes de error diferenciados para 401, 403 y fallo de conexión.
- Sesión persistida en `localStorage` con expiración tomada de `expiresIn`.
- Restauración de sesión al iniciar la app mediante `GET /api/auth/me`; si el token expiró o es inválido, se limpia la sesión.
- Cierre de sesión y redirección al login cuando la API responde 401.
- Redirección posterior al login validada: solo rutas internas (`/...`, sin `//`).

### Seguridad de rutas

- `authGuard`: exige sesión válida y conserva la ruta solicitada en `redirect`.
- `guestGuard`: impide volver al login con sesión activa.
- `roleGuard`: restringe rutas según `data.roles`; el backend sigue siendo la autoridad final.
- `authInterceptor`: agrega `Authorization: Bearer <token>` a las llamadas a la API, excepto al login.
- `errorInterceptor`: traduce 401, 403, 0 y 5xx en notificaciones claras y cierra la sesión cuando corresponde.
- No se envía `X-Client-Interface`: el login web funciona sin ese encabezado.

### Layout y navegación

- Sidebar con logotipo, secciones, iconos y estado activo.
- Sidebar contraíble en escritorio y deslizable con fondo oscuro en móvil; el estado se recuerda en `localStorage`.
- Header con breadcrumb, título de la sección, perfil del usuario y menú de cierre de sesión.
- Enlace «Saltar al contenido» para navegación por teclado.
- La navegación solo muestra módulos ya funcionales; no hay enlaces vacíos.

### Panel general

Consume los endpoints reales y adapta la vista a los permisos efectivos del backend:

| Endpoint | Roles permitidos |
|---|---|
| `GET /api/dashboard/summary` | `ADMIN`, `WAREHOUSE` |
| `GET /api/dashboard/low-stock` | `ADMIN`, `WAREHOUSE`, `PURCHASING` |
| `GET /api/dashboard/expiring-lots` | `ADMIN`, `WAREHOUSE` |

Contenido por perfil:

- **ADMIN / WAREHOUSE**: cinco KPI (productos activos, bajo stock, lotes activos, por vencer y vencidos); dona de estado de los lotes activos (sin alerta / por vencer / vencidos), columnas de vencimientos por rango (vencidos, 0–7, 8–15 y 16–30 días), tabla paginada de bajo stock con barras de stock actual frente al mínimo de la página visible y tabla de lotes vencidos o por vencer con severidad.
- **PURCHASING**: alerta de bajo stock, gráfica de barras de la página visible y tabla paginada, orientada a reposición.
- **SELLER**: estado de bienvenida con sus datos de cuenta; los módulos de venta se habilitarán en el siguiente entregable.

Las gráficas son SVG/CSS propios, sin Chart.js, ApexCharts ni otra dependencia. Solo representan los datos devueltos por `summary`, `low-stock` y `expiring-lots`; no se inventan tendencias ni comparaciones entre unidades distintas.

Estados cubiertos: carga con skeletons, error con reintento por sección, listas vacías con mensaje explicativo y actualización manual de datos.

### Página 404

Ruta comodín con identidad de marca y accesos al panel o al login según el estado de sesión.

---

## 4. Identidad visual

La paleta se extrajo del logotipo en `Documentacion/Logo` y se centraliza en `src/styles/tokens.scss`.

| Token | Valor | Uso |
|---|---|---|
| `--brand-500` | `#0873C4` | Acciones principales y estado activo |
| `--brand-700` | `#004B87` | Texto de marca y degradados |
| `--accent-500` | `#00A8FF` | Acentos y detalles |
| `--text` | `#0B2739` | Texto principal |
| `--text-muted` | `#5B6B7A` | Texto secundario |
| `--canvas` | `#F4F7FB` | Fondo general |
| `--surface` | `#FFFFFF` | Tarjetas y paneles |
| `--border` | `#E2E9F1` | Bordes |

Criterios aplicados:

- Superficies claras, bordes suaves y sombras discretas.
- Login editorial: panel de marca en degradado azul con corte diagonal, tarjeta de acceso que invade el límite y mini panel ilustrativo.
- Colores pastel solo para fondos de estado (éxito, advertencia, peligro, información).
- Tipografía **Inter** con fallback del sistema.
- Animaciones sutiles (aparición, hover, transiciones) y respeto de `prefers-reduced-motion`.
- Gráficas SVG/CSS propias con etiquetas accesibles y colores de estado; sin librerías de visualización.
- Diseño responsive para escritorio, laptop, tablet y móvil.
- Iconografía SVG de línea propia; sin emojis.
- Textos de interfaz en español.

---

## 5. Estructura

```text
Web/
├── public/
│   ├── brand/                 # Logo horizontal, versión blanca e isotipo
│   └── favicon-*.png
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── auth/          # modelo, servicio, guards e interceptor
│   │   │   ├── http/          # interceptor de errores
│   │   │   ├── models/        # ApiErrorResponse, PageResponse
│   │   │   └── ui/            # ToastService
│   │   ├── layout/
│   │   │   ├── header/
│   │   │   ├── sidebar/
│   │   │   ├── shell/
│   │   │   └── nav.config.ts
│   │   ├── shared/ui/         # icon, button, badge, skeleton, empty-state,
│   │   │                      # page-header, stat-card, pagination, toast-container
│   │   │                      # y charts/ (donut, column, bar)
│   │   ├── features/
│   │   │   ├── auth/login/
│   │   │   ├── dashboard/
│   │   │   └── errors/
│   │   ├── app.config.ts
│   │   ├── app.routes.ts
│   │   └── app.ts
│   ├── environments/
│   ├── styles/                # tokens, base, components, utilities
│   ├── index.html
│   └── main.ts
├── angular.json
├── proxy.conf.json
├── tsconfig.json
└── package.json
```

Alias de importación disponibles: `@core/*`, `@shared/*`, `@layout/*`, `@features/*` y `@env/*`.

---

## 6. Rutas

| Ruta | Acceso | Descripción |
|---|---|---|
| `/login` | Solo invitados | Inicio de sesión |
| `/dashboard` | Autenticados | Panel adaptado por rol |
| `/` | Autenticados | Redirige a `/dashboard` |
| `**` | Público | Página no encontrada |

La ruta del shell está protegida con `authGuard`; los módulos se cargan con `loadComponent` / `loadChildren`.

---

## 7. Componentes reutilizables

- `IconComponent`: catálogo SVG propio, tamaño, grosor y etiqueta accesible.
- `ButtonComponent` (`button[appButton]`, `a[appButton]`): variantes primaria, secundaria, fantasma y peligro; tamaños, bloque y estado de carga.
- `BadgeComponent`: tonos neutral, marca, éxito, advertencia, peligro e información; punto opcional.
- `StatCardComponent`: KPI con icono, tono, pista y skeleton.
- `SkeletonComponent`: placeholders de carga.
- `EmptyStateComponent`: icono, título, descripción y contenido proyectado.
- `PageHeaderComponent`: título, subtítulo y acciones.
- `PaginationComponent`: rango visible, página actual y navegación anterior/siguiente.
- `ToastContainerComponent`: notificaciones no bloqueantes con cierre y temporizador.
- `DonutChartComponent`, `ColumnChartComponent` y `BarChartComponent`: gráficas SVG/CSS accesibles con etiqueta ARIA y leyenda; sin datos simulados ni dependencias externas.

---

## 8. Convenciones del cliente

- Componentes standalone con `ChangeDetectionStrategy.OnPush`.
- Estado con signals; `computed` para derivados; `effect` solo si es imprescindible.
- Sin `any` explícito ni tipos implícitos; `strictTemplates` activo.
- Formularios reactivos con validaciones espejo del backend.
- Servicios con `HttpClient` tipado y URLs construidas desde `environment.apiBaseUrl`.
- DTOs del backend reflejados como interfaces en `features/*/*.model.ts`.
- Lógica de negocio y acceso HTTP fuera de las plantillas.
- UI en español; código, nombres de archivos y símbolos en inglés.
- No se modifican contratos ni reglas del backend desde el cliente.

---

## 9. Pruebas

```bash
npm test -- --watch=false
```

La suite incluye:

- `auth.service.spec.ts`: mapeo de errores de login (401, 403, fallo de conexión, mensaje del backend y error genérico) y comportamiento del servicio de autenticación.
- `dashboard.charts.spec.ts`: reparto de la dona de lotes, rangos de vencimiento, cálculo del faltante y casos límite con datos inconsistentes o vacíos.

El build de producción también valida plantillas estrictas y presupuestos de tamaño.

```bash
npm run build
```

Salida: `dist/tamachihua-web/browser`.

---

## 10. Roadmap del frontend

| Entregable | Alcance |
|---|---|
| **7.1 Base del frontend** | Proyecto, diseño, login, shell, guards, dashboard, 404 y documentación — **completado**; rediseño visual 7.1.1 con login asimétrico y gráficas propias — **completado** |
| 7.2 Catálogos e inventario | Catálogos, productos, presentaciones, precios y lotes |
| 7.3 Clientes | Listado, filtros, detalle, creación, edición, estado y crédito |
| 7.4 Ventas | Listado, nueva venta, detalle, confirmación y cancelación |
| 7.5 Facturación | Emisión, detalle, pagos y notas de crédito |
| 7.6 Reportes | Consultas y exportaciones definidas en la Fase 8 del plan |

Cada entregable debe actualizar este README, `MEMORY.md` e `Implementacion.md`.

---

## 11. Limitaciones conocidas

- Solo el panel general está implementado; los demás módulos se agregan por entregable.
- No hay entorno de producción ni pipeline de despliegue del frontend todavía.
- En producción se requiere un proxy inverso que enrute `/api` al backend y sirva el `index.html` para las rutas del router.
- No hay pruebas E2E de navegador; la verificación actual es build, pruebas unitarias y arranque con proxy.
- Las imágenes de producto se muestran por URL según el contrato del backend; no hay subida de archivos.

---

## 12. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `502` en `/api` desde el dev server | Backend apagado o en otro puerto | Inicia el backend en `8080` o ajusta `proxy.conf.json` |
| Redirección constante al login | Token expirado o `JWT_SECRET` cambiado | Inicia sesión de nuevo; la sesión inválida se limpia sola |
| El panel no muestra indicadores | Rol sin permiso (`SELLER`) | Es el comportamiento esperado; el backend restringe esos endpoints |
| Error de compilación por alias | `tsconfig.json` modificado | Conserva los `paths` de `@core`, `@shared`, `@layout`, `@features` y `@env` |
| Puerto 4200 ocupado | Otro `ng serve` activo | Usa `npx ng serve --port 4300` |
