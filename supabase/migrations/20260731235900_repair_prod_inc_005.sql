-- Migración de Reparación de Slugs: INC-005
-- Archivo: supabase/migrations/20260731235900_repair_prod_inc_005.sql
--
-- PROPÓSITO: Corregir los slugs canónicos de dos contribuciones publicadas
--            cuyos slugs registrados no coincidían con la URL que el catálogo
--            calculaba dinámicamente en memoria, generando errores 404 en el detalle.
--
-- ALCANCE: MV-FOT-2026-0001 (Cuartel de Bomberos) y MV-FOT-2026-0004 (Don Argel)
--
-- GARANTÍAS:
--   - Transaccional (BEGIN/COMMIT): ambos bloques se revierten juntos ante cualquier error.
--   - Idempotente: si el slug objetivo ya es canónico, no genera escrituras ni logs nuevos.
--   - Validación de identidad exactamente única (COUNT(*) <> 1 → RAISE EXCEPTION).
--   - Prevención de colisiones de slug con otras identidades.
--   - Sincronización de estado dinámico desde contributions.publication_status_option_id.
--   - Auditoría trazable: solo registra en audit_logs cuando hubo cambios reales.
--   - Exactamente 1 canónico activo al finalizar (verificación de integridad final).
--
-- SEGUNDA EJECUCIÓN: Produce cero cambios en slugs, cero cambios en identidades,
--                    y cero registros nuevos en audit_logs.
--
-- APLICAR EN PRODUCCIÓN MANUALMENTE:
--   1. Ir al SQL Editor del proyecto en app.supabase.com
--   2. Pegar el contenido de este archivo
--   3. Ejecutar (se aplica como transacción única)
--   4. Verificar que el log del editor no muestre errores
--   5. Verificar en audit_logs: SELECT * FROM public.audit_logs
--      WHERE action LIKE 'REPAIR_INC_005%' ORDER BY created_at DESC LIMIT 10;

BEGIN;

-- ============================================================================
-- CASO 1: Don Argel Manuel Santiago (MV-FOT-2026-0004)
-- ============================================================================
DO $$
DECLARE
  v_contrib_id          UUID    := '1057bba1-ab32-4567-a873-45212bc4f4fb';
  v_identity_id         UUID;
  v_identity_count      INTEGER;
  v_old_identity_status VARCHAR;
  v_old_has_ever_pub    BOOLEAN;
  v_target_slug_id      UUID;
  v_target_slug_kind    VARCHAR;
  v_other_identity_id   UUID;
  v_pub_status          VARCHAR;
  v_expected_status     VARCHAR;
  v_canonical_count     INTEGER;
  v_rows_updated        INTEGER;
  v_old_slug_audit      JSONB;
  v_target_slug         VARCHAR := 'el-pionero-de-la-avenida-rivadavia-el-legado-de-esfuerzo-y-solidaridad-de-don-argel-mv-fot-2026-0004';
BEGIN
  -- A. Validar identidad exactamente única
  SELECT COUNT(*), MIN(id::text)::uuid
    INTO v_identity_count, v_identity_id
    FROM public.public_identities
   WHERE entity_type = 'contribution'
     AND entity_uuid = v_contrib_id;

  IF v_identity_count <> 1 THEN
    RAISE EXCEPTION
      'INC-005 [Don Argel]: Se esperaba exactamente una identidad para %, se encontraron %',
      v_contrib_id, v_identity_count;
  END IF;

  -- B. Verificar colisión de slug con otra identidad
  SELECT identity_id
    INTO v_other_identity_id
    FROM public.public_slugs
   WHERE slug = v_target_slug
     AND identity_id <> v_identity_id
   LIMIT 1;

  IF v_other_identity_id IS NOT NULL THEN
    RAISE EXCEPTION
      'INC-005 [Don Argel]: Colisión — el slug % ya pertenece a la identidad %',
      v_target_slug, v_other_identity_id;
  END IF;

  -- C. Actualizar slug canónico de forma idempotente
  SELECT id, kind
    INTO v_target_slug_id, v_target_slug_kind
    FROM public.public_slugs
   WHERE identity_id = v_identity_id
     AND slug = v_target_slug;

  IF v_target_slug_id IS NULL OR v_target_slug_kind <> 'canonical' THEN
    -- Capturar el canónico anterior para auditoría trazable
    SELECT jsonb_build_object('id', id, 'slug', slug, 'kind', kind, 'reason', reason)
      INTO v_old_slug_audit
      FROM public.public_slugs
     WHERE identity_id = v_identity_id
       AND kind = 'canonical';

    -- Degradar el canónico anterior a alias (redirects_to_identity_id = NULL, como dictan las restricciones)
    UPDATE public.public_slugs
       SET kind = 'alias',
           reason = 'renamed',
           redirects_to_identity_id = NULL
     WHERE identity_id = v_identity_id
       AND kind = 'canonical';

    IF v_target_slug_id IS NOT NULL THEN
      -- El slug ya existe como alias: promover a canónico
      UPDATE public.public_slugs
         SET kind = 'canonical'
       WHERE id = v_target_slug_id;
    ELSE
      -- Insertar nuevo registro canónico
      INSERT INTO public.public_slugs
             (identity_id, entity_type, slug, kind, reason, source, note)
      VALUES (v_identity_id, 'contribution', v_target_slug, 'canonical', 'renamed', 'system',
              'Reparación INC-005: slug normalizado con sufijo de código de catálogo');
    END IF;

    -- Registrar en audit_logs con valores reales trazables
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_value, new_value)
    VALUES (
      NULL,
      'REPAIR_INC_005_SLUG',
      'public_slugs',
      v_identity_id,
      COALESCE(v_old_slug_audit, jsonb_build_object('slug', NULL, 'kind', NULL)),
      jsonb_build_object('slug', v_target_slug, 'kind', 'canonical', 'reason', 'renamed')
    );
  END IF;

  -- D. Sincronizar estado de identidad desde el estado real del aporte
  SELECT o.code
    INTO v_pub_status
    FROM public.contributions c
    JOIN public.select_options o ON o.id = c.publication_status_option_id
   WHERE c.id = v_contrib_id;

  v_expected_status := CASE WHEN v_pub_status = 'published' THEN 'published' ELSE 'unpublished' END;

  -- Capturar valores previos
  SELECT status, has_ever_been_published
    INTO v_old_identity_status, v_old_has_ever_pub
    FROM public.public_identities
   WHERE id = v_identity_id;

  -- Actualizar solo si hay diferencia real (idempotencia de timestamps)
  UPDATE public.public_identities
     SET status               = v_expected_status,
         has_ever_been_published = CASE WHEN v_expected_status = 'published' THEN TRUE
                                        ELSE has_ever_been_published END,
         updated_at           = NOW()
   WHERE id = v_identity_id
     AND (
       status IS DISTINCT FROM v_expected_status
       OR (v_expected_status = 'published' AND has_ever_been_published IS DISTINCT FROM TRUE)
     );

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated > 0 THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_value, new_value)
    VALUES (
      NULL,
      'REPAIR_INC_005_IDENTITY',
      'public_identities',
      v_identity_id,
      jsonb_build_object('status', v_old_identity_status, 'has_ever_been_published', v_old_has_ever_pub),
      jsonb_build_object('status', v_expected_status,
                         'has_ever_been_published',
                         CASE WHEN v_expected_status = 'published' THEN TRUE ELSE v_old_has_ever_pub END)
    );
  END IF;

  -- E. Verificación final de integridad: exactamente 1 canónico
  SELECT COUNT(*)
    INTO v_canonical_count
    FROM public.public_slugs
   WHERE identity_id = v_identity_id
     AND kind = 'canonical';

  IF v_canonical_count <> 1 THEN
    RAISE EXCEPTION
      'INC-005 [Don Argel]: Integridad violada — la identidad % posee % slugs canónicos',
      v_identity_id, v_canonical_count;
  END IF;

  RAISE NOTICE 'INC-005 [Don Argel] completado: identity_id=%, slug_changes=%, identity_changes=%',
    v_identity_id,
    CASE WHEN v_target_slug_id IS NULL OR v_target_slug_kind <> 'canonical' THEN 1 ELSE 0 END,
    v_rows_updated;
END $$;

-- ============================================================================
-- CASO 2: Cuartel de Bomberos Nº 29 (MV-FOT-2026-0001)
-- ============================================================================
DO $$
DECLARE
  v_contrib_id          UUID    := '0f39e9b5-ca51-4e1e-b28f-3d562946ff37';
  v_identity_id         UUID;
  v_identity_count      INTEGER;
  v_old_identity_status VARCHAR;
  v_old_has_ever_pub    BOOLEAN;
  v_target_slug_id      UUID;
  v_target_slug_kind    VARCHAR;
  v_other_identity_id   UUID;
  v_pub_status          VARCHAR;
  v_expected_status     VARCHAR;
  v_canonical_count     INTEGER;
  v_rows_updated        INTEGER;
  v_old_slug_audit      JSONB;
  v_target_slug         VARCHAR := 'inauguracion-del-cuartel-de-bomberos-n-29-en-el-sector-del-barrio-ypf-pico-truncado-mv-fot-2026-0001';
BEGIN
  -- A. Validar identidad exactamente única
  SELECT COUNT(*), MIN(id::text)::uuid
    INTO v_identity_count, v_identity_id
    FROM public.public_identities
   WHERE entity_type = 'contribution'
     AND entity_uuid = v_contrib_id;

  IF v_identity_count <> 1 THEN
    RAISE EXCEPTION
      'INC-005 [Cuartel]: Se esperaba exactamente una identidad para %, se encontraron %',
      v_contrib_id, v_identity_count;
  END IF;

  -- B. Verificar colisión
  SELECT identity_id
    INTO v_other_identity_id
    FROM public.public_slugs
   WHERE slug = v_target_slug
     AND identity_id <> v_identity_id
   LIMIT 1;

  IF v_other_identity_id IS NOT NULL THEN
    RAISE EXCEPTION
      'INC-005 [Cuartel]: Colisión — el slug % ya pertenece a la identidad %',
      v_target_slug, v_other_identity_id;
  END IF;

  -- C. Actualizar slug canónico de forma idempotente
  SELECT id, kind
    INTO v_target_slug_id, v_target_slug_kind
    FROM public.public_slugs
   WHERE identity_id = v_identity_id
     AND slug = v_target_slug;

  IF v_target_slug_id IS NULL OR v_target_slug_kind <> 'canonical' THEN
    -- Capturar canónico anterior
    SELECT jsonb_build_object('id', id, 'slug', slug, 'kind', kind, 'reason', reason)
      INTO v_old_slug_audit
      FROM public.public_slugs
     WHERE identity_id = v_identity_id
       AND kind = 'canonical';

    -- Degradar a alias
    UPDATE public.public_slugs
       SET kind = 'alias',
           reason = 'renamed',
           redirects_to_identity_id = NULL
     WHERE identity_id = v_identity_id
       AND kind = 'canonical';

    IF v_target_slug_id IS NOT NULL THEN
      UPDATE public.public_slugs
         SET kind = 'canonical'
       WHERE id = v_target_slug_id;
    ELSE
      INSERT INTO public.public_slugs
             (identity_id, entity_type, slug, kind, reason, source, note)
      VALUES (v_identity_id, 'contribution', v_target_slug, 'canonical', 'renamed', 'system',
              'Reparación INC-005: slug normalizado con sufijo de código de catálogo');
    END IF;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_value, new_value)
    VALUES (
      NULL,
      'REPAIR_INC_005_SLUG',
      'public_slugs',
      v_identity_id,
      COALESCE(v_old_slug_audit, jsonb_build_object('slug', NULL, 'kind', NULL)),
      jsonb_build_object('slug', v_target_slug, 'kind', 'canonical', 'reason', 'renamed')
    );
  END IF;

  -- D. Sincronizar estado
  SELECT o.code
    INTO v_pub_status
    FROM public.contributions c
    JOIN public.select_options o ON o.id = c.publication_status_option_id
   WHERE c.id = v_contrib_id;

  v_expected_status := CASE WHEN v_pub_status = 'published' THEN 'published' ELSE 'unpublished' END;

  SELECT status, has_ever_been_published
    INTO v_old_identity_status, v_old_has_ever_pub
    FROM public.public_identities
   WHERE id = v_identity_id;

  UPDATE public.public_identities
     SET status               = v_expected_status,
         has_ever_been_published = CASE WHEN v_expected_status = 'published' THEN TRUE
                                        ELSE has_ever_been_published END,
         updated_at           = NOW()
   WHERE id = v_identity_id
     AND (
       status IS DISTINCT FROM v_expected_status
       OR (v_expected_status = 'published' AND has_ever_been_published IS DISTINCT FROM TRUE)
     );

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated > 0 THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_value, new_value)
    VALUES (
      NULL,
      'REPAIR_INC_005_IDENTITY',
      'public_identities',
      v_identity_id,
      jsonb_build_object('status', v_old_identity_status, 'has_ever_been_published', v_old_has_ever_pub),
      jsonb_build_object('status', v_expected_status,
                         'has_ever_been_published',
                         CASE WHEN v_expected_status = 'published' THEN TRUE ELSE v_old_has_ever_pub END)
    );
  END IF;

  -- E. Verificar integridad final
  SELECT COUNT(*)
    INTO v_canonical_count
    FROM public.public_slugs
   WHERE identity_id = v_identity_id
     AND kind = 'canonical';

  IF v_canonical_count <> 1 THEN
    RAISE EXCEPTION
      'INC-005 [Cuartel]: Integridad violada — la identidad % posee % slugs canónicos',
      v_identity_id, v_canonical_count;
  END IF;

  RAISE NOTICE 'INC-005 [Cuartel] completado: identity_id=%, slug_changes=%, identity_changes=%',
    v_identity_id,
    CASE WHEN v_target_slug_id IS NULL OR v_target_slug_kind <> 'canonical' THEN 1 ELSE 0 END,
    v_rows_updated;
END $$;

COMMIT;
