// Composición e Inyección de Dependencias Servidor-Only de Exploración
// Archivo: src/lib/public/explore/server.ts

import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";
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
 */
export function createContributionExplorerService(supabase: SupabaseClient): ContributionExplorerService {
  const repo = new SupabaseExploreRepository(supabase);
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
