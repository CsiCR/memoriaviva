-- MIGRACIÓN DE CORRECCIÓN: VALIDACIÓN ESTRICTA DE FECHA PROGRAMADA Y SANEAMIENTO DE POLÍTICAS RLS EN SELECT_OPTIONS
-- Archivo: supabase/migrations/202607142220_fix_scheduled_date_validation.sql

-- 1. Saneamiento de RLS en select_options
-- Borra dinámicamente cualquier política anterior (evitando ORs permisivos con políticas obsoletas) y recrea las tres autorizadas
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'select_options'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.select_options;';
    END LOOP;
END $$;

-- Forzar habilitación de RLS
ALTER TABLE public.select_options ENABLE ROW LEVEL SECURITY;

-- Recrear políticas limpias
CREATE POLICY "Permitir lectura publica de categorias seleccionadas"
  ON public.select_options FOR SELECT TO anon
  USING (category IN ('relation_to_city', 'contribution_type', 'authorization_level', 'credit_preference'));

CREATE POLICY "Permitir lectura completa a usuarios autenticados"
  ON public.select_options FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Permitir control de select_options solo a admins"
  ON public.select_options FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), ARRAY['admin']));


-- 2. Redefinir la RPC update_editorial_dimensions con validación estricta de fecha programada
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
  -- El estado Programado (scheduled) requiere obligatoriamente que se especifique una fecha programada en el parámetro p_publication_scheduled_at
  IF v_pub_code = 'scheduled' AND p_publication_scheduled_at IS NULL THEN
    RAISE EXCEPTION 'El estado Programado requiere una fecha de publicación programada.';
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
    END
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
      -- Solo insertar si no existe ya un ciclo activo para este indicador
      IF NOT EXISTS (
        SELECT 1 FROM public.contribution_editorial_indicators
        WHERE contribution_id = p_contribution_id AND indicator_option_id = v_ind_id AND is_active = TRUE
      ) THEN
        INSERT INTO public.contribution_editorial_indicators (
          contribution_id,
          indicator_option_id,
          is_active
        ) VALUES (
          p_contribution_id,
          v_ind_id,
          TRUE
        );
      END IF;
    END LOOP;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
