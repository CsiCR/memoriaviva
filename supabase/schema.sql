-- Esquema inicial para Memoria Viva Pico Truncado (Etapa 1 MVP)

-- 1. Tabla de Perfiles de la Administración
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'validator', 'interviewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla de Aportantes
CREATE TABLE IF NOT EXISTS public.contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dni TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  relation_to_city TEXT NOT NULL,
  neighborhood_or_institution TEXT NOT NULL,
  comments TEXT,
  allow_contact BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5 Tabla de Convenios Institucionales
CREATE TABLE IF NOT EXISTS public.institutional_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  institution TEXT NOT NULL,
  file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabla de Aportes
CREATE TABLE IF NOT EXISTS public.contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id UUID NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  contribution_type TEXT NOT NULL CHECK (contribution_type IN ('Testimonio escrito', 'Fotografía', 'Documento', 'Audio', 'Video')),
  description TEXT NOT NULL,
  exact_date DATE,
  approximate_decade TEXT CHECK (approximate_decade IN ('1920s', '1930s', '1940s', '1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s')),
  related_place TEXT NOT NULL,
  mentioned_people TEXT,
  related_institution TEXT,
  historical_context TEXT,
  authorization_level CHAR(1) NOT NULL CHECK (authorization_level IN ('A', 'B', 'C', 'D')),
  credit_preference TEXT NOT NULL CHECK (credit_preference IN ('Nombre completo', 'Iniciales', 'Familia aportante', 'Anónimo')),
  editorial_status TEXT NOT NULL DEFAULT 'Recibido' CHECK (editorial_status IN (
    'Recibido', 'Datos incompletos', 'En revisión', 'En transcripción', 'Transcripto',
    'En validación histórica', 'Validado', 'Aprobado para archivo', 'Aprobado para libro',
    'Aprobado para e-book', 'Restringido', 'Rechazado', 'Archivado'
  )),
  internal_notes TEXT,
  institutional_agreement_id UUID REFERENCES public.institutional_agreements(id) ON DELETE SET NULL,
  catalog_code TEXT UNIQUE,
  consent_source TEXT NOT NULL DEFAULT 'web_form' CHECK (consent_source IN ('web_form', 'signed_paper', 'institutional_agreement')),
  consent_reference TEXT,
  consent_file_path TEXT,
  consent_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabla de Archivos de Aportes
CREATE TABLE IF NOT EXISTS public.contribution_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id UUID NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'historical-uploads',
  is_original BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tabla de Registro de Consentimiento
CREATE TABLE IF NOT EXISTS public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id UUID NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  contribution_id UUID NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
  authorization_level CHAR(1) NOT NULL CHECK (authorization_level IN ('A', 'B', 'C', 'D')),
  credit_preference TEXT NOT NULL CHECK (credit_preference IN ('Nombre completo', 'Iniciales', 'Familia aportante', 'Anónimo')),
  owns_or_has_permission BOOLEAN NOT NULL CHECK (owns_or_has_permission = TRUE),
  accepts_cataloging BOOLEAN NOT NULL CHECK (accepts_cataloging = TRUE),
  consent_text_version TEXT NOT NULL,
  consent_file_path TEXT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Tabla de Auditoría
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS) en todas las tablas de public
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutional_agreements ENABLE ROW LEVEL SECURITY;

-- Función de ayuda para validación de roles de usuario (SECURITY DEFINER para bypassear RLS en consultas internas)
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = ANY(allowed_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para Profiles
CREATE POLICY "Permitir lectura de perfil propio o admins"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), ARRAY['admin']));

CREATE POLICY "Permitir modificación a administradores"
  ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin']));

-- Políticas para Contributors
CREATE POLICY "Permitir inserción de aportantes (público)"
  ON public.contributors FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir lectura al equipo de administración"
  ON public.contributors FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin', 'editor', 'validator', 'interviewer']));

CREATE POLICY "Permitir actualización al equipo de administración"
  ON public.contributors FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin', 'editor']));

CREATE POLICY "Permitir eliminación al administrador"
  ON public.contributors FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin']));

-- Políticas para Contributions
CREATE POLICY "Permitir inserción de aportes (público)"
  ON public.contributions FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir lectura de aportes al equipo"
  ON public.contributions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin', 'editor', 'validator', 'interviewer']));

CREATE POLICY "Permitir actualización de aportes al equipo"
  ON public.contributions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin', 'editor', 'validator', 'interviewer']));

CREATE POLICY "Permitir eliminación al administrador"
  ON public.contributions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin']));

-- Políticas para Contribution Files
CREATE POLICY "Permitir inserción de archivos de aportes (público)"
  ON public.contribution_files FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir lectura de archivos al equipo"
  ON public.contribution_files FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin', 'editor', 'validator', 'interviewer']));

CREATE POLICY "Permitir actualización/eliminación de archivos al equipo"
  ON public.contribution_files FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin', 'editor']));

-- Políticas para Consent Records
CREATE POLICY "Permitir inserción de consentimiento (público)"
  ON public.consent_records FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir lectura de consentimiento al equipo"
  ON public.consent_records FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin', 'editor', 'validator', 'interviewer']));

CREATE POLICY "Permitir control total de consentimiento al administrador"
  ON public.consent_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin']));

-- Políticas para Institutional Agreements
CREATE POLICY "Permitir lectura de convenios al equipo"
  ON public.institutional_agreements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin', 'editor', 'validator', 'interviewer']));

CREATE POLICY "Permitir inserción de convenios al equipo"
  ON public.institutional_agreements FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), ARRAY['admin', 'editor', 'validator', 'interviewer']));

-- Políticas para Audit Logs
CREATE POLICY "Permitir lectura de auditoría a administradores y editores"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin', 'editor']));

-- Triggers y Funciones

-- Trigger: Vincular auth.users con public.profiles automáticamente al crearse un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Auditoría de cambios en Contributions
CREATE OR REPLACE FUNCTION public.audit_contributions_changes()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Intentar obtener el user_id de la sesión de Supabase Auth
  BEGIN
    current_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;

  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_value, new_value)
    VALUES (
      current_user_id,
      'UPDATE',
      'contributions',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_value, new_value)
    VALUES (
      current_user_id,
      'DELETE',
      'contributions',
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_value, new_value)
    VALUES (
      current_user_id,
      'INSERT',
      'contributions',
      NEW.id,
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER audit_contributions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.audit_contributions_changes();

-- Trigger: Actualizar updated_at en contributions automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_contributions_updated_at
  BEFORE UPDATE ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Generar código de catálogo automático (ej: MV-FOT-2026-0001)
CREATE OR REPLACE FUNCTION public.generate_catalog_code()
RETURNS TRIGGER AS $$
DECLARE
  type_code TEXT;
  year_val TEXT;
  seq_num INT;
BEGIN
  -- 1. Obtener la abreviatura del tipo
  type_code := CASE NEW.contribution_type
    WHEN 'Testimonio escrito' THEN 'TXT'
    WHEN 'Fotografía' THEN 'FOT'
    WHEN 'Documento' THEN 'DOC'
    WHEN 'Audio' THEN 'AUD'
    WHEN 'Video' THEN 'VID'
    ELSE 'GEN'
  END;

  -- 2. Obtener el año de creación
  year_val := to_char(NOW(), 'YYYY');

  -- 3. Obtener el número correlativo para este tipo y año
  SELECT COALESCE(COUNT(*), 0) + 1 INTO seq_num
  FROM public.contributions
  WHERE contribution_type = NEW.contribution_type
    AND to_char(created_at, 'YYYY') = year_val;

  -- 4. Formatear y asignar el código de catálogo (ej: MV-FOT-2026-0001)
  NEW.catalog_code := 'MV-' || type_code || '-' || year_val || '-' || lpad(seq_num::text, 4, '0');

  -- 5. Para el Caso 2 (signed_paper), el código de referencia física por defecto es el mismo código de catálogo
  IF NEW.consent_source = 'signed_paper' AND (NEW.consent_reference IS NULL OR NEW.consent_reference = '') THEN
    NEW.consent_reference := NEW.catalog_code;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER contributions_catalog_code_trigger
  BEFORE INSERT ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.generate_catalog_code();

-- 7. Inicialización de Storage (bucket privado 'historical-uploads')
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'historical-uploads', 
  'historical-uploads', 
  FALSE, 
  52428800, -- 50 MB en bytes
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a', 'audio/m4a', 'audio/mp4', 'audio/aac',
    'video/mp4', 'video/quicktime', 'video/mov'
  ]
)
ON CONFLICT (id) DO UPDATE SET 
  public = FALSE, 
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a', 'audio/m4a', 'audio/mp4', 'audio/aac',
    'video/mp4', 'video/quicktime', 'video/mov'
  ];

-- Políticas de Storage
CREATE POLICY "Permitir carga pública a historical-uploads"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'historical-uploads');

CREATE POLICY "Permitir lectura de archivos al equipo"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'historical-uploads' AND public.has_role(auth.uid(), ARRAY['admin', 'editor', 'validator', 'interviewer']));

CREATE POLICY "Permitir eliminación al equipo administrativo"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'historical-uploads' AND public.has_role(auth.uid(), ARRAY['admin', 'editor']));
