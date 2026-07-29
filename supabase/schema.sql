-- Schema: Memoria Viva Pico Truncado (Esquema Unificado CORE-002)
-- Estado: Sincronizado con Producción

-- ==========================================
-- 1. EXTENSIONES Y SEGURIDAD INICIAL
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 2. TABLAS DEL SISTEMA
-- ==========================================

-- Tabla: public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'editor' CHECK (role IN ('admin', 'editor', 'validator', 'interviewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: public.select_options (opciones paramétricas de publicación y estados)
CREATE TABLE IF NOT EXISTS public.select_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'publication_status', 'indicator_type', etc.
  value TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_select_options_category_code UNIQUE (category, code)
);

-- Tabla: public.contributors
CREATE TABLE IF NOT EXISTS public.contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  relation_to_city TEXT NOT NULL,
  neighborhood_or_institution TEXT,
  comments TEXT,
  allow_contact BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dni TEXT
);

-- Tabla: public.institutional_agreements
CREATE TABLE IF NOT EXISTS public.institutional_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  institution TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: public.contributions
CREATE TABLE IF NOT EXISTS public.contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id UUID NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  contribution_type TEXT NOT NULL CHECK (contribution_type IN ('Testimonio escrito', 'Fotografía', 'Documento', 'Audio', 'Video')),
  description TEXT,
  exact_date DATE,
  approximate_decade TEXT,
  related_place TEXT NOT NULL,
  mentioned_people TEXT,
  related_institution TEXT,
  historical_context TEXT,
  authorization_level CHARACTER(1) NOT NULL CHECK (authorization_level IN ('A', 'B', 'C')),
  credit_preference TEXT NOT NULL,
  editorial_status TEXT NOT NULL DEFAULT 'Recibido',
  internal_notes TEXT,
  consent_source TEXT NOT NULL DEFAULT 'web_form',
  consent_reference TEXT,
  consent_file_path TEXT,
  consent_verified BOOLEAN NOT NULL DEFAULT FALSE,
  institutional_agreement_id UUID REFERENCES public.institutional_agreements(id) ON DELETE SET NULL,
  catalog_code TEXT UNIQUE,
  
  -- Campos editoriales de Stage 2+
  publication_status_option_id UUID REFERENCES public.select_options(id) ON DELETE SET NULL,
  publication_notes TEXT,
  publication_scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  editorial_title TEXT,
  editorial_description TEXT,
  editorial_summary TEXT,
  editorial_context TEXT,
  editorial_classification TEXT,
  historical_validation_status TEXT DEFAULT 'pending' CHECK (historical_validation_status IN ('pending', 'approved', 'rejected')),
  historical_validation_notes TEXT,
  publication_title TEXT,
  publication_excerpt TEXT,
  publication_level CHARACTER(1) DEFAULT 'A' CHECK (publication_level IN ('A', 'B', 'C')),
  publication_credits TEXT,
  editor_responsible_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  validated_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  editorial_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: public.upload_sessions (carga temporal de archivos grandes)
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
  linked_contribution_id UUID REFERENCES public.contributions(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('pending', 'uploading', 'uploaded', 'linked', 'failed', 'quarantined', 'expired', 'deleted')) DEFAULT 'pending',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  upload_source TEXT CHECK (upload_source IN ('web_form', 'admin_panel')) DEFAULT 'web_form',
  checksum_sha256 TEXT
);

-- Tabla: public.contribution_files
CREATE TABLE IF NOT EXISTS public.contribution_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id UUID NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'historical-uploads',
  is_original BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Trazabilidad de archivos
  upload_id UUID REFERENCES public.upload_sessions(id) ON DELETE SET NULL,
  upload_status TEXT CHECK (upload_status IN ('temporary', 'uploaded', 'linked', 'failed', 'quarantined')) DEFAULT 'temporary',
  confirmed_at TIMESTAMPTZ,
  checksum_sha256 TEXT,
  stored_filename TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  upload_source TEXT DEFAULT 'web_form',
  file_role TEXT CHECK (file_role IN ('original', 'restored', 'derivative', 'legal_support')) DEFAULT 'original',
  processing_status TEXT CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending'
);

-- Tabla: public.consent_records
CREATE TABLE IF NOT EXISTS public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id UUID NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  contribution_id UUID NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
  authorization_level CHARACTER(1) NOT NULL CHECK (authorization_level IN ('A', 'B', 'C')),
  credit_preference TEXT NOT NULL,
  owns_or_has_permission BOOLEAN NOT NULL DEFAULT TRUE,
  accepts_cataloging BOOLEAN NOT NULL DEFAULT TRUE,
  consent_text_version TEXT NOT NULL DEFAULT '1.0',
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consent_file_path TEXT
);

-- Tabla: public.oversized_file_notices
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

-- Tabla: public.admin_notifications
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
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

-- Tabla: public.contribution_editorial_indicators
CREATE TABLE IF NOT EXISTS public.contribution_editorial_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id UUID NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
  indicator_option_id UUID NOT NULL REFERENCES public.select_options(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Tabla: public.public_identities (Capa de publicación e identidad estable)
CREATE TABLE IF NOT EXISTS public.public_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR NOT NULL CHECK (entity_type IN ('contribution', 'author')),
  entity_uuid UUID NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_frozen BOOLEAN NOT NULL DEFAULT FALSE,
  has_ever_been_published BOOLEAN NOT NULL DEFAULT FALSE,
  merged_into_identity_id UUID REFERENCES public.public_identities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: public.public_slugs (Capas de URL y SEO estables)
CREATE TABLE IF NOT EXISTS public.public_slugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id UUID NOT NULL REFERENCES public.public_identities(id) ON DELETE CASCADE,
  entity_type VARCHAR NOT NULL CHECK (entity_type IN ('contribution', 'author')),
  slug VARCHAR NOT NULL,
  kind VARCHAR NOT NULL DEFAULT 'canonical' CHECK (kind IN ('canonical', 'historical', 'alias')),
  reason VARCHAR,
  redirects_to_identity_id UUID REFERENCES public.public_identities(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  source VARCHAR NOT NULL DEFAULT 'system',
  operation_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: public.audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 3. HABILITACIÓN DE RLS
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.select_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutional_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oversized_file_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_editorial_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_slugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. FUNCIONES DE AYUDA Y RPCs
-- ==========================================

-- Función: has_role (Comprobar roles del operador)
CREATE OR REPLACE FUNCTION public.has_role(
  p_user_id UUID,
  p_roles TEXT[]
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
  RETURN v_role = ANY(p_roles);
END;
$$;

-- Trigger Function: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'editor')
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;
  RETURN NEW;
END;
$$;

-- Trigger Function: audit_contributions_changes
CREATE OR REPLACE FUNCTION public.audit_contributions_changes()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  BEGIN
    current_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;

  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_value, new_value)
    VALUES (current_user_id, 'UPDATE', 'contributions', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_value, new_value)
    VALUES (current_user_id, 'DELETE', 'contributions', OLD.id, to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_value, new_value)
    VALUES (current_user_id, 'INSERT', 'contributions', NEW.id, NULL, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger Function: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger Function: generate_catalog_code
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

  year_val := to_char(NOW(), 'YYYY');

  SELECT COALESCE(COUNT(*), 0) + 1 INTO seq_num
  FROM public.contributions
  WHERE contribution_type = NEW.contribution_type
    AND to_char(created_at, 'YYYY') = year_val;

  NEW.catalog_code := 'MV-' || type_code || '-' || year_val || '-' || lpad(seq_num::text, 4, '0');

  IF NEW.consent_source = 'signed_paper' AND (NEW.consent_reference IS NULL OR NEW.consent_reference = '') THEN
    NEW.consent_reference := NEW.catalog_code;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger Function: update_upload_sessions_updated_at
CREATE OR REPLACE FUNCTION public.update_upload_sessions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_activity_at = NOW();
  RETURN NEW;
END;
$$;

-- RPC Function: create_contribution_with_files
CREATE OR REPLACE FUNCTION public.create_contribution_with_files(
  p_contributor JSONB,
  p_contribution JSONB,
  p_consent JSONB,
  p_files JSONB,
  p_user_id UUID DEFAULT NULL,
  p_oversized_files JSONB DEFAULT '[]'::JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
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

      -- Insertar fila en public.contribution_files
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

  -- 6. Procesar archivos excedidos (oversized) insertando solo en columnas existentes en producción
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

  -- 7. Crear notificación en admin_notifications
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

-- RPC Function: link_files_to_contribution
CREATE OR REPLACE FUNCTION public.link_files_to_contribution(
  p_contribution_id UUID,
  p_files JSONB,
  p_resolved_notice_ids UUID[] DEFAULT ARRAY[]::UUID[]
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_file_item JSONB;
  v_upload_session RECORD;
  v_file_id UUID;
  v_role TEXT;
  v_notice_id UUID;
  v_notice_contribution_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL OR NOT public.has_role(v_user_id, ARRAY['admin', 'editor', 'validator', 'interviewer']) THEN
    RAISE EXCEPTION 'Usuario no autorizado para realizar esta operación.';
  END IF;

  IF p_files IS NOT NULL AND jsonb_array_length(p_files) > 0 THEN
    FOR v_file_item IN SELECT * FROM jsonb_array_elements(p_files) LOOP
      v_role := COALESCE(v_file_item->>'file_role', 'original');
      IF v_role NOT IN ('original', 'restored', 'derivative', 'legal_support') THEN
        RAISE EXCEPTION 'El rol de archivo % no es válido.', v_role;
      END IF;

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

      UPDATE public.upload_sessions
      SET status = 'linked',
          linked_contribution_id = p_contribution_id,
          confirmed_at = NOW(),
          updated_at = NOW()
      WHERE id = v_upload_session.id;
    END LOOP;
  END IF;

  IF p_resolved_notice_ids IS NOT NULL AND array_length(p_resolved_notice_ids, 1) > 0 THEN
    FOREACH v_notice_id IN ARRAY p_resolved_notice_ids LOOP
      SELECT contribution_id INTO v_notice_contribution_id
      FROM public.oversized_file_notices
      WHERE id = v_notice_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Aviso de archivo grande % no encontrado.', v_notice_id;
      END IF;

      IF v_notice_contribution_id != p_contribution_id THEN
        RAISE EXCEPTION 'El aviso % no pertenece a la contribución indicada.', v_notice_id;
      END IF;

      UPDATE public.oversized_file_notices
      SET status = 'resolved',
          resolved_at = NOW(),
          resolved_by = v_user_id
      WHERE id = v_notice_id;
    END LOOP;
  END IF;

  v_result := jsonb_build_object('success', TRUE);
  RETURN v_result;
END;
$$;

-- RPC Function: update_editorial_dimensions
CREATE OR REPLACE FUNCTION public.update_editorial_dimensions(
  p_contribution_id UUID,
  p_editorial_status TEXT,
  p_publication_status_option_id UUID,
  p_publication_notes TEXT,
  p_publication_scheduled_at TIMESTAMPTZ,
  p_internal_notes TEXT,
  p_active_indicator_option_ids UUID[],
  p_indicator_notes TEXT,
  p_editorial_title TEXT,
  p_editorial_description TEXT,
  p_editorial_summary TEXT,
  p_editorial_context TEXT,
  p_editorial_classification TEXT,
  p_historical_validation_status TEXT,
  p_historical_validation_notes TEXT,
  p_publication_title TEXT,
  p_publication_excerpt TEXT,
  p_publication_level CHARACTER(1),
  p_publication_credits TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_indicator_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL OR NOT public.has_role(v_user_id, ARRAY['admin', 'editor', 'validator']) THEN
    RAISE EXCEPTION 'Usuario no autorizado para realizar esta operación.';
  END IF;

  UPDATE public.contributions
  SET
    editorial_status = p_editorial_status,
    publication_status_option_id = p_publication_status_option_id,
    publication_notes = p_publication_notes,
    publication_scheduled_at = p_publication_scheduled_at,
    internal_notes = p_internal_notes,
    editorial_title = p_editorial_title,
    editorial_description = p_editorial_description,
    editorial_summary = p_editorial_summary,
    editorial_context = p_editorial_context,
    editorial_classification = p_editorial_classification,
    historical_validation_status = p_historical_validation_status,
    historical_validation_notes = p_historical_validation_notes,
    publication_title = p_publication_title,
    publication_excerpt = p_publication_excerpt,
    publication_level = p_publication_level,
    publication_credits = p_publication_credits,
    editor_responsible_user_id = v_user_id,
    editorial_updated_at = NOW()
  WHERE id = p_contribution_id;

  -- Sincronizar indicadores editoriales
  UPDATE public.contribution_editorial_indicators
  SET is_active = FALSE,
      resolved_at = NOW(),
      resolved_by = v_user_id
  WHERE contribution_id = p_contribution_id AND is_active = TRUE;

  IF p_active_indicator_option_ids IS NOT NULL AND array_length(p_active_indicator_option_ids, 1) > 0 THEN
    FOREACH v_indicator_id IN ARRAY p_active_indicator_option_ids LOOP
      INSERT INTO public.contribution_editorial_indicators (
        contribution_id, indicator_option_id, is_active, notes, created_by
      ) VALUES (
        p_contribution_id, v_indicator_id, TRUE, p_indicator_notes, v_user_id
      );
    END LOOP;
  END IF;

  v_result := jsonb_build_object('success', TRUE);
  RETURN v_result;
END;
$$;

-- ==========================================
-- 5. POLÍTICAS RLS (EJEMPLO BASE)
-- ==========================================

-- Select Options
CREATE POLICY "Permitir select público a select_options" ON public.select_options
  FOR SELECT TO anon, authenticated USING (is_active = TRUE);

-- Profiles
CREATE POLICY "Permitir select a profiles autenticados" ON public.profiles
  FOR SELECT TO authenticated USING (TRUE);

-- Contributions
CREATE POLICY "Permitir select de aportes publicados al público" ON public.contributions
  FOR SELECT TO anon, authenticated
  USING (consent_verified = TRUE AND authorization_level IN ('A', 'B'));

-- ==========================================
-- 6. TRIGGERS
-- ==========================================
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE TRIGGER audit_contributions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.audit_contributions_changes();

CREATE OR REPLACE TRIGGER update_contributions_updated_at
  BEFORE UPDATE ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER contributions_catalog_code_trigger
  BEFORE INSERT ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.generate_catalog_code();

CREATE OR REPLACE TRIGGER tr_update_upload_sessions_updated_at
  BEFORE UPDATE ON public.upload_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_upload_sessions_updated_at();

-- ==========================================
-- 7. GRANTS PARA RPCs
-- ==========================================
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_contribution_with_files(JSONB, JSONB, JSONB, JSONB, UUID, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.link_files_to_contribution(UUID, JSONB, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_editorial_dimensions(UUID, TEXT, UUID, TEXT, TIMESTAMPTZ, TEXT, UUID[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, CHARACTER, TEXT) TO authenticated;
