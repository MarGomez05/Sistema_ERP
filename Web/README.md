# TAMACHIHUA ERP · Cliente web Angular

Cliente web único del ERP TAMACHIHUA, construido con **Angular 22 standalone**. Consume la API REST de Spring Boot en `/api` y cubre autenticación, layout, navegación por rol, panel general, catálogos e inventario, clientes y ventas con confirmación FEFO y cancelación.

> Estado: **Fase 7.1 completada** (16/11/2026), con el rediseño visual **7.1.1** (17/11/2026), y **7.2 completado** (17/11/2026) con los módulos de **catálogos de inventario**, **productos, presentaciones y precios** y **lotes**; **7.3 completado** (17/11/2026) con **clientes**; **7.4 completado** (17/11/2026) con **ventas**. Facturación y reportes se incorporan en los siguientes entregables.

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

## 3. Funcionalidad entregada

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

### Catálogos de inventario (7.2 completado)

- Página única `/catalogs` con pestañas accesibles para categorías, tipos de producto, marcas, modelos, unidades de medida y presentaciones.
- Listado paginado con búsqueda, filtro por estado y filtro por marca o unidad de medida según el catálogo.
- Formulario lateral reutilizable con validaciones espejo del backend; los modelos y presentaciones cargan sus combos desde `/options`.
- Baja lógica con `PATCH /{id}/status`, confirmación en línea y mensaje del backend cuando el catálogo tiene hijos activos.
- Lectura para `ADMIN`, `WAREHOUSE` y `PURCHASING`; escritura solo `ADMIN`.
- Configuración declarativa en `catalog.model.ts` (`CATALOGS`, `toPayload`, `columnValue`) para no duplicar los seis listados.

### Productos y presentaciones (7.2 completado)

- Listado `/products` con búsqueda por nombre o código, filtros por categoría, tipo y estado, paginación y existencias por presentación en chips con color según `stockStatus`.
- Alta y edición de producto en panel lateral: código, nombre, descripción, categoría, tipo, modelo opcional y bandera de vencimiento. El formulario conserva las opciones actuales aunque estén inactivas para no perder la referencia al editar.
- Al crear un producto se navega a su detalle `/products/:id`, donde se concentran la información general y las presentaciones.
- Detalle con tarjetas de presentación que reservan un espacio 16:9 para la imagen: si `imageUrl` existe se muestra, y si no aparece un marcador «Imagen pendiente · Espacio reservado». Una URL que falla cae al mismo marcador.
- Cada tarjeta muestra existencia, stock mínimo, precio vigente, estado de stock y estado lógico; permite agregar, editar y activar/desactivar presentaciones con confirmación en línea.
- El formulario de presentación edita código, stock mínimo, URL de imagen y texto alternativo, con vista previa y validación de `http(s)://` o ruta relativa iniciada en `/`. Como el `PUT` del backend reemplaza la imagen, el formulario siempre reenvía la URL vigente para no borrarla.
- La subida de archivos no está implementada: la imagen se referencia por URL, tal como exige el contrato.
- Lectura para `ADMIN`, `WAREHOUSE` y `PURCHASING`; escritura solo `ADMIN` y `WAREHOUSE`. El catálogo de precios es exclusivo de `ADMIN`.
- El cambio de precio se hace desde el detalle: cada presentación tiene la acción «Precio», que abre un panel con el precio vigente, el formulario del nuevo valor y el historial completo.
- Guardar un precio cierra el vigente y registra el nuevo con el usuario del JWT; el panel se actualiza al instante y muestra cuál quedó vigente, con fecha de inicio, cierre y autor del cambio.
- El historial se carga con `GET /api/products/{productId}/presentations/{presentationId}/prices` y el alta con `POST` sobre la misma ruta; ambos exigen rol `ADMIN`.
- El listado no suma existencias entre presentaciones distintas: cada chip corresponde a una presentación con su propia unidad.
- Si el backend rechaza una operación (código duplicado, presentación repetida, vencimiento con lotes activos, activación con catálogos inactivos), el mensaje del `400`/`409` se muestra en el formulario o en el toast.

### Lotes (7.2 completado)

- Página `/lots` con búsqueda por número de factura, filtro por proveedor (solo `ADMIN` y `PURCHASING`), casilla «Solo con existencia» y filtro por producto mediante `?productId=`, que se muestra como chip removible y se sincroniza con la URL para compartir la consulta.
- Tabla ordenada por vencimiento con producto, presentación, lote, proveedor, factura, fecha de ingreso, vencimiento con severidad (`EXPIRED`, `RED`, `YELLOW`, `NONE`), cantidad disponible frente a la recibida y costos cuando el perfil puede verlos.
- La columna de vencimiento combina la insignia de severidad con la fecha y la etiqueta de días restantes («Vence en 16 días», «Vencido hace 7 días», «Sin vencimiento»).
- Alta de ingreso en panel lateral: búsqueda de producto activo, selección de presentación, proveedor, factura y fecha (no futura), número de lote, cantidad recibida, costo unitario, vencimiento y notas. El vencimiento se vuelve obligatorio cuando el producto lo requiere y siempre debe ser posterior al ingreso.
- El último costo por presentación (`GET /api/products/{id}/last-cost`) se muestra como referencia y se puede aplicar con un clic; el costo se sugiere al elegir la presentación si el campo está vacío.
- Corrección de cantidad disponible desde el mismo listado con `PATCH /api/lots/{id}/available-quantity`; valida que no sea negativa ni supere la cantidad recibida.
- Lectura para `ADMIN`, `WAREHOUSE` y `PURCHASING`; la corrección de cantidad es para `ADMIN` y `WAREHOUSE`. El alta queda limitada a `ADMIN` porque requiere el catálogo de proveedores, restringido a `ADMIN` y `PURCHASING`; `PURCHASING` ve el listado con costos en modo lectura.
- El detalle de producto enlaza a `/lots?productId=` con la acción «Ver lotes».
- `lot.model.ts` centraliza el mapeo al payload, la interpretación de fechas ISO como fechas locales sin desfase de zona horaria y las etiquetas de severidad, días, cantidades y costos.

### Clientes (7.3 completado)

- Listado `/customers` con búsqueda por nombre, documento, NIT o correo; filtros por tipo de documento y estado; paginación y contador de resultados.
- Cada fila muestra nombre legal y comercial, documento principal, teléfono/correo, línea de crédito, saldo pendiente con color según el uso del crédito y estado lógico.
- Alta y edición en panel lateral con datos generales, documentos (tipo, número, NIT, NRC, DUI) y contacto (teléfono, correo, dirección). Las validaciones replican el contrato: longitudes, correo, teléfono y unicidad reportada por el backend.
- El alta navega al detalle del cliente recién creado; la edición conserva las condiciones de crédito vigentes para no reiniciarlas.
- Detalle `/customers/:id` con datos fiscales y de contacto, fechas de registro/actualización, tarjeta de crédito con límite, días, saldo pendiente, disponible y barra de uso.
- `ADMIN` puede ajustar crédito (límite y días) desde un panel propio, con aviso si el nuevo límite queda por debajo del saldo pendiente, y activar/desactivar el cliente con confirmación en línea.
- Lectura para `ADMIN`, `PURCHASING` y `SELLER`; creación y edición para `ADMIN` y `SELLER`; estado y crédito solo `ADMIN`, coherente con `SecurityConfig`.
- Al crear se envía una línea de crédito en cero; el ajuste posterior queda reservado a `ADMIN`.
- `customer.model.ts` centraliza payloads con recorte de textos y conversión de vacíos a `null`, redondeo de crédito, etiquetas de tipo/documento y cálculos de uso, disponible, tono y estado del crédito.

### Ventas (7.4 completado)

- Listado `/sales` con filtros por rango de fechas, cliente y estado (`DRAFT`, `CONFIRMED`, `CANCELLED`), paginación y contador. `SELLER` solo ve sus propias ventas; el backend aplica esa visibilidad.
- Cada fila muestra número y fecha, cliente, vendedor, condición de pago, total, estado lógico y accesos a detalle y edición cuando la venta está en borrador.
- Editor `/sales/new` y `/sales/:id/edit` restringido a `ADMIN` y `SELLER`: cliente opcional (consumidor final), condición de pago contado/crédito, método de pago, notas y líneas por presentación.
- La búsqueda de productos usa `GET /api/products` con solo activos; al elegir un producto se cargan sus presentaciones con precio vigente y stock, y se agrega la presentación como línea con cantidad, precio y descuento editables.
- El resumen calcula el total y los descuentos en vivo; el servidor recalcula base imponible e IVA al guardar. La venta creada o editada queda en `DRAFT`.
- Con un cliente seleccionado se muestra su límite, saldo y disponible; para ventas a crédito se advierte si no hay días configurados o si el total supera el crédito disponible (la validación definitiva ocurre al confirmar).
- Detalle `/sales/:id` con cliente, vendedor, condiciones, notas, líneas con IVA y totales (subtotal, descuentos, IVA, total, pagado y saldo pendiente).
- Confirmación en línea con `POST /api/sales/{id}/confirm`, que descuenta stock con FEFO; los errores de stock insuficiente o crédito se muestran con el mensaje del backend.
- Cancelación con `POST /api/sales/{id}/cancel` en un panel con motivo opcional, solo para `ADMIN`; si existe factura emitida se muestra el conflicto reportado por el backend.
- Lectura para los cuatro roles; crear, editar y confirmar para `ADMIN` y `SELLER` (cada vendedor sobre sus propias ventas), y cancelar solo `ADMIN`, conforme a `SecurityConfig`.
- `sale.model.ts` centraliza payloads con recorte y redondeo, totales estimados, etiquetas de estado y pago, saldo pendiente, permisos por estado/propietario y la validación visual del crédito.

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
- Botones con degradado de marca (`--gradient-brand`) de azul profundo a cian, borde degradado en secundarios, elevación sutil al pasar el cursor y anillo de foco accesible; la variante de peligro usa su propio degradado. Los controles de icono (header, paginación, cierre de paneles) comparten el mismo lenguaje visual en versión suave.
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
│   │   │   ├── http/          # interceptores y lectura de errores de la API
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
│   │   │   ├── catalogs/      # configuración, servicio, pestañas, listado y formulario
│   │   │   ├── products/      # modelo, servicio, listado, detalle y formularios
│   │   │   ├── lots/          # modelo, servicio, listado, ingreso y corrección de cantidad
│   │   │   ├── customers/     # modelo, servicio, listado, formularios y detalle
│   │   │   ├── sales/         # modelo, servicio, listado, editor y detalle de venta
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
| `/catalogs` | `ADMIN`, `WAREHOUSE`, `PURCHASING` | Catálogos de inventario |
| `/products` | `ADMIN`, `WAREHOUSE`, `PURCHASING` | Listado de productos |
| `/products/:id` | `ADMIN`, `WAREHOUSE`, `PURCHASING` | Detalle y presentaciones del producto |
| `/lots` | `ADMIN`, `WAREHOUSE`, `PURCHASING` | Consulta de lotes; alta solo `ADMIN` y corrección `ADMIN`/`WAREHOUSE` |
| `/customers` | `ADMIN`, `PURCHASING`, `SELLER` | Listado de clientes; alta y edición `ADMIN`/`SELLER` |
| `/customers/:id` | `ADMIN`, `PURCHASING`, `SELLER` | Detalle, crédito y estado del cliente |
| `/sales` | `ADMIN`, `WAREHOUSE`, `PURCHASING`, `SELLER` | Listado de ventas; `SELLER` solo las propias |
| `/sales/new` | `ADMIN`, `SELLER` | Nueva venta en borrador |
| `/sales/:id` | `ADMIN`, `WAREHOUSE`, `PURCHASING`, `SELLER` | Detalle, confirmación y cancelación (`ADMIN`) |
| `/sales/:id/edit` | `ADMIN`, `SELLER` | Edición de una venta en borrador |
| `/` | Autenticados | Redirige a `/dashboard` |
| `**` | Público | Página no encontrada |

La ruta del shell está protegida con `authGuard`; los módulos se cargan con `loadComponent` / `loadChildren`.

---

## 7. Componentes reutilizables

- `IconComponent`: catálogo SVG propio, tamaño, grosor y etiqueta accesible.
- `ButtonComponent` (`button[appButton]`, `a[appButton]`): variantes primaria con degradado de marca, secundaria con borde degradado, fantasma, peligro con degradado propio; tamaños, bloque, estado de carga y foco visible.
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
- `catalog.model.spec.ts`: configuración de los seis catálogos, filtros por relación, payloads de creación/edición y formato de columnas.
- `product.model.spec.ts`: payloads de producto y presentación (incluida la conservación de la imagen), payloads de precio, formatos de cantidad, dinero y fecha, etiquetas de estado de stock, resumen de presentaciones visibles y conteo de imágenes pendientes.
- `lot.model.spec.ts`: payload de ingreso con recorte y redondeo, fechas locales sin desfase, severidad y tono de vencimiento, etiquetas de días (incluidos vencidos y sin fecha), cantidades y costos visibles u ocultos, y búsqueda del último costo por presentación.
- `customer.model.spec.ts`: payload de cliente con recorte y conversión de vacíos a `null`, normalización del crédito, etiquetas de tipo y documento, documento principal, disponible y porcentaje de uso, tonos y estados del crédito, y formatos de límite y días.
- `sale.model.spec.ts`: payload de venta con recorte y redondeo, cálculo de líneas y totales con descuento, etiquetas de estado y pago, saldo pendiente, permisos de edición/confirmación/cancelación por estado y propietario, y advertencias de crédito.

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
| 7.2 Catálogos e inventario | Catálogos, productos con presentaciones, precios con historial y lotes — **completado** |
| 7.3 Clientes | Listado, filtros, detalle, creación, edición, estado y crédito — **completado** |
| 7.4 Ventas | Listado, nueva venta, detalle, confirmación y cancelación — **completado** |
| 7.5 Facturación | Emisión, detalle, pagos y notas de crédito |
| 7.6 Reportes | Consultas y exportaciones definidas en la Fase 8 del plan |

Cada entregable debe actualizar este README, `MEMORY.md` e `Implementacion.md`.

---

## 11. Limitaciones conocidas

- Solo el panel general, los catálogos, los productos con sus presentaciones y precios, los lotes, los clientes y las ventas están implementados; facturación y reportes se agregan por entregable.
- El alta de lotes requiere el catálogo de proveedores, por lo que `WAREHOUSE` puede corregir cantidades pero no registrar ingresos desde la interfaz.
- `PURCHASING` puede consultar lotes con costos y filtrar por proveedor, pero no registrar ingresos ni corregir cantidades.
- Las condiciones de crédito y el estado de un cliente solo los modifica `ADMIN`; `SELLER` puede crear y editar los datos básicos, y al crear el cliente la línea de crédito queda en cero.
- `PURCHASING` consulta clientes, saldo y crédito en modo lectura.
- `SELLER` solo ve sus propias ventas; `WAREHOUSE` y `PURCHASING` consultan el historial completo sin crear, editar, confirmar ni cancelar. Cancelar una venta queda reservado a `ADMIN`.
- El listado de ventas filtra por fechas, cliente y estado porque la API no expone búsqueda por número de venta.
- La emisión de factura desde una venta confirmada y los pagos corresponden al entregable 7.5; el detalle solo muestra el saldo pendiente.
- El filtro por cliente del listado de ventas y el alta requieren `/api/customers/options`, disponible para `ADMIN` y `SELLER`.
- La imagen de cada presentación se referencia por URL: no hay subida de archivos ni almacenamiento binario en el cliente.
- No hay entorno de producción ni pipeline de despliegue del frontend todavía.
- En producción se requiere un proxy inverso que enrute `/api` al backend y sirva el `index.html` para las rutas del router.
- No hay pruebas E2E de navegador; la verificación actual es build, pruebas unitarias y arranque con proxy.

---

## 12. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `502` en `/api` desde el dev server | Backend apagado o en otro puerto | Inicia el backend en `8080` o ajusta `proxy.conf.json` |
| Redirección constante al login | Token expirado o `JWT_SECRET` cambiado | Inicia sesión de nuevo; la sesión inválida se limpia sola |
| El panel no muestra indicadores | Rol sin permiso (`SELLER`) | Es el comportamiento esperado; el backend restringe esos endpoints |
| Error de compilación por alias | `tsconfig.json` modificado | Conserva los `paths` de `@core`, `@shared`, `@layout`, `@features` y `@env` |
| Puerto 4200 ocupado | Otro `ng serve` activo | Usa `npx ng serve --port 4300` |
