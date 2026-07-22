// Repositorio de Exploración y Estadísticas Públicas
// Archivo: src/lib/public/explore/repository.ts

import { SupabaseClient } from "@supabase/supabase-js";
import { ExploreStats, ExploreQueryParams, AvailableFilters } from "./types";
import { PublicContribution } from "../types/contribution";
import { ContributionInput } from "../../editorial/types";
import { fetchPublishedOptionId, buildBasePublishedQuery, SORTING_STRATEGIES } from "./queries";
import { toPublicContribution } from "../mappers/to-public-contribution";

export interface ExploreRepository {
  listContributions(query: ExploreQueryParams): Promise<{ items: PublicContribution[]; total: number }>;
  getFeaturedContributions(limit: number): Promise<PublicContribution[]>;
  getAvailableFilters(): Promise<AvailableFilters>;
}

export interface StatisticsRepository {
  getStats(): Promise<ExploreStats>;
}

export class InMemoryExploreRepository implements ExploreRepository {
  constructor(public contributions: ContributionInput[] = []) {}

  async listContributions(
    query: ExploreQueryParams
  ): Promise<{ items: PublicContribution[]; total: number }> {
    // 1. Filtrar únicamente aportes publicables
    let filtered = this.contributions.filter((c) => {
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
        const titleStr = c.title || "";
        const descStr = c.description || "";
        return titleStr.toLowerCase().includes(search) || descStr.toLowerCase().includes(search);
      });
    }

    // Filtro por tipo de aporte
    if (query.type) {
      filtered = filtered.filter((c) => {
        const cRaw = c as unknown as Record<string, unknown>;
        const type = (cRaw.contribution_type || cRaw.content_type || "") as string;
        return type.toLowerCase() === query.type?.toLowerCase();
      });
    }

    // Filtro por década
    if (query.decade) {
      filtered = filtered.filter((c) => {
        const cRaw = c as unknown as Record<string, unknown>;
        return cRaw.approximate_decade === query.decade;
      });
    }

    // Filtro por institución (búsqueda difusa sobre cadena separada por comas)
    if (query.institution) {
      const searchInst = query.institution.toLowerCase();
      filtered = filtered.filter((c) => {
        const cRaw = c as unknown as Record<string, unknown>;
        const insts = (cRaw.related_institution as string || "").toLowerCase();
        return insts.includes(searchInst);
      });
    }

    // Filtro por persona (búsqueda difusa sobre cadena separada por comas)
    if (query.person) {
      const searchPerson = query.person.toLowerCase();
      filtered = filtered.filter((c) => {
        const cRaw = c as unknown as Record<string, unknown>;
        const people = (cRaw.mentioned_people as string || "").toLowerCase();
        return people.includes(searchPerson);
      });
    }

    // Filtro por lugar
    if (query.place) {
      const searchPlace = query.place.toLowerCase();
      filtered = filtered.filter((c) => {
        const cRaw = c as unknown as Record<string, unknown>;
        const place = (cRaw.related_place as string || "").toLowerCase();
        return place.includes(searchPlace);
      });
    }

    // 3. Ordenamiento desacoplado en memoria
    const inMemorySorts: Record<
      "recent" | "oldest" | "title-asc" | "title-desc",
      (a: ContributionInput, b: ContributionInput) => number
    > = {
      recent: (a, b) => {
        const aRaw = a as unknown as Record<string, unknown>;
        const bRaw = b as unknown as Record<string, unknown>;
        const dateA = (aRaw.publication_scheduled_at || aRaw.updated_at || "") as string;
        const dateB = (bRaw.publication_scheduled_at || bRaw.updated_at || "") as string;
        if (dateA !== dateB) return Date.parse(dateB) - Date.parse(dateA);
        const createdA = (aRaw.created_at || "") as string;
        const createdB = (bRaw.created_at || "") as string;
        if (createdA !== createdB) return Date.parse(createdB) - Date.parse(createdA);
        return (b.id || "").localeCompare(a.id || "");
      },
      oldest: (a, b) => {
        const aRaw = a as unknown as Record<string, unknown>;
        const bRaw = b as unknown as Record<string, unknown>;
        const dateA = (aRaw.publication_scheduled_at || aRaw.updated_at || "") as string;
        const dateB = (bRaw.publication_scheduled_at || bRaw.updated_at || "") as string;
        if (dateA !== dateB) return Date.parse(dateA) - Date.parse(dateB);
        const createdA = (aRaw.created_at || "") as string;
        const createdB = (bRaw.created_at || "") as string;
        if (createdA !== createdB) return Date.parse(createdA) - Date.parse(createdB);
        return (a.id || "").localeCompare(b.id || "");
      },
      "title-asc": (a, b) => (a.title || "").localeCompare(b.title || ""),
      "title-desc": (a, b) => (b.title || "").localeCompare(a.title || ""),
    };

    const sortFn = inMemorySorts[query.sort] || inMemorySorts.recent;
    filtered.sort(sortFn);

    const total = filtered.length;

    // 4. Paginación
    const startIndex = (query.page - 1) * query.pageSize;
    const slice = filtered.slice(startIndex, startIndex + query.pageSize);
    const items = slice.map((item) => toPublicContribution(item));

    return { items, total };
  }

  async getFeaturedContributions(limit: number): Promise<PublicContribution[]> {
    const filtered = this.contributions.filter((c) => {
      const cRaw = c as unknown as Record<string, unknown>;
      const pubStatus = c.publication_status as Record<string, unknown> | null | undefined;
      const isPublished =
        pubStatus?.code === "published" &&
        c.consent_verified &&
        (c.authorization_level === "A" ||
          c.authorization_level === "public" ||
          c.authorization_level === "public_with_credit");
      return isPublished && cRaw.featured === true;
    });

    return filtered.slice(0, limit).map((item) => toPublicContribution(item));
  }

  async getAvailableFilters(): Promise<AvailableFilters> {
    const publicContributions = this.contributions.filter((c) => {
      const pubStatus = c.publication_status as Record<string, unknown> | null | undefined;
      return (
        pubStatus?.code === "published" &&
        c.consent_verified &&
        (c.authorization_level === "A" ||
          c.authorization_level === "public" ||
          c.authorization_level === "public_with_credit")
      );
    });

    const types = new Set<string>();
    const decades = new Set<string>();
    const institutions = new Set<string>();
    const people = new Set<string>();
    const places = new Set<string>();

    for (const c of publicContributions) {
      const cRaw = c as unknown as Record<string, unknown>;
      const type = (cRaw.contribution_type || cRaw.content_type || "") as string;
      if (type) types.add(type);

      const decade = cRaw.approximate_decade as string | undefined;
      if (decade) decades.add(decade);

      const place = cRaw.related_place as string | undefined;
      if (place) places.add(place);

      const peopleStr = cRaw.mentioned_people as string | undefined;
      if (peopleStr) {
        peopleStr
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean)
          .forEach((p) => people.add(p));
      }

      const instStr = cRaw.related_institution as string | undefined;
      if (instStr) {
        instStr
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean)
          .forEach((i) => institutions.add(i));
      }
    }

    return {
      types: Array.from(types).sort(),
      decades: Array.from(decades).sort(),
      institutions: Array.from(institutions).sort(),
      people: Array.from(people).sort(),
      places: Array.from(places).sort(),
    };
  }
}

export class InMemoryStatisticsRepository implements StatisticsRepository {
  constructor(public contributions: ContributionInput[] = []) {}

  async getStats(): Promise<ExploreStats> {
    const publicContributions = this.contributions.filter((c) => {
      const pubStatus = c.publication_status as Record<string, unknown> | null | undefined;
      return (
        pubStatus?.code === "published" &&
        c.consent_verified &&
        (c.authorization_level === "A" ||
          c.authorization_level === "public" ||
          c.authorization_level === "public_with_credit")
      );
    });

    const totalContributions = publicContributions.length;
    let totalPhotographs = 0;
    let totalDocuments = 0;

    const uniqueContributors = new Set<string>();
    const uniqueInterviewees = new Set<string>();
    const uniqueInstitutions = new Set<string>();

    for (const c of publicContributions) {
      const cRaw = c as unknown as Record<string, unknown>;
      const type = (cRaw.contribution_type || cRaw.content_type || "") as string;
      if (type === "Fotografía" || type === "Fotografia" || type === "fot") {
        totalPhotographs++;
      }
      if (type === "Documento" || type === "doc") {
        totalDocuments++;
      }
      
      const contributor = cRaw.contributor as Record<string, unknown> | null | undefined;
      const contributorName = contributor?.full_name as string | undefined;
      const contributorId = cRaw.contributor_id as string | undefined;
      if (contributorName || contributorId) {
        uniqueContributors.add(contributorName || contributorId || "");
      }

      if (cRaw.mentioned_people) {
        const people = (cRaw.mentioned_people as string)
          .split(",")
          .map((p: string) => p.trim())
          .filter(Boolean);
        for (const p of people) {
          uniqueInterviewees.add(p.toLowerCase());
        }
      }
      if (cRaw.related_institution) {
        const institutions = (cRaw.related_institution as string)
          .split(",")
          .map((i: string) => i.trim())
          .filter(Boolean);
        for (const inst of institutions) {
          uniqueInstitutions.add(inst.toLowerCase());
        }
      }
    }

    return {
      totalContributions,
      totalPhotographs,
      totalDocuments,
      totalInterviewees: uniqueInterviewees.size,
      totalInstitutions: uniqueInstitutions.size,
      totalContributors: uniqueContributors.size,
    };
  }
}

export class SupabaseExploreRepository implements ExploreRepository {
  constructor(private supabase: SupabaseClient) {}

  async listContributions(
    query: ExploreQueryParams
  ): Promise<{ items: PublicContribution[]; total: number }> {
    const publishedOptId = await fetchPublishedOptionId(this.supabase);
    let qb = buildBasePublishedQuery(this.supabase, publishedOptId);

    // Búsqueda por q
    if (query.q) {
      const escapedQ = query.q.trim().normalize("NFC").replace(/\s+/g, " ").replace(/[%_]/g, "\\$&");
      qb = qb.or(`title.ilike.%${escapedQ}%,description.ilike.%${escapedQ}%`);
    }

    // Filtros combinados
    if (query.type) {
      qb = qb.eq("contribution_type", query.type);
    }
    if (query.decade) {
      qb = qb.eq("approximate_decade", query.decade);
    }
    if (query.institution) {
      const escapedVal = query.institution.trim().replace(/[%_]/g, "\\$&");
      qb = qb.ilike("related_institution", `%${escapedVal}%`);
    }
    if (query.person) {
      const escapedVal = query.person.trim().replace(/[%_]/g, "\\$&");
      qb = qb.ilike("mentioned_people", `%${escapedVal}%`);
    }
    if (query.place) {
      const escapedVal = query.place.trim().replace(/[%_]/g, "\\$&");
      qb = qb.ilike("related_place", `%${escapedVal}%`);
    }

    // Ordenamiento desacoplado por estrategia
    const sortStrategy = SORTING_STRATEGIES[query.sort] || SORTING_STRATEGIES.recent;
    qb = sortStrategy(qb);

    // Paginación
    const fromIndex = (query.page - 1) * query.pageSize;
    const toIndex = fromIndex + query.pageSize - 1;
    qb = qb.range(fromIndex, toIndex);

    const { data, error } = await qb;
    if (error) {
      throw new Error(`Error executing listContributions query: ${error.message}`);
    }

    const items = (data || []).map((row: unknown) => {
      const rowObj = row as Record<string, unknown>;
      const contributionFiles = (rowObj.contribution_files || []) as Array<Record<string, unknown>>;
      const mappedFiles = contributionFiles.map((f) => ({
        id: f.id as string,
        file_name: f.file_name as string,
        file_size: f.file_size as number | undefined,
        file_role: f.file_role as string | null | undefined,
        processing_status: f.processing_status as string | null | undefined,
      }));

      const contributionType = rowObj.contribution_type as string | undefined;
      const contentType = contributionType === "Fotografía" || contributionType === "Documento" ? "documentary"
        : contributionType === "Audio" || contributionType === "Video" ? "audiovisual"
        : contributionType === "Testimonio escrito" ? "textual"
        : "mixed";

      const contributionInput: ContributionInput = {
        id: rowObj.id as string,
        title: rowObj.title as string | null,
        description: rowObj.description as string | null,
        exact_date: rowObj.exact_date as string | null,
        approximate_decade: rowObj.approximate_decade as string | null,
        related_place: rowObj.related_place as string | null,
        mentioned_people: rowObj.mentioned_people as string | null,
        related_institution: rowObj.related_institution as string | null,
        historical_context: rowObj.historical_context as string | null,
        authorization_level: rowObj.authorization_level as string | null,
        credit_preference: rowObj.credit_preference as string | null,
        consent_verified: rowObj.consent_verified as boolean,
        consent_source: rowObj.consent_source as string | null,
        catalog_code: rowObj.catalog_code as string | null,
        publication_scheduled_at: rowObj.publication_scheduled_at as string | null,
        created_at: rowObj.created_at as string,
        updated_at: rowObj.updated_at as string,
        content_type: contentType,
        files: mappedFiles,
        contributor: rowObj.contributor as any,
        publication_status: { id: rowObj.publication_status_option_id as string | null, code: "published", name: "Publicado" },
        editorial_status: { id: "", code: "approved_archive", name: "Aprobado para archivo" },
      } as unknown as ContributionInput;

      const cRaw = contributionInput as unknown as Record<string, unknown>;
      cRaw.contribution_type = contributionType;

      return toPublicContribution(contributionInput);
    });

    // Calcular el conteo total aplicando los mismos filtros
    let countQb = this.supabase
      .from("contributions")
      .select("id", { count: "exact", head: true })
      .eq("consent_verified", true)
      .eq("authorization_level", "A")
      .eq("publication_status_option_id", publishedOptId);

    if (query.q) {
      const escapedQ = query.q.trim().normalize("NFC").replace(/\s+/g, " ").replace(/[%_]/g, "\\$&");
      countQb = countQb.or(`title.ilike.%${escapedQ}%,description.ilike.%${escapedQ}%`);
    }
    if (query.type) {
      countQb = countQb.eq("contribution_type", query.type);
    }
    if (query.decade) {
      countQb = countQb.eq("approximate_decade", query.decade);
    }
    if (query.institution) {
      const escapedVal = query.institution.trim().replace(/[%_]/g, "\\$&");
      countQb = countQb.ilike("related_institution", `%${escapedVal}%`);
    }
    if (query.person) {
      const escapedVal = query.person.trim().replace(/[%_]/g, "\\$&");
      countQb = countQb.ilike("mentioned_people", `%${escapedVal}%`);
    }
    if (query.place) {
      const escapedVal = query.place.trim().replace(/[%_]/g, "\\$&");
      countQb = countQb.ilike("related_place", `%${escapedVal}%`);
    }

    const { count: totalCount, error: countError } = await countQb;
    if (countError) {
      throw new Error(`Error executing count query: ${countError.message}`);
    }

    return { items, total: totalCount || 0 };
  }

  async getFeaturedContributions(limit: number): Promise<PublicContribution[]> {
    return ([] as PublicContribution[]).slice(0, limit);
  }

  async getAvailableFilters(): Promise<AvailableFilters> {
    const publishedOptId = await fetchPublishedOptionId(this.supabase);

    const { data, error } = await this.supabase
      .from("contributions")
      .select("contribution_type, approximate_decade, related_place, mentioned_people, related_institution")
      .eq("consent_verified", true)
      .eq("authorization_level", "A")
      .eq("publication_status_option_id", publishedOptId);

    if (error) {
      throw new Error(`Error fetching available filters: ${error.message}`);
    }

    const types = new Set<string>();
    const decades = new Set<string>();
    const institutions = new Set<string>();
    const people = new Set<string>();
    const places = new Set<string>();

    if (data) {
      for (const row of data) {
        const rowObj = row as Record<string, unknown>;
        const contributionType = rowObj.contribution_type as string | null | undefined;
        const approximateDecade = rowObj.approximate_decade as string | null | undefined;
        const relatedPlace = rowObj.related_place as string | null | undefined;
        const mentionedPeople = rowObj.mentioned_people as string | null | undefined;
        const relatedInstitution = rowObj.related_institution as string | null | undefined;

        if (contributionType) types.add(contributionType);
        if (approximateDecade) decades.add(approximateDecade);
        if (relatedPlace) places.add(relatedPlace);

        if (mentionedPeople) {
          mentionedPeople
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
            .forEach((p) => people.add(p));
        }

        if (relatedInstitution) {
          relatedInstitution
            .split(",")
            .map((i) => i.trim())
            .filter(Boolean)
            .forEach((i) => institutions.add(i));
        }
      }
    }

    return {
      types: Array.from(types).sort(),
      decades: Array.from(decades).sort(),
      institutions: Array.from(institutions).sort(),
      people: Array.from(people).sort(),
      places: Array.from(places).sort(),
    };
  }
}

export class SupabaseStatisticsRepository implements StatisticsRepository {
  constructor(private supabase: SupabaseClient) {}

  async getStats(): Promise<ExploreStats> {
    const publishedOptId = await fetchPublishedOptionId(this.supabase);

    const { data, error } = await this.supabase
      .from("contributions")
      .select("id, contribution_type, mentioned_people, related_institution, contributor_id")
      .eq("consent_verified", true)
      .eq("authorization_level", "A")
      .eq("publication_status_option_id", publishedOptId);

    if (error) {
      throw new Error(`Error executing statistics query: ${error.message}`);
    }

    const totalContributions = data?.length || 0;
    let totalPhotographs = 0;
    let totalDocuments = 0;

    const uniqueContributors = new Set<string>();
    const uniqueInterviewees = new Set<string>();
    const uniqueInstitutions = new Set<string>();

    if (data) {
      for (const row of data) {
        const type = row.contribution_type || "";
        if (type === "Fotografía") {
          totalPhotographs++;
        }
        if (type === "Documento") {
          totalDocuments++;
        }
        if (row.contributor_id) {
          uniqueContributors.add(row.contributor_id);
        }
        if (row.mentioned_people) {
          const people = row.mentioned_people
            .split(",")
            .map((p: string) => p.trim())
            .filter(Boolean);
          for (const p of people) {
            uniqueInterviewees.add(p.toLowerCase());
          }
        }
        if (row.related_institution) {
          const institutions = row.related_institution
            .split(",")
            .map((i: string) => i.trim())
            .filter(Boolean);
          for (const inst of institutions) {
            uniqueInstitutions.add(inst.toLowerCase());
          }
        }
      }
    }

    return {
      totalContributions,
      totalPhotographs,
      totalDocuments,
      totalInterviewees: uniqueInterviewees.size,
      totalInstitutions: uniqueInstitutions.size,
      totalContributors: uniqueContributors.size,
    };
  }
}
