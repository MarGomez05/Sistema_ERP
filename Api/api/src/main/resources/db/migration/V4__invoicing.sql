-- =====================================================================
-- TAMACHIHUA-ERP · V4 — Facturación y pagos
--
-- Facturas inmutables con snapshot fiscal del cliente y de las líneas,
-- notas de crédito y pagos. Ver Implementacion.md §5.2 y §7.3-7.5.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Facturas
-- ---------------------------------------------------------------------
CREATE TABLE invoices (
  id                        BIGSERIAL      NOT NULL,
  invoice_number            VARCHAR(30)    NOT NULL,
  control_number            VARCHAR(30)    NULL,
  invoice_type              VARCHAR(20)    NOT NULL,
  sale_id                   BIGINT         NULL,
  customer_id               BIGINT         NULL,
  related_invoice_id        BIGINT         NULL,
  issue_date                DATE           NOT NULL,
  due_date                  DATE           NULL,
  status                    VARCHAR(20)    NOT NULL,
  payment_condition         VARCHAR(20)    NOT NULL,
  subtotal                  NUMERIC(12,2)  NOT NULL DEFAULT 0,
  discount_total            NUMERIC(12,2)  NOT NULL DEFAULT 0,
  tax_total                 NUMERIC(12,2)  NOT NULL DEFAULT 0,
  total                     NUMERIC(12,2)  NOT NULL DEFAULT 0,
  paid_total                NUMERIC(12,2)  NOT NULL DEFAULT 0,
  customer_name             VARCHAR(200)   NOT NULL,
  customer_document_type    VARCHAR(10)    NULL,
  customer_document_number  VARCHAR(20)    NULL,
  customer_nit              VARCHAR(17)    NULL,
  customer_nrc              VARCHAR(10)    NULL,
  customer_address          VARCHAR(255)   NULL,
  customer_email            VARCHAR(150)   NULL,
  notes                     VARCHAR(255)   NULL,
  cancelled_at              TIMESTAMP      NULL,
  cancelled_by              BIGINT         NULL,
  cancel_reason             VARCHAR(255)   NULL,
  created_by                BIGINT         NOT NULL,
  created_at                TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_invoices PRIMARY KEY (id),
  CONSTRAINT uq_invoices_number UNIQUE (invoice_number),
  CONSTRAINT uq_invoices_control_number UNIQUE (control_number),
  CONSTRAINT fk_invoices_sale FOREIGN KEY (sale_id) REFERENCES sales (id),
  CONSTRAINT fk_invoices_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
  CONSTRAINT fk_invoices_related FOREIGN KEY (related_invoice_id) REFERENCES invoices (id),
  CONSTRAINT fk_invoices_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users (id),
  CONSTRAINT fk_invoices_created_by FOREIGN KEY (created_by) REFERENCES users (id),
  CONSTRAINT ck_invoices_type CHECK (invoice_type IN ('CONSUMER', 'CCF', 'CREDIT_NOTE')),
  CONSTRAINT ck_invoices_status CHECK (status IN ('DRAFT', 'ISSUED', 'CANCELLED')),
  CONSTRAINT ck_invoices_payment_condition CHECK (payment_condition IN ('CASH', 'CREDIT')),
  CONSTRAINT ck_invoices_subtotal CHECK (subtotal >= 0),
  CONSTRAINT ck_invoices_discount_total CHECK (discount_total >= 0),
  CONSTRAINT ck_invoices_tax_total CHECK (tax_total >= 0),
  CONSTRAINT ck_invoices_total CHECK (total >= 0),
  CONSTRAINT ck_invoices_paid_total CHECK (paid_total >= 0),
  CONSTRAINT ck_invoices_dates CHECK (due_date IS NULL OR due_date >= issue_date),
  CONSTRAINT ck_invoices_credit_due_date CHECK (
    payment_condition <> 'CREDIT' OR due_date IS NOT NULL
  ),
  CONSTRAINT ck_invoices_credit_note_related CHECK (
    invoice_type <> 'CREDIT_NOTE' OR related_invoice_id IS NOT NULL
  )
);

-- Una venta solo puede tener una factura emitida.
CREATE UNIQUE INDEX uq_invoices_sale_id ON invoices (sale_id)
  WHERE sale_id IS NOT NULL;

CREATE INDEX ix_invoices_customer_id ON invoices (customer_id);
CREATE INDEX ix_invoices_issue_date ON invoices (issue_date);
CREATE INDEX ix_invoices_status ON invoices (status);
CREATE INDEX ix_invoices_sale_id ON invoices (sale_id);
CREATE INDEX ix_invoices_related_invoice_id ON invoices (related_invoice_id);

CREATE TRIGGER trg_invoices_audit
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();

COMMENT ON TABLE  invoices                    IS 'Facturas emitidas. Inmutables: se cancelan con nota de crédito.';
COMMENT ON COLUMN invoices.invoice_number     IS 'Correlativo por tipo y año, generado con document_sequences.';
COMMENT ON COLUMN invoices.control_number     IS 'Número de control para CCF preimpreso. Opcional y único.';
COMMENT ON COLUMN invoices.invoice_type       IS 'CONSUMER, CCF o CREDIT_NOTE.';
COMMENT ON COLUMN invoices.related_invoice_id IS 'Factura original cuando el documento es nota de crédito.';
COMMENT ON COLUMN invoices.status             IS 'DRAFT, ISSUED o CANCELLED.';
COMMENT ON COLUMN invoices.customer_name      IS 'Snapshot fiscal del nombre del cliente al emitir.';

-- ---------------------------------------------------------------------
-- Detalle de factura (snapshot inmutable)
-- ---------------------------------------------------------------------
CREATE TABLE invoice_details (
  id                       BIGSERIAL      NOT NULL,
  invoice_id               BIGINT         NOT NULL,
  product_presentation_id  BIGINT         NULL,
  product_code             VARCHAR(50)    NOT NULL,
  product_name             VARCHAR(150)   NOT NULL,
  presentation_code        VARCHAR(50)    NOT NULL,
  presentation_name        VARCHAR(100)   NOT NULL,
  quantity                 NUMERIC(12,2)  NOT NULL,
  unit_price               NUMERIC(10,2)  NOT NULL,
  discount                 NUMERIC(12,2)  NOT NULL DEFAULT 0,
  tax_rate                 NUMERIC(5,2)   NOT NULL DEFAULT 13.00,
  tax_amount               NUMERIC(12,2)  NOT NULL DEFAULT 0,
  line_subtotal            NUMERIC(12,2)  NOT NULL DEFAULT 0,
  line_total               NUMERIC(12,2)  NOT NULL DEFAULT 0,
  unit_cost                NUMERIC(10,2)  NULL,
  created_at               TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_invoice_details PRIMARY KEY (id),
  CONSTRAINT fk_invoice_details_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id),
  CONSTRAINT fk_invoice_details_product_presentation FOREIGN KEY (product_presentation_id)
    REFERENCES product_presentations (id),
  CONSTRAINT ck_invoice_details_quantity CHECK (quantity > 0),
  CONSTRAINT ck_invoice_details_unit_price CHECK (unit_price > 0),
  CONSTRAINT ck_invoice_details_discount CHECK (discount >= 0),
  CONSTRAINT ck_invoice_details_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 100),
  CONSTRAINT ck_invoice_details_tax_amount CHECK (tax_amount >= 0),
  CONSTRAINT ck_invoice_details_line_subtotal CHECK (line_subtotal >= 0),
  CONSTRAINT ck_invoice_details_line_total CHECK (line_total >= 0),
  CONSTRAINT ck_invoice_details_unit_cost CHECK (unit_cost IS NULL OR unit_cost >= 0)
);

CREATE INDEX ix_invoice_details_invoice_id ON invoice_details (invoice_id);
CREATE INDEX ix_invoice_details_product_presentation_id ON invoice_details (product_presentation_id);

COMMENT ON TABLE  invoice_details                 IS 'Snapshot de las líneas de la factura.';
COMMENT ON COLUMN invoice_details.unit_cost       IS 'Costo congelado. Solo uso interno; no se expone a roles no autorizados.';

-- ---------------------------------------------------------------------
-- Pagos de factura
-- ---------------------------------------------------------------------
CREATE TABLE invoice_payments (
  id              BIGSERIAL      NOT NULL,
  invoice_id      BIGINT         NOT NULL,
  payment_date    DATE           NOT NULL,
  amount          NUMERIC(12,2)  NOT NULL,
  payment_method  VARCHAR(20)    NOT NULL,
  reference       VARCHAR(50)    NULL,
  notes           VARCHAR(255)   NULL,
  user_id         BIGINT         NOT NULL,
  created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_invoice_payments PRIMARY KEY (id),
  CONSTRAINT fk_invoice_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id),
  CONSTRAINT fk_invoice_payments_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT ck_invoice_payments_amount CHECK (amount > 0),
  CONSTRAINT ck_invoice_payments_method CHECK (
    payment_method IN ('CASH', 'CARD', 'TRANSFER', 'CHECK', 'OTHER')
  )
);

CREATE INDEX ix_invoice_payments_invoice_id ON invoice_payments (invoice_id);
CREATE INDEX ix_invoice_payments_payment_date ON invoice_payments (payment_date);

COMMENT ON TABLE  invoice_payments            IS 'Pagos aplicados a una factura. La suma no puede superar el total.';
COMMENT ON COLUMN invoice_payments.user_id    IS 'Usuario que registra el pago; se toma del JWT.';
