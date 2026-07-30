-- Migración: Concurrencia y Saneamiento en catalog_code (BUG-001)
-- Archivo: supabase/migrations/20260730180000_bug_001_concurrency_catalog_code.sql

BEGIN;

-- 1. Redefinir la función trigger generate_catalog_code con bloqueo consultivo y búsqueda del máximo
CREATE OR REPLACE FUNCTION public.generate_catalog_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  type_code TEXT;
  year_val TEXT;
  seq_num INT;
BEGIN
  type_code := CASE NEW.contribution_type
    WHEN 'Testimonio escrito' THEN 'TXT'
    WHEN 'Fotografía' THEN 'FOT'
    WHEN 'Documento' THEN 'DOC'
    WHEN 'Audio' THEN 'AUD'
    WHEN 'Video' THEN 'VID'
    ELSE 'GEN'
  END;

  -- Definir el criterio temporal una sola vez para garantizar coherencia
  year_val := to_char(NOW(), 'YYYY');

  -- A. Adquirir bloqueo exclusivo a nivel de transacción para la combinación de tipo y año
  -- Esto serializa las solicitudes concurrentes para la misma categoría en el mismo año.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(type_code || ':' || year_val, 0)
  );

  -- B. Calcular el máximo número de secuencia existente y sumar 1 (soporta huecos por eliminación)
  SELECT COALESCE(
    MAX(SUBSTRING(catalog_code FROM '-([0-9]{4})$')::INTEGER),
    0
  ) + 1 INTO seq_num
  FROM public.contributions
  WHERE catalog_code LIKE 'MV-' || type_code || '-' || year_val || '-%';

  -- C. Asignar el nuevo código formateado
  NEW.catalog_code := 'MV-' || type_code || '-' || year_val || '-' || lpad(seq_num::text, 4, '0');

  -- D. Asignar el consentimiento si es signed_paper
  IF NEW.consent_source = 'signed_paper' AND (NEW.consent_reference IS NULL OR NEW.consent_reference = '') THEN
    NEW.consent_reference := NEW.catalog_code;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
