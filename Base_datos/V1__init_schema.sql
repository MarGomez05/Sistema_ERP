-- =====================================================================
-- V1__init_schema.sql
-- Esquema inicial consolidado (PostgreSQL): inventario, ventas y facturación.
--
-- Consolida en un solo script las 5 migraciones anteriores.
-- 21 tablas, creadas en orden de dependencia de llaves foráneas:
--   función de auditoría → seguridad → catálogos → productos y precios
--   → proveedores y lotes → clientes → ventas → facturación
--   → triggers de auditoría → datos base.
-- =====================================================================

CREATE FUNCTION set_audit_timestamps() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := COALESCE(NEW.created_at, CURRENT_TIMESTAMP);
    NEW.updated_at := COALESCE(NEW.updated_at, NEW.created_at);
  ELSE
    NEW.created_at := OLD.created_at;          -- la fecha de creación no cambia
    NEW.updated_at := CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_audit_timestamps() IS
  'Mantiene created_at (inmutable) y updated_at (fecha de la última modificación) en las tablas con auditoría completa (ver bloque de triggers al final).';

-- =====================================================================
-- SEGURIDAD
-- =====================================================================

-- 1. roles ------------------------------------------------------------
CREATE TABLE roles (
  id          BIGSERIAL     NOT NULL,
  code        VARCHAR(20)   NOT NULL,
  name        VARCHAR(50)   NOT NULL,
  description VARCHAR(255)  NULL,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_roles             PRIMARY KEY (id),
  CONSTRAINT uq_roles_code        UNIQUE (code),
  CONSTRAINT uq_roles_name        UNIQUE (name),
  CONSTRAINT ck_roles_code_format CHECK (code ~ '^[A-Z_]+$')
);

COMMENT ON TABLE  roles             IS 'Roles del sistema (RN-14, D-03, D-07). No son jerárquicos: cada endpoint declara qué roles acepta.';
COMMENT ON COLUMN roles.id          IS 'Identificador del rol.';
COMMENT ON COLUMN roles.code        IS 'Código que usa la API para los permisos: ADMIN, WAREHOUSE, PURCHASING o SELLER (D-07).';
COMMENT ON COLUMN roles.name        IS 'Nombre que se muestra en pantalla (Administrador, Bodega, Compras, Vendedor).';
COMMENT ON COLUMN roles.description IS 'Descripción de lo que puede hacer el rol.';
COMMENT ON COLUMN roles.is_active   IS 'Borrado lógico: FALSE = rol desactivado.';
COMMENT ON COLUMN roles.created_at  IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN roles.updated_at  IS 'Fecha y hora de la última modificación.';

-- 2. users ------------------------------------------------------------
CREATE TABLE users (
  id            BIGSERIAL     NOT NULL,
  role_id       BIGINT        NOT NULL,
  username      VARCHAR(50)   NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  full_name     VARCHAR(150)  NOT NULL,
  email         VARCHAR(150)  NULL,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_users          PRIMARY KEY (id),
  CONSTRAINT uq_users_username UNIQUE (username),
  CONSTRAINT fk_users_role     FOREIGN KEY (role_id) REFERENCES roles (id)
);
CREATE UNIQUE INDEX uq_users_email ON users (lower(email));
CREATE INDEX ix_users_role_id ON users (role_id);

COMMENT ON TABLE  users               IS 'Usuarios del panel y de la app. No hay autorregistro: los crea el administrador (HU-02).';
COMMENT ON COLUMN users.id            IS 'Identificador del usuario.';
COMMENT ON COLUMN users.role_id       IS 'Rol del usuario (FK a roles).';
COMMENT ON COLUMN users.username      IS 'Nombre de usuario para iniciar sesión. Único.';
COMMENT ON COLUMN users.password_hash IS 'Contraseña cifrada con BCrypt (RNF-01). Nunca se devuelve en la API.';
COMMENT ON COLUMN users.full_name     IS 'Nombre completo de la persona.';
COMMENT ON COLUMN users.email         IS 'Correo electrónico. Opcional; único sin distinguir mayúsculas.';
COMMENT ON COLUMN users.is_active     IS 'Borrado lógico: un usuario inactivo no puede iniciar sesión (RN-13).';
COMMENT ON COLUMN users.created_at    IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN users.updated_at    IS 'Fecha y hora de la última modificación.';

-- =====================================================================
-- CATÁLOGOS
-- =====================================================================

-- 3. product_categories -----------------------------------------------
CREATE TABLE product_categories (
  id          BIGSERIAL     NOT NULL,
  name        VARCHAR(100)  NOT NULL,
  description VARCHAR(255)  NULL,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_product_categories PRIMARY KEY (id)
);
CREATE UNIQUE INDEX uq_product_categories_name ON product_categories (lower(name));

COMMENT ON TABLE  product_categories             IS 'Clasificación comercial del producto (ferretería, fontanería, agroquímicos...). HU-03.';
COMMENT ON COLUMN product_categories.id          IS 'Identificador de la categoría.';
COMMENT ON COLUMN product_categories.name        IS 'Nombre de la categoría. Único sin distinguir mayúsculas.';
COMMENT ON COLUMN product_categories.description IS 'Descripción opcional.';
COMMENT ON COLUMN product_categories.is_active   IS 'Borrado lógico.';
COMMENT ON COLUMN product_categories.created_at  IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN product_categories.updated_at  IS 'Fecha y hora de la última modificación.';

-- 4. product_types ----------------------------------------------------
CREATE TABLE product_types (
  id          BIGSERIAL     NOT NULL,
  name        VARCHAR(100)  NOT NULL,
  description VARCHAR(255)  NULL,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_product_types PRIMARY KEY (id)
);
CREATE UNIQUE INDEX uq_product_types_name ON product_types (lower(name));

COMMENT ON TABLE  product_types             IS 'Clasificación por naturaleza del artículo (insumo, herramienta, material, químico). Filtro extra (D-08); se carga con datos iniciales (HU-20 aplazada).';
COMMENT ON COLUMN product_types.id          IS 'Identificador del tipo de producto.';
COMMENT ON COLUMN product_types.name        IS 'Nombre del tipo. Único sin distinguir mayúsculas.';
COMMENT ON COLUMN product_types.description IS 'Descripción opcional.';
COMMENT ON COLUMN product_types.is_active   IS 'Borrado lógico.';
COMMENT ON COLUMN product_types.created_at  IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN product_types.updated_at  IS 'Fecha y hora de la última modificación.';

-- 5. product_brands ---------------------------------------------------
CREATE TABLE product_brands (
  id          BIGSERIAL     NOT NULL,
  name        VARCHAR(100)  NOT NULL,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_product_brands PRIMARY KEY (id)
);
CREATE UNIQUE INDEX uq_product_brands_name ON product_brands (lower(name));

COMMENT ON TABLE  product_brands            IS 'Fabricantes o marcas de los productos (HU-04).';
COMMENT ON COLUMN product_brands.id         IS 'Identificador de la marca.';
COMMENT ON COLUMN product_brands.name       IS 'Nombre de la marca. Único sin distinguir mayúsculas (evita Ferromax / FERROMAX).';
COMMENT ON COLUMN product_brands.is_active  IS 'Borrado lógico.';
COMMENT ON COLUMN product_brands.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN product_brands.updated_at IS 'Fecha y hora de la última modificación.';

-- 6. product_models ---------------------------------------------------
CREATE TABLE product_models (
  id               BIGSERIAL     NOT NULL,
  product_brand_id BIGINT        NOT NULL,
  name             VARCHAR(100)  NOT NULL,
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_product_models       PRIMARY KEY (id),
  CONSTRAINT fk_product_models_brand FOREIGN KEY (product_brand_id) REFERENCES product_brands (id)
);
CREATE UNIQUE INDEX uq_product_models_brand_name ON product_models (product_brand_id, lower(name));

COMMENT ON TABLE  product_models                  IS 'Modelos o referencias de cada marca (HU-04). El producto llega a su marca a través del modelo.';
COMMENT ON COLUMN product_models.id               IS 'Identificador del modelo.';
COMMENT ON COLUMN product_models.product_brand_id IS 'Marca a la que pertenece el modelo (FK a product_brands).';
COMMENT ON COLUMN product_models.name             IS 'Nombre del modelo. Único dentro de la misma marca, sin distinguir mayúsculas.';
COMMENT ON COLUMN product_models.is_active        IS 'Borrado lógico.';
COMMENT ON COLUMN product_models.created_at       IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN product_models.updated_at       IS 'Fecha y hora de la última modificación.';

-- 7. measure_units ----------------------------------------------------
CREATE TABLE measure_units (
  id          BIGSERIAL     NOT NULL,
  name        VARCHAR(50)   NOT NULL,
  code        VARCHAR(10)   NOT NULL,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_measure_units PRIMARY KEY (id)
);
CREATE UNIQUE INDEX uq_measure_units_name ON measure_units (lower(name));
CREATE UNIQUE INDEX uq_measure_units_code ON measure_units (lower(code));

COMMENT ON TABLE  measure_units            IS 'Unidades en que se expresa una presentación: libra, kilogramo, litro, galón, unidad, metro (HU-05).';
COMMENT ON COLUMN measure_units.id         IS 'Identificador de la unidad de medida.';
COMMENT ON COLUMN measure_units.name       IS 'Nombre de la unidad. Único sin distinguir mayúsculas.';
COMMENT ON COLUMN measure_units.code       IS 'Abreviatura de la unidad (LB, KG, L...). Única, máximo 10 caracteres.';
COMMENT ON COLUMN measure_units.is_active  IS 'Borrado lógico.';
COMMENT ON COLUMN measure_units.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN measure_units.updated_at IS 'Fecha y hora de la última modificación.';

-- 8. presentations ----------------------------------------------------
CREATE TABLE presentations (
  id              BIGSERIAL      NOT NULL,
  measure_unit_id BIGINT         NOT NULL,
  name            VARCHAR(100)   NOT NULL,
  quantity        NUMERIC(10,2)  NOT NULL,
  is_active       BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_presentations              PRIMARY KEY (id),
  CONSTRAINT fk_presentations_measure_unit FOREIGN KEY (measure_unit_id) REFERENCES measure_units (id),
  CONSTRAINT ck_presentations_quantity     CHECK (quantity > 0)
);
CREATE UNIQUE INDEX uq_presentations_name ON presentations (lower(name));
CREATE INDEX ix_presentations_measure_unit_id ON presentations (measure_unit_id);

COMMENT ON TABLE  presentations                 IS 'Formas de venta (Libra, Caja 25 lb, Saco 100 lb, Galón...). Cada una se expresa en una unidad y contiene una cantidad (RN-04).';
COMMENT ON COLUMN presentations.id              IS 'Identificador de la presentación.';
COMMENT ON COLUMN presentations.measure_unit_id IS 'Unidad de medida en que se expresa el contenido (FK a measure_units).';
COMMENT ON COLUMN presentations.name            IS 'Nombre de la presentación. Único sin distinguir mayúsculas; incluye el contenido cuando hay empaques del mismo nombre (Caja 25 lb, Caja 1000 u).';
COMMENT ON COLUMN presentations.quantity        IS 'Cantidad contenida en la unidad de medida (p. ej. 25 libras). Mayor que cero.';
COMMENT ON COLUMN presentations.is_active       IS 'Borrado lógico.';
COMMENT ON COLUMN presentations.created_at      IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN presentations.updated_at      IS 'Fecha y hora de la última modificación.';

-- =====================================================================
-- PRODUCTOS Y PRECIOS
-- =====================================================================

-- 9. products ---------------------------------------------------------
CREATE TABLE products (
  id                  BIGSERIAL     NOT NULL,
  product_category_id BIGINT        NOT NULL,
  product_type_id     BIGINT        NOT NULL,
  product_model_id    BIGINT        NULL,
  code                VARCHAR(50)   NOT NULL,
  name                VARCHAR(150)  NOT NULL,
  description         VARCHAR(255)  NULL,
  requires_expiration BOOLEAN       NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_products          PRIMARY KEY (id),
  CONSTRAINT uq_products_code     UNIQUE (code),
  CONSTRAINT fk_products_category FOREIGN KEY (product_category_id) REFERENCES product_categories (id),
  CONSTRAINT fk_products_type     FOREIGN KEY (product_type_id)     REFERENCES product_types (id),
  CONSTRAINT fk_products_model    FOREIGN KEY (product_model_id)    REFERENCES product_models (id)
);
CREATE INDEX ix_products_product_category_id ON products (product_category_id);
CREATE INDEX ix_products_product_type_id     ON products (product_type_id);
CREATE INDEX ix_products_product_model_id    ON products (product_model_id);

COMMENT ON TABLE  products                     IS 'Artículos que vende el negocio (HU-06). Pertenecen a una categoría y a un tipo; pueden tener modelo (y por él, marca). RN-01, RN-02.';
COMMENT ON COLUMN products.id                  IS 'Identificador del producto.';
COMMENT ON COLUMN products.product_category_id IS 'Categoría del producto (FK a product_categories).';
COMMENT ON COLUMN products.product_type_id     IS 'Tipo de producto (FK a product_types).';
COMMENT ON COLUMN products.product_model_id    IS 'Modelo del producto (FK a product_models). Opcional.';
COMMENT ON COLUMN products.code                IS 'Código interno del producto (p. ej. FER-001). Único (RN-01).';
COMMENT ON COLUMN products.name                IS 'Nombre del producto.';
COMMENT ON COLUMN products.description         IS 'Descripción opcional.';
COMMENT ON COLUMN products.requires_expiration IS 'TRUE si sus lotes exigen fecha de vencimiento (químicos, semillas, pinturas). D-01, RN-08.';
COMMENT ON COLUMN products.is_active           IS 'Borrado lógico (RN-13).';
COMMENT ON COLUMN products.created_at          IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN products.updated_at          IS 'Fecha y hora de la última modificación.';

-- 10. product_presentations -------------------------------------------
CREATE TABLE product_presentations (
  id              BIGSERIAL      NOT NULL,
  product_id      BIGINT         NOT NULL,
  presentation_id BIGINT         NOT NULL,
  code            VARCHAR(50)    NOT NULL,
  min_stock       NUMERIC(12,2)  NOT NULL,
  image_url       VARCHAR(500)   NULL,
  image_alt       VARCHAR(150)   NULL,
  is_active       BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_product_presentations                      PRIMARY KEY (id),
  CONSTRAINT uq_product_presentations_code                 UNIQUE (code),
  CONSTRAINT uq_product_presentations_product_presentation UNIQUE (product_id, presentation_id),
  CONSTRAINT fk_product_presentations_product      FOREIGN KEY (product_id)      REFERENCES products (id),
  CONSTRAINT fk_product_presentations_presentation FOREIGN KEY (presentation_id) REFERENCES presentations (id),
  CONSTRAINT ck_product_presentations_min_stock    CHECK (min_stock > 0)
);
CREATE INDEX ix_product_presentations_presentation_id ON product_presentations (presentation_id);

COMMENT ON TABLE  product_presentations                 IS 'Presentaciones en que se vende cada producto, con su stock mínimo (HU-07, RN-03). La existencia NO se guarda: es SUM(available_quantity) de sus lotes activos (RN-09).';
COMMENT ON COLUMN product_presentations.id              IS 'Identificador de la presentación del producto.';
COMMENT ON COLUMN product_presentations.product_id      IS 'Producto (FK a products).';
COMMENT ON COLUMN product_presentations.presentation_id IS 'Presentación (FK a presentations). La combinación producto + presentación es única.';
COMMENT ON COLUMN product_presentations.code            IS 'Código de la presentación del producto (p. ej. FER-001-CJ25). Único en todo el sistema; se usa en la búsqueda de la app.';
COMMENT ON COLUMN product_presentations.min_stock       IS 'Stock mínimo de esta presentación. Mayor que cero. Bajo stock si existencia <= mínimo (RN-10).';
COMMENT ON COLUMN product_presentations.image_url       IS 'URL o ruta relativa de la imagen. Máximo 500 caracteres.';
COMMENT ON COLUMN product_presentations.image_alt       IS 'Texto alternativo de la imagen. Máximo 150 caracteres.';
COMMENT ON COLUMN product_presentations.is_active       IS 'Borrado lógico.';
COMMENT ON COLUMN product_presentations.created_at      IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN product_presentations.updated_at      IS 'Fecha y hora de la última modificación.';

-- 11. product_prices --------------------------------------------------
--     Sin is_active: el historial se controla con end_date.
CREATE TABLE product_prices (
  id                      BIGSERIAL      NOT NULL,
  product_presentation_id BIGINT         NOT NULL,
  user_id                 BIGINT         NOT NULL,
  price                   NUMERIC(10,2)  NOT NULL,
  start_date              TIMESTAMP      NOT NULL,
  end_date                TIMESTAMP      NULL,
  created_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_product_prices                      PRIMARY KEY (id),
  CONSTRAINT fk_product_prices_product_presentation FOREIGN KEY (product_presentation_id) REFERENCES product_presentations (id),
  CONSTRAINT fk_product_prices_user                 FOREIGN KEY (user_id)                 REFERENCES users (id),
  CONSTRAINT ck_product_prices_price                CHECK (price > 0),
  CONSTRAINT ck_product_prices_dates                CHECK (end_date IS NULL OR end_date >= start_date)
);
-- Un solo precio vigente (end_date IS NULL) por presentación del producto (RN-05, P-11)
CREATE UNIQUE INDEX uq_product_prices_current
  ON product_prices (product_presentation_id) WHERE end_date IS NULL;
CREATE INDEX ix_product_prices_history ON product_prices (product_presentation_id, start_date DESC);
CREATE INDEX ix_product_prices_user_id ON product_prices (user_id);

COMMENT ON TABLE  product_prices                         IS 'Historial de precios de venta por presentación (HU-08, RN-05). Vigente = end_date IS NULL; solo uno por presentación.';
COMMENT ON COLUMN product_prices.id                      IS 'Identificador del registro de precio.';
COMMENT ON COLUMN product_prices.product_presentation_id IS 'Presentación del producto a la que aplica el precio (FK a product_presentations).';
COMMENT ON COLUMN product_prices.user_id                 IS 'Usuario que registró o autorizó el cambio (FK a users; la API lo toma del token).';
COMMENT ON COLUMN product_prices.price                   IS 'Precio de venta en US$. Mayor que cero.';
COMMENT ON COLUMN product_prices.start_date              IS 'Inicio de vigencia del precio.';
COMMENT ON COLUMN product_prices.end_date                IS 'Fin de vigencia. NULL = precio vigente. No puede ser anterior a start_date.';
COMMENT ON COLUMN product_prices.created_at              IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN product_prices.updated_at              IS 'Fecha y hora de la última modificación.';

-- =====================================================================
-- PROVEEDORES Y LOTES
-- =====================================================================

-- 12. suppliers -------------------------------------------------------
CREATE TABLE suppliers (
  id          BIGSERIAL     NOT NULL,
  trade_name  VARCHAR(150)  NOT NULL,
  legal_name  VARCHAR(150)  NOT NULL,
  nit         VARCHAR(17)   NOT NULL,
  nrc         VARCHAR(10)   NULL,
  address     VARCHAR(255)  NULL,
  phone       VARCHAR(20)   NULL,
  email       VARCHAR(150)  NULL,
  credit_days INTEGER       NOT NULL,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_suppliers             PRIMARY KEY (id),
  CONSTRAINT uq_suppliers_nit         UNIQUE (nit),
  CONSTRAINT uq_suppliers_nrc         UNIQUE (nrc),
  CONSTRAINT ck_suppliers_credit_days CHECK (credit_days >= 0)
);
CREATE UNIQUE INDEX uq_suppliers_email ON suppliers (lower(email));

COMMENT ON TABLE  suppliers             IS 'Proveedores de mercadería (HU-09). Fuera del alcance: contactos, límite de crédito y marcas que vende (RN-15).';
COMMENT ON COLUMN suppliers.id          IS 'Identificador del proveedor.';
COMMENT ON COLUMN suppliers.trade_name  IS 'Nombre comercial.';
COMMENT ON COLUMN suppliers.legal_name  IS 'Razón social.';
COMMENT ON COLUMN suppliers.nit         IS 'NIT de 14 dígitos (0000-000000-000-0) o DUI usado como NIT (00000000-0). Único; formato validado en la API (P-08).';
COMMENT ON COLUMN suppliers.nrc         IS 'Número de registro de contribuyente (p. ej. 245781-3). Opcional y único.';
COMMENT ON COLUMN suppliers.address     IS 'Dirección.';
COMMENT ON COLUMN suppliers.phone       IS 'Teléfono (dígitos, espacios, + y -).';
COMMENT ON COLUMN suppliers.email       IS 'Correo para pedidos. Opcional; único sin distinguir mayúsculas.';
COMMENT ON COLUMN suppliers.credit_days IS 'Días de crédito que otorga el proveedor. Cero o positivo.';
COMMENT ON COLUMN suppliers.is_active   IS 'Borrado lógico (RN-13).';
COMMENT ON COLUMN suppliers.created_at  IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN suppliers.updated_at  IS 'Fecha y hora de la última modificación.';

-- 13. product_lots ----------------------------------------------------
CREATE TABLE product_lots (
  id                      BIGSERIAL      NOT NULL,
  product_presentation_id BIGINT         NOT NULL,
  supplier_id             BIGINT         NOT NULL,
  user_id                 BIGINT         NOT NULL,
  lot_number              VARCHAR(50)    NOT NULL,
  invoice_number          VARCHAR(50)    NOT NULL,
  invoice_date            DATE           NOT NULL,
  entry_date              DATE           NOT NULL DEFAULT CURRENT_DATE,
  expiration_date         DATE           NULL,
  received_quantity       NUMERIC(12,2)  NOT NULL,
  available_quantity      NUMERIC(12,2)  NOT NULL,
  unit_cost               NUMERIC(10,2)  NOT NULL,
  total_cost              NUMERIC(12,2)  GENERATED ALWAYS AS (round(received_quantity * unit_cost, 2)) STORED NOT NULL,
  notes                   VARCHAR(200)   NULL,
  is_active               BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_product_lots                      PRIMARY KEY (id),
  CONSTRAINT uq_product_lots_supplier_lot_pp      UNIQUE (supplier_id, lot_number, product_presentation_id),
  CONSTRAINT fk_product_lots_product_presentation FOREIGN KEY (product_presentation_id) REFERENCES product_presentations (id),
  CONSTRAINT fk_product_lots_supplier             FOREIGN KEY (supplier_id)             REFERENCES suppliers (id),
  CONSTRAINT fk_product_lots_user                 FOREIGN KEY (user_id)                 REFERENCES users (id),
  CONSTRAINT ck_product_lots_received_quantity    CHECK (received_quantity > 0),
  CONSTRAINT ck_product_lots_available_quantity   CHECK (available_quantity >= 0 AND available_quantity <= received_quantity),
  CONSTRAINT ck_product_lots_unit_cost            CHECK (unit_cost >= 0),
  CONSTRAINT ck_product_lots_expiration_date      CHECK (expiration_date IS NULL OR expiration_date > entry_date)
);
CREATE INDEX ix_product_lots_product_presentation_id ON product_lots (product_presentation_id);
CREATE INDEX ix_product_lots_user_id                 ON product_lots (user_id);
CREATE INDEX ix_product_lots_expiration_date         ON product_lots (expiration_date);

COMMENT ON TABLE  product_lots                         IS 'Ingresos de mercadería por lote (HU-10, HU-11, RN-06). Un registro por presentación recibida (D-02). Lote activo: is_active = TRUE y available_quantity > 0.';
COMMENT ON COLUMN product_lots.id                      IS 'Identificador del lote.';
COMMENT ON COLUMN product_lots.product_presentation_id IS 'Presentación del producto que ingresa (FK a product_presentations).';
COMMENT ON COLUMN product_lots.supplier_id             IS 'Proveedor que entregó el lote (FK a suppliers).';
COMMENT ON COLUMN product_lots.user_id                 IS 'Usuario que registró el ingreso (FK a users; la API lo toma del token).';
COMMENT ON COLUMN product_lots.lot_number              IS 'Número de lote del proveedor. Único por proveedor y presentación (P-07). Sin lote del proveedor: SL-<factura>; inventario inicial: INI-<código>.';
COMMENT ON COLUMN product_lots.invoice_number          IS 'Número de la factura o CCF de compra.';
COMMENT ON COLUMN product_lots.invoice_date            IS 'Fecha de emisión de la factura. No puede ser futura (validación de la API).';
COMMENT ON COLUMN product_lots.entry_date              IS 'Fecha de ingreso a bodega. Por defecto, la fecha actual.';
COMMENT ON COLUMN product_lots.expiration_date         IS 'Fecha de vencimiento. Obligatoria si products.requires_expiration = TRUE (validación de la API, D-01); si existe, posterior a entry_date.';
COMMENT ON COLUMN product_lots.received_quantity       IS 'Cantidad recibida según el conteo físico. Mayor que cero.';
COMMENT ON COLUMN product_lots.available_quantity      IS 'Cantidad que queda disponible. Entre 0 y received_quantity. Se corrige con HU-11.';
COMMENT ON COLUMN product_lots.unit_cost               IS 'Costo unitario pagado al proveedor (US$). Cero o positivo. Solo lo ven ADMIN y PURCHASING (RN-12).';
COMMENT ON COLUMN product_lots.total_cost              IS 'Columna generada: round(received_quantity * unit_cost, 2). La API no la envía (insertable = false, updatable = false).';
COMMENT ON COLUMN product_lots.notes                   IS 'Observaciones (p. ej. diferencias entre lo facturado y lo contado). Máximo 200 caracteres.';
COMMENT ON COLUMN product_lots.is_active               IS 'Borrado lógico.';
COMMENT ON COLUMN product_lots.created_at              IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN product_lots.updated_at              IS 'Fecha y hora de la última modificación.';

-- =====================================================================
-- CLIENTES
-- =====================================================================

-- 14. customers -------------------------------------------------------
CREATE TABLE customers (
  id               BIGSERIAL      NOT NULL,
  customer_type    VARCHAR(20)    NOT NULL,
  document_type    VARCHAR(10)    NULL,
  document_number  VARCHAR(20)    NULL,
  legal_name       VARCHAR(200)   NOT NULL,
  trade_name       VARCHAR(200)   NULL,
  nit              VARCHAR(17)    NULL,
  nrc              VARCHAR(10)    NULL,
  dui              VARCHAR(10)    NULL,
  address          VARCHAR(255)   NULL,
  phone            VARCHAR(20)    NULL,
  email            VARCHAR(150)   NULL,
  credit_limit     NUMERIC(12,2)  NOT NULL DEFAULT 0,
  credit_days      INTEGER        NOT NULL DEFAULT 0,
  is_active        BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_customers               PRIMARY KEY (id),
  CONSTRAINT ck_customers_type          CHECK (customer_type IN ('NATURAL', 'BUSINESS')),
  CONSTRAINT ck_customers_document_type CHECK (
    document_type IS NULL OR document_type IN ('DUI', 'NIT', 'PASSPORT', 'FOREIGN')
  ),
  CONSTRAINT ck_customers_credit_limit  CHECK (credit_limit >= 0),
  CONSTRAINT ck_customers_credit_days   CHECK (credit_days >= 0)
);
-- Documentos y correo únicos solo cuando vienen informados.
CREATE UNIQUE INDEX uq_customers_document_number ON customers (document_number) WHERE document_number IS NOT NULL;
CREATE UNIQUE INDEX uq_customers_nit             ON customers (nit)             WHERE nit IS NOT NULL;
CREATE UNIQUE INDEX uq_customers_nrc             ON customers (nrc)             WHERE nrc IS NOT NULL;
CREATE UNIQUE INDEX uq_customers_dui             ON customers (dui)             WHERE dui IS NOT NULL;
CREATE UNIQUE INDEX uq_customers_email           ON customers (lower(email))    WHERE email IS NOT NULL;
CREATE INDEX ix_customers_legal_name ON customers (lower(legal_name));
CREATE INDEX ix_customers_is_active  ON customers (is_active);

COMMENT ON TABLE  customers                 IS 'Clientes naturales y jurídicos (Endpoints-API.md §10).';
COMMENT ON COLUMN customers.customer_type   IS 'NATURAL o BUSINESS.';
COMMENT ON COLUMN customers.document_type   IS 'DUI, NIT, PASSPORT o FOREIGN. Opcional.';
COMMENT ON COLUMN customers.document_number IS 'Número de documento. Único cuando no es nulo.';
COMMENT ON COLUMN customers.legal_name      IS 'Nombre o razón social. Obligatorio.';
COMMENT ON COLUMN customers.trade_name      IS 'Nombre comercial. Opcional.';
COMMENT ON COLUMN customers.nit             IS 'NIT. Único cuando no es nulo.';
COMMENT ON COLUMN customers.nrc             IS 'NRC. Único cuando no es nulo.';
COMMENT ON COLUMN customers.dui             IS 'DUI. Único cuando no es nulo.';
COMMENT ON COLUMN customers.email           IS 'Correo. Único sin distinguir mayúsculas cuando no es nulo.';
COMMENT ON COLUMN customers.credit_limit    IS 'Límite de crédito en US$. Cero o positivo.';
COMMENT ON COLUMN customers.credit_days     IS 'Días de crédito otorgados. Cero o positivo.';
COMMENT ON COLUMN customers.is_active       IS 'Borrado lógico: FALSE = cliente desactivado.';

-- =====================================================================
-- VENTAS
-- =====================================================================

-- 15. document_sequences ----------------------------------------------
CREATE TABLE document_sequences (
  id             BIGSERIAL    NOT NULL,
  document_type  VARCHAR(20)  NOT NULL,
  prefix         VARCHAR(10)  NOT NULL,
  year           INTEGER      NOT NULL,
  current_number BIGINT       NOT NULL DEFAULT 0,
  version        BIGINT       NOT NULL DEFAULT 0,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_document_sequences           PRIMARY KEY (id),
  CONSTRAINT uq_document_sequences_type_year UNIQUE (document_type, year),
  CONSTRAINT ck_document_sequences_type      CHECK (document_type IN ('SALE', 'INVOICE', 'CCF', 'CREDIT_NOTE')),
  CONSTRAINT ck_document_sequences_year      CHECK (year >= 2000),
  CONSTRAINT ck_document_sequences_number    CHECK (current_number >= 0),
  CONSTRAINT ck_document_sequences_version   CHECK (version >= 0)
);

COMMENT ON TABLE  document_sequences                IS 'Correlativos por tipo de documento y año. Se leen con SELECT ... FOR UPDATE.';
COMMENT ON COLUMN document_sequences.document_type  IS 'SALE, INVOICE, CCF o CREDIT_NOTE.';
COMMENT ON COLUMN document_sequences.prefix         IS 'Prefijo del número: V-, F-, CCF-, NC-.';
COMMENT ON COLUMN document_sequences.year           IS 'Año del correlativo.';
COMMENT ON COLUMN document_sequences.current_number IS 'Último número emitido.';
COMMENT ON COLUMN document_sequences.version        IS 'Control de concurrencia optimista.';

-- 16. sales -----------------------------------------------------------
CREATE TABLE sales (
  id                BIGSERIAL      NOT NULL,
  sale_number       VARCHAR(30)    NOT NULL,
  customer_id       BIGINT         NULL,
  user_id           BIGINT         NOT NULL,
  sale_date         TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status            VARCHAR(20)    NOT NULL,
  payment_condition VARCHAR(20)    NOT NULL,
  payment_method    VARCHAR(20)    NULL,
  subtotal          NUMERIC(12,2)  NOT NULL DEFAULT 0,
  discount_total    NUMERIC(12,2)  NOT NULL DEFAULT 0,
  tax_total         NUMERIC(12,2)  NOT NULL DEFAULT 0,
  total             NUMERIC(12,2)  NOT NULL DEFAULT 0,
  paid_total        NUMERIC(12,2)  NOT NULL DEFAULT 0,
  notes             VARCHAR(255)   NULL,
  cancelled_at      TIMESTAMP      NULL,
  cancelled_by      BIGINT         NULL,
  cancel_reason     VARCHAR(255)   NULL,
  created_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_sales                   PRIMARY KEY (id),
  CONSTRAINT uq_sales_number            UNIQUE (sale_number),
  CONSTRAINT fk_sales_customer          FOREIGN KEY (customer_id)  REFERENCES customers (id),
  CONSTRAINT fk_sales_user              FOREIGN KEY (user_id)      REFERENCES users (id),
  CONSTRAINT fk_sales_cancelled_by      FOREIGN KEY (cancelled_by) REFERENCES users (id),
  CONSTRAINT ck_sales_status            CHECK (status IN ('DRAFT', 'CONFIRMED', 'CANCELLED')),
  CONSTRAINT ck_sales_payment_condition CHECK (payment_condition IN ('CASH', 'CREDIT')),
  CONSTRAINT ck_sales_payment_method    CHECK (
    payment_method IS NULL OR payment_method IN ('CASH', 'CARD', 'TRANSFER', 'OTHER')
  ),
  CONSTRAINT ck_sales_subtotal          CHECK (subtotal >= 0),
  CONSTRAINT ck_sales_discount_total    CHECK (discount_total >= 0),
  CONSTRAINT ck_sales_tax_total         CHECK (tax_total >= 0),
  CONSTRAINT ck_sales_total             CHECK (total >= 0),
  CONSTRAINT ck_sales_paid_total        CHECK (paid_total >= 0)
);
CREATE INDEX ix_sales_customer_id ON sales (customer_id);
CREATE INDEX ix_sales_user_id     ON sales (user_id);
CREATE INDEX ix_sales_sale_date   ON sales (sale_date);
CREATE INDEX ix_sales_status      ON sales (status);

COMMENT ON TABLE  sales                   IS 'Ventas del ERP. Estado: DRAFT → CONFIRMED → CANCELLED.';
COMMENT ON COLUMN sales.sale_number       IS 'Número generado por document_sequences. Único.';
COMMENT ON COLUMN sales.customer_id       IS 'Cliente. Nulo para consumidor final.';
COMMENT ON COLUMN sales.user_id           IS 'Vendedor tomado del JWT, nunca del body.';
COMMENT ON COLUMN sales.status            IS 'DRAFT, CONFIRMED o CANCELLED.';
COMMENT ON COLUMN sales.payment_condition IS 'CASH o CREDIT.';
COMMENT ON COLUMN sales.payment_method    IS 'CASH, CARD, TRANSFER u OTHER. Opcional.';
COMMENT ON COLUMN sales.paid_total        IS 'Total pagado a nivel de venta.';

-- 17. sale_details ----------------------------------------------------
CREATE TABLE sale_details (
  id                      BIGSERIAL      NOT NULL,
  sale_id                 BIGINT         NOT NULL,
  product_presentation_id BIGINT         NOT NULL,
  quantity                NUMERIC(12,2)  NOT NULL,
  unit_price              NUMERIC(10,2)  NOT NULL,
  discount                NUMERIC(12,2)  NOT NULL DEFAULT 0,
  tax_rate                NUMERIC(5,2)   NOT NULL DEFAULT 13.00,
  tax_amount              NUMERIC(12,2)  NOT NULL DEFAULT 0,
  line_subtotal           NUMERIC(12,2)  NOT NULL DEFAULT 0,
  line_total              NUMERIC(12,2)  NOT NULL DEFAULT 0,
  created_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_sale_details                      PRIMARY KEY (id),
  CONSTRAINT uq_sale_details_sale_presentation    UNIQUE (sale_id, product_presentation_id),
  CONSTRAINT fk_sale_details_sale                 FOREIGN KEY (sale_id) REFERENCES sales (id),
  CONSTRAINT fk_sale_details_product_presentation FOREIGN KEY (product_presentation_id)
    REFERENCES product_presentations (id),
  CONSTRAINT ck_sale_details_quantity             CHECK (quantity > 0),
  CONSTRAINT ck_sale_details_unit_price           CHECK (unit_price > 0),
  CONSTRAINT ck_sale_details_discount             CHECK (discount >= 0),
  CONSTRAINT ck_sale_details_tax_rate             CHECK (tax_rate >= 0 AND tax_rate <= 100),
  CONSTRAINT ck_sale_details_tax_amount           CHECK (tax_amount >= 0),
  CONSTRAINT ck_sale_details_line_subtotal        CHECK (line_subtotal >= 0),
  CONSTRAINT ck_sale_details_line_total           CHECK (line_total >= 0)
);
-- sale_id no lleva índice propio: ya es la primera columna de uq_sale_details_sale_presentation.
CREATE INDEX ix_sale_details_product_presentation_id ON sale_details (product_presentation_id);

COMMENT ON TABLE  sale_details            IS 'Líneas de la venta con precio e IVA congelados.';
COMMENT ON COLUMN sale_details.unit_price IS 'Precio de venta congelado al momento de la venta.';

-- 18. sale_lot_allocations --------------------------------------------
--     Asignación de lotes (FEFO). Sin updated_at: solo se inserta y se lee.
CREATE TABLE sale_lot_allocations (
  id             BIGSERIAL      NOT NULL,
  sale_detail_id BIGINT         NOT NULL,
  product_lot_id BIGINT         NOT NULL,
  quantity       NUMERIC(12,2)  NOT NULL,
  unit_cost      NUMERIC(10,2)  NOT NULL,
  created_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_sale_lot_allocations             PRIMARY KEY (id),
  CONSTRAINT uq_sale_lot_allocations_detail_lot  UNIQUE (sale_detail_id, product_lot_id),
  CONSTRAINT fk_sale_lot_allocations_sale_detail FOREIGN KEY (sale_detail_id) REFERENCES sale_details (id),
  CONSTRAINT fk_sale_lot_allocations_product_lot FOREIGN KEY (product_lot_id) REFERENCES product_lots (id),
  CONSTRAINT ck_sale_lot_allocations_quantity    CHECK (quantity > 0),
  CONSTRAINT ck_sale_lot_allocations_unit_cost   CHECK (unit_cost >= 0)
);
-- sale_detail_id no lleva índice propio: ya es la primera columna de uq_sale_lot_allocations_detail_lot.
CREATE INDEX ix_sale_lot_allocations_product_lot_id ON sale_lot_allocations (product_lot_id);

COMMENT ON TABLE  sale_lot_allocations           IS 'Lotes consumidos por línea de venta. Permite devolver stock al lote correcto al cancelar.';
COMMENT ON COLUMN sale_lot_allocations.unit_cost IS 'Costo unitario congelado del lote. Solo uso interno.';

-- =====================================================================
-- FACTURACIÓN
-- =====================================================================

-- 19. invoices --------------------------------------------------------
CREATE TABLE invoices (
  id                       BIGSERIAL      NOT NULL,
  invoice_number           VARCHAR(30)    NOT NULL,
  control_number           VARCHAR(30)    NULL,
  invoice_type             VARCHAR(20)    NOT NULL,
  sale_id                  BIGINT         NULL,
  customer_id              BIGINT         NULL,
  related_invoice_id       BIGINT         NULL,
  issue_date               DATE           NOT NULL,
  due_date                 DATE           NULL,
  status                   VARCHAR(20)    NOT NULL,
  payment_condition        VARCHAR(20)    NOT NULL,
  subtotal                 NUMERIC(12,2)  NOT NULL DEFAULT 0,
  discount_total           NUMERIC(12,2)  NOT NULL DEFAULT 0,
  tax_total                NUMERIC(12,2)  NOT NULL DEFAULT 0,
  total                    NUMERIC(12,2)  NOT NULL DEFAULT 0,
  paid_total               NUMERIC(12,2)  NOT NULL DEFAULT 0,
  customer_name            VARCHAR(200)   NOT NULL,
  customer_document_type   VARCHAR(10)    NULL,
  customer_document_number VARCHAR(20)    NULL,
  customer_nit             VARCHAR(17)    NULL,
  customer_nrc             VARCHAR(10)    NULL,
  customer_address         VARCHAR(255)   NULL,
  customer_email           VARCHAR(150)   NULL,
  notes                    VARCHAR(255)   NULL,
  cancelled_at             TIMESTAMP      NULL,
  cancelled_by             BIGINT         NULL,
  cancel_reason            VARCHAR(255)   NULL,
  created_by               BIGINT         NOT NULL,
  created_at               TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_invoices                   PRIMARY KEY (id),
  CONSTRAINT uq_invoices_number            UNIQUE (invoice_number),
  CONSTRAINT uq_invoices_control_number    UNIQUE (control_number),
  CONSTRAINT fk_invoices_sale              FOREIGN KEY (sale_id)            REFERENCES sales (id),
  CONSTRAINT fk_invoices_customer          FOREIGN KEY (customer_id)        REFERENCES customers (id),
  CONSTRAINT fk_invoices_related           FOREIGN KEY (related_invoice_id) REFERENCES invoices (id),
  CONSTRAINT fk_invoices_cancelled_by      FOREIGN KEY (cancelled_by)       REFERENCES users (id),
  CONSTRAINT fk_invoices_created_by        FOREIGN KEY (created_by)         REFERENCES users (id),
  CONSTRAINT ck_invoices_type              CHECK (invoice_type IN ('CONSUMER', 'CCF', 'CREDIT_NOTE')),
  CONSTRAINT ck_invoices_status            CHECK (status IN ('DRAFT', 'ISSUED', 'CANCELLED')),
  CONSTRAINT ck_invoices_payment_condition CHECK (payment_condition IN ('CASH', 'CREDIT')),
  CONSTRAINT ck_invoices_subtotal          CHECK (subtotal >= 0),
  CONSTRAINT ck_invoices_discount_total    CHECK (discount_total >= 0),
  CONSTRAINT ck_invoices_tax_total         CHECK (tax_total >= 0),
  CONSTRAINT ck_invoices_total             CHECK (total >= 0),
  CONSTRAINT ck_invoices_paid_total        CHECK (paid_total >= 0),
  CONSTRAINT ck_invoices_dates             CHECK (due_date IS NULL OR due_date >= issue_date),
  CONSTRAINT ck_invoices_credit_due_date   CHECK (
    payment_condition <> 'CREDIT' OR due_date IS NOT NULL
  ),
  CONSTRAINT ck_invoices_credit_note_related CHECK (
    invoice_type <> 'CREDIT_NOTE' OR related_invoice_id IS NOT NULL
  )
);
-- Una venta solo puede tener una factura emitida. Este índice único también
-- sirve para buscar por sale_id, por eso no hay un índice normal adicional.
CREATE UNIQUE INDEX uq_invoices_sale_id ON invoices (sale_id) WHERE sale_id IS NOT NULL;
CREATE INDEX ix_invoices_customer_id        ON invoices (customer_id);
CREATE INDEX ix_invoices_issue_date         ON invoices (issue_date);
CREATE INDEX ix_invoices_status             ON invoices (status);
CREATE INDEX ix_invoices_related_invoice_id ON invoices (related_invoice_id);

COMMENT ON TABLE  invoices                    IS 'Facturas emitidas. Inmutables: se cancelan con nota de crédito.';
COMMENT ON COLUMN invoices.invoice_number     IS 'Correlativo por tipo y año, generado con document_sequences.';
COMMENT ON COLUMN invoices.control_number     IS 'Número de control para CCF preimpreso. Opcional y único.';
COMMENT ON COLUMN invoices.invoice_type       IS 'CONSUMER, CCF o CREDIT_NOTE.';
COMMENT ON COLUMN invoices.related_invoice_id IS 'Factura original cuando el documento es nota de crédito.';
COMMENT ON COLUMN invoices.status             IS 'DRAFT, ISSUED o CANCELLED.';
COMMENT ON COLUMN invoices.customer_name      IS 'Snapshot fiscal del nombre del cliente al emitir.';

-- 20. invoice_details -------------------------------------------------
--     Snapshot inmutable de las líneas. Sin updated_at: solo se inserta y se lee.
CREATE TABLE invoice_details (
  id                      BIGSERIAL      NOT NULL,
  invoice_id              BIGINT         NOT NULL,
  product_presentation_id BIGINT         NULL,
  product_code            VARCHAR(50)    NOT NULL,
  product_name            VARCHAR(150)   NOT NULL,
  presentation_code       VARCHAR(50)    NOT NULL,
  presentation_name       VARCHAR(100)   NOT NULL,
  quantity                NUMERIC(12,2)  NOT NULL,
  unit_price              NUMERIC(10,2)  NOT NULL,
  discount                NUMERIC(12,2)  NOT NULL DEFAULT 0,
  tax_rate                NUMERIC(5,2)   NOT NULL DEFAULT 13.00,
  tax_amount              NUMERIC(12,2)  NOT NULL DEFAULT 0,
  line_subtotal           NUMERIC(12,2)  NOT NULL DEFAULT 0,
  line_total              NUMERIC(12,2)  NOT NULL DEFAULT 0,
  unit_cost               NUMERIC(10,2)  NULL,
  created_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_invoice_details                      PRIMARY KEY (id),
  CONSTRAINT fk_invoice_details_invoice              FOREIGN KEY (invoice_id) REFERENCES invoices (id),
  CONSTRAINT fk_invoice_details_product_presentation FOREIGN KEY (product_presentation_id)
    REFERENCES product_presentations (id),
  CONSTRAINT ck_invoice_details_quantity             CHECK (quantity > 0),
  CONSTRAINT ck_invoice_details_unit_price           CHECK (unit_price > 0),
  CONSTRAINT ck_invoice_details_discount             CHECK (discount >= 0),
  CONSTRAINT ck_invoice_details_tax_rate             CHECK (tax_rate >= 0 AND tax_rate <= 100),
  CONSTRAINT ck_invoice_details_tax_amount           CHECK (tax_amount >= 0),
  CONSTRAINT ck_invoice_details_line_subtotal        CHECK (line_subtotal >= 0),
  CONSTRAINT ck_invoice_details_line_total           CHECK (line_total >= 0),
  CONSTRAINT ck_invoice_details_unit_cost            CHECK (unit_cost IS NULL OR unit_cost >= 0)
);
CREATE INDEX ix_invoice_details_invoice_id              ON invoice_details (invoice_id);
CREATE INDEX ix_invoice_details_product_presentation_id ON invoice_details (product_presentation_id);

COMMENT ON TABLE  invoice_details           IS 'Snapshot de las líneas de la factura.';
COMMENT ON COLUMN invoice_details.unit_cost IS 'Costo congelado. Solo uso interno; no se expone a roles no autorizados.';

-- 21. invoice_payments ------------------------------------------------
--     Sin updated_at: los pagos no se editan.
CREATE TABLE invoice_payments (
  id             BIGSERIAL      NOT NULL,
  invoice_id     BIGINT         NOT NULL,
  payment_date   DATE           NOT NULL,
  amount         NUMERIC(12,2)  NOT NULL,
  payment_method VARCHAR(20)    NOT NULL,
  reference      VARCHAR(50)    NULL,
  notes          VARCHAR(255)   NULL,
  user_id        BIGINT         NOT NULL,
  created_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_invoice_payments         PRIMARY KEY (id),
  CONSTRAINT fk_invoice_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id),
  CONSTRAINT fk_invoice_payments_user    FOREIGN KEY (user_id)    REFERENCES users (id),
  CONSTRAINT ck_invoice_payments_amount  CHECK (amount > 0),
  CONSTRAINT ck_invoice_payments_method  CHECK (payment_method IN ('CASH', 'CARD', 'TRANSFER', 'CHECK', 'OTHER'))
);
CREATE INDEX ix_invoice_payments_invoice_id   ON invoice_payments (invoice_id);
CREATE INDEX ix_invoice_payments_payment_date ON invoice_payments (payment_date);

COMMENT ON TABLE  invoice_payments         IS 'Pagos aplicados a una factura. La suma no puede superar el total.';
COMMENT ON COLUMN invoice_payments.user_id IS 'Usuario que registra el pago; se toma del JWT.';

-- =====================================================================
-- TRIGGERS DE AUDITORÍA (18 tablas)
-- Excluidas a propósito: sale_lot_allocations, invoice_details e
-- invoice_payments. Son registros de solo inserción y no tienen updated_at.
-- =====================================================================
CREATE TRIGGER trg_roles_audit                  BEFORE INSERT OR UPDATE ON roles                 FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();
CREATE TRIGGER trg_users_audit                  BEFORE INSERT OR UPDATE ON users                 FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();
CREATE TRIGGER trg_product_categories_audit     BEFORE INSERT OR UPDATE ON product_categories    FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();
CREATE TRIGGER trg_product_types_audit          BEFORE INSERT OR UPDATE ON product_types         FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();
CREATE TRIGGER trg_product_brands_audit         BEFORE INSERT OR UPDATE ON product_brands        FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();
CREATE TRIGGER trg_product_models_audit         BEFORE INSERT OR UPDATE ON product_models        FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();
CREATE TRIGGER trg_measure_units_audit          BEFORE INSERT OR UPDATE ON measure_units         FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();
CREATE TRIGGER trg_presentations_audit          BEFORE INSERT OR UPDATE ON presentations         FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();
CREATE TRIGGER trg_products_audit               BEFORE INSERT OR UPDATE ON products              FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();
CREATE TRIGGER trg_product_presentations_audit  BEFORE INSERT OR UPDATE ON product_presentations FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();
CREATE TRIGGER trg_product_prices_audit         BEFORE INSERT OR UPDATE ON product_prices        FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();
CREATE TRIGGER trg_suppliers_audit              BEFORE INSERT OR UPDATE ON suppliers             FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();
CREATE TRIGGER trg_product_lots_audit           BEFORE INSERT OR UPDATE ON product_lots          FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();
CREATE TRIGGER trg_customers_audit              BEFORE INSERT OR UPDATE ON customers             FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();
CREATE TRIGGER trg_document_sequences_audit     BEFORE INSERT OR UPDATE ON document_sequences    FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();
CREATE TRIGGER trg_sales_audit                  BEFORE INSERT OR UPDATE ON sales                 FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();
CREATE TRIGGER trg_sale_details_audit           BEFORE INSERT OR UPDATE ON sale_details          FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();
CREATE TRIGGER trg_invoices_audit               BEFORE INSERT OR UPDATE ON invoices              FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();

-- ---------------------------------------------------------------------
-- Datos base mínimos: roles del sistema (no jerárquicos, D-07)
-- ---------------------------------------------------------------------
INSERT INTO roles (code, name, description) VALUES
  ('ADMIN',      'Administrador', 'Gerencia y soporte IT: usuarios, catálogos, productos, precios, proveedores, lotes, clientes, ventas, facturación, dashboard y reportes.'),
  ('WAREHOUSE',  'Bodega',        'Productos y presentaciones, ingreso y corrección de lotes, consulta de ventas, dashboard y consulta de productos.'),
  ('PURCHASING', 'Compras',       'Proveedores, costos de lotes, productos en bajo stock, consulta de productos, lotes, ventas y facturas.'),
  ('SELLER',     'Vendedor',      'Clientes, ventas propias, emisión de facturas y registro de pagos. No ve costos ni proveedores.')
ON CONFLICT (code) DO NOTHING;
