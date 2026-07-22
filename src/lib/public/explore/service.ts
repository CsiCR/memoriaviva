// Servicios del Módulo de Exploración y Estadísticas Públicas
// Archivo: src/lib/public/explore/service.ts

import { ExploreRepository, StatisticsRepository } from "./repository";
import {
  ExploreStats,
  ExploreQueryParams,
  ContributionCardModel,
  HomeData,
  SearchResult,
  AvailableFilters,
} from "./types";
import { PublicContribution } from "../types/contribution";

/**
 * Mapea una entidad pública completa de aporte a su modelo desacoplada de tarjeta.
 */
export function mapToCardModel(pub: PublicContribution): ContributionCardModel {
  // 1. Resolver imagen de portada o fallback en galería
  const imageMedia =
    pub.media.find((m) => m.role === "cover" && m.mediaType === "image") ||
    pub.media.find((m) => m.mediaType === "image");
  const imageUrl = imageMedia ? imageMedia.publicUrl : null;

  // 2. Resolver etiqueta en español para el tipo de aporte
  let typeLabel = "Aporte";
  if (pub.contentType === "textual") {
    typeLabel = "Testimonio escrito";
  } else if (pub.media.some((m) => m.mimeType.startsWith("image/"))) {
    typeLabel = "Fotografía";
  } else if (
    pub.media.some(
      (m) =>
        m.mimeType === "application/pdf" || m.mimeType.includes("word") || m.mimeType.includes("document")
    )
  ) {
    typeLabel = "Documento";
  } else if (pub.media.some((m) => m.mimeType.startsWith("audio/"))) {
    typeLabel = "Audio";
  } else if (pub.media.some((m) => m.mimeType.startsWith("video/"))) {
    typeLabel = "Video";
  } else {
    const map: Record<string, string> = {
      textual: "Testimonio escrito",
      documentary: "Documento / Fotografía",
      audiovisual: "Audio / Video",
      mixed: "Aporte mixto",
    };
    typeLabel = map[pub.contentType] || "Aporte";
  }

  // 3. Resolver autor o crédito de forma pública
  const authorName = pub.credits.displayName || "Anónimo";

function formatArgentinaDate(isoDateStr: string): string {
  const parts = isoDateStr.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return isoDateStr;
}

  // 4. Resolver etiqueta de tiempo histórico
  let dateLabel = pub.historicalDate.displayLabel;
  if (pub.historicalDate.precision === "exact" && pub.historicalDate.isoDate) {
    dateLabel = formatArgentinaDate(pub.historicalDate.isoDate);
  } else if (pub.historicalDate.precision === "decade" && pub.historicalDate.decade) {
    dateLabel = `Década de ${pub.historicalDate.decade}`;
  } else if (pub.historicalDate.precision === "year" && pub.historicalDate.year) {
    dateLabel = String(pub.historicalDate.year);
  }

  // 5. Soporte futuro para insignias/badges
  let badge: ContributionCardModel["badge"] = undefined;
  const rawPub = pub as unknown as Record<string, unknown>;
  if (rawPub.badge) {
    badge = rawPub.badge as ContributionCardModel["badge"];
  }

  return {
    id: pub.id,
    slug: pub.slug,
    title: pub.title,
    description: pub.description,
    imageUrl,
    historicalDateLabel: dateLabel,
    contributionTypeLabel: typeLabel,
    authorName,
    badge,
  };
}

/**
 * Interface del motor de búsqueda para soportar futuras evoluciones (ej. Búsqueda Semántica)
 */
export interface SearchEngine {
  search(query: ExploreQueryParams): Promise<{ items: PublicContribution[]; total: number }>;
}

/**
 * Motor de búsqueda por palabra clave (Keyword / Texto e indexación SQL)
 */
export class KeywordSearchEngine implements SearchEngine {
  constructor(private repository: ExploreRepository) {}

  async search(query: ExploreQueryParams) {
    return this.repository.listContributions(query);
  }
}

/**
 * Catálogo encargado de proveer los filtros disponibles del sistema.
 */
export interface FilterCatalog {
  getAvailableFilters(): Promise<AvailableFilters>;
}

export class DbFilterCatalog implements FilterCatalog {
  constructor(private repository: ExploreRepository) {}

  async getAvailableFilters() {
    return this.repository.getAvailableFilters();
  }
}

/**
 * Servicio dedicado al cálculo y provisión de estadísticas institucionales y comunitarias.
 */
export class StatisticsService {
  constructor(private repository: StatisticsRepository) {}

  async getStats(): Promise<ExploreStats> {
    return this.repository.getStats();
  }
}

/**
 * Servicio encargado de la exploración, filtrado y destacados de aportes.
 */
export class ContributionExplorerService {
  private searchEngine: SearchEngine;
  private filterCatalog: FilterCatalog;

  constructor(private repository: ExploreRepository) {
    this.searchEngine = new KeywordSearchEngine(repository);
    this.filterCatalog = new DbFilterCatalog(repository);
  }

  /**
   * Ejecuta una búsqueda combinada de aportes públicos y devuelve un SearchResult unificado.
   */
  async search(query: ExploreQueryParams): Promise<SearchResult> {
    const [searchRes, availableFilters] = await Promise.all([
      this.searchEngine.search(query),
      this.filterCatalog.getAvailableFilters(),
    ]);

    const cardModels = searchRes.items.map(mapToCardModel);

    const { page, pageSize, ...filters } = query;
    const appliedFilters = { ...filters };
    delete (appliedFilters as Record<string, unknown>).sort;

    return {
      version: 1,
      items: cardModels,
      total: searchRes.total,
      page,
      pageSize,
      filters: appliedFilters,
      availableFilters,
    };
  }

  /**
   * Obtiene la lista completa de filtros acumulados en el catálogo de aportes.
   */
  async getAvailableFilters(): Promise<AvailableFilters> {
    return this.filterCatalog.getAvailableFilters();
  }

  /**
   * Obtiene la lista básica de aportes destacados.
   */
  async getFeaturedContributions(limit: number = 6): Promise<PublicContribution[]> {
    return this.repository.getFeaturedContributions(limit);
  }

  /**
   * Método legacy para compatibilidad con firmas de servicios anteriores
   */
  async listContributions(
    query: ExploreQueryParams
  ): Promise<{ items: PublicContribution[]; total: number }> {
    return this.repository.listContributions(query);
  }
}

/**
 * Orquestador y agregador de datos para renderizar la Home del portal de manera limpia y óptima.
 */
export class HomeService {
  constructor(
    private explorer: ContributionExplorerService,
    private statsService: StatisticsService
  ) {}

  /**
   * Carga todo el payload necesario para la Home en paralelo usando concurrencia nativa.
   */
  async load(): Promise<HomeData> {
    const [stats, featured, recentResult] = await Promise.all([
      this.statsService.getStats(),
      this.explorer.getFeaturedContributions(6),
      this.explorer.listContributions({
        page: 1,
        pageSize: 12,
        sort: "recent",
      }),
    ]);

    const featuredModels = featured.map(mapToCardModel);
    const recentModels = recentResult.items.map(mapToCardModel);

    return {
      hero: {
        title: "Memoria Viva Pico Truncado",
        subtitle: "La historia de una comunidad construida entre miles de recuerdos.",
      },
      stats,
      featured: featuredModels,
      recent: recentModels,
      future: {
        timeline: {},
        collections: {},
        institutions: {},
      },
    };
  }
}
