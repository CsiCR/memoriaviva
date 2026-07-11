-- 1. Tabla de Sesiones de Carga (upload_sessions)
CREATE TABLE IF NOT EXISTS public.upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_uuid UUID NOT NULL UNIQUE,
  file_uuid UUID NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  linked_contribution_id UUID, -- Se enlazará mediante clave foránea en la migración
  status TEXT CHECK (status IN ('pending', 'uploading', 'uploaded', 'linked', 'failed', 'quarantined', 'expired', 'deleted')) DEFAULT 'pending',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  upload_source TEXT CHECK (upload_source IN ('web_form', 'admin_panel')) DEFAULT 'web_form',
  checksum_sha256 TEXT
);

-- 2. Alterar tabla public.contribution_files para agregar columnas de trazabilidad
ALTER TABLE public.contribution_files 
ADD COLUMN IF NOT EXISTS upload_id UUID REFERENCES public.upload_sessions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS upload_status TEXT CHECK (upload_status IN ('temporary', 'uploaded', 'linked', 'failed', 'quarantined')) DEFAULT 'temporary',
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS checksum_sha256 TEXT,
ADD COLUMN IF NOT EXISTS stored_filename TEXT,
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS upload_source TEXT DEFAULT 'web_form',
ADD COLUMN IF NOT EXISTS file_role TEXT CHECK (file_role IN ('original', 'restored', 'derivative', 'legal_support')) DEFAULT 'original',
ADD COLUMN IF NOT EXISTS processing_status TEXT CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending';

-- Agregar clave foránea para linked_contribution_id en upload_sessions
ALTER TABLE public.upload_sessions
ADD CONSTRAINT fk_upload_sessions_contribution FOREIGN KEY (linked_contribution_id) REFERENCES public.contributions(id) ON DELETE SET NULL;

-- 3. Habilitar RLS en public.upload_sessions
ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas previas si existiesen
DROP POLICY IF EXISTS "Permitir select al equipo" ON public.upload_sessions;

CREATE POLICY "Permitir select al equipo"
  ON public.upload_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin', 'editor', 'validator', 'interviewer']));

-- 4. Modificar Políticas de RLS en storage.objects (Eliminar inserción libre)
DROP POLICY IF EXISTS "Permitir carga pública a historical-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Permitir carga al equipo de administración" ON storage.objects;

CREATE POLICY "Permitir carga al equipo de administración"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'historical-uploads' AND public.has_role(auth.uid(), ARRAY['admin', 'editor', 'validator', 'interviewer']));

-- 5. Modificar Políticas de RLS en public.contribution_files (Eliminar inserción libre)
DROP POLICY IF EXISTS "Permitir inserción de archivos de aportes (público)" ON public.contribution_files;
DROP POLICY IF EXISTS "Permitir inserción al equipo" ON public.contribution_files;

CREATE POLICY "Permitir inserción al equipo"
  ON public.contribution_files FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), ARRAY['admin', 'editor', 'validator', 'interviewer']));

-- 6. Trigger para updated_at en public.upload_sessions
CREATE OR REPLACE FUNCTION public.update_upload_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_activity_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_update_upload_sessions_updated_at
  BEFORE UPDATE ON public.upload_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_upload_sessions_updated_at();

-- 7. Función RPC Transaccional para la Creación de Aporte y Vinculación de Archivos
CREATE OR REPLACE FUNCTION public.create_contribution_with_files(
  p_contributor JSONB,
  p_contribution JSONB,
  p_consent JSONB,
  p_files JSONB, -- Array de metadatos de archivos subidos
  p_user_id UUID DEFAULT NULL
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
BEGIN
  -- 1. Determinar upload_source basándose en la sesión
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
    v_upload_source,
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

  -- 5. Procesar cada archivo en el array
  IF p_files IS NOT NULL AND jsonb_array_length(p_files) > 0 THEN
    FOR v_file_item IN SELECT * FROM jsonb_array_elements(p_files) LOOP
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

      -- Validar que no esté ya vinculada a otra contribución
      IF v_upload_session.linked_contribution_id IS NOT NULL THEN
        RAISE EXCEPTION 'El archivo % ya se encuentra vinculado a otra contribución', v_file_item->>'original_filename';
      END IF;

      -- Control de roles por tipo de sesión (solo administradores pueden subir restored/derivative/legal_support)
      IF p_user_id IS NULL THEN
        v_role := 'original';
      ELSE
        v_role := COALESCE(v_file_item->>'file_role', 'original');
      END IF;

      -- Insertar fila en public.contribution_files
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
        'pending' -- Llenar con pending por defecto, no completed
      ) RETURNING id INTO v_file_id;

      -- Actualizar sesión de carga
      UPDATE public.upload_sessions
      SET status = 'linked',
          linked_contribution_id = v_contribution_id,
          confirmed_at = NOW(),
          updated_at = NOW()
      WHERE id = v_upload_session.id;

    END LOOP;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'contribution_id', v_contribution_id,
    'contributor_id', v_contributor_id
  );
  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- El rollback de toda la función PL/pgSQL es automático si ocurre una excepción
  RAISE EXCEPTION '%', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Políticas de RLS adicionales para habilitar cargas temporales TUS (Estrictas para carpeta temporary/)
DROP POLICY IF EXISTS "Permitir carga temporal a anon" ON storage.objects;
DROP POLICY IF EXISTS "Permitir select temporal a anon" ON storage.objects;
DROP POLICY IF EXISTS "Permitir carga temporal a authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Permitir select temporal a authenticated" ON storage.objects;

CREATE POLICY "Permitir carga temporal a anon"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'historical-uploads' AND name LIKE 'temporary/%');

CREATE POLICY "Permitir select temporal a anon"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'historical-uploads' AND name LIKE 'temporary/%');

CREATE POLICY "Permitir carga temporal a authenticated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'historical-uploads' AND name LIKE 'temporary/%');

CREATE POLICY "Permitir select temporal a authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'historical-uploads' AND name LIKE 'temporary/%');
