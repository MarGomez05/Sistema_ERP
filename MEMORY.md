# MEMORY.md — TAMACHIHUA-ERP

> Memoria viva del proyecto. Leer al inicio de cada tarea y actualizar al finalizar.
> Última actualización: 17/11/2026.
> Estado: Fases 2 a 6 completadas (Flyway V1–V6, clientes, ventas con FEFO, facturación e imágenes por URL), **Fase 7.1 completada** (base del frontend Angular: login, shell, guards, dashboard y 404) con el rediseño visual **7.1.1** y **7.2 completado** con los módulos de **catálogos** (categorías, tipos, marcas, modelos, unidades y presentaciones), de **productos con sus presentaciones**, de **precios con historial** y de **lotes con corrección de cantidad**, más un sistema de botones con degradado de marca. API validada con `validate`, pruebas unitarias y E2E de endpoints; frontend compilado y con 58 pruebas en verde.

## 1. Resumen

TAMACHIHUA-ERP es un sistema de gestión para ferretería y agroservicio. El módulo actual cubre inventario: catálogos, productos, presentaciones, precios, proveedores, lotes, dashboard y una API móvil que será retirada.

La nueva etapa convierte el sistema en un ERP comercial con:
- Clientes.
- Ventas y detalle de venta.
- Facturación, pagos y cuentas por cobrar.
- Imagen por presentación de producto.
- Esquema versionado con Flyway.
- Frontend Angular como único cliente web.

**Cambio de alcance aprobado:** se elimina Vue y se elimina Ionic/móvil. Solo habrá Angular web. Los endpoints `/api/app/**` y el encabezado `X-Client-Interface` se retiran en la migración.

## 2. Stack

- Backend: Java 21, Spring Boot 4.1.2, Maven Wrapper 3.10.0.
- Persistencia: PostgreSQL 16+, Spring Data JPA, Hibernate `validate`, Flyway.
- Seguridad: Spring Security, JWT HS256, BCrypt, roles no jerárquicos.
- Documentación: springdoc OpenAPI.
- Frontend: Angular (standalone, signals, servicios tipados).
- Pruebas: JUnit 5, Spring Boot Test, Testcontainers, MockMvc.
- CI/CD: GitHub Actions.

## 3. Estado actual

- Código backend en `Api/api/`.
- Documentación del backend en `Api/README.md`.
- Plan aprobado en `Implementacion.md`.
- Contrato REST v2.0 en `Documentacion/Diagramas/Endpoints-API.md`.
- `Base_datos/esquema_consolidado.sql` es el script consolidado de referencia y `Base_datos/Script.pdf` el MER completo (2 páginas).
- **Flyway implementado** en `Api/api/src/main/resources/db/migration/` con `V1`–`V6`.
- 21 tablas de negocio: las 13 originales más `customers`, `document_sequences`, `sales`, `sale_details`, `sale_lot_allocations`, `invoices`, `invoice_details` e `invoice_payments`.
- Migraciones aplicadas y verificadas en dos escenarios: esquema existente (baseline V1 + V2–V6) y esquema vacío (V1–V6).
- `spring.jpa.hibernate.ddl-auto=validate` se mantiene; la API arranca correctamente en ambos escenarios.
- API implementada: auth, usuarios, roles, catálogos, productos, presentaciones, precios, proveedores, lotes, dashboard, `/api/app/**`, **clientes** (`/api/customers`) y **ventas** (`/api/sales`).
- Clientes: listado paginado con filtros, opciones, detalle con saldo pendiente, creación, edición, estado y crédito; matriz de seguridad aplicada.
- Ventas: creación/edición en `DRAFT`, confirmación con FEFO y bloqueo pesimista, cancelación con devolución de stock, numeración por secuencia y validación de crédito.
- Facturación: emisión desde ventas confirmadas, snapshot inmutable, pagos con control de saldo y notas de crédito con devolución opcional de stock (`/api/invoices`).
- Imágenes: `imageUrl` e `imageAlt` en presentaciones, expuestos en el detalle del producto y editables con `PUT /api/products/{productId}/presentations/{id}/image` (solo referencia, sin binarios).
- Aún no hay subida de archivos ni almacenamiento local/S3 (D-06).
- Tests: contexto de Spring con Testcontainers (requiere Docker), pruebas unitarias de clientes, ventas, facturación e imágenes, y validación E2E manual contra PostgreSQL local.
- No hay CI/CD configurado.
- **Frontend Angular 22 implementado en `Web/`** con la base del ERP: login real, layout, guards por rol, dashboard con gráficas SVG/CSS propias, página 404, **catálogos de inventario**, **productos con presentaciones** y **precios con historial**; documentado en `Web/README.md`.
- Rama de trabajo actual: `feature/web-base`. No se debe hacer commit sin autorización.

### Avance 14/11/2026 — Fase 2 (Flyway)

- `pom.xml`: se agregó `spring-boot-starter-flyway` y `flyway-database-postgresql`.
- `application.properties`: se habilitó Flyway con `baseline-on-migrate=true` y `baseline-version=1`.
- Migraciones creadas:
  - `V1__baseline_inventory.sql`: 13 tablas, función `set_audit_timestamps()`, índices, triggers y roles base.
  - `V2__customers.sql`: clientes con documentos únicos parciales y crédito.
  - `V3__sales.sql`: `document_sequences`, `sales`, `sale_details` y `sale_lot_allocations`.
  - `V4__invoicing.sql`: `invoices`, `invoice_details` e `invoice_payments`.
  - `V5__product_presentation_images.sql`: `image_url` e `image_alt`.
  - `V6__product_tax_rate.sql`: `tax_rate` por producto y correlativos del año en curso.
- `src/test/resources/application-test.properties`: secreto JWT exclusivo de pruebas y perfil `test` en `ApiApplicationTests`.
- Validación realizada: `./mvnw -q -DskipTests compile`, `package`, `test-compile`; arranque real contra PostgreSQL 18 local en base existente y en esquema vacío.

### Avance 14/11/2026 — Fase 3 (Clientes)

- Implementación por capas: `controller/CustomerController`, `service/CustomerService` + `service/impl/CustomerServiceImpl`, `repository/CustomerRepository`, `repository/projection/CustomerBalanceProjection`, `entity/Customer`, `mapper/CustomerMapper` y DTO en `dto/customer/`.
- Endpoints implementados: `GET /api/customers`, `GET /api/customers/options`, `GET /api/customers/{id}`, `POST /api/customers`, `PUT /api/customers/{id}`, `PATCH /api/customers/{id}/status` y `PATCH /api/customers/{id}/credit`.
- Validaciones: tipo de cliente/documento, tamaños, correo, teléfono, crédito y días no negativos.
- Unicidad: documento, NIT, NRC, DUI y correo (sin distinguir mayúsculas); conflicto 409 con mensaje en español.
- `outstandingBalance` se calcula con `SUM(total - paid_total)` de facturas `ISSUED`; en listados se resuelve en una sola consulta agregada.
- `SecurityConfig`: ADMIN, PURCHASING y SELLER consultan; ADMIN y SELLER crean/editan; solo ADMIN cambia estado y crédito; opciones solo ADMIN y SELLER.
- Pruebas unitarias: `CustomerServiceImplTest` y `CustomerRequestDtoValidationTest` (Mockito + Jakarta Validation), en verde.
- Validación E2E contra PostgreSQL local: 26 comprobaciones de CRUD, validaciones, saldo y matriz de permisos, todas en verde.

### Avance 14/11/2026 — Fase 4 (Ventas)

- Implementación por capas: `controller/SaleController`, `service/SaleService` + `service/impl/SaleServiceImpl`, `repository/SaleRepository`, `repository/DocumentSequenceRepository`, `entity/Sale`, `entity/SaleDetail`, `entity/SaleLotAllocation`, `entity/DocumentSequence`, `mapper/SaleMapper` y DTO en `dto/sale/`.
- Endpoints implementados: `GET /api/sales`, `GET /api/sales/{id}`, `POST /api/sales`, `PUT /api/sales/{id}`, `POST /api/sales/{id}/confirm` y `POST /api/sales/{id}/cancel`.
- Creación y edición solo en `DRAFT`; precio vigente tomado de `product_prices` cuando no se envía; `tax_rate` desde el producto.
- Totales con `BigDecimal` y `HALF_UP`: los precios incluyen IVA (D-02), `lineTotal = cantidad × precio − descuento`, `lineSubtotal = lineTotal / (1 + tasa/100)`.
- Confirmación: valida cliente activo y límite de crédito, excluye lotes vencidos, bloquea con `PESSIMISTIC_WRITE` y asigna en orden FEFO; devuelve 409 `INSUFFICIENT_STOCK` si falta stock.
- Cancelación: solo ADMIN; devuelve stock a los lotes de `sale_lot_allocations`; rechaza ventas con factura `ISSUED`.
- Numeración `V-AAAA-NNNNNN` con `document_sequences`, `ON CONFLICT` + `SELECT ... FOR UPDATE`.
- `SELLER` solo ve y opera sus propias ventas; `ADMIN` ve todas; `WAREHOUSE` y `PURCHASING` consultan.
- Pruebas unitarias: `SaleTotalsCalculatorTest`, `SaleRequestDtoValidationTest` y `SaleServiceImplTest`, en verde.
- Validación E2E contra PostgreSQL local: 53 comprobaciones de totales, FEFO, stock, cancelación, crédito, numeración, visibilidad y permisos, todas en verde.
- `Base_datos/esquema_consolidado.sql` corregido (D-14): se agregaron `products.tax_rate`, `ck_products_tax_rate`, `ix_invoices_sale_id`, `ix_sale_details_sale_id`, `ix_sale_lot_allocations_sale_detail_id` y las secuencias iniciales; se validó contra la base migrada comparando columnas, restricciones e índices.

### Avance 16/11/2026 — Fase 5 (Facturación)

- Implementación por capas: `controller/InvoiceController`, `service/InvoiceService` + `service/impl/InvoiceServiceImpl`, `repository/InvoiceRepository`, `repository/InvoicePaymentRepository`, `entity/Invoice`, `entity/InvoiceDetail`, `entity/InvoicePayment`, `mapper/InvoiceMapper` y DTO en `dto/billing/`.
- Endpoints implementados: `GET /api/invoices`, `GET /api/invoices/{id}`, `POST /api/invoices`, `POST /api/sales/{id}/invoice`, `POST /api/invoices/{id}/payments`, `GET /api/invoices/{id}/payments` y `POST /api/invoices/{id}/credit-note`.
- Emisión solo desde una venta `CONFIRMED` y sin factura previa; bloqueo pesimista sobre la venta; número generado con `document_sequences` (`F-AAAA-NNNNNN` para consumidor y `CCF-AAAA-NNNNNN` para crédito fiscal).
- Snapshot inmutable del cliente y de las líneas; el costo promedio ponderado de los lotes se guarda en `invoice_details.unit_cost` pero no se expone en la API.
- `paymentCondition` de la factura debe coincidir con la venta; en crédito, `dueDate = issueDate + customer.creditDays` (mínimo 1 día) y se exige cliente registrado.
- `CCF` exige cliente registrado; `CONSUMER` permite consumidor final.
- Pagos con bloqueo de la factura: fecha no futura, monto positivo y suma de pagos ≤ total; se actualiza `paidTotal`.
- Nota de crédito solo `ADMIN`: referencia la factura original, copia el snapshot, cancela la factura **y la venta**, y devuelve stock solo si `returnStock = true`.
- `SecurityConfig`: `ADMIN` y `SELLER` emiten facturas y pagos; `PURCHASING` consulta; `WAREHOUSE` no accede.
- Pruebas unitarias: `BillingRequestValidationTest` e `InvoiceServiceImplTest`, en verde; suite unitaria existente revalidada.
- Validación E2E contra PostgreSQL local: 51 comprobaciones de emisión, snapshot, numeración, pagos, notas de crédito, stock y permisos, todas en verde; datos de prueba eliminados.

### Avance 16/11/2026 — Fase 6 (Imágenes por URL)

- Columnas `image_url` e `image_alt` (migración `V5`) mapeadas en `entity/ProductPresentation`.
- `imageUrl` e `imageAlt` agregados a `ProductPresentationRequestDto`, `ProductPresentationUpdateRequestDto` y `ProductPresentationResponseDto`; se devuelven en el detalle del producto y en el listado de presentaciones.
- Nuevo `dto/productpresentation/PresentationImageRequestDto` y endpoint `PUT /api/products/{productId}/presentations/{id}/image` en `ProductPresentationController`.
- `ProductPresentationService.updateImage` asigna o quita la imagen; `create` y `update` también aceptan los campos.
- Validación en DTO: `imageUrl` ≤ 500 con `http://`, `https://` o ruta relativa que empiece con `/`; `imageAlt` ≤ 150; URL vacía o nula elimina la imagen.
- Seguridad reutilizada: `ADMIN` y `WAREHOUSE` escriben; `ADMIN`, `WAREHOUSE` y `PURCHASING` consultan; `SELLER` no modifica imágenes.
- Pruebas unitarias: `PresentationImageRequestDtoValidationTest` y `ProductPresentationImageServiceImplTest`, en verde; suite existente revalidada.
- Validación E2E contra PostgreSQL local: 27 comprobaciones de asignación, edición, validaciones de formato, permisos, recursos inexistentes y borrado lógico de la imagen, todas en verde; imagen original restaurada.
- Pendiente por D-06: subida `multipart/form-data` con almacenamiento local/S3 y servido de archivos.

### Avance 16/11/2026 — Fase 7.1 (Base del frontend Angular)

- Proyecto Angular 22 standalone creado en `Web/` (Angular CLI 22.1.8, Node 24), con Vitest, plantillas estrictas y `OnPush` por defecto.
- Sistema de diseño propio en SCSS con tokens extraídos del logo: marca `#0873C4`, profundo `#004B87`, acento `#00A8FF`, gris `#5B6B7A`; tipografía Inter; `prefers-reduced-motion` respetado.
- Configuración: alias `@core`, `@shared`, `@layout`, `@features`, `@env`; proxy `/api → http://localhost:8080`; presupuestos de build; favicons y logos en `public/`.
- Núcleo de autenticación: `AuthService` con signals y sesión en `localStorage`, `restoreSession` vía `/api/auth/me`, `authInterceptor`, `errorInterceptor`, `authGuard`, `guestGuard` y `roleGuard`.
- UI compartida: `icon`, `button`, `badge`, `skeleton`, `empty-state`, `page-header`, `stat-card`, `pagination` y `toast-container`; iconos SVG propios sin dependencias externas.
- Layout: sidebar contraíble y responsive, header con breadcrumb y perfil, shell con enlace de salto al contenido y toast global.
- Login real contra `POST /api/auth/login`, con validaciones, mostrar/ocultar contraseña, errores diferenciados y redirección interna segura.
- Dashboard adaptado a los permisos reales: `summary` y `expiring-lots` para `ADMIN`/`WAREHOUSE`; `low-stock` también para `PURCHASING`; `SELLER` recibe estado de bienvenida. Incluye KPIs, composición de lotes, tablas, skeletons, estados vacíos, error con reintento y paginación.
- Página 404 con identidad de marca y accesos según sesión.
- Verificación: `npm run build` en verde (inicial 306.92 kB, presupuesto 1.2 MB), `npm test -- --watch=false` con 5 pruebas en verde y `ng serve` sirviendo en `4200` con assets y proxy activos.
- Documentación del cliente en `Web/README.md`; `README.md`, `AGENTS.md`, `Implementacion.md` y `MEMORY.md` actualizados con la ruta `Web/`.
- Pendiente para siguientes entregables: catálogos/inventario, clientes, ventas, facturación y reportes.

### Avance 17/11/2026 — Rediseño visual 7.1.1 (login y gráficas)

- Login editorial asimétrico (~58/42) con panel de marca en degradado, corte diagonal, tarjeta de acceso que invade el límite y mini panel ilustrativo sin cifras ni datos simulados.
- Se conservan el formulario reactivo, las validaciones, el mostrar/ocultar contraseña, los errores diferenciados, la redirección interna segura y el texto/acento del borrador previo.
- Gráficas SVG/CSS propias en `Web/src/app/shared/ui/charts/`: `donut-chart`, `column-chart` y `bar-chart`, con `chart.model.ts` y etiquetas ARIA.
- Cálculos puros en `features/dashboard/dashboard.charts.ts`: dona de estado de lotes, rangos de vencimiento (vencidos, 0–7, 8–15 y 16–30 días) y faltante de stock.
- Dashboard: fila analítica con dona y columnas; barras de stock actual frente al mínimo de la página visible en el panel de bajo stock; skeletons y estados vacíos por gráfica.
- Sin dependencias nuevas ni cambios en backend, contratos o reglas de negocio; `prefers-reduced-motion` se mantiene.
- Verificación: `npm run build` en verde (inicial 307.04 kB) y `npm test -- --watch=false` con 16 pruebas en verde (auth y cálculos de gráficas).
- Documentación actualizada: `Web/README.md`, `Implementacion.md` y `MEMORY.md`.

### Avance 17/11/2026 — Fase 7.2 (Catálogos de inventario)

- Módulo `Web/src/app/features/catalogs/` con una sola página de pestañas accesibles (`role="tablist"`, flechas, Home/End) para los seis catálogos: categorías, tipos de producto, marcas, modelos, unidades de medida y presentaciones.
- Configuración declarativa en `catalog.model.ts` (`CATALOGS`, `toPayload`, `columnValue`) que dirige columnas, filtros, campos y payloads; evita duplicar seis listados y seis formularios.
- `CatalogService` tipado sobre `/api/{categories|product-types|brands|models|measure-units|presentations}`: listado paginado con `search`, `isActive`, `brandId`/`measureUnitId`, opciones activas para combos, creación, edición y cambio de estado con `PATCH /{id}/status`.
- Formulario lateral reutilizable con Reactive Forms, validaciones espejo del backend, mensajes en español y selectores de marca/unidad cargados desde `/options`.
- Listados con búsqueda, filtro por estado, filtro por relación, paginación, skeletons, estado vacío y error con reintento. La baja lógica se confirma en línea antes de desactivar.
- Permisos: lectura para `ADMIN`, `WAREHOUSE` y `PURCHASING`; escritura solo `ADMIN`, coherente con `SecurityConfig`. Ruta `/catalogs` protegida por `roleGuard` y nueva sección «Inventario» en la navegación.
- `core/http/api-error.ts` (`readApiError`) muestra los mensajes 400/409 del backend en el formulario y en conflictos de desactivación (por ejemplo, catálogo con hijos activos).
- Iconos SVG propios añadidos: `plus`, `edit`, `power`, `tag`, `layers` y `ruler`.
- Verificación: `npm run build` en verde (inicial 308.88 kB) y `npm test -- --watch=false` con 26 pruebas en verde, incluidas las de configuración y payloads de catálogos.
- Pendiente del entregable 7.2: productos, presentaciones de producto, precios y lotes.

### Avance 17/11/2026 — Fase 7.2 (Productos y presentaciones)

- Módulo `Web/src/app/features/products/` con listado `/products` y detalle `/products/:id`; ambos bajo `roleGuard` con lectura `ADMIN`/`WAREHOUSE`/`PURCHASING` y escritura `ADMIN`/`WAREHOUSE`.
- `ProductService` consume `/api/products` (listado con `search`, `categoryId`, `productTypeId`, `isActive` y paginación; detalle, alta, edición y `PATCH /{id}/status`), las presentaciones por producto (`GET`/`POST`, `PUT /{presentationId}`, `PATCH /{presentationId}/status`) y las opciones de `/categories`, `/product-types`, `/models` y `/presentations`.
- Listado con filtros, chips de existencias por presentación con color según `stockStatus` (`OUT`, `LOW`, `OK`), paginación, skeletons, vacío y error con reintento. No se suman unidades de presentaciones distintas.
- Alta/edición de producto en panel lateral; `ProductRequestDto` no incluye `taxRate`, por lo que el formulario no lo envía ni lo inventa.
- El detalle agrupa información general y tarjetas de presentación con espacio 16:9 reservado para la imagen: se muestra si `imageUrl` existe y, si no o si falla la carga, un marcador «Imagen pendiente · Espacio reservado».
- El formulario de presentación edita código, stock mínimo, `imageUrl` e `imageAlt` con vista previa y validación (`http(s)://` o ruta relativa con `/`, máx. 500/150). Como `ProductPresentationUpdateRequestDto` borra la imagen si no se envía, el formulario siempre reenvía la URL vigente.
- Precio vigente y existencias se muestran en modo lectura; el cambio de precio y los lotes quedan para la siguiente parte del entregable (el cambio de precio se completó en el avance siguiente).
- Iconos SVG añadidos: `image` y `arrowLeft`.
- Verificación: `npm run build` en verde (inicial 309.80 kB) y `npm test -- --watch=false` con 40 pruebas en verde, incluidas `product.model.spec.ts`.
- Pendiente del entregable 7.2: cambio de precio, historial y lotes.

### Avance 17/11/2026 — Fase 7.2 (Precios e historial) y rediseño de botones

- `ProductService` incorpora `GET/POST /api/products/{productId}/presentations/{presentationId}/prices`; ambos endpoints son exclusivos de `ADMIN` según `SecurityConfig`.
- Nuevo componente `product-price-panel` en el detalle: muestra el precio vigente en una tarjeta con degradado de marca, formulario del nuevo valor (obligatorio, > 0, máximo 8 enteros y 2 decimales, redondeo `HALF_UP` a 2 decimales) e historial con fecha de inicio, cierre, autor y estado «Vigente»/«Cerrado».
- Al guardar, se cierra el precio vigente y el nuevo queda activo; el panel y el detalle se recargan para reflejar el cambio sin cerrar el formulario. Los errores 400/409 del backend se muestran con `readApiError`.
- La acción «Precio» solo aparece para `ADMIN`; `WAREHOUSE` y `PURCHASING` siguen viendo el precio vigente en modo lectura.
- Se corrigió un defecto del sistema de botones: la variante primaria nunca recibía `app-button--primary` y, además, la encapsulación emulada de Angular compilaba las reglas con `[_ngcontent]`, que no coincide con el elemento anfitrión (`<button appButton>`). Los estilos se movieron a `src/styles/components.scss`; `app-badge` tenía el mismo problema y también se corrigió.
- Rediseño de botones: tokens `--gradient-brand`, `--gradient-soft`, `--gradient-danger`, `--shadow-brand` y `--shadow-brand-strong`; primaria con degradado azul→cian que se desplaza al pasar el cursor, secundaria con borde degradado, peligro con degradado propio, elevación sutil, anillo de foco y respeto de `prefers-reduced-motion`. Header, paginación, cierre de paneles y enlace activo del sidebar usan el lenguaje suave del degradado.
- Verificación: `npm run build` en verde (inicial 310.58 kB) y `npm test -- --watch=false` con 44 pruebas en verde.
- Pendiente del entregable 7.2: lotes (ingreso, consulta, corrección de cantidad y último costo).

### Avance 17/11/2026 — Fase 7.2 (Lotes)

- Nuevo módulo `/lots` con rutas propias (`LOTS_ROUTES`), entrada «Lotes» en la sección Inventario y acceso «Ver lotes» desde el detalle de producto con `?productId=`.
- Listado con filtros de factura, proveedor (solo `ADMIN`/`PURCHASING`), «Solo con existencia» y producto; el filtro de producto se muestra como chip removible y se sincroniza con la URL para conservar la consulta al recargar.
- Tabla con producto, presentación, lote, proveedor, factura, ingreso, vencimiento con insignia de severidad y días restantes, disponible frente a recibido y costos cuando el perfil puede verlos.
- Alta de ingreso en panel lateral (`lot-form`): búsqueda de producto activo, presentación, proveedor, factura y fecha no futura, número de lote único, cantidad recibida, costo unitario, vencimiento y notas. El vencimiento es obligatorio si el producto lo requiere y siempre posterior al ingreso.
- El último costo por presentación se consulta con `GET /api/products/{id}/last-cost`, se muestra como referencia y se aplica con un clic; al elegir presentación se sugiere si el costo está vacío.
- Corrección de cantidad con `PATCH /api/lots/{id}/available-quantity`, validando que no sea negativa ni supere la cantidad recibida.
- Permisos reales: lectura `ADMIN`/`WAREHOUSE`/`PURCHASING`; corrección de cantidad `ADMIN`/`WAREHOUSE`; alta solo `ADMIN` porque los proveedores están restringidos a `ADMIN`/`PURCHASING`. `WAREHOUSE` ve una nota explicativa y `PURCHASING` consulta con costos en modo lectura.
- `lot.model.ts` centraliza modelos, payload con recorte y redondeo a 2 decimales, fechas ISO interpretadas como locales sin desfase, severidad/tono de vencimiento, etiquetas de días y costos, y búsqueda del último costo.
- Verificación: `npm run build` en verde (inicial 314.38 kB) y `npm test -- --watch=false` con 58 pruebas en verde (14 nuevas de lotes).
- Pendiente del entregable 7.2: ninguno. Siguiente: entregable 7.3 (clientes).

### Documentación completada en esta rama

- `AGENTS.md` en español con stack, convenciones, patrones, prohibiciones, estructura, flujo, testing y memoria.
- `MEMORY.md` como memoria viva.
- `Implementacion.md` con plan, modelo de datos, endpoints, flujos, Flyway, fases y criterios de aceptación.
- `README.md` raíz actualizado.
- `Api/README.md` reescrito sin Vue/Ionic, con Flyway y flujo Angular.
- `Documentacion/Diagramas/Endpoints-API.md` en v2.0 con clientes, ventas, facturación y pagos.
- `Base_datos/README.md` describe el esquema consolidado, el MER y el diccionario de datos.
- `Base_datos/esquema_consolidado.sql` validado contra la base migrada por Flyway: mismas tablas, columnas, restricciones e índices.

## 4. Decisiones aprobadas

| ID | Decisión | Estado |
|---|---|---|
| D-01 | Adoptar Flyway con baseline del esquema actual | Aprobada |
| D-02 | Los precios actuales incluyen IVA 13 %; `tax_rate` por producto | Aprobada |
| D-03 | Factura consumidor final, CCF y nota de crédito | Aprobada |
| D-04 | FEFO y exclusión de lotes vencidos al vender | Aprobada |
| D-05 | Paquetes por funcionalidad para módulos nuevos, migración incremental | Reemplazada por D-11 |
| D-06 | Imagen por URL; upload con almacenamiento local/S3 en fase posterior | Aprobada |
| D-07 | Angular standalone + signals; Material o Tailwind se decide antes de iniciar | Reemplazada por D-18 |
| D-08 | Mantener stock físico y agregar stock vendible sin vencidos | Aprobada |
| D-09 | Spring Boot 4 requiere `spring-boot-starter-flyway`; `flyway-core` por sí solo no activa la auto-configuración | Aplicada |
| D-10 | El saldo pendiente del cliente se calcula con consulta agregada sobre `invoices`; no se expone la entidad de factura en el módulo de clientes | Aplicada |
| D-11 | Mantener la arquitectura por capas (`controller`, `service`, `repository`, `entity`, `mapper`, `dto`); los DTO por dominio usan subpaquetes (`dto/customer`) y no se crean paquetes raíz por funcionalidad | Aplicada |
| D-12 | Los totales de venta se derivan de precios con IVA incluido; `discount` es un importe y la base se obtiene con `lineTotal / (1 + taxRate/100)` | Aplicada |
| D-13 | La numeración de ventas usa `document_sequences` con `INSERT ... ON CONFLICT` y `SELECT ... FOR UPDATE` para serializar concurrencia | Aplicada |
| D-14 | Flyway `V1`–`V6` sigue siendo la fuente oficial del esquema; `Base_datos/esquema_consolidado.sql` es una referencia sincronizada, no una migración | Aplicada |
| D-15 | La factura se emite solo desde una venta `CONFIRMED` sin factura previa y su `paymentCondition` debe coincidir con la de la venta; el costo del lote se conserva en `invoice_details.unit_cost` sin exponerse | Aplicada |
| D-16 | La nota de crédito copia el snapshot, cancela la factura original y la venta asociada, y devuelve stock solo cuando `returnStock = true` | Aplicada |
| D-17 | La imagen de una presentación se asigna con un endpoint JSON que guarda la URL o ruta relativa; la subida `multipart` con almacenamiento local/S3 queda para una fase posterior | Aplicada |
| D-18 | El frontend usa un sistema de diseño propio con SCSS y tokens (sin Angular Material ni Tailwind), iconos SVG propios y consumo de la API por ruta relativa `/api` con proxy de desarrollo hacia `localhost:8080` | Aplicada |
| D-19 | Las gráficas del dashboard son componentes SVG/CSS propios (`donut`, `column`, `bar`), sin librerías de visualización, y solo representan datos reales de `summary`, `low-stock` y `expiring-lots` | Aplicada |
| D-20 | Los seis catálogos de inventario comparten una sola página con pestañas accesibles, listado y formulario dirigidos por configuración (`CATALOGS`); la lectura es `ADMIN`/`WAREHOUSE`/`PURCHASING` y la escritura solo `ADMIN` | Aplicada |
| D-21 | Productos y sus presentaciones se gestionan en `/products` (listado) y `/products/:id` (detalle, presentaciones e imágenes por URL); la lectura es `ADMIN`/`WAREHOUSE`/`PURCHASING` y la escritura `ADMIN`/`WAREHOUSE`; el cambio de precio se reserva a `ADMIN` y queda para el siguiente entregable | Aplicada |
| D-22 | El cambio de precio y su historial viven en el detalle del producto, en un panel por presentación; solo `ADMIN` ve la acción, el precio anterior se cierra al guardar y el historial muestra vigencia y autor | Aplicada |
| D-23 | Los botones usan degradados de marca (`--gradient-brand`, `--gradient-soft`) con bordes redondeados, elevación al pasar el cursor y foco visible; la variante peligro conserva su propio degradado y los controles de icono usan la versión suave | Aplicada |
| D-24 | Los lotes se consultan en `/lots` con filtros de factura, proveedor, existencia y producto; el alta vive en un panel lateral y la corrección de cantidad en otro. El alta queda para `ADMIN` porque requiere `/api/suppliers/options`; `WAREHOUSE` corrige cantidades y `PURCHASING` consulta con costos en modo lectura | Aplicada |

## 5. Reglas de negocio clave

- La existencia física no se guarda: es `SUM(available_quantity)` de lotes activos (`is_active = true` y `available_quantity > 0`).
- El **stock vendible** excluye lotes vencidos. Las ventas usan stock vendible; las pantallas de inventario pueden mostrar ambos.
- Un solo precio vigente por presentación: `end_date IS NULL`; índice único parcial.
- Cambio de precio: cierra el vigente y crea uno nuevo con `user_id` del JWT.
- Baja lógica con `is_active`; no hay `DELETE`.
- Roles: `ADMIN`, `WAREHOUSE`, `PURCHASING`, `SELLER`; no son jerárquicos.
- `SELLER` no ve costos; `WAREHOUSE` no ve costos ni proveedores; `PURCHASING` ve costos.
- `userId` siempre se toma del JWT, nunca del body.
- Mensajes de usuario, validaciones, comentarios y documentación en español; identificadores de código en inglés.
- Venta: `DRAFT → CONFIRMED → CANCELLED`. Solo se edita en `DRAFT`.
- Confirmar venta valida stock vendible, cliente activo y crédito, y asigna lotes FEFO con bloqueo pesimista.
- Cancelar venta devuelve stock; si hay factura emitida, exige nota de crédito.
- La numeración de ventas es `V-AAAA-NNNNNN` y sale de `document_sequences`.
- `discount` en la línea es un importe y no puede superar `cantidad × unitPrice`.
- Factura emitida: inmutable; snapshot de cliente y líneas.
- Solo se factura una venta `CONFIRMED` y sin factura previa; `paymentCondition` debe coincidir con la venta.
- `CCF` exige cliente registrado; `CONSUMER` admite consumidor final.
- En crédito, `dueDate = issueDate + customer.creditDays` (mínimo 1 día).
- Pago: no puede superar el saldo de la factura.
- Nota de crédito: cancela la factura y la venta; devuelve stock solo si `returnStock = true`.
- Imagen de presentación: solo se guarda `imageUrl`/`imageAlt` (http(s) o ruta relativa); nunca binarios en PostgreSQL.
- Crédito: se valida `saldo pendiente + total` contra `credit_limit`.

## 6. Convenciones de código

### Backend
- Paquetes en minúsculas; clases `PascalCase`; métodos y variables `camelCase`; constantes `UPPER_SNAKE_CASE`.
- DTOs como `record`; entidades con Lombok `@Getter/@Setter/@NoArgsConstructor`; no `@Data`.
- Inyección por constructor con `@RequiredArgsConstructor`; no `@Autowired` en campos.
- Servicio: interfaz + `impl`; `@Transactional(readOnly = true)` en la clase y `@Transactional` en escrituras.
- Mapeo manual en `mapper`; no exponer entidades.
- Dinero con `BigDecimal` y `RoundingMode.HALF_UP`; fechas con `LocalDate`/`LocalDateTime`.
- `isActive` como `Boolean`, no `boolean`.
- Validaciones de formato en DTOs; reglas de negocio en servicios.
- Filtros con `Specification`; paginación con `PageResponseDto` (máximo 100).
- Errores centralizados en `GlobalExceptionHandler`.
- Endpoints REST en plural, base `/api`, sin `DELETE`; baja lógica con `PATCH /{id}/status`.
- Organización por capas: `controller`, `service`, `repository`, `entity`, `mapper` y `dto`. Los DTO de cada dominio viven en subpaquetes (`dto/customer`, `dto/sale`, `dto/billing`); no se crean paquetes raíz por funcionalidad.

### Base de datos
- Nombres en inglés y `snake_case`; tablas en plural.
- PK `BIGSERIAL`; FK `BIGINT`; `is_active BOOLEAN NOT NULL DEFAULT TRUE` en catálogos.
- `created_at` y `updated_at` con trigger `set_audit_timestamps()`.
- Restricciones `CHECK` para cantidades, precios y estados.
- Índices en FKs y columnas de búsqueda.
- Nombres de catálogos únicos con `lower(name)`.
- Cambios de esquema solo por migración Flyway.

### Frontend (Angular)
- Standalone components, signals y servicios HTTP tipados.
- Estructura `core/`, `shared/`, `layout/`, `features/`.
- Interceptor JWT con `Authorization`.
- Guards por rol; el backend sigue siendo la autoridad.
- Formularios reactivos; sin `any`; UI en español.

## 7. Patrones

- Monolito modular; `controller → service → repository → entity`.
- DTO de entrada/salida + mapper manual.
- Baja lógica con `is_active`.
- Historial de precios con vigencia.
- Stock derivado de lotes.
- Venta transaccional con asignación FEFO y bloqueo pesimista.
- Factura inmutable con snapshot de cliente y líneas.
- Numeración por tabla de secuencias con bloqueo.
- Imágenes por URL, no binarios en la base.

## 8. Prohibiciones

- No usar `ddl-auto=update` ni `create`; solo `validate`.
- No modificar el esquema fuera de Flyway.
- No eliminar registros físicamente ni agregar `DELETE`.
- No exponer entidades JPA ni costos a roles no autorizados.
- No usar `double` o `float` para dinero.
- No confiar en `userId` enviado por el cliente.
- No ocultar datos sensibles con `@JsonIgnore`; usar DTOs separados.
- No poner lógica de negocio en controllers.
- No acceder a repositorios desde controllers.
- No hardcodear secretos, credenciales ni URLs de producción.
- No usar `System.out`; usar SLF4J.
- No commitear `target/`, `.idea/`, `.env*` ni archivos generados.
- No subir binarios de imágenes a PostgreSQL.
- No vender lotes vencidos.
- No usar `/api/app/**`, Vue, Ionic ni `X-Client-Interface` en código nuevo.
- No hacer commit sin autorización.

## 9. Estructura del proyecto

```text
Control_inventario/
├── AGENTS.md
├── MEMORY.md
├── Implementacion.md
├── README.md
├── Api/
│   ├── README.md
│   └── api/                 # Backend Spring Boot
├── Base_datos/              # Esquema consolidado de referencia + MER + diccionario
├── Documentacion/           # Contrato, diagramas y logo
└── Web/                     # Cliente Angular (Fase 7.1 implementada)
```

Backend actual: `Api/api/src/main/java/com/tamachihua_erp/api/`.
Módulos actuales: `config`, `security`, `controller`, `service`, `repository`, `entity`, `mapper`, `dto`, `exception`, `util`.
Subpaquetes de DTO por dominio: `dto/app`, `dto/auth`, `dto/customer`, `dto/sale`, `dto/product`, etc.
No existen paquetes raíz por funcionalidad.

## 10. Comandos

Desde `Api/api`:

```bash
./mvnw -q -DskipTests compile
./mvnw spring-boot:run
./mvnw test
./mvnw -Dtest=ApiApplicationTests test
./mvnw -Dtest=ApiApplicationTests#contextLoads test
./mvnw package
./mvnw verify
```

Variables requeridas: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET` (Base64, mínimo 32 bytes decodificados). No hay carga automática de `.env`.

Desde `Web`:

```bash
npm ci
npm start                 # http://localhost:4200 con proxy /api → 8080
npm run build
npm test -- --watch=false
```

## 11. Documentación

- `Implementacion.md`: plan detallado de la nueva etapa.
- `Api/README.md`: guía del backend, configuración, Flyway y endpoints.
- `Documentacion/Diagramas/Endpoints-API.md`: contrato REST v2.0.
- `Base_datos/`: esquema consolidado de referencia, MER y diccionario; `README.md` explica su relación con Flyway.
- `AGENTS.md`: reglas para agentes.

## 12. Pendientes técnicos

- Implementar la subida de imágenes con `multipart/form-data` y almacenamiento local/S3 (D-06/D-17).
- Servir las imágenes locales o integrar el CDN elegido.
- Retirar `/api/app/**` y `X-Client-Interface`.
- Agregar pruebas de integración con MockMvc, concurrencia y seguridad.
- Ejecutar la suite con Testcontainers cuando haya Docker disponible.
- Configurar CI/CD.
- Frontend: entregable 7.2 completado (catálogos, productos, presentaciones, precios con historial y lotes); continuar con los entregables 7.3 a 7.6 (clientes, ventas, facturación y reportes) sobre la base ya creada en `Web/`.
- Frontend: validar visualmente el rediseño 7.1.1 en navegador con backend y credenciales reales; en el entorno de trabajo no estaban disponibles.
- Frontend: definir estrategia de despliegue con proxy inverso para `/api`.
- Regenerar diagramas de arquitectura y clases.
- Documentación base ya actualizada; falta validarla con el equipo.

## 13. Cómo actualizar esta memoria

1. Actualizar la fecha y el estado en la cabecera.
2. Agregar decisiones nuevas a la tabla de decisiones.
3. Actualizar tablas y endpoints implementados.
4. Registrar pendientes y riesgos nuevos.
5. No borrar decisiones anteriores; marcarlas como reemplazadas si cambian.
