-- 1. Tabla de Identidad Pública
CREATE TABLE IF NOT EXISTS public.public_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_uuid UUID NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  is_frozen BOOLEAN NOT NULL DEFAULT FALSE,
  has_ever_been_published BOOLEAN NOT NULL DEFAULT FALSE,
  merged_into_identity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_public_entity UNIQUE (entity_type, entity_uuid),
  CONSTRAINT unique_identity_id_type UNIQUE (id, entity_type),
  CONSTRAINT valid_identity_status CHECK (
    status IN ('draft', 'published', 'unpublished', 'deleted', 'merged')
  ),
  CONSTRAINT valid_public_entity_type CHECK (
    entity_type IN ('story', 'contribution', 'person', 'place', 'institution', 'collection')
  ),
  -- Impide fusiones de tipos diferentes
  CONSTRAINT fk_merged_identity_type FOREIGN KEY (merged_into_identity_id, entity_type)
    REFERENCES public.public_identities (id, entity_type) ON DELETE RESTRICT,
  -- Restricción estricta de estado de fusión
  CONSTRAINT valid_identity_merge_state CHECK (
    (status = 'merged' AND merged_into_identity_id IS NOT NULL AND merged_into_identity_id <> id)
    OR
    (status <> 'merged' AND merged_into_identity_id IS NULL)
  )
);

-- 2. Tabla de Slugs y Direcciones Únicas
CREATE TABLE IF NOT EXISTS public.public_slugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  slug VARCHAR(150) NOT NULL,
  kind VARCHAR(30) NOT NULL, -- 'canonical', 'alias'
  reason VARCHAR(50) NOT NULL, -- 'created', 'renamed', 'merged', 'imported', 'migration', 'restored'
  redirects_to_identity_id UUID,
  
  -- Auditoría
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source VARCHAR(30),
  operation_id UUID, -- Identificador lógico del lote operacional
  note TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_slug_kind CHECK (kind IN ('canonical', 'alias')),
  CONSTRAINT valid_slug_reason CHECK (
    reason IN ('created', 'renamed', 'merged', 'imported', 'migration', 'restored')
  ),
  CONSTRAINT valid_slug_source CHECK (
    source IS NULL OR source IN ('editor', 'import', 'system', 'migration')
  ),
  -- Formato de URL
  CONSTRAINT valid_slug_format CHECK (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    AND char_length(slug) BETWEEN 3 AND 150
  ),
  -- Coherencia del tipo de entidad
  CONSTRAINT fk_identity_type FOREIGN KEY (identity_id, entity_type) 
    REFERENCES public.public_identities (id, entity_type) ON DELETE RESTRICT,
  -- Restricciones de redirección desacopladas
  CONSTRAINT valid_slug_redirect CHECK (
    (kind = 'alias' AND (redirects_to_identity_id IS NULL OR redirects_to_identity_id <> identity_id))
    OR
    (kind = 'canonical' AND redirects_to_identity_id IS NULL)
  ),
  -- Impide redirecciones de tipos diferentes
  CONSTRAINT fk_redirect_identity_type FOREIGN KEY (redirects_to_identity_id, entity_type)
    REFERENCES public.public_identities (id, entity_type) ON DELETE RESTRICT
);

-- Unicidad del slug por tipo de entidad
CREATE UNIQUE INDEX IF NOT EXISTS unique_public_slug
ON public.public_slugs(entity_type, slug);

-- Único slug canónico activo por identidad
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_canonical_slug_per_identity
ON public.public_slugs(identity_id)
WHERE kind = 'canonical';
