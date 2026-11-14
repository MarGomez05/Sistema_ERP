-- =====================================================================
-- TAMACHIHUA-ERP · V3 — Ventas y asignación FEFO
--
-- Crea la numeración de documentos, las ventas, su detalle y la
-- asignación de cantidades a lotes. Ver Implementacion.md §5.2 y §7.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Secuencias de documentos por tipo y año
-- ---------------------------------------------------------------------
CREATE TABLE document_sequences (
  id              BIGSERIAL    NOT NULL,
  document_type   VARCHAR(20)  NOT NULL,
  prefix          VARCHAR(10)  NOT NULL,
  year            INTEGER      NOT NULL,
  current_number  BIGINT       NOT NULL DEFAULT 0,
  version         BIGINT       NOT NULL DEFAULT 0,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_document_sequences PRIMARY KEY (id),
  CONSTRAINT uq_document_sequences_type_year UNIQUE (document_type, year),
  CONSTRAINT ck_document_sequences_type CHECK (
    document_type IN ('SALE', 'INVOICE', 'CCF', 'CREDIT_NOTE')
  ),
  CONSTRAINT ck_document_sequences_year CHECK (year >= 2000),
  CONSTRAINT ck_document_sequences_number CHECK (current_number >= 0),
  CONSTRAINT ck_document_sequences_version CHECK (version >= 0)
);

CREATE TRIGGER trg_document_sequences_audit
  BEFORE INSERT OR UPDATE ON document_sequences
  FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();

COMMENT ON TABLE  document_sequences               IS 'Correlativos por tipo de documento y año. Se leen con SELECT ... FOR UPDATE.';
COMMENT ON COLUMN document_sequences.document_type IS 'SALE, INVOICE, CCF o CREDIT_NOTE.';
COMMENT ON COLUMN document_sequences.prefix        IS 'Prefijo del número: V-, F-, CCF-, NC-.';
COMMENT ON COLUMN document_sequences.year          IS 'Año del correlativo.';
COMMENT ON COLUMN document_sequences.current_number IS 'Último número emitido.';
COMMENT ON COLUMN document_sequences.version       IS 'Control de concurrencia optimista.';

-- ---------------------------------------------------------------------
-- Ventas
-- ---------------------------------------------------------------------
CREATE TABLE sales (
  id                 BIGSERIAL      NOT NULL,
  sale_number        VARCHAR(30)    NOT NULL,
  customer_id        BIGINT         NULL,
  user_id            BIGINT         NOT NULL,
  sale_date          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status             VARCHAR(20)    NOT NULL,
  payment_condition  VARCHAR(20)    NOT NULL,
  payment_method     VARCHAR(20)    NULL,
  subtotal           NUMERIC(12,2)  NOT NULL DEFAULT 0,
  discount_total     NUMERIC(12,2)  NOT NULL DEFAULT 0,
  tax_total          NUMERIC(12,2)  NOT NULL DEFAULT 0,
  total              NUMERIC(12,2)  NOT NULL DEFAULT 0,
  paid_total         NUMERIC(12,2)  NOT NULL DEFAULT 0,
  notes              VARCHAR(255)   NULL,
  cancelled_at       TIMESTAMP      NULL,
  cancelled_by       BIGINT         NULL,
  cancel_reason      VARCHAR(255)   NULL,
  created_at         TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_sales PRIMARY KEY (id),
  CONSTRAINT uq_sales_number UNIQUE (sale_number),
  CONSTRAINT fk_sales_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
  CONSTRAINT fk_sales_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_sales_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users (id),
  CONSTRAINT ck_sales_status CHECK (status IN ('DRAFT', 'CONFIRMED', 'CANCELLED')),
  CONSTRAINT ck_sales_payment_condition CHECK (payment_condition IN ('CASH', 'CREDIT')),
  CONSTRAINT ck_sales_payment_method CHECK (
    payment_method IS NULL OR payment_method IN ('CASH', 'CARD', 'TRANSFER', 'OTHER')
  ),
  CONSTRAINT ck_sales_subtotal CHECK (subtotal >= 0),
  CONSTRAINT ck_sales_discount_total CHECK (discount_total >= 0),
  CONSTRAINT ck_sales_tax_total CHECK (tax_total >= 0),
  CONSTRAINT ck_sales_total CHECK (total >= 0),
  CONSTRAINT ck_sales_paid_total CHECK (paid_total >= 0)
);

CREATE INDEX ix_sales_customer_id ON sales (customer_id);
CREATE INDEX ix_sales_user_id ON sales (user_id);
CREATE INDEX ix_sales_sale_date ON sales (sale_date);
CREATE INDEX ix_sales_status ON sales (status);

CREATE TRIGGER trg_sales_audit
  BEFORE INSERT OR UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();

COMMENT ON TABLE  sales                  IS 'Ventas del ERP. Estado: DRAFT → CONFIRMED → CANCELLED.';
COMMENT ON COLUMN sales.sale_number      IS 'Número generado por document_sequences. Único.';
COMMENT ON COLUMN sales.customer_id      IS 'Cliente. Nulo para consumidor final.';
COMMENT ON COLUMN sales.user_id          IS 'Vendedor tomado del JWT, nunca del body.';
COMMENT ON COLUMN sales.status           IS 'DRAFT, CONFIRMED o CANCELLED.';
COMMENT ON COLUMN sales.payment_condition IS 'CASH o CREDIT.';
COMMENT ON COLUMN sales.payment_method   IS 'CASH, CARD, TRANSFER u OTHER. Opcional.';
COMMENT ON COLUMN sales.paid_total       IS 'Total pagado a nivel de venta.';

-- ---------------------------------------------------------------------
-- Detalle de venta
-- ---------------------------------------------------------------------
CREATE TABLE sale_details (
  id                       BIGSERIAL      NOT NULL,
  sale_id                  BIGINT         NOT NULL,
  product_presentation_id  BIGINT         NOT NULL,
  quantity                 NUMERIC(12,2)  NOT NULL,
  unit_price               NUMERIC(10,2)  NOT NULL,
  discount                 NUMERIC(12,2)  NOT NULL DEFAULT 0,
  tax_rate                 NUMERIC(5,2)   NOT NULL DEFAULT 13.00,
  tax_amount               NUMERIC(12,2)  NOT NULL DEFAULT 0,
  line_subtotal            NUMERIC(12,2)  NOT NULL DEFAULT 0,
  line_total               NUMERIC(12,2)  NOT NULL DEFAULT 0,
  created_at               TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_sale_details PRIMARY KEY (id),
  CONSTRAINT uq_sale_details_sale_presentation UNIQUE (sale_id, product_presentation_id),
  CONSTRAINT fk_sale_details_sale FOREIGN KEY (sale_id) REFERENCES sales (id),
  CONSTRAINT fk_sale_details_product_presentation FOREIGN KEY (product_presentation_id)
    REFERENCES product_presentations (id),
  CONSTRAINT ck_sale_details_quantity CHECK (quantity > 0),
  CONSTRAINT ck_sale_details_unit_price CHECK (unit_price > 0),
  CONSTRAINT ck_sale_details_discount CHECK (discount >= 0),
  CONSTRAINT ck_sale_details_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 100),
  CONSTRAINT ck_sale_details_tax_amount CHECK (tax_amount >= 0),
  CONSTRAINT ck_sale_details_line_subtotal CHECK (line_subtotal >= 0),
  CONSTRAINT ck_sale_details_line_total CHECK (line_total >= 0)
);

CREATE INDEX ix_sale_details_sale_id ON sale_details (sale_id);
CREATE INDEX ix_sale_details_product_presentation_id ON sale_details (product_presentation_id);

CREATE TRIGGER trg_sale_details_audit
  BEFORE INSERT OR UPDATE ON sale_details
  FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();

COMMENT ON TABLE  sale_details            IS 'Líneas de la venta con precio e IVA congelados.';
COMMENT ON COLUMN sale_details.unit_price IS 'Precio de venta congelado al momento de la venta.';

-- ---------------------------------------------------------------------
-- Asignación de lotes (FEFO)
-- ---------------------------------------------------------------------
CREATE TABLE sale_lot_allocations (
  id               BIGSERIAL      NOT NULL,
  sale_detail_id   BIGINT         NOT NULL,
  product_lot_id   BIGINT         NOT NULL,
  quantity         NUMERIC(12,2)  NOT NULL,
  unit_cost        NUMERIC(10,2)  NOT NULL,
  created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_sale_lot_allocations PRIMARY KEY (id),
  CONSTRAINT uq_sale_lot_allocations_detail_lot UNIQUE (sale_detail_id, product_lot_id),
  CONSTRAINT fk_sale_lot_allocations_sale_detail FOREIGN KEY (sale_detail_id)
    REFERENCES sale_details (id),
  CONSTRAINT fk_sale_lot_allocations_product_lot FOREIGN KEY (product_lot_id)
    REFERENCES product_lots (id),
  CONSTRAINT ck_sale_lot_allocations_quantity CHECK (quantity > 0),
  CONSTRAINT ck_sale_lot_allocations_unit_cost CHECK (unit_cost >= 0)
);

CREATE INDEX ix_sale_lot_allocations_sale_detail_id ON sale_lot_allocations (sale_detail_id);
CREATE INDEX ix_sale_lot_allocations_product_lot_id ON sale_lot_allocations (product_lot_id);

COMMENT ON TABLE  sale_lot_allocations            IS 'Lotes consumidos por línea de venta. Permite devolver stock al lote correcto al cancelar.';
COMMENT ON COLUMN sale_lot_allocations.unit_cost  IS 'Costo unitario congelado del lote. Solo uso interno.';
