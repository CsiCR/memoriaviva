-- Migración: Regularización de create_contribution_with_files y Saneamiento CORE-002
-- ID: 20260728000000
-- Tipo: Migración transaccional con eliminación controlada de una sobrecarga obsoleta

BEGIN;

-- 1. Eliminar la versión obsoleta y duplicada de 5 parámetros para evitar la ambigüedad
DROP FUNCTION IF EXISTS public.create_contribution_with_files(
  p_contributor JSONB,
  p_contribution JSONB,
  p_consent JSONB,
  p_files JSONB,
  p_user_id UUID
);

-- 2. Redefinir la versión de 6 parámetros de create_contribution_with_files regularizada
CREATE OR REPLACE FUNCTION public.create_contribution_with_files(
  p_contributor JSONB,
  p_contribution JSONB,
  p_consent JSONB,
  p_files JSONB,
  p_user_id UUID DEFAULT NULL,
  p_oversized_files JSONB DEFAULT '[]'::JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- 3. Insertar Aporte
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
    COALESCE((p_contribution->>'consent_verified')::BOOLEAN, FALSE), -- Semántica de Producción
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

      -- Validación de expiración
      IF v_upload_session.expires_at < NOW() THEN
        RAISE EXCEPTION 'La sesión de carga para % ha expirado', v_file_item->>'original_filename';
      END IF;

      -- Validación que impide reutilizar sesión ya vinculada
      IF v_upload_session.linked_contribution_id IS NOT NULL THEN
        RAISE EXCEPTION 'El archivo % ya se encuentra vinculado a otra contribución', v_file_item->>'original_filename';
      END IF;

      -- Control estricto de file_role
      IF p_user_id IS NULL THEN
        v_role := 'original';
      ELSE
        v_role := COALESCE(v_file_item->>'file_role', 'original');
      END IF;

      -- Insertar fila en public.contribution_files preservando columnas de producción (incluyendo checksum_sha256)
      INSERT INTO public.contribution_files (
        contribution_id, file_name, file_path, file_type, file_size,
        storage_bucket, upload_id, upload_status, confirmed_at,
        checksum_sha256, stored_filename, uploaded_by, upload_source, file_role, processing_status
      ) VALUES (
        v_contribution_id,
        COALESCE(v_file_item->>'original_filename', v_upload_session.storage_path),
        v_upload_session.storage_path,
        v_upload_session.mime_type,
        v_upload_session.size_bytes,
        'historical-uploads',
        v_upload_session.id,
        'linked',
        NOW(),
        v_upload_session.checksum_sha256,
        v_upload_session.file_uuid::TEXT || '.' || split_part(v_upload_session.storage_path, '.', 2),
        p_user_id,
        v_upload_source,
        v_role,
        'pending'
      ) RETURNING id INTO v_file_id;

      -- Actualizar upload_sessions marcando confirmed_at = NOW()
      UPDATE public.upload_sessions
      SET status = 'linked',
          linked_contribution_id = v_contribution_id,
          confirmed_at = NOW(),
          updated_at = NOW()
      WHERE id = v_upload_session.id;
    END LOOP;
  END IF;

  -- 6. Procesar archivos excedidos (oversized) insertando solo en columnas existentes en producción (removiendo bugs de columnas contact_phone/contact_email)
  IF p_oversized_files IS NOT NULL AND jsonb_array_length(p_oversized_files) > 0 THEN
    FOR v_file_item IN SELECT * FROM jsonb_array_elements(p_oversized_files) LOOP
      INSERT INTO public.oversized_file_notices (
        contribution_id, original_filename, size_bytes, mime_type
      ) VALUES (
        v_contribution_id,
        v_file_item->>'original_filename',
        (v_file_item->>'size_bytes')::BIGINT,
        COALESCE(v_file_item->>'mime_type', 'application/octet-stream')
      );
    END LOOP;
  END IF;

  -- 7. Crear notificación en admin_notifications (preservando is_resolved = FALSE)
  v_notification_msg := 'Nuevo aporte recibido: "' || (p_contribution->>'title') || '" por ' || (p_contributor->>'full_name');
  IF p_oversized_files IS NOT NULL AND jsonb_array_length(p_oversized_files) > 0 THEN
    INSERT INTO public.admin_notifications (
      type, title, message, contribution_id, is_read, is_resolved, metadata
    ) VALUES (
      'oversized_files',
      'Aporte con archivos pendientes',
      v_notification_msg || ' (Archivos > 50MB pendientes de carga física)',
      v_contribution_id,
      FALSE,
      FALSE,
      jsonb_build_object(
        'contact_phone', p_contributor->>'phone',
        'contact_email', p_contributor->>'email'
      )
    );
  ELSE
    INSERT INTO public.admin_notifications (
      type, title, message, contribution_id, is_read, is_resolved, metadata
    ) VALUES (
      'new_contribution',
      'Aporte recibido',
      v_notification_msg,
      v_contribution_id,
      FALSE,
      FALSE,
      jsonb_build_object(
        'contact_phone', p_contributor->>'phone',
        'contact_email', p_contributor->>'email'
      )
    );
  END IF;

  v_result := jsonb_build_object(
    'success', TRUE,
    'contribution_id', v_contribution_id,
    'contributor_id', v_contributor_id
  );

  RETURN v_result;
END;
$$;

-- 3. Restablecer permisos y configuración explícita
ALTER FUNCTION public.create_contribution_with_files(JSONB, JSONB, JSONB, JSONB, UUID, JSONB) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_contribution_with_files(JSONB, JSONB, JSONB, JSONB, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_contribution_with_files(JSONB, JSONB, JSONB, JSONB, UUID, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.create_contribution_with_files(JSONB, JSONB, JSONB, JSONB, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_contribution_with_files(JSONB, JSONB, JSONB, JSONB, UUID, JSONB) TO service_role;

COMMIT;
