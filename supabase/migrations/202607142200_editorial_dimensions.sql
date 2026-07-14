-- MIGRACIÓN: ARQUITECTURA EDITORIAL MULTIDIMENSIONAL (Etapas 1 y 2)
-- Archivo: supabase/migrations/202607142200_editorial_dimensions.sql

-- 1. Renombrar columnas en select_options de forma segura e idempotente (evita errores en ejecuciones múltiples)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'select_options' AND column_name = 'label') THEN
    ALTER TABLE public.select_options RENAME COLUMN label TO name;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'select_options' AND column_name = 'sort_order') THEN
    ALTER TABLE public.select_options RENAME COLUMN sort_order TO display_order;
  END IF;
END $$;

-- 2. Agregar nuevas columnas a select_options para soporte de catálogos configurables
ALTER TABLE public.select_options ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
ALTER TABLE public.select_options ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;
ALTER TABLE public.select_options ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.select_options ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.select_options ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.select_options ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Crear índice único de is_default por categoría (máximo un valor por defecto por categoría)
DROP INDEX IF EXISTS UNIQUE_is_default_per_category;
CREATE UNIQUE INDEX UNIQUE_is_default_per_category 
ON public.select_options (category) 
WHERE (is_default = true);

-- 4. Agregar columnas de publicación a contributions (independientes del estado editorial)
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS publication_status_option_id UUID REFERENCES public.select_options(id) ON DELETE SET NULL;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS publication_notes TEXT;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS publication_scheduled_at TIMESTAMPTZ;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ;

-- 5. Crear tabla de relación muchos-a-muchos: aportes e indicadores editoriales
CREATE TABLE IF NOT EXISTS public.contribution_editorial_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id UUID NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
  indicator_option_id UUID NOT NULL REFERENCES public.select_options(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT
);

-- 6. Crear índice único parcial para impedir indicadores duplicados activos para el mismo aporte
DROP INDEX IF EXISTS unique_active_contribution_indicator;
CREATE UNIQUE INDEX unique_active_contribution_indicator 
ON public.contribution_editorial_indicators (contribution_id, indicator_option_id) 
WHERE (is_active = true);

-- 7. Crear índices de rendimiento para búsquedas y filtros de indicadores
CREATE INDEX IF NOT EXISTS idx_contribution_indicators_contribution_id ON public.contribution_editorial_indicators(contribution_id);
CREATE INDEX IF NOT EXISTS idx_contribution_indicators_indicator_option_id ON public.contribution_editorial_indicators(indicator_option_id);
CREATE INDEX IF NOT EXISTS idx_contribution_indicators_is_active ON public.contribution_editorial_indicators(is_active);
CREATE INDEX IF NOT EXISTS idx_contribution_indicators_contrib_active ON public.contribution_editorial_indicators(contribution_id, is_active);

-- 8. Habilitar RLS en indicadores y select_options
ALTER TABLE public.contribution_editorial_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.select_options ENABLE ROW LEVEL SECURITY;

-- 9. Políticas RLS para select_options (Acceso restringido para anónimos)
DROP POLICY IF EXISTS "Permitir lectura publica de categorias seleccionadas" ON public.select_options;
CREATE POLICY "Permitir lectura publica de categorias seleccionadas"
  ON public.select_options FOR SELECT TO anon
  USING (category IN ('relation_to_city', 'contribution_type', 'authorization_level', 'credit_preference'));

DROP POLICY IF EXISTS "Permitir lectura completa a usuarios autenticados" ON public.select_options;
CREATE POLICY "Permitir lectura completa a usuarios autenticados"
  ON public.select_options FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Permitir control de select_options solo a admins" ON public.select_options;
CREATE POLICY "Permitir control de select_options solo a admins"
  ON public.select_options FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin']));

-- 10. Políticas RLS para indicadores editoriales (Uso exclusivo del equipo de administración)
DROP POLICY IF EXISTS "Permitir lectura de indicadores al equipo" ON public.contribution_editorial_indicators;
CREATE POLICY "Permitir lectura de indicadores al equipo"
  ON public.contribution_editorial_indicators FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin', 'editor', 'validator', 'interviewer']));

DROP POLICY IF EXISTS "Permitir gestion de indicadores al equipo" ON public.contribution_editorial_indicators;
CREATE POLICY "Permitir gestion de indicadores al equipo"
  ON public.contribution_editorial_indicators FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin', 'editor', 'validator', 'interviewer']));

-- 11. Función y trigger de auditoría para indicadores en public.audit_logs
CREATE OR REPLACE FUNCTION public.audit_indicators_changes()
RETURNS TRIGGER AS $$
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
    VALUES (
      current_user_id,
      'UPDATE',
      'contribution_editorial_indicators',
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
      'contribution_editorial_indicators',
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
      'contribution_editorial_indicators',
      NEW.id,
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER audit_indicators_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.contribution_editorial_indicators
  FOR EACH ROW EXECUTE FUNCTION public.audit_indicators_changes();

-- 12. RPC Transaccional: Actualización coordinada de las tres dimensiones editoriales
CREATE OR REPLACE FUNCTION public.update_editorial_dimensions(
  p_contribution_id UUID,
  p_editorial_status TEXT,
  p_publication_status_option_id UUID,
  p_publication_notes TEXT,
  p_publication_scheduled_at TIMESTAMPTZ,
  p_internal_notes TEXT,
  p_active_indicator_option_ids UUID[],
  p_indicator_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_pub_code TEXT;
  v_prev_scheduled_at TIMESTAMPTZ;
  v_prev_published_at TIMESTAMPTZ;
  v_prev_withdrawn_at TIMESTAMPTZ;
  v_ind_id UUID;
BEGIN
  -- A. Validar rol del usuario autenticado (Rol del equipo requerido)
  v_user_id := auth.uid();
  IF v_user_id IS NULL OR NOT public.has_role(v_user_id, ARRAY['admin', 'editor', 'validator', 'interviewer']) THEN
    RAISE EXCEPTION 'No autorizado. Se requieren permisos del equipo editorial.';
  END IF;

  -- B. Validar categoría del estado de publicación
  IF p_publication_status_option_id IS NOT NULL THEN
    SELECT code INTO v_pub_code 
    FROM public.select_options 
    WHERE id = p_publication_status_option_id AND category = 'publication_status';
    
    IF v_pub_code IS NULL THEN
      RAISE EXCEPTION 'Categoría o ID de estado de publicación inválido.';
    END IF;
  END IF;

  -- C. Validar categoría de los indicadores
  IF p_active_indicator_option_ids IS NOT NULL AND cardinality(p_active_indicator_option_ids) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM unnest(p_active_indicator_option_ids) AS ind_id
      WHERE NOT EXISTS (
        SELECT 1 FROM public.select_options
        WHERE id = ind_id AND category = 'editorial_indicator'
      )
    ) THEN
      RAISE EXCEPTION 'Uno o más indicadores tienen una categoría inválida.';
    END IF;
  END IF;

  -- D. Obtener fechas históricas para no borrarlas silenciosamente
  SELECT publication_scheduled_at, published_at, withdrawn_at
  INTO v_prev_scheduled_at, v_prev_published_at, v_prev_withdrawn_at
  FROM public.contributions
  WHERE id = p_contribution_id;

  -- E. Validar reglas de negocio para fechas según el estado de publicación
  IF v_pub_code = 'scheduled' THEN
    IF p_publication_scheduled_at IS NULL AND v_prev_scheduled_at IS NULL THEN
      RAISE EXCEPTION 'El estado Programado requiere una fecha de publicación programada.';
    END IF;
  END IF;

  -- F. Actualizar la contribución (Estado editorial, publicación y notas)
  UPDATE public.contributions
  SET
    editorial_status = p_editorial_status,
    publication_status_option_id = p_publication_status_option_id,
    publication_notes = p_publication_notes,
    internal_notes = p_internal_notes,
    publication_scheduled_at = COALESCE(p_publication_scheduled_at, v_prev_scheduled_at),
    published_at = CASE 
      WHEN v_pub_code = 'published' THEN COALESCE(v_prev_published_at, NOW()) 
      ELSE v_prev_published_at 
    END,
    withdrawn_at = CASE 
      WHEN v_pub_code = 'withdrawn' THEN COALESCE(v_prev_withdrawn_at, NOW()) 
      ELSE v_prev_withdrawn_at 
    END,
    updated_at = NOW()
  WHERE id = p_contribution_id;

  -- G. Desactivar (baja lógica) indicadores que ya no están marcados
  UPDATE public.contribution_editorial_indicators
  SET
    is_active = false,
    resolved_at = NOW(),
    resolved_by = v_user_id,
    notes = COALESCE(p_indicator_notes, notes)
  WHERE contribution_id = p_contribution_id
    AND is_active = true
    AND (
      p_active_indicator_option_ids IS NULL 
      OR NOT (indicator_option_id = ANY(p_active_indicator_option_ids))
    );

  -- H. Insertar nuevos ciclos para indicadores activados (sin pisar ciclos resueltos)
  IF p_active_indicator_option_ids IS NOT NULL AND cardinality(p_active_indicator_option_ids) > 0 THEN
    FOREACH v_ind_id IN ARRAY p_active_indicator_option_ids LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.contribution_editorial_indicators
        WHERE contribution_id = p_contribution_id 
          AND indicator_option_id = v_ind_id 
          AND is_active = true
      ) THEN
        INSERT INTO public.contribution_editorial_indicators (
          contribution_id,
          indicator_option_id,
          created_by,
          is_active
        )
        VALUES (
          p_contribution_id,
          v_ind_id,
          v_user_id,
          true
        );
      END IF;
    END LOOP;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Insertar semillas idempotentes para Estados de Publicación (category: publication_status)
INSERT INTO public.select_options (id, category, value, name, code, display_order, is_active, is_system, is_default, metadata)
VALUES
  ('d3c1a3bb-8c3b-4171-a472-ee1d8bb09cc1', 'publication_status', 'No evaluado', 'No evaluado', 'not_evaluated', 1, true, true, true, '{"minimum_conditions": "Aporte recibido, pendiente de revisión editorial y legal.", "color": "gray", "icon": "circle", "allows_public_visibility": false, "requires_publication_date": false, "help_key": "not_evaluated"}'),
  ('d3c1a3bb-8c3b-4171-a472-ee1d8bb09cc2', 'publication_status', 'No publicable', 'No publicable', 'not_publishable', 2, true, true, false, '{"minimum_conditions": "Rechazado en revisión o restricción legal insalvable.", "color": "red", "icon": "x-circle", "allows_public_visibility": false, "requires_publication_date": false, "help_key": "not_publishable"}'),
  ('d3c1a3bb-8c3b-4171-a472-ee1d8bb09cc3', 'publication_status', 'Publicable', 'Publicable', 'publishable', 3, true, true, false, '{"minimum_conditions": "Validación completa y consentimiento firmado de nivel A o B.", "color": "blue", "icon": "check-circle", "allows_public_visibility": false, "requires_publication_date": false, "help_key": "publishable"}'),
  ('d3c1a3bb-8c3b-4171-a472-ee1d8bb09cc4', 'publication_status', 'Programado', 'Programado', 'scheduled', 4, true, true, false, '{"minimum_conditions": "Aporte aprobado y fecha de publicación establecida.", "color": "amber", "icon": "calendar", "allows_public_visibility": false, "requires_publication_date": true, "help_key": "scheduled"}'),
  ('d3c1a3bb-8c3b-4171-a472-ee1d8bb09cc5', 'publication_status', 'Publicado', 'Publicado', 'published', 5, true, true, false, '{"minimum_conditions": "Material expuesto públicamente (lógica no activa en esta etapa).", "color": "green", "icon": "eye", "allows_public_visibility": false, "requires_publication_date": false, "help_key": "published"}'),
  ('d3c1a3bb-8c3b-4171-a472-ee1d8bb09cc6', 'publication_status', 'Retirado', 'Retirado', 'withdrawn', 6, true, true, false, '{"minimum_conditions": "Aporte anteriormente publicado que fue removido por solicitud o revisión.", "color": "gray", "icon": "eye-off", "allows_public_visibility": false, "requires_publication_date": false, "help_key": "withdrawn"}')
ON CONFLICT (id) DO UPDATE SET
  value = EXCLUDED.value,
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  is_system = EXCLUDED.is_system,
  is_default = EXCLUDED.is_default,
  metadata = EXCLUDED.metadata;

-- 14. Insertar semillas idempotentes para Indicadores Editoriales (category: editorial_indicator)
INSERT INTO public.select_options (id, category, value, name, code, display_order, is_active, is_system, is_default, metadata)
VALUES
  ('8c71a3bb-8c3b-4171-a472-ee1d8bb09cc1', 'editorial_indicator', 'Faltan archivos', 'Faltan archivos', 'missing_files', 1, true, true, false, '{"activation_criteria": "Archivos no subidos por el aportante o tamaño superior a 50 MB.", "resolution_instructions": "Coordinar entrega manual con el aportante y subir los archivos a la ficha.", "color": "orange", "icon": "file-warning", "blocks_publication": true, "help_key": "missing_files"}'),
  ('8c71a3bb-8c3b-4171-a472-ee1d8bb09cc2', 'editorial_indicator', 'Falta información', 'Falta información', 'missing_information', 2, true, true, false, '{"activation_criteria": "Descripción vacía o incoherente, o datos de catálogo faltantes.", "resolution_instructions": "Completar la ficha con el aportante o investigando el material.", "color": "orange", "icon": "help-circle", "blocks_publication": true, "help_key": "missing_information"}'),
  ('8c71a3bb-8c3b-4171-a472-ee1d8bb09cc3', 'editorial_indicator', 'Transcripción pendiente', 'Transcripción pendiente', 'transcription_pending', 3, true, true, false, '{"activation_criteria": "Aporte contiene audio o video sin texto transcrito.", "resolution_instructions": "Asignar a un voluntario transcriptor y cargar el texto en la ficha.", "color": "blue", "icon": "file-text", "blocks_publication": true, "help_key": "transcription_pending"}'),
  ('8c71a3bb-8c3b-4171-a472-ee1d8bb09cc4', 'editorial_indicator', 'Validación histórica pendiente', 'Validación histórica pendiente', 'historical_validation_pending', 4, true, true, false, '{"activation_criteria": "Fechas, lugares o personas en el testimonio no corroborados.", "resolution_instructions": "Investigar en archivos y agregar notas aclaratorias de contexto histórico.", "color": "purple", "icon": "history", "blocks_publication": true, "help_key": "historical_validation_pending"}'),
  ('8c71a3bb-8c3b-4171-a472-ee1d8bb09cc5', 'editorial_indicator', 'Requiere contactar al aportante', 'Requiere contactar al aportante', 'contact_contributor', 5, true, true, false, '{"activation_criteria": "Dudas sobre la procedencia, coherencia o detalles del material.", "resolution_instructions": "Llamar o escribir al aportante al teléfono o correo registrado.", "color": "amber", "icon": "phone", "blocks_publication": false, "help_key": "contact_contributor"}'),
  ('8c71a3bb-8c3b-4171-a472-ee1d8bb09cc6', 'editorial_indicator', 'Contiene datos sensibles', 'Contiene datos sensibles', 'sensitive_data', 6, true, true, false, '{"activation_criteria": "Mención de datos personales protegidos o hechos conflictivos locales.", "resolution_instructions": "Evaluar con el equipo de coordinación el nivel de reserva o anonimato.", "color": "red", "icon": "shield-alert", "blocks_publication": true, "help_key": "sensitive_data"}'),
  ('8c71a3bb-8c3b-4171-a472-ee1d8bb09cc7', 'editorial_indicator', 'Revisión técnica pendiente', 'Revisión técnica pendiente', 'technical_review_pending', 7, true, true, false, '{"activation_criteria": "Archivos dañados, audios con mucho ruido o videos desincronizados.", "resolution_instructions": "Restaurar digitalmente o cambiar formato de los archivos asociados.", "color": "indigo", "icon": "settings", "blocks_publication": true, "help_key": "technical_review_pending"}'),
  ('8c71a3bb-8c3b-4171-a472-ee1d8bb09cc8', 'editorial_indicator', 'Consentimiento pendiente', 'Consentimiento pendiente', 'consent_pending', 8, true, true, false, '{"activation_criteria": "Falta firma física o convenio de cesión no verificado.", "resolution_instructions": "Revisar firma digital, subir planilla firmada o verificar convenio.", "color": "red", "icon": "lock", "blocks_publication": true, "help_key": "consent_pending"}')
ON CONFLICT (id) DO UPDATE SET
  value = EXCLUDED.value,
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  is_system = EXCLUDED.is_system,
  is_default = EXCLUDED.is_default,
  metadata = EXCLUDED.metadata;

-- 15. Inicializar el estado de publicación en aportes existentes con "No evaluado"
UPDATE public.contributions
SET publication_status_option_id = 'd3c1a3bb-8c3b-4171-a472-ee1d8bb09cc1'
WHERE publication_status_option_id IS NULL;
