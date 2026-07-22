// Helpers de Consultas Supabase para Exploración
// Archivo: src/lib/public/explore/queries.ts

import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Obtiene dinámicamente el ID de opción para el estado "published".
 */
export async function fetchPublishedOptionId(supabase: SupabaseClient): Promise<string> {
  const { data: opt, error } = await supabase
    .from("select_options")
    .select("id")
    .eq("category", "publication_status")
    .eq("code", "published")
    .maybeSingle();

  if (error) {
    throw new Error(`Error fetching publication status option: ${error.message}`);
  }
  return opt?.id || "00000000-0000-0000-0000-000000000000";
}

/**
 * Construye la consulta base para obtener aportes publicados y consentidos.
 */
export function buildBasePublishedQuery(supabase: SupabaseClient, publishedOptId: string) {
  return supabase
    .from("contributions")
    .select(
      `
      id,
      title,
      description,
      exact_date,
      approximate_decade,
      related_place,
      mentioned_people,
      related_institution,
      historical_context,
      authorization_level,
      credit_preference,
      consent_verified,
      consent_source,
      catalog_code,
      publication_scheduled_at,
      created_at,
      updated_at,
      publication_status_option_id,
      contribution_type,
      contributor_id,
      contribution_files(
        id,
        file_name,
        file_size,
        file_role,
        processing_status,
        file_type,
        is_original
      )
      `
    )
    .eq("consent_verified", true)
    .eq("authorization_level", "A")
    .eq("publication_status_option_id", publishedOptId);
}

/**
 * Estrategias de ordenamiento desacopladas para evitar ramificaciones condicionales.
 */
export const SORTING_STRATEGIES = {
  recent: <T extends { order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => T }>(qb: T): T =>
    qb
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
  oldest: <T extends { order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => T }>(qb: T): T =>
    qb
      .order("published_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
  "title-asc": <T extends { order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => T }>(qb: T): T =>
    qb
      .order("title", { ascending: true })
      .order("id", { ascending: true }),
  "title-desc": <T extends { order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => T }>(qb: T): T =>
    qb
      .order("title", { ascending: false })
      .order("id", { ascending: true }),
};
