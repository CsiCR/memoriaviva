// Composición e Inyección de Dependencias Servidor-Only de Exploración
// Archivo: src/lib/public/explore/server.ts

import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import { SupabaseExploreRepository, SupabaseStatisticsRepository } from "./repository";
import { ContributionExplorerService, StatisticsService, HomeService } from "./service";

/**
 * Crea e inyecta dependencias para el StatisticsService.
 */
export function createStatisticsService(supabase: SupabaseClient): StatisticsService {
  const repo = new SupabaseStatisticsRepository(supabase);
  return new StatisticsService(repo);
}

/**
 * Crea e inyecta dependencias para el ContributionExplorerService.
 *
 * El cliente administrativo (service_role) se inyecta aquí para que
 * SupabaseExploreRepository pueda consultar public_slugs/public_identities
 * sin depender del RLS restrictivo del cliente anon/authenticated.
 * createAdminClient() permanece en este módulo server-only y no se
 * acopla directamente al repositorio.
 */
export function createContributionExplorerService(supabase: SupabaseClient): ContributionExplorerService {
  const adminClient = createAdminClient();
  const repo = new SupabaseExploreRepository(supabase, adminClient);
  return new ContributionExplorerService(repo);
}

/**
 * Crea e inyecta dependencias para el HomeService agregador de la portada.
 */
export function createHomeService(supabase: SupabaseClient): HomeService {
  const statsService = createStatisticsService(supabase);
  const explorerService = createContributionExplorerService(supabase);
  return new HomeService(explorerService, statsService);
}
