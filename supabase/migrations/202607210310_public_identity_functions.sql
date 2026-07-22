-- 1. Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF ROW(NEW.*) IS DISTINCT FROM ROW(OLD.*) THEN
      NEW.updated_at := NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_public_identities_updated_at
BEFORE UPDATE ON public.public_identities
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 2. Trigger para verificar e impedir reiniciar has_ever_been_published
CREATE OR REPLACE FUNCTION public.prevent_publication_history_reset()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.has_ever_been_published = TRUE AND NEW.has_ever_been_published = FALSE THEN
      RAISE EXCEPTION 'has_ever_been_published cannot be reset';
    END IF;
  END IF;

  IF NEW.status = 'published' THEN
    NEW.has_ever_been_published := TRUE;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_public_identity_publication_history
BEFORE INSERT OR UPDATE ON public.public_identities
FOR EACH ROW
EXECUTE FUNCTION public.prevent_publication_history_reset();

-- 3. Trigger para proteger identidades congeladas
CREATE OR REPLACE FUNCTION public.check_frozen_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.is_frozen = TRUE THEN
    -- Permitir descongelar (cambiar is_frozen de TRUE a FALSE), pero no otras propiedades si permanece congelada
    IF NEW.is_frozen = TRUE AND (
      OLD.status IS DISTINCT FROM NEW.status
      OR OLD.entity_type IS DISTINCT FROM NEW.entity_type
      OR OLD.entity_uuid IS DISTINCT FROM NEW.entity_uuid
      OR OLD.merged_into_identity_id IS DISTINCT FROM NEW.merged_into_identity_id
    ) THEN
      RAISE EXCEPTION 'Identity is frozen and cannot be modified';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_public_identities_frozen_check
BEFORE UPDATE ON public.public_identities
FOR EACH ROW
EXECUTE FUNCTION public.check_frozen_identity();

-- 4. RPC: Registrar identidad pública
CREATE OR REPLACE FUNCTION public.register_public_identity(
  p_entity_uuid UUID,
  p_entity_type VARCHAR,
  p_slug VARCHAR,
  p_status VARCHAR,
  p_user_id UUID,
  p_source VARCHAR,
  p_note TEXT
)
RETURNS TABLE (
  identity_id UUID,
  canonical_slug VARCHAR,
  aliases_created INTEGER,
  redirect_required BOOLEAN,
  has_changed BOOLEAN,
  operation VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_identity_id UUID;
  v_operation_id UUID := gen_random_uuid();
BEGIN
  -- 1. Insertar la identidad pública
  INSERT INTO public.public_identities (
    entity_type,
    entity_uuid,
    status,
    is_frozen,
    has_ever_been_published
  )
  VALUES (
    p_entity_type,
    p_entity_uuid,
    p_status,
    FALSE,
    (p_status = 'published')
  )
  RETURNING id INTO v_identity_id;

  -- 2. Insertar el slug canónico
  INSERT INTO public.public_slugs (
    identity_id,
    entity_type,
    slug,
    kind,
    reason,
    user_id,
    source,
    operation_id,
    note
  )
  VALUES (
    v_identity_id,
    p_entity_type,
    p_slug,
    'canonical',
    'created',
    p_user_id,
    p_source,
    v_operation_id,
    p_note
  );

  RETURN QUERY
  SELECT 
    v_identity_id AS identity_id,
    p_slug AS canonical_slug,
    0 AS aliases_created,
    FALSE AS redirect_required,
    TRUE AS has_changed,
    'registered'::VARCHAR AS operation;
END;
$$;

-- 5. RPC: Cambiar slug canónico de identidad
CREATE OR REPLACE FUNCTION public.change_canonical_public_slug(
  p_identity_id UUID,
  p_new_slug VARCHAR,
  p_reason VARCHAR,
  p_user_id UUID,
  p_source VARCHAR,
  p_note TEXT
)
RETURNS TABLE (
  identity_id UUID,
  canonical_slug VARCHAR,
  aliases_created INTEGER,
  redirect_required BOOLEAN,
  has_changed BOOLEAN,
  operation VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_identity public.public_identities%ROWTYPE;
  v_old_slug public.public_slugs%ROWTYPE;
  v_operation_id UUID := gen_random_uuid();
  v_aliases_created INTEGER := 0;
BEGIN
  -- 1. Bloquear y obtener identidad para evitar condiciones de carrera
  SELECT * INTO v_identity
  FROM public.public_identities
  WHERE id = p_identity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Identity % not found', p_identity_id;
  END IF;

  -- 2. Validar si está congelada
  IF v_identity.is_frozen THEN
    RAISE EXCEPTION 'Identity is frozen';
  END IF;

  -- 3. Obtener el canónico actual
  SELECT * INTO v_old_slug
  FROM public.public_slugs
  WHERE public_slugs.identity_id = p_identity_id
    AND kind = 'canonical';

  -- 4. Idempotencia: si es el mismo, no hacer nada
  IF FOUND AND v_old_slug.slug = p_new_slug THEN
    RETURN QUERY
    SELECT 
      p_identity_id AS identity_id,
      v_old_slug.slug AS canonical_slug,
      0 AS aliases_created,
      FALSE AS redirect_required,
      FALSE AS has_changed,
      'unchanged'::VARCHAR AS operation;
    RETURN;
  END IF;

  -- 5. Transición del canónico previo
  IF FOUND THEN
    IF NOT v_identity.has_ever_been_published THEN
      -- Borrador nunca publicado: eliminar físicamente el slug anterior
      DELETE FROM public.public_slugs
      WHERE id = v_old_slug.id;
    ELSE
      -- Publicado alguna vez: convertir canónico anterior en alias
      UPDATE public.public_slugs
      SET 
        kind = 'alias',
        reason = p_reason,
        user_id = p_user_id,
        source = p_source,
        operation_id = v_operation_id,
        note = 'Retired from canonical'
      WHERE id = v_old_slug.id;
      v_aliases_created := 1;
    END IF;
  END IF;

  -- 6. Insertar el nuevo canónico
  INSERT INTO public.public_slugs (
    identity_id,
    entity_type,
    slug,
    kind,
    reason,
    user_id,
    source,
    operation_id,
    note
  )
  VALUES (
    p_identity_id,
    v_identity.entity_type,
    p_new_slug,
    'canonical',
    p_reason,
    p_user_id,
    p_source,
    v_operation_id,
    p_note
  );

  RETURN QUERY
  SELECT 
    p_identity_id AS identity_id,
    p_new_slug AS canonical_slug,
    v_aliases_created AS aliases_created,
    TRUE AS redirect_required,
    TRUE AS has_changed,
    'renamed'::VARCHAR AS operation;
END;
$$;

-- 6. RPC: Fusionar identidades públicas
CREATE OR REPLACE FUNCTION public.merge_public_identities(
  p_source_id UUID,
  p_target_id UUID,
  p_user_id UUID,
  p_source VARCHAR,
  p_note TEXT
)
RETURNS TABLE (
  identity_id UUID,
  canonical_slug VARCHAR,
  aliases_created INTEGER,
  redirect_required BOOLEAN,
  has_changed BOOLEAN,
  operation VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_source public.public_identities%ROWTYPE;
  v_target public.public_identities%ROWTYPE;
  v_target_slug VARCHAR;
  v_operation_id UUID := gen_random_uuid();
  v_count INTEGER;
BEGIN
  -- 1. Validar que origen y destino sean diferentes
  IF p_source_id = p_target_id THEN
    RAISE EXCEPTION 'Cannot merge an identity into itself';
  END IF;

  -- 2. Bloquear ambas identidades en orden ascendente por UUID para evitar deadlocks
  IF p_source_id < p_target_id THEN
    SELECT * INTO v_source FROM public.public_identities WHERE id = p_source_id FOR UPDATE;
    SELECT * INTO v_target FROM public.public_identities WHERE id = p_target_id FOR UPDATE;
  ELSE
    SELECT * INTO v_target FROM public.public_identities WHERE id = p_target_id FOR UPDATE;
    SELECT * INTO v_source FROM public.public_identities WHERE id = p_source_id FOR UPDATE;
  END IF;

  IF v_source.id IS NULL OR v_target.id IS NULL THEN
    RAISE EXCEPTION 'One or both identities not found';
  END IF;

  -- 3. Validar congelamiento
  IF v_source.is_frozen OR v_target.is_frozen THEN
    RAISE EXCEPTION 'One or both identities are frozen';
  END IF;

  -- 4. Validar tipos de entidad coincidentes
  IF v_source.entity_type <> v_target.entity_type THEN
    RAISE EXCEPTION 'Cannot merge identities of different entity types';
  END IF;

  -- 5. Validar que no estén ya fusionadas
  IF v_source.status = 'merged' THEN
    RAISE EXCEPTION 'Source identity is already merged';
  END IF;

  IF v_target.status = 'merged' THEN
    RAISE EXCEPTION 'Cannot merge into an already merged target identity';
  END IF;

  -- 6. Obtener el slug canónico actual de la identidad destino
  SELECT slug INTO v_target_slug
  FROM public.public_slugs
  WHERE identity_id = p_target_id
    AND kind = 'canonical';

  IF v_target_slug IS NULL THEN
    RAISE EXCEPTION 'Target identity has no canonical slug';
  END IF;

  -- 7. Actualizar todos los slugs de la identidad de origen:
  -- Se convierten en aliases, con motivo 'merged' y apuntando a la identidad destino.
  UPDATE public.public_slugs
  SET
    kind = 'alias',
    reason = 'merged',
    redirects_to_identity_id = p_target_id,
    user_id = p_user_id,
    source = p_source,
    operation_id = v_operation_id,
    note = COALESCE(p_note, 'Merged into target identity')
  WHERE identity_id = p_source_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- 8. Actualizar el estado de la identidad origen
  UPDATE public.public_identities
  SET
    status = 'merged',
    merged_into_identity_id = p_target_id
  WHERE id = p_source_id;

  RETURN QUERY
  SELECT 
    p_target_id AS identity_id,
    v_target_slug AS canonical_slug,
    v_count AS aliases_created,
    TRUE AS redirect_required,
    TRUE AS has_changed,
    'merged'::VARCHAR AS operation;
END;
$$;
