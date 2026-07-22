-- Habilitar RLS en las tablas
ALTER TABLE public.public_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_slugs ENABLE ROW LEVEL SECURITY;

-- Revocar accesos a las tablas para anon, authenticated y PUBLIC
REVOKE ALL ON public.public_identities FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.public_slugs FROM anon, authenticated, PUBLIC;

-- Revocar permisos de ejecución en las funciones RPC de forma explícita
REVOKE ALL ON FUNCTION public.register_public_identity(UUID, VARCHAR, VARCHAR, VARCHAR, UUID, VARCHAR, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.change_canonical_public_slug(UUID, VARCHAR, VARCHAR, UUID, VARCHAR, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.merge_public_identities(UUID, UUID, UUID, VARCHAR, TEXT) FROM PUBLIC, anon, authenticated;

-- Otorgar ejecución exclusivamente al rol confiable del backend (service_role)
GRANT EXECUTE ON FUNCTION public.register_public_identity(UUID, VARCHAR, VARCHAR, VARCHAR, UUID, VARCHAR, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.change_canonical_public_slug(UUID, VARCHAR, VARCHAR, UUID, VARCHAR, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.merge_public_identities(UUID, UUID, UUID, VARCHAR, TEXT) TO service_role;
