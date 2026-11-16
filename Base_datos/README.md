# Base_datos — Referencia del esquema

Esta carpeta contiene el esquema consolidado y los documentos de referencia del modelo de datos.

> **La fuente oficial del esquema es Flyway**, con las migraciones `V1`–`V6` en `Api/api/src/main/resources/db/migration/`. Este directorio no se ejecuta en el arranque de la aplicación.

## Archivos

| Archivo | Uso |
|---|---|
| `esquema_consolidado.sql` | Script consolidado de las migraciones `V1`–`V6`: 21 tablas, 4 roles y secuencias iniciales. Sirve para revisión, documentación y creación de bases de referencia. **No** es una migración de Flyway |
| `Script.pdf` | MER del modelo completo (2 páginas): inventario, clientes, ventas y facturación |
| `Diccionario_de_datos_TAMACHIHUA.xlsx` | Diccionario, restricciones e índices del esquema |

## Reglas

- No ejecutar `esquema_consolidado.sql` contra una base administrada por Flyway: el esquema se crea y actualiza solo con migraciones.
- No modificar el esquema fuera de una migración.
- Al cambiar el esquema, actualizar la migración correspondiente **y** el script consolidado para que sigan representando el mismo modelo.
- `product_lots.total_cost` es columna generada `STORED`; la API no la inserta.
- `products.tax_rate` define el IVA aplicable (por defecto `13.00`); los precios de venta ya incluyen IVA (D-02).

## Verificación de paridad

`esquema_consolidado.sql` se validó ejecutándolo en un esquema temporal de PostgreSQL y comparándolo con la base migrada por Flyway:

- mismas 21 tablas y mismas columnas (incluida `products.tax_rate`);
- mismas restricciones `PK`, `UNIQUE`, `FK` y `CHECK` (incluida `ck_products_tax_rate`);
- mismos índices, incluidos `ix_invoices_sale_id`, `ix_sale_details_sale_id` e `ix_sale_lot_allocations_sale_detail_id`.

## Migraciones oficiales

| Versión | Contenido | Estado |
|---|---|---|
| `V1` | Baseline del esquema de inventario | Aplicada |
| `V2` | Clientes | Aplicada |
| `V3` | Ventas, detalle, asignación de lotes y secuencias | Aplicada |
| `V4` | Facturación, detalle y pagos | Aplicada |
| `V5` | Imágenes de presentación | Aplicada |
| `V6` | `tax_rate` y secuencias iniciales | Aplicada |

Las migraciones viven en `Api/api/src/main/resources/db/migration/`.
