// Inyección de Dependencias Servidor-Only de URLs Públicas
// Archivo: src/lib/public/url/server.ts

import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";
import { SupabasePublicIdentityRepository } from "../slugs/repository";
import { PublicIdentityService } from "../slugs/service";
import { SupabasePublicApiRepository } from "../api/repository";
import { PublicApiService } from "../api/service";
import { PublicUrlIdentityResolver } from "./identity-resolver";
import { PublicContributionPageService } from "./page-service";
import { validatePublicSiteUrl } from "./canonical-url";

export interface UrlResolutionContainer {
  siteUrl: string;
  identityResolver: PublicUrlIdentityResolver;
  pageService: PublicContributionPageService;
}

/**
 * Crea e inyecta todas las dependencias para la resolución de URLs públicas.
 */
export function createUrlResolutionContainer(supabase: SupabaseClient): UrlResolutionContainer {
  const siteUrl = validatePublicSiteUrl(process.env.PUBLIC_SITE_URL);
  
  const identityRepo = new SupabasePublicIdentityRepository(supabase);
  const identityService = new PublicIdentityService(identityRepo);
  
  const apiRepo = new SupabasePublicApiRepository(supabase);
  const apiService = new PublicApiService(apiRepo, identityService);
  
  const identityResolver = new PublicUrlIdentityResolver(identityService);
  const pageService = new PublicContributionPageService(identityResolver, apiService);
  
  return {
    siteUrl,
    identityResolver,
    pageService,
  };
}
