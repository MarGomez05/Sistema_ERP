# TAMACHIHUA-ERP

Sistema de gestión para ferretería y agroservicio. Cubre **inventario** y avanza hacia un **ERP comercial** con clientes, ventas, facturación y pagos.

> **Alcance del cliente:** únicamente **Angular web**. No se usa Vue ni Ionic ni aplicación móvil.

## Estado de la nueva etapa

- **Flyway implementado**: migraciones `V1`–`V6` en `Api/api/src/main/resources/db/migration/`.
- **CRUD de clientes implementado** en `/api/customers` con validaciones, saldo pendiente y seguridad por rol.
- **CRUD de proveedores implementado** en `/api/suppliers` y en la pantalla `/suppliers`, exclusiva de `ADMIN` y `PURCHASING`, con alta, edición, filtros y activación/desactivación.
- **Ventas implementadas** en `/api/sales`: creación y edición en `DRAFT`, confirmación con FEFO y bloqueo pesimista, cancelación con devolución de stock, numeración `V-AAAA-NNNNNN` y validación de crédito.
- **Facturación implementada** en `/api/invoices`: emisión desde ventas confirmadas, snapshot inmutable, CCF, pagos con control de saldo, notas de crédito con devolución opcional de stock y descarga de PDF con datos de la empresa.
- **Imágenes por URL implementadas**: `imageUrl` e `imageAlt` en presentaciones y `PUT /api/products/{productId}/presentations/{id}/image`; la subida de archivos queda para una fase posterior.
- **Frontend Angular implementado** en `Web/`: login real, layout responsive, guards por rol, panel general, catálogos e inventario, proveedores, clientes, ventas con estado de facturación, facturación con pagos, notas de crédito, reportes y administración de usuarios y roles.
- Se retiran los endpoints `/api/app/**` y el encabezado `X-Client-Interface` en el código nuevo.

La documentación oficial del proyecto se mantiene en este README, en `Api/README.md`, `Web/README.md`, `Base_datos/README.md` y en el contrato REST de `Documentacion/Diagramas/Endpoints-API.md`.

## Estructura del proyecto

```text
Control_inventario/
├── README.md
├── Api/
│   ├── README.md          # Documentación del backend
│   └── api/               # Proyecto Spring Boot (pom.xml aquí)
├── Base_datos/            # Esquema consolidado, MER y seeder de datos de prueba
├── Documentacion/         # Contrato de API y logo
└── Web/                   # Cliente Angular
```

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Java 21, Spring Boot 4.1.2, Maven Wrapper |
| Persistencia | PostgreSQL 16+, Spring Data JPA, Hibernate `validate`, Flyway |
| Seguridad | Spring Security, JWT HS256, BCrypt |
| Documentación API | springdoc OpenAPI |
| Frontend | Angular 22 (standalone, signals, SCSS) |
| Pruebas | JUnit 5, Testcontainers, MockMvc |
| CI/CD | GitHub Actions |

## Arranque rápido del backend

Requisitos: JDK 21, Docker (para pruebas) y PostgreSQL 16+.

```bash
cd Api/api
./mvnw spring-boot:run
```

Variables de entorno necesarias:

```text
DB_URL=jdbc:postgresql://localhost:5432/tamachihua_erp
DB_USERNAME=<usuario>
DB_PASSWORD=<contraseña>
JWT_SECRET=<base64 de al menos 32 bytes>
```

Comandos útiles:

```bash
cd Api/api
./mvnw -q -DskipTests compile
./mvnw test
./mvnw verify
```

Documentación interactiva: `http://localhost:8080/swagger-ui/index.html`.

## Arranque rápido del frontend

Requisitos: Node.js 24+ y npm 11+. El backend debe estar disponible en `http://localhost:8080`.

```bash
cd Web
npm ci
npm start          # http://localhost:4200 con proxy /api
```

Comandos útiles:

```bash
cd Web
npm run build
npm test -- --watch=false
```

La guía completa del cliente web está en [`Web/README.md`](Web/README.md).

## Documentación

- [`Api/README.md`](Api/README.md): configuración y guía del backend.
- [`Web/README.md`](Web/README.md): guía del cliente Angular, diseño, rutas y entregables.
- [`Documentacion/Diagramas/Endpoints-API.md`](Documentacion/Diagramas/Endpoints-API.md): contrato REST v2.0.
- [`Base_datos/README.md`](Base_datos/README.md): esquema consolidado, MER y datos de prueba.
- [`Base_datos/seeder.sql`](Base_datos/seeder.sql): datos de prueba de junio a la fecha, incluido el usuario administrador `mgomez`.

## Reglas generales

- No hay `DELETE`: la baja lógica se hace con `PATCH /{id}/status`.
- El `userId` sale siempre del JWT, nunca del body.
- Dinero con `BigDecimal`; nunca `double` ni `float`.
- Cambios de esquema solo mediante migraciones Flyway.
- `ddl-auto=validate` en todos los entornos.
- No commitear secretos, `target/`, `.idea/` ni archivos generados.
