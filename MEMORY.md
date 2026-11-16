# MEMORY.md — TAMACHIHUA-ERP

> Memoria viva del proyecto. Leer al inicio de cada tarea y actualizar al finalizar.
> Última actualización: 16/11/2026.
> Estado: Fases 2, 3, 4 y 5 completadas (Flyway V1–V6, clientes, ventas con FEFO y facturación con pagos y notas de crédito); API validada con `validate`, pruebas unitarias y E2E de endpoints.

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
- Aún no hay endpoints, entidades ni servicios de imágenes: solo el esquema migrado.
- Tests: contexto de Spring con Testcontainers (requiere Docker), pruebas unitarias de clientes, ventas y facturación (servicio, validaciones y cálculo de IVA) y validación E2E manual contra PostgreSQL local.
- No hay CI/CD configurado.
- Rama de trabajo actual: `feature/facturacion`. No se debe hacer commit sin autorización.

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
| D-07 | Angular standalone + signals; Material o Tailwind se decide antes de iniciar | Aprobada |
| D-08 | Mantener stock físico y agregar stock vendible sin vencidos | Aprobada |
| D-09 | Spring Boot 4 requiere `spring-boot-starter-flyway`; `flyway-core` por sí solo no activa la auto-configuración | Aplicada |
| D-10 | El saldo pendiente del cliente se calcula con consulta agregada sobre `invoices`; no se expone la entidad de factura en el módulo de clientes | Aplicada |
| D-11 | Mantener la arquitectura por capas (`controller`, `service`, `repository`, `entity`, `mapper`, `dto`); los DTO por dominio usan subpaquetes (`dto/customer`) y no se crean paquetes raíz por funcionalidad | Aplicada |
| D-12 | Los totales de venta se derivan de precios con IVA incluido; `discount` es un importe y la base se obtiene con `lineTotal / (1 + taxRate/100)` | Aplicada |
| D-13 | La numeración de ventas usa `document_sequences` con `INSERT ... ON CONFLICT` y `SELECT ... FOR UPDATE` para serializar concurrencia | Aplicada |
| D-14 | Flyway `V1`–`V6` sigue siendo la fuente oficial del esquema; `Base_datos/esquema_consolidado.sql` es una referencia sincronizada, no una migración | Aplicada |
| D-15 | La factura se emite solo desde una venta `CONFIRMED` sin factura previa y su `paymentCondition` debe coincidir con la de la venta; el costo del lote se conserva en `invoice_details.unit_cost` sin exponerse | Aplicada |
| D-16 | La nota de crédito copia el snapshot, cancela la factura original y la venta asociada, y devuelve stock solo cuando `returnStock = true` | Aplicada |

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
└── web/                     # Angular (futuro)
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

## 11. Documentación

- `Implementacion.md`: plan detallado de la nueva etapa.
- `Api/README.md`: guía del backend, configuración, Flyway y endpoints.
- `Documentacion/Diagramas/Endpoints-API.md`: contrato REST v2.0.
- `Base_datos/`: esquema consolidado de referencia, MER y diccionario; `README.md` explica su relación con Flyway.
- `AGENTS.md`: reglas para agentes.

## 12. Pendientes técnicos

- Implementar imágenes de presentación (entidades, DTOs, servicios y endpoints).
- Retirar `/api/app/**` y `X-Client-Interface`.
- Mapear `image_url`/`image_alt` en las entidades y DTOs de presentación.
- Agregar pruebas de integración con MockMvc, concurrencia y seguridad.
- Ejecutar la suite con Testcontainers cuando haya Docker disponible.
- Configurar CI/CD.
- Crear frontend Angular en `web/`.
- Regenerar diagramas de arquitectura y clases.
- Documentación base ya actualizada; falta validarla con el equipo.

## 13. Cómo actualizar esta memoria

1. Actualizar la fecha y el estado en la cabecera.
2. Agregar decisiones nuevas a la tabla de decisiones.
3. Actualizar tablas y endpoints implementados.
4. Registrar pendientes y riesgos nuevos.
5. No borrar decisiones anteriores; marcarlas como reemplazadas si cambian.
