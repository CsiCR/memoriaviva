// Repositorio de la API Pública
// Archivo: src/lib/public/api/repository.ts

import { SupabaseClient } from "@supabase/supabase-js";
import { ParsedQueryParams } from "./query-params";
import { ContributionInput } from "../../editorial/types";
import { normalizeSlug } from "../slugs/generator";

export interface PublicSitemapEntry {
  slug: string;
  updatedAt: string;
  priority: number;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
}

export interface PublicApiRepository {
  listContributions(
    query: ParsedQueryParams
  ): Promise<{ items: ContributionInput[]; total: number }>;
  getContributionByIdentity(identityId: string): Promise<ContributionInput | null>;
  getPublicSitemapEntries(): Promise<PublicSitemapEntry[]>;
}

interface DbContributionFile {
  id: string;
  file_name: string;
  file_size: number;
  file_role: string;
  processing_status: string;
  file_type: string;
  is_original: boolean;
}

interface DbContributionRow {
  id: string;
  title: string;
  description: string | null;
  exact_date: string | null;
  approximate_decade: string | null;
  related_place: string | null;
  mentioned_people: string | null;
  related_institution: string | null;
  historical_context: string | null;
  authorization_level: string;
  credit_preference: string;
  consent_verified: boolean;
  consent_source: string | null;
  catalog_code: string | null;
  publication_scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  publication_status_option_id: string | null;
  contribution_files: DbContributionFile[] | null;
}

export class InMemoryPublicApiRepository implements PublicApiRepository {
  public contributions: ContributionInput[] = [];

  async listContributions(
    query: ParsedQueryParams
  ): Promise<{ items: ContributionInput[]; total: number }> {
    const rawContributions = this.contributions.map((c) => c as unknown as Record<string, unknown>);

    // 1. Filtrar únicamente aportes publicables
    let filtered = rawContributions.filter((c) => {
      const pubStatus = c.publication_status as Record<string, unknown> | null | undefined;
      if (pubStatus?.code !== "published") return false;
      if (!c.consent_verified) return false;
      if (
        c.authorization_level !== "A" &&
        c.authorization_level !== "public" &&
        c.authorization_level !== "public_with_credit"
      ) {
        return false;
      }
      return true;
    });

    // 2. Filtro de búsqueda q
    if (query.q) {
      const search = query.q.toLowerCase();
      filtered = filtered.filter((c) => {
        const titleStr = typeof c.title === "string" ? c.title : "";
        const descStr = typeof c.description === "string" ? c.description : "";
        const titleMatch = titleStr.toLowerCase().includes(search);
        const descMatch = descStr.toLowerCase().includes(search);
        return titleMatch || descMatch;
      });
    }

    // 3. Filtro contributionType
    if (query.contributionType) {
      filtered = filtered.filter((c) => c.content_type === query.contributionType);
    }

    // 4. Filtro year
    if (query.year) {
      filtered = filtered.filter((c) => {
        const exactDateStr = typeof c.exact_date === "string" ? c.exact_date : null;
        if (exactDateStr) {
          return new Date(exactDateStr).getFullYear() === query.year;
        }
        return false;
      });
    }

    // 5. Filtro collection
    if (query.collection) {
      filtered = filtered.filter((c) => c.related_institution === query.collection);
    }

    // 6. Filtro fechas (from y to)
    if (query.from) {
      const fromTime = Date.parse(query.from);
      filtered = filtered.filter((c) => {
        const pubSchedStr = typeof c.publication_scheduled_at === "string" ? c.publication_scheduled_at : null;
        const updatedStr = typeof c.updated_at === "string" ? c.updated_at : "";
        const date = pubSchedStr || updatedStr;
        return Date.parse(date) >= fromTime;
      });
    }
    if (query.to) {
      const toTime = Date.parse(query.to);
      filtered = filtered.filter((c) => {
        const pubSchedStr = typeof c.publication_scheduled_at === "string" ? c.publication_scheduled_at : null;
        const updatedStr = typeof c.updated_at === "string" ? c.updated_at : "";
        const date = pubSchedStr || updatedStr;
        return Date.parse(date) <= toTime;
      });
    }

    // 7. Ordenar de forma determinista y estable
    filtered.sort((a, b) => {
      const pubSchedA = typeof a.publication_scheduled_at === "string" ? a.publication_scheduled_at : null;
      const updatedA = typeof a.updated_at === "string" ? a.updated_at : "";
      const dateA = pubSchedA || updatedA;

      const pubSchedB = typeof b.publication_scheduled_at === "string" ? b.publication_scheduled_at : null;
      const updatedB = typeof b.updated_at === "string" ? b.updated_at : "";
      const dateB = pubSchedB || updatedB;

      const titleA = typeof a.title === "string" ? a.title : "";
      const titleB = typeof b.title === "string" ? b.title : "";

      const idA = typeof a.id === "string" ? a.id : "";
      const idB = typeof b.id === "string" ? b.id : "";

      if (query.sort === "title") {
        const lowerA = titleA.toLowerCase();
        const lowerB = titleB.toLowerCase();
        if (lowerA !== lowerB) {
          return lowerA.localeCompare(lowerB);
        }
        return idA.localeCompare(idB);
      }

      if (query.sort === "oldest") {
        if (dateA !== dateB) {
          return Date.parse(dateA) - Date.parse(dateB);
        }
        return idA.localeCompare(idB);
      }

      // Default/recent
      if (dateA !== dateB) {
        return Date.parse(dateB) - Date.parse(dateA);
      }
      return idB.localeCompare(idA);
    });

    const total = filtered.length;

    // 8. Paginación
    const startIndex = (query.page - 1) * query.pageSize;
    const slice = filtered.slice(startIndex, startIndex + query.pageSize);
    
    const items = slice.map((item) => item as unknown as ContributionInput);

    return { items, total };
  }

  async getContributionByIdentity(identityId: string): Promise<ContributionInput | null> {
    const contribution = this.contributions.find((c) => c.id === identityId);
    if (!contribution) return null;

    // Validar publicación
    if (
      contribution.publication_status?.code === "published" &&
      contribution.consent_verified &&
      (contribution.authorization_level === "A" ||
        contribution.authorization_level === "public" ||
        contribution.authorization_level === "public_with_credit")
    ) {
      return contribution;
    }

    return null;
  }

  async getPublicSitemapEntries(): Promise<PublicSitemapEntry[]> {
    const filtered = this.contributions.filter((c) => {
      const pubStatus = c.publication_status as Record<string, unknown> | null | undefined;
      return (
        pubStatus?.code === "published" &&
        c.consent_verified &&
        (c.authorization_level === "A" ||
          c.authorization_level === "public" ||
          c.authorization_level === "public_with_credit")
      );
    });

    return filtered.map((c) => {
      const cRaw = c as unknown as Record<string, unknown>;
      const updatedAtStr = typeof cRaw.updated_at === "string" ? cRaw.updated_at : new Date().toISOString();
      return {
        slug: normalizeSlug(c.title || ""),
        updatedAt: updatedAtStr,
        priority: 0.7,
        changeFrequency: "weekly" as const,
      };
    });
  }
}

export class SupabasePublicApiRepository implements PublicApiRepository {
  constructor(private supabase: SupabaseClient) {}

  async listContributions(
    query: ParsedQueryParams
  ): Promise<{ items: ContributionInput[]; total: number }> {
    // 1. Obtener ID de opción para estado de publicación "published" dinámicamente
    const { data: opt, error: optErr } = await this.supabase
      .from("select_options")
      .select("id")
      .eq("category", "publication_status")
      .eq("code", "published")
      .maybeSingle();

    if (optErr) throw new Error(`select_options query failed: ${optErr.message}`);
    const publishedOptId = opt?.id || "00000000-0000-0000-0000-000000000000";

    // 2. Construir query base con selección de campos explícitos (Prohibido select("*"))
    let qb = this.supabase
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
        contribution_files(
          id,
          file_name,
          file_size,
          file_role,
          processing_status,
          file_type,
          is_original
        )
      `,
        { count: "exact" }
      )
      .eq("consent_verified", true)
      .eq("authorization_level", "A")
      .eq("publication_status_option_id", publishedOptId);

    // 3. Aplicar filtro q (escapado de comodines)
    if (query.escapedQ) {
      qb = qb.or(`title.ilike.%${query.escapedQ}%,description.ilike.%${query.escapedQ}%`);
    }

    // 4. Filtro contributionType
    if (query.contributionType) {
      qb = qb.eq("content_type", query.contributionType);
    }

    // 5. Filtro year
    if (query.year) {
      qb = qb.gte("exact_date", `${query.year}-01-01`).lte("exact_date", `${query.year}-12-31`);
    }

    // 6. Filtro collection
    if (query.collection) {
      qb = qb.eq("related_institution", query.collection);
    }

    // 7. Filtro fechas (from y to)
    if (query.from) {
      qb = qb.or(
        `publication_scheduled_at.gte.${query.from},and(publication_scheduled_at.is.null,updated_at.gte.${query.from})`
      );
    }
    if (query.to) {
      qb = qb.or(
        `publication_scheduled_at.lte.${query.to},and(publication_scheduled_at.is.null,updated_at.lte.${query.to})`
      );
    }

    // 8. Aplicar orden determinista y estable
    const ascending = query.sort === "oldest";
    if (query.sort === "title") {
      qb = qb.order("title", { ascending: true }).order("id", { ascending: true });
    } else {
      qb = qb
        .order("publication_scheduled_at", { ascending, nullsFirst: false })
        .order("updated_at", { ascending })
        .order("id", { ascending: !ascending });
    }

    // 9. Paginación
    const fromIndex = (query.page - 1) * query.pageSize;
    const toIndex = fromIndex + query.pageSize - 1;
    qb = qb.range(fromIndex, toIndex);

    const { data, count, error } = await qb;
    if (error) throw new Error(`listContributions failed: ${error.message}`);

    const rawRows = (data || []) as unknown as DbContributionRow[];

    // Mapear el formato plano para el mapper (agregando publication_status)
    const items = rawRows.map((item) => {
      const files = (item.contribution_files || []).map((f) => ({
        id: f.id,
        file_name: f.file_name,
        file_size: f.file_size,
        file_role: f.file_role,
        processing_status: f.processing_status,
        is_original: f.is_original,
      }));

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        exact_date: item.exact_date,
        approximate_decade: item.approximate_decade,
        related_place: item.related_place,
        mentioned_people: item.mentioned_people,
        related_institution: item.related_institution,
        historical_context: item.historical_context,
        authorization_level: item.authorization_level,
        credit_preference: item.credit_preference,
        consent_verified: item.consent_verified,
        consent_source: item.consent_source,
        catalog_code: item.catalog_code,
        publication_scheduled_at: item.publication_scheduled_at,
        created_at: item.created_at,
        updated_at: item.updated_at,
        files,
        publication_status: {
          id: item.publication_status_option_id || "",
          code: "published",
          name: "Publicado",
        },
        editorial_status: {
          id: "",
          code: "approved_archive",
          name: "Aprobado para archivo",
        },
      } as unknown as ContributionInput;
    });

    return { items, total: count || 0 };
  }

  async getContributionByIdentity(identityId: string): Promise<ContributionInput | null> {
    const { data: opt, error: optErr } = await this.supabase
      .from("select_options")
      .select("id")
      .eq("category", "publication_status")
      .eq("code", "published")
      .maybeSingle();

    if (optErr) throw new Error(`select_options query failed: ${optErr.message}`);
    const publishedOptId = opt?.id || "00000000-0000-0000-0000-000000000000";

    const { data, error } = await this.supabase
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
      .eq("id", identityId)
      .eq("consent_verified", true)
      .eq("authorization_level", "A")
      .eq("publication_status_option_id", publishedOptId)
      .maybeSingle();

    if (error) throw new Error(`getContributionByIdentity failed: ${error.message}`);
    if (!data) return null;

    const item = data as unknown as DbContributionRow;

    const files = (item.contribution_files || []).map((f) => ({
      id: f.id,
      file_name: f.file_name,
      file_size: f.file_size,
      file_role: f.file_role,
      processing_status: f.processing_status,
      is_original: f.is_original,
    }));

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      exact_date: item.exact_date,
      approximate_decade: item.approximate_decade,
      related_place: item.related_place,
      mentioned_people: item.mentioned_people,
      related_institution: item.related_institution,
      historical_context: item.historical_context,
      authorization_level: item.authorization_level,
      credit_preference: item.credit_preference,
      consent_verified: item.consent_verified,
      consent_source: item.consent_source,
      catalog_code: item.catalog_code,
      publication_scheduled_at: item.publication_scheduled_at,
      created_at: item.created_at,
      updated_at: item.updated_at,
      files,
      publication_status: {
        id: item.publication_status_option_id || "",
        code: "published",
        name: "Publicado",
      },
      editorial_status: {
        id: "",
        code: "approved_archive",
        name: "Aprobado para archivo",
      },
    } as unknown as ContributionInput;
  }

  async getPublicSitemapEntries(): Promise<PublicSitemapEntry[]> {
    const { data, error } = await this.supabase
      .from("public_slugs")
      .select("slug, public_identities(updated_at, status)")
      .eq("entity_type", "contribution")
      .eq("kind", "canonical");

    if (error) {
      throw new Error(`Failed to fetch sitemap entries: ${error.message}`);
    }

    const rows = (data || []) as unknown as Array<{
      slug: string;
      public_identities: {
        updated_at: string;
        status: string;
      } | null;
    }>;

    return rows
      .filter((row) => row.public_identities?.status === "published")
      .map((row) => ({
        slug: row.slug,
        updatedAt: row.public_identities?.updated_at || new Date().toISOString(),
        priority: 0.7,
        changeFrequency: "weekly" as const,
      }));
  }
}
