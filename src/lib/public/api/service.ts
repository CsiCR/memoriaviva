// Servicio Orquestador de la API Pública de Lectura
// Archivo: src/lib/public/api/service.ts

import { PublicIdentityService } from "../slugs/service";
import { PublicApiRepository, PublicSitemapEntry } from "./repository";
import { ParsedQueryParams } from "./query-params";
import { PublicContribution } from "../types/contribution";
import { toPublicContribution } from "../mappers/to-public-contribution";
import { buildContributionCanonicalSlug } from "../slugs/canonical-slug";
import { canPublishContribution } from "../policies/contribution-publication.policy";
import { PublicApiError } from "./errors";

export interface PublicDetailResolution<T> {
  data: T;
  requestedSlug: string;
  canonicalSlug: string;
  resolutionType: "canonical" | "alias" | "merged";
}

export class PublicApiService {
  constructor(
    private repository: PublicApiRepository,
    private identityService: PublicIdentityService
  ) {}

  /**
   * Obtiene la lista de aportes públicos aplicando filtros, orden y paginación.
   */
  async listContributions(
    query: ParsedQueryParams
  ): Promise<{ items: PublicContribution[]; total: number }> {
    const { items: rawItems, total } = await this.repository.listContributions(query);

    const items = rawItems
      .map((raw) => {
        try {
          // Doble línea de defensa: validar políticas en código
          if (!canPublishContribution(raw)) return null;
          const rawRecord = raw as unknown as Record<string, unknown>;
          const slug = buildContributionCanonicalSlug({
            publicTitle: (raw.publication_title || raw.editorial_title || raw.title || "Aporte sin título") as string,
            catalogCode: (rawRecord.catalog_code as string | null) || null,
            contributionId: raw.id || "",
          });
          return toPublicContribution(raw, slug);
        } catch {
          // Saltar elementos que no cumplan la política (ej. datos incompletos en base)
          return null;
        }
      })
      .filter((item): item is PublicContribution => item !== null);

    return { items, total };
  }

  /**
   * Obtiene el detalle de un aporte por su slug, resolviendo alias e identidades fusionadas.
   */
  async getContributionBySlug(
    slug: string
  ): Promise<PublicDetailResolution<PublicContribution> | null> {
    const resolution = await this.identityService.resolveIdentity("contribution", slug);
    if (!resolution) return null;

    const { identity, requestedSlug, canonicalSlug, resolutionType } = resolution;

    // 1. Si está eliminada o congelada
    if (identity.status === "deleted") {
      throw new PublicApiError(
        "PUBLIC_NOT_FOUND",
        "La contribución solicitada ha sido eliminada.",
        404
      );
    }

    // 2. Obtener aporte de base de datos usando el UUID de la entidad inyectada
    const raw = await this.repository.getContributionByIdentity(identity.entityUuid);
    if (!raw) {
      throw new PublicApiError(
        "PUBLIC_NOT_PUBLISHED",
        "La contribución solicitada no se encuentra disponible públicamente.",
        404
      );
    }

    // 3. Validar con política de publicación
    if (!canPublishContribution(raw)) {
      throw new PublicApiError(
        "PUBLIC_NOT_PUBLISHED",
        "La contribución no cumple con los criterios de exposición pública.",
        404
      );
    }

    // 4. Mapear al contrato público usando el slug canónico resuelto por la identidad pública.
    // Este es el camino correcto: el slug viene de la base de datos, no se recalcula en memoria.
    const data = toPublicContribution(raw, canonicalSlug);

    return {
      data,
      requestedSlug,
      canonicalSlug,
      resolutionType,
    };
  }

  /**
   * Obtiene las entradas ligeras del sitemap para todos los aportes públicos.
   */
  async getPublicSitemapEntries(): Promise<PublicSitemapEntry[]> {
    return this.repository.getPublicSitemapEntries();
  }
}
