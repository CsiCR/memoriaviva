-- Migración: Mejoras del Piloto Editorial (Alcance Acotado)
-- ID: 202607111830

-- 1. Permitir que el correo electrónico del aportante sea opcional
ALTER TABLE public.contributors ALTER COLUMN email DROP NOT NULL;

-- 2. Crear Tabla para Avisos de Archivos Grandes (Oversized)
CREATE TABLE IF NOT EXISTS public.oversized_file_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id UUID NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 3. Crear Tabla para Notificaciones Administrativas Internas
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'oversized_files'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  contribution_id UUID REFERENCES public.contributions(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB
);

-- 4. Habilitar RLS en las nuevas tablas
ALTER TABLE public.oversized_file_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas RLS para oversized_file_notices
DROP POLICY IF EXISTS "Permitir select al equipo en oversized_file_notices" ON public.oversized_file_notices;
DROP POLICY IF EXISTS "Permitir update al equipo en oversized_file_notices" ON public.oversized_file_notices;
DROP POLICY IF EXISTS "Permitir delete al equipo en oversized_file_notices" ON public.oversized_file_notices;

CREATE POLICY "Permitir select al equipo en oversized_file_notices"
  ON public.oversized_file_notices FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin', 'editor', 'validator', 'interviewer']));

CREATE POLICY "Permitir update al equipo en oversized_file_notices"
  ON public.oversized_file_notices FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin', 'editor', 'validator', 'interviewer']));

CREATE POLICY "Permitir delete al equipo en oversized_file_notices"
  ON public.oversized_file_notices FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin', 'editor', 'validator', 'interviewer']));

-- 6. Crear políticas RLS para admin_notifications
DROP POLICY IF EXISTS "Permitir select al equipo en admin_notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Permitir update al equipo en admin_notifications" ON public.admin_notifications;

CREATE POLICY "Permitir select al equipo en admin_notifications"
  ON public.admin_notifications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin', 'editor', 'validator', 'interviewer']));

CREATE POLICY "Permitir update al equipo en admin_notifications"
  ON public.admin_notifications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin', 'editor', 'validator', 'interviewer']));


-- 7. Recrear RPC create_contribution_with_files con soporte para archivos grandes y notificaciones
CREATE OR REPLACE FUNCTION public.create_contribution_with_files(
  p_contributor JSONB,
  p_contribution JSONB,
  p_consent JSONB,
  p_files JSONB, -- Array de metadatos de archivos subidos válidos
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
  -- Variables de validación de oversized
  v_mime TEXT;
  v_ext TEXT;
  -- Notificación
  v_notification_msg TEXT;
BEGIN
  -- A. Validar p_oversized_files en backend
  IF p_oversized_files IS NOT NULL AND jsonb_array_length(p_oversized_files) > 0 THEN
    IF jsonb_array_length(p_oversized_files) > 10 THEN
      RAISE EXCEPTION 'No se admiten más de 10 archivos excedidos por aporte.';
    END IF;

    FOR v_file_item IN SELECT * FROM jsonb_array_elements(p_oversized_files) LOOP
      -- Validar nombre obligatorio y longitud limitada
      IF v_file_item->>'original_filename' IS NULL OR BTRIM(v_file_item->>'original_filename') = '' THEN
        RAISE EXCEPTION 'El nombre original de los archivos excedidos es obligatorio.';
      END IF;
      IF LENGTH(BTRIM(v_file_item->>'original_filename')) > 255 THEN
        RAISE EXCEPTION 'El nombre original del archivo excedido supera la longitud máxima permitida (255 caracteres).';
      END IF;

      -- Validar size_bytes mayor a 50 MB (50 * 1024 * 1024 = 52428800 bytes)
      IF (v_file_item->>'size_bytes')::BIGINT <= 52428800 THEN
        RAISE EXCEPTION 'Los archivos informados como excedidos deben ser estrictamente superiores a 50 MB.';
      END IF;

      -- Validar categoría/MIME permitido
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

  -- 1. Determinar upload_source basándose en la sesión
  IF p_user_id IS NOT NULL THEN
    v_upload_source := 'admin_panel';
  ELSE
    v_upload_source := 'web_form';
  END IF;

  -- 2. Insertar Aportante con normalización defensiva
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
    COALESCE((p_contribution->>'consent_verified')::BOOLEAN, FALSE),
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

  -- 5. Procesar cada archivo físico válido en el array
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

      IF v_upload_session.expires_at < NOW() THEN
        RAISE EXCEPTION 'La sesión de carga para % ha expirado', v_file_item->>'original_filename';
      END IF;

      IF v_upload_session.linked_contribution_id IS NOT NULL THEN
        RAISE EXCEPTION 'El archivo % ya se encuentra vinculado a otra contribución', v_file_item->>'original_filename';
      END IF;

      IF p_user_id IS NULL THEN
        v_role := 'original';
      ELSE
        v_role := COALESCE(v_file_item->>'file_role', 'original');
      END IF;

      INSERT INTO public.contribution_files (
        contribution_id, file_name, file_path, file_type, file_size,
        storage_bucket, upload_id, upload_status, confirmed_at,
        stored_filename, uploaded_by, upload_source, file_role, processing_status
      ) VALUES (
        v_contribution_id,
        v_file_item->>'original_filename',
        v_upload_session.storage_path,
        v_upload_session.mime_type,
        v_upload_session.size_bytes,
        'historical-uploads',
        v_upload_session.id,
        'linked',
        NOW(),
        v_upload_session.file_uuid::TEXT || '.' || split_part(v_upload_session.storage_path, '.', 2),
        p_user_id,
        v_upload_source,
        v_role,
        'pending'
      ) RETURNING id INTO v_file_id;

      UPDATE public.upload_sessions
      SET status = 'linked',
          linked_contribution_id = v_contribution_id,
          confirmed_at = NOW(),
          updated_at = NOW()
      WHERE id = v_upload_session.id;

    END LOOP;
  END IF;

  -- 6. Procesar avisos de archivos grandes y crear notificación
  IF p_oversized_files IS NOT NULL AND jsonb_array_length(p_oversized_files) > 0 THEN
    FOR v_file_item IN SELECT * FROM jsonb_array_elements(p_oversized_files) LOOP
      INSERT INTO public.oversized_file_notices (
        contribution_id, original_filename, size_bytes, mime_type, status, created_at
      ) VALUES (
        v_contribution_id,
        BTRIM(v_file_item->>'original_filename'),
        (v_file_item->>'size_bytes')::BIGINT,
        v_file_item->>'mime_type',
        'pending',
        NOW()
      );
    END LOOP;

    -- Construir mensaje de notificación sin incluir datos personales (DNI, Tel, Mail)
    v_notification_msg := 'Título del Aporte: ' || (p_contribution->>'title') || E'\n' ||
                          'Cantidad de archivos pendientes: ' || jsonb_array_length(p_oversized_files)::TEXT || E'\n\n' ||
                          'Archivos:\n';
    FOR v_file_item IN SELECT * FROM jsonb_array_elements(p_oversized_files) LOOP
      v_notification_msg := v_notification_msg || '- ' || BTRIM(v_file_item->>'original_filename') || 
                            ' (' || ROUND((v_file_item->>'size_bytes')::NUMERIC / 1024 / 1024, 2)::TEXT || ' MB)' || E'\n';
    END LOOP;

    INSERT INTO public.admin_notifications (
      type, title, message, contribution_id, is_read, is_resolved, created_at, metadata
    ) VALUES (
      'oversized_files',
      'Archivos grandes pendientes - ' || COALESCE(p_contribution->>'title', 'Nuevo Aporte'),
      v_notification_msg,
      v_contribution_id,
      FALSE,
      FALSE,
      NOW(),
      jsonb_build_object(
        'files_count', jsonb_array_length(p_oversized_files)
      )
    );
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'contribution_id', v_contribution_id,
    'contributor_id', v_contributor_id
  );
  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '%', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. Crear RPC link_files_to_contribution para vinculación administrativa posterior y resolución de avisos
CREATE OR REPLACE FUNCTION public.link_files_to_contribution(
  p_contribution_id UUID,
  p_files JSONB, -- Array de metadatos de archivos subidos válidos
  p_resolved_notice_ids UUID[] DEFAULT ARRAY[]::UUID[]
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_file_item JSONB;
  v_upload_session RECORD;
  v_file_id UUID;
  v_role TEXT;
  v_notice_id UUID;
  v_notice_contribution_id UUID;
  v_remaining_pending INT;
  v_result JSONB;
BEGIN
  -- Validar permisos del operador usando auth.uid()
  v_user_id := auth.uid();
  IF v_user_id IS NULL OR NOT public.has_role(v_user_id, ARRAY['admin', 'editor', 'validator', 'interviewer']) THEN
    RAISE EXCEPTION 'Usuario no autorizado para realizar esta operación.';
  END IF;

  -- 1. Vincular los nuevos archivos
  IF p_files IS NOT NULL AND jsonb_array_length(p_files) > 0 THEN
    FOR v_file_item IN SELECT * FROM jsonb_array_elements(p_files) LOOP
      -- Validar que el rol de archivo sea permitido
      v_role := COALESCE(v_file_item->>'file_role', 'original');
      IF v_role NOT IN ('original', 'restored', 'derivative', 'legal_support') THEN
        RAISE EXCEPTION 'El rol de archivo % no es válido.', v_role;
      END IF;

      -- Validar existencia y consistencia de la sesión de carga
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

      IF v_upload_session.expires_at < NOW() THEN
        RAISE EXCEPTION 'La sesión de carga para % ha expirado', v_file_item->>'original_filename';
      END IF;

      IF v_upload_session.linked_contribution_id IS NOT NULL THEN
        RAISE EXCEPTION 'El archivo % ya se encuentra vinculado a otra contribución', v_file_item->>'original_filename';
      END IF;

      -- Insertar fila en public.contribution_files
      INSERT INTO public.contribution_files (
        contribution_id, file_name, file_path, file_type, file_size,
        storage_bucket, upload_id, upload_status, confirmed_at,
        stored_filename, uploaded_by, upload_source, file_role, processing_status
      ) VALUES (
        p_contribution_id,
        v_file_item->>'original_filename',
        v_upload_session.storage_path,
        v_upload_session.mime_type,
        v_upload_session.size_bytes,
        'historical-uploads',
        v_upload_session.id,
        'linked',
        NOW(),
        v_upload_session.file_uuid::TEXT || '.' || split_part(v_upload_session.storage_path, '.', 2),
        v_user_id,
        'admin_panel',
        v_role,
        'pending'
      ) RETURNING id INTO v_file_id;

      -- Actualizar sesión de carga
      UPDATE public.upload_sessions
      SET status = 'linked',
          linked_contribution_id = p_contribution_id,
          confirmed_at = NOW(),
          updated_at = NOW()
      WHERE id = v_upload_session.id;
    END LOOP;
  END IF;

  -- 2. Resolver avisos indicados
  IF p_resolved_notice_ids IS NOT NULL AND array_length(p_resolved_notice_ids, 1) > 0 THEN
    FOREACH v_notice_id IN ARRAY p_resolved_notice_ids LOOP
      -- Validar que el aviso exista y pertenezca al mismo aporte
      SELECT contribution_id INTO v_notice_contribution_id
      FROM public.oversized_file_notices
      WHERE id = v_notice_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Aviso de archivo grande % no encontrado.', v_notice_id;
      END IF;

      IF v_notice_contribution_id != p_contribution_id THEN
        RAISE EXCEPTION 'El aviso % no pertenece a la contribución indicada.', v_notice_id;
      END IF;

      -- Actualizar el aviso como resuelto
      UPDATE public.oversized_file_notices
      SET status = 'resolved',
          resolved_at = NOW(),
          resolved_by = v_user_id
      WHERE id = v_notice_id;
    END LOOP;
  END IF;

  -- 3. Si ya no quedan avisos pendientes para este aporte, resolver la notificación
  SELECT COUNT(*) INTO v_remaining_pending
  FROM public.oversized_file_notices
  WHERE contribution_id = p_contribution_id AND status = 'pending';

  IF v_remaining_pending = 0 THEN
    UPDATE public.admin_notifications
    SET is_resolved = TRUE,
        is_read = TRUE, -- Marcación como leída de forma automática al resolver
        resolved_at = NOW(),
        resolved_by = v_user_id,
        read_at = COALESCE(read_at, NOW())
    WHERE contribution_id = p_contribution_id AND type = 'oversized_files' AND is_resolved = FALSE;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'contribution_id', p_contribution_id,
    'resolved_notices_count', COALESCE(array_length(p_resolved_notice_ids, 1), 0),
    'remaining_pending_count', v_remaining_pending
  );
  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '%', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
