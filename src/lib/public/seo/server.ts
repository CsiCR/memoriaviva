// Contenedor de Inyección de Dependencias para SEO (Server-Only)
// Archivo: src/lib/public/seo/server.ts

import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
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
 *
 * El cliente administrativo se inyecta en SupabasePublicApiRepository para que
 * getPublicSitemapEntries() pueda consultar public_slugs/public_identities
 * sin que el RLS restrictivo del rol anon bloquee la operación.
 */
export function createSeoContainer(supabase: SupabaseClient): SeoContainer {
  const siteUrl = validatePublicSiteUrl(process.env.PUBLIC_SITE_URL);

  const identityRepo = new SupabasePublicIdentityRepository(supabase);
  const identityService = new PublicIdentityService(identityRepo);

  const adminClient = createAdminClient();
  const apiRepo = new SupabasePublicApiRepository(supabase, adminClient);
  const apiService = new PublicApiService(apiRepo, identityService);

  return {
    siteUrl,
    apiService,
  };
}
