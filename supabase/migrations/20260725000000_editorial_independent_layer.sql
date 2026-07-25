-- Migración: Capa Editorial Independiente y Preservación del Aporte Original
-- Archivo: supabase/migrations/20260725000000_editorial_independent_layer.sql

-- 1. Agregar columnas para el trabajo editorial independiente en la tabla contributions
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS editorial_title TEXT;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS editorial_description TEXT;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS editorial_summary TEXT;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS editorial_context TEXT;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS editorial_classification TEXT;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS historical_validation_status TEXT DEFAULT 'not_evaluated' CHECK (historical_validation_status IN ('not_evaluated', 'pending', 'validated', 'not_required', 'rejected'));
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS historical_validation_notes TEXT;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS publication_title TEXT;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS publication_excerpt TEXT;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS publication_level CHAR(1) CHECK (publication_level IN ('A', 'B', 'C', 'D'));
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS publication_credits TEXT;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS editor_responsible_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS validated_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS published_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS editorial_updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Redefinir la RPC update_editorial_dimensions para que persista los nuevos campos editoriales
-- e identifique la autoría (editor, validador, publicador) según el estado actual
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
  p_publication_level CHAR,
  p_publication_credits TEXT
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
  IF v_pub_code = 'scheduled' AND p_publication_scheduled_at IS NULL THEN
    RAISE EXCEPTION 'El estado Programado requiere una fecha de publicación programada.';
  END IF;

  -- F. Actualizar la contribución (Capa editorial, publicación y autorías)
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
    -- Nuevos campos de la capa editorial
    editorial_title = p_editorial_title,
    editorial_description = p_editorial_description,
    editorial_summary = p_editorial_summary,
    editorial_context = p_editorial_context,
    editorial_classification = p_editorial_classification,
    historical_validation_status = COALESCE(p_historical_validation_status, historical_validation_status),
    historical_validation_notes = p_historical_validation_notes,
    -- Nuevos campos de publicación
    publication_title = p_publication_title,
    publication_excerpt = p_publication_excerpt,
    publication_level = p_publication_level,
    publication_credits = p_publication_credits,
    -- Trazabilidad de identidad
    editor_responsible_user_id = v_user_id,
    validated_by_user_id = CASE
      WHEN p_historical_validation_status = 'validated' THEN v_user_id
      ELSE validated_by_user_id
    END,
    published_by_user_id = CASE
      WHEN v_pub_code = 'published' THEN v_user_id
      ELSE published_by_user_id
    END,
    editorial_updated_at = NOW()
  WHERE id = p_contribution_id;

  -- G. Gestionar Indicadores Editoriales
  -- Marcar como inactivos los que ya no están presentes (Baja lógica y auditoría)
  UPDATE public.contribution_editorial_indicators
  SET 
    is_active = FALSE,
    resolved_at = NOW(),
    resolved_by = v_user_id
  WHERE contribution_id = p_contribution_id 
    AND is_active = TRUE 
    AND (p_active_indicator_option_ids IS NULL OR NOT (indicator_option_id = ANY(p_active_indicator_option_ids)));

  -- Insertar o Reactivar los que sí están presentes
  IF p_active_indicator_option_ids IS NOT NULL AND cardinality(p_active_indicator_option_ids) > 0 THEN
    FOREACH v_ind_id IN ARRAY p_active_indicator_option_ids
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.contribution_editorial_indicators
        WHERE contribution_id = p_contribution_id AND indicator_option_id = v_ind_id AND is_active = TRUE
      ) THEN
        INSERT INTO public.contribution_editorial_indicators (
          contribution_id,
          indicator_option_id,
          is_active,
          created_by
        ) VALUES (
          p_contribution_id,
          v_ind_id,
          TRUE,
          v_user_id
        );
      END IF;
    END LOOP;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
