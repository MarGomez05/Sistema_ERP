-- =====================================================================
-- TAMACHIHUA-ERP · V2 — Clientes
--
-- Registra clientes naturales y jurídicos con datos fiscales, contacto
-- y condiciones de crédito. La baja es lógica (is_active).
-- Ver Implementacion.md §5.2 y Endpoints-API.md §10.
-- =====================================================================

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
  CONSTRAINT pk_customers PRIMARY KEY (id),
  CONSTRAINT ck_customers_type CHECK (customer_type IN ('NATURAL', 'BUSINESS')),
  CONSTRAINT ck_customers_document_type CHECK (
    document_type IS NULL OR document_type IN ('DUI', 'NIT', 'PASSPORT', 'FOREIGN')
  ),
  CONSTRAINT ck_customers_credit_limit CHECK (credit_limit >= 0),
  CONSTRAINT ck_customers_credit_days CHECK (credit_days >= 0)
);

-- Documentos y correo únicos solo cuando vienen informados.
CREATE UNIQUE INDEX uq_customers_document_number ON customers (document_number)
  WHERE document_number IS NOT NULL;
CREATE UNIQUE INDEX uq_customers_nit ON customers (nit)
  WHERE nit IS NOT NULL;
CREATE UNIQUE INDEX uq_customers_nrc ON customers (nrc)
  WHERE nrc IS NOT NULL;
CREATE UNIQUE INDEX uq_customers_dui ON customers (dui)
  WHERE dui IS NOT NULL;
CREATE UNIQUE INDEX uq_customers_email ON customers (lower(email))
  WHERE email IS NOT NULL;
CREATE INDEX ix_customers_legal_name ON customers (lower(legal_name));
CREATE INDEX ix_customers_is_active ON customers (is_active);

CREATE TRIGGER trg_customers_audit
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_audit_timestamps();

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
