// Composición de Dependencias Servidor-Only de la API Pública
// Archivo: src/lib/public/api/server.ts

import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";
import { SupabasePublicIdentityRepository } from "../slugs/repository";
import { PublicIdentityService } from "../slugs/service";
import { SupabasePublicApiRepository } from "./repository";
import { PublicApiService } from "./service";
import { PublicApiController } from "./controller";

/**
 * Crea e inyecta todas las dependencias del controlador de la API pública en el servidor.
 */
export function createPublicApiController(supabase: SupabaseClient): PublicApiController {
  const identityRepo = new SupabasePublicIdentityRepository(supabase);
  const identityService = new PublicIdentityService(identityRepo);
  
  const apiRepo = new SupabasePublicApiRepository(supabase);
  const apiService = new PublicApiService(apiRepo, identityService);
  
  return new PublicApiController(apiService);
}
