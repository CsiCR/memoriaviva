// Contenedor de Inyección de Dependencias para SEO (Server-Only)
// Archivo: src/lib/public/seo/server.ts

import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";
import { SupabasePublicApiRepository } from "../api/repository";
import { PublicApiService } from "../api/service";
import { SupabasePublicIdentityRepository } from "../slugs/repository";
import { PublicIdentityService } from "../slugs/service";
import { validatePublicSiteUrl } from "../url/canonical-url";

export interface SeoContainer {
  siteUrl: string;
  apiService: PublicApiService;
}

/**
 * Crea e inyecta las dependencias necesarias para los publicadores y constructores de SEO.
 */
export function createSeoContainer(supabase: SupabaseClient): SeoContainer {
  const siteUrl = validatePublicSiteUrl(process.env.PUBLIC_SITE_URL);

  const identityRepo = new SupabasePublicIdentityRepository(supabase);
  const identityService = new PublicIdentityService(identityRepo);

  const apiRepo = new SupabasePublicApiRepository(supabase);
  const apiService = new PublicApiService(apiRepo, identityService);

  return {
    siteUrl,
    apiService,
  };
}
