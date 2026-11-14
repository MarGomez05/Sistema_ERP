-- =====================================================================
-- TAMACHIHUA-ERP · V5 — Imagen por presentación de producto
--
-- Solo se guarda la URL (o ruta relativa) y el texto alternativo.
-- No se almacenan binarios en PostgreSQL (D-06).
-- =====================================================================

ALTER TABLE product_presentations
  ADD COLUMN image_url VARCHAR(500) NULL,
  ADD COLUMN image_alt VARCHAR(150) NULL;

COMMENT ON COLUMN product_presentations.image_url IS 'URL o ruta relativa de la imagen. Máximo 500 caracteres.';
COMMENT ON COLUMN product_presentations.image_alt IS 'Texto alternativo de la imagen. Máximo 150 caracteres.';
