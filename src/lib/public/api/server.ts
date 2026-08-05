// Composición de Dependencias Servidor-Only de la API Pública
// Archivo: src/lib/public/api/server.ts

import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import { SupabasePublicIdentityRepository } from "../slugs/repository";
import { PublicIdentityService } from "../slugs/service";
import { SupabasePublicApiRepository } from "./repository";
import { PublicApiService } from "./service";
import { PublicApiController } from "./controller";

/**
 * Crea e inyecta todas las dependencias del controlador de la API pública en el servidor.
 *
 * El cliente administrativo (service_role) se inyecta en SupabasePublicApiRepository
 * para que getPublicSitemapEntries() pueda consultar public_slugs/public_identities
 * sin que el RLS restrictivo del rol anon bloquee la operación.
 * createAdminClient() permanece en este módulo server-only y no se acopla
 * directamente al repositorio.
 */
export function createPublicApiController(supabase: SupabaseClient): PublicApiController {
  const adminClient = createAdminClient();
  const identityRepo = new SupabasePublicIdentityRepository(supabase);
  const identityService = new PublicIdentityService(identityRepo);
  
  const apiRepo = new SupabasePublicApiRepository(supabase, adminClient);
  const apiService = new PublicApiService(apiRepo, identityService);
  
  return new PublicApiController(apiService);
}
