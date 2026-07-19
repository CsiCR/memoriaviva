-- 1. Crear función pura para evaluar la validez canónica del consentimiento
CREATE OR REPLACE FUNCTION public.has_valid_consent(p_contribution_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.consent_records
    WHERE contribution_id = p_contribution_id
      AND accepted_at IS NOT NULL
      AND owns_or_has_permission IS TRUE
      AND accepts_cataloging IS TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.has_valid_consent(uuid) FROM PUBLIC;

-- 2. Crear función para actualizar la caché sin alterar updated_at
CREATE OR REPLACE FUNCTION public.refresh_contribution_consent_verified(p_contribution_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.contributions
  SET consent_verified = public.has_valid_consent(p_contribution_id)
  WHERE id = p_contribution_id
    AND consent_verified IS DISTINCT FROM public.has_valid_consent(p_contribution_id);
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_contribution_consent_verified(uuid) FROM PUBLIC;

-- 3. Crear función del trigger de sincronización
CREATE OR REPLACE FUNCTION public.sync_contribution_consent_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- DELETE: Recalcular aporte anterior
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_contribution_consent_verified(OLD.contribution_id);
    RETURN OLD;
  END IF;

  -- UPDATE: Si cambió el aporte, recalcular el anterior
  IF TG_OP = 'UPDATE' AND OLD.contribution_id IS DISTINCT FROM NEW.contribution_id THEN
    PERFORM public.refresh_contribution_consent_verified(OLD.contribution_id);
  END IF;

  -- INSERT / UPDATE: Recalcular el aporte nuevo o actual
  PERFORM public.refresh_contribution_consent_verified(NEW.contribution_id);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_contribution_consent_verified() FROM PUBLIC;

-- 4. Crear trigger idempotente en la tabla consent_records
DROP TRIGGER IF EXISTS sync_consent_verified_trigger ON public.consent_records;

CREATE TRIGGER sync_consent_verified_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.consent_records
FOR EACH ROW
EXECUTE FUNCTION public.sync_contribution_consent_verified();

-- 5. Saneamiento del flujo público (recrear RPC create_contribution_with_files)
-- Cambiamos la inserción de consent_verified para forzar FALSE inicial
CREATE OR REPLACE FUNCTION public.create_contribution_with_files(
  p_contributor JSONB,
  p_contribution JSONB,
  p_consent JSONB,
  p_files JSONB,
  p_user_id UUID DEFAULT NULL,
  p_oversized_files JSONB DEFAULT '[]'::JSONB
) RETURNS JSONB AS $$
DECLARE
  v_contributor_id UUID;
  v_contribution_id UUID;
  v_file_item JSONB;
  v_upload_session RECORD;
  v_file_id UUID;
  v_upload_source TEXT;
  v_role TEXT;
  v_result JSONB;
  v_mime TEXT;
  v_ext TEXT;
  v_notification_msg TEXT;
BEGIN
  -- A. Validar p_oversized_files en backend
  IF p_oversized_files IS NOT NULL AND jsonb_array_length(p_oversized_files) > 0 THEN
    IF jsonb_array_length(p_oversized_files) > 10 THEN
      RAISE EXCEPTION 'No se admiten más de 10 archivos excedidos por aporte.';
    END IF;

    FOR v_file_item IN SELECT * FROM jsonb_array_elements(p_oversized_files) LOOP
      IF v_file_item->>'original_filename' IS NULL OR BTRIM(v_file_item->>'original_filename') = '' THEN
        RAISE EXCEPTION 'El nombre original de los archivos excedidos es obligatorio.';
      END IF;
      IF LENGTH(BTRIM(v_file_item->>'original_filename')) > 255 THEN
        RAISE EXCEPTION 'El nombre original del archivo excedido supera la longitud máxima permitida (255 caracteres).';
      END IF;

      IF (v_file_item->>'size_bytes')::BIGINT <= 52428800 THEN
        RAISE EXCEPTION 'Los archivos informados como excedidos deben ser estrictamente superiores a 50 MB.';
      END IF;

      v_mime := LOWER(BTRIM(COALESCE(v_file_item->>'mime_type', '')));
      v_ext := LOWER(BTRIM(substring(v_file_item->>'original_filename' from '\.([^.]+)$')));

      IF NOT (
        v_mime LIKE 'image/%' OR v_mime LIKE 'audio/%' OR v_mime LIKE 'video/%' OR v_mime = 'application/pdf' OR v_mime LIKE 'text/%' OR
        v_mime = 'application/msword' OR v_mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' OR
        v_ext IN ('png', 'jpg', 'jpeg', 'webp', 'mp3', 'wav', 'm4a', 'ogg', 'mp4', 'mov', 'avi', 'mkv', 'pdf', 'doc', 'docx', 'txt')
      ) THEN
        RAISE EXCEPTION 'El archivo % tiene un formato o tipo MIME no admitido por la plataforma.', v_file_item->>'original_filename';
      END IF;
    END LOOP;
  END IF;

  IF p_user_id IS NOT NULL THEN
    v_upload_source := 'admin_panel';
  ELSE
    v_upload_source := 'web_form';
  END IF;

  -- 2. Insertar Aportante
  INSERT INTO public.contributors (
    dni, full_name, phone, email, relation_to_city, neighborhood_or_institution, comments, allow_contact
  ) VALUES (
    p_contributor->>'dni',
    p_contributor->>'full_name',
    NULLIF(BTRIM(p_contributor->>'phone'), ''),
    NULLIF(BTRIM(p_contributor->>'email'), ''),
    p_contributor->>'relation_to_city',
    NULLIF(BTRIM(p_contributor->>'neighborhood_or_institution'), ''),
    NULLIF(BTRIM(p_contributor->>'comments'), ''),
    COALESCE((p_contributor->>'allow_contact')::BOOLEAN, FALSE)
  ) RETURNING id INTO v_contributor_id;

  -- 3. Insertar Aporte (fijamos consent_verified = FALSE)
  INSERT INTO public.contributions (
    contributor_id, title, contribution_type, description,
    exact_date, approximate_decade, related_place,
    mentioned_people, related_institution, historical_context,
    authorization_level, credit_preference, consent_source,
    consent_reference, consent_file_path, consent_verified,
    editorial_status
  ) VALUES (
    v_contributor_id,
    p_contribution->>'title',
    p_contribution->>'contribution_type',
    p_contribution->>'description',
    CASE WHEN p_contribution->>'exact_date' IS NOT NULL AND BTRIM(p_contribution->>'exact_date') != '' THEN (p_contribution->>'exact_date')::DATE ELSE NULL END,
    NULLIF(BTRIM(p_contribution->>'approximate_decade'), ''),
    p_contribution->>'related_place',
    NULLIF(BTRIM(p_contribution->>'mentioned_people'), ''),
    NULLIF(BTRIM(p_contribution->>'related_institution'), ''),
    NULLIF(BTRIM(p_contribution->>'historical_context'), ''),
    p_contribution->>'authorization_level',
    p_contribution->>'credit_preference',
    COALESCE(NULLIF(BTRIM(p_contribution->>'consent_source'), ''), 'web_form'),
    NULLIF(BTRIM(p_contribution->>'consent_reference'), ''),
    NULLIF(BTRIM(p_contribution->>'consent_file_path'), ''),
    FALSE, -- Forzado a FALSE inicialmente para que lo determine el trigger
    'Recibido'
  ) RETURNING id INTO v_contribution_id;

  -- 4. Insertar Registro de Consentimiento
  INSERT INTO public.consent_records (
    contributor_id, contribution_id, authorization_level, credit_preference,
    owns_or_has_permission, accepts_cataloging, consent_text_version, consent_file_path
  ) VALUES (
    v_contributor_id,
    v_contribution_id,
    p_contribution->>'authorization_level',
    p_contribution->>'credit_preference',
    COALESCE((p_consent->>'owns_or_has_permission')::BOOLEAN, TRUE),
    COALESCE((p_consent->>'accepts_cataloging')::BOOLEAN, TRUE),
    COALESCE(p_consent->>'consent_text_version', 'Versión inicial 1.0 - MVP - Junio 2026'),
    p_contribution->>'consent_file_path'
  );

  -- 5. Procesar cada archivo físico válido
  IF p_files IS NOT NULL AND jsonb_array_length(p_files) > 0 THEN
    FOR v_file_item IN SELECT * FROM jsonb_array_elements(p_files) LOOP
      SELECT * INTO v_upload_session 
      FROM public.upload_sessions
      WHERE upload_uuid = (v_file_item->>'upload_uuid')::UUID;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Sesión de carga no encontrada para el archivo %', v_file_item->>'original_filename';
      END IF;

      IF v_upload_session.status != 'uploaded' THEN
        RAISE EXCEPTION 'El archivo % no está listo para vincular (estado: %)', v_file_item->>'original_filename', v_upload_session.status;
      END IF;

      IF v_upload_session.storage_path != v_file_item->>'storage_path' THEN
        RAISE EXCEPTION 'La ruta de almacenamiento no coincide con la registrada en la sesión';
      END IF;

      INSERT INTO public.contribution_files (
        contribution_id, storage_path, mime_type, file_size, file_role, original_filename, processing_status
      ) VALUES (
        v_contribution_id,
        v_upload_session.storage_path,
        v_upload_session.mime_type,
        v_upload_session.size_bytes,
        COALESCE(v_file_item->>'file_role', 'original'),
        v_upload_session.storage_path,
        'ready'
      ) RETURNING id INTO v_file_id;

      UPDATE public.upload_sessions
      SET linked_contribution_id = v_contribution_id,
          status = 'linked',
          updated_at = NOW()
      WHERE id = v_upload_session.id;
    END LOOP;
  END IF;

  -- 6. Procesar archivos excedidos (oversized)
  IF p_oversized_files IS NOT NULL AND jsonb_array_length(p_oversized_files) > 0 THEN
    FOR v_file_item IN SELECT * FROM jsonb_array_elements(p_oversized_files) LOOP
      INSERT INTO public.oversized_file_notices (
        contribution_id, original_filename, size_bytes, mime_type, contact_phone, contact_email
      ) VALUES (
        v_contribution_id,
        v_file_item->>'original_filename',
        (v_file_item->>'size_bytes')::BIGINT,
        COALESCE(v_file_item->>'mime_type', 'application/octet-stream'),
        p_contributor->>'phone',
        p_contributor->>'email'
      );
    END LOOP;
  END IF;

  -- 7. Crear notificación
  v_notification_msg := 'Nuevo aporte recibido: "' || (p_contribution->>'title') || '" por ' || (p_contributor->>'full_name');
  INSERT INTO public.notifications (
    recipient_role, message, is_read, metadata
  ) VALUES (
    'admin',
    v_notification_msg,
    FALSE,
    jsonb_build_object(
      'contribution_id', v_contribution_id,
      'contributor_id', v_contributor_id,
      'title', p_contribution->>'title',
      'contributor_name', p_contributor->>'full_name'
    )
  );

  v_result := jsonb_build_object(
    'success', TRUE,
    'contribution_id', v_contribution_id,
    'contributor_id', v_contributor_id
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.create_contribution_with_files(jsonb, jsonb, jsonb, jsonb, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_contribution_with_files(jsonb, jsonb, jsonb, jsonb, uuid, jsonb) TO anon, authenticated;

-- 6. Backfill optimizado con relevamiento de transiciones
DO $$
DECLARE
  v_false_to_true INT;
  v_true_to_false INT;
  v_unchanged INT;
BEGIN
  SELECT COUNT(*) FILTER (WHERE c.consent_verified IS FALSE AND public.has_valid_consent(c.id) IS TRUE) INTO v_false_to_true FROM public.contributions c;
  SELECT COUNT(*) FILTER (WHERE c.consent_verified IS TRUE AND public.has_valid_consent(c.id) IS FALSE) INTO v_true_to_false FROM public.contributions c;
  SELECT COUNT(*) FILTER (WHERE c.consent_verified IS NOT DISTINCT FROM public.has_valid_consent(c.id)) INTO v_unchanged FROM public.contributions c;
  
  RAISE NOTICE 'Backfill Plan - false_to_true: %, true_to_false: %, unchanged: %', v_false_to_true, v_true_to_false, v_unchanged;
END;
$$;

UPDATE public.contributions c
SET consent_verified = public.has_valid_consent(c.id)
WHERE c.consent_verified IS DISTINCT FROM public.has_valid_consent(c.id);
