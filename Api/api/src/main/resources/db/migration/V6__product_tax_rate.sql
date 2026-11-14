-- =====================================================================
-- TAMACHIHUA-ERP · V6 — IVA por producto y secuencias iniciales
--
-- tax_rate: los precios actuales incluyen IVA 13 % (D-02).
-- Los productos exentos usan 0.00.
-- =====================================================================

ALTER TABLE products
  ADD COLUMN tax_rate NUMERIC(5,2) NOT NULL DEFAULT 13.00;

ALTER TABLE products
  ADD CONSTRAINT ck_products_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 100);

COMMENT ON COLUMN products.tax_rate IS 'Tasa de IVA aplicable al producto (0 a 100). Por defecto 13.00.';

-- ---------------------------------------------------------------------
-- Secuencias del año en curso.
-- El servicio de numeración debe crear la fila del año nuevo cuando
-- no exista; estas filas solo evitan el primer INSERT manual.
-- ---------------------------------------------------------------------
INSERT INTO document_sequences (document_type, prefix, year, current_number)
VALUES
  ('SALE',        'V-',   EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 0),
  ('INVOICE',     'F-',   EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 0),
  ('CCF',         'CCF-', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 0),
  ('CREDIT_NOTE', 'NC-',  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 0)
ON CONFLICT (document_type, year) DO NOTHING;
