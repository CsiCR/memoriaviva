// Funciones Auxiliares para Navegación y Filtros de Aportes
// Archivo: src/lib/editorial/navigation/navigationHelpers.ts

import { ContributionListFilter } from './navigationTypes';
import { EvaluatedContribution } from '../dashboard/dashboardTypes';
import { STAGES } from '../progress/progressConstants';

const VALID_STAGES = Object.keys(STAGES); // RECEIVED, EDITORIAL_PROCESSING, etc.

function parseArrayParam(val: unknown): string[] | undefined {
  if (!val) return undefined;
  if (Array.isArray(val)) {
    return val.flatMap(v => String(v).split(",")).map(s => s.trim()).filter(Boolean);
  }
  return String(val).split(",").map(s => s.trim()).filter(Boolean);
}

export function parseContributionFilters(
  searchParams: Record<string, string | string[] | undefined>
): ContributionListFilter {
  const filter: ContributionListFilter = {};

  // 1. Búsqueda
  if (searchParams.search) {
    filter.search = String(searchParams.search).trim();
  }

  if (searchParams.dni) {
    filter.dni = String(searchParams.dni).trim();
  }

  // 2. Arrays
  const contentTypes = parseArrayParam(searchParams.contentTypes);
  if (contentTypes && contentTypes.length > 0) {
    filter.contentTypes = contentTypes;
  }

  const authorizationLevels = parseArrayParam(searchParams.authorizationLevels);
  if (authorizationLevels && authorizationLevels.length > 0) {
    filter.authorizationLevels = authorizationLevels;
  }

  const editorialStatuses = parseArrayParam(searchParams.editorialStatuses);
  if (editorialStatuses && editorialStatuses.length > 0) {
    filter.editorialStatuses = editorialStatuses;
  }

  const publicationStatuses = parseArrayParam(searchParams.publicationStatuses);
  if (publicationStatuses && publicationStatuses.length > 0) {
    filter.publicationStatuses = publicationStatuses;
  }

  // 3. Etapas (Validar enumeración)
  const stages = parseArrayParam(searchParams.stages);
  if (stages && stages.length > 0) {
    const valid = stages.filter(st => VALID_STAGES.includes(st.toUpperCase()));
    if (valid.length > 0) {
      filter.stages = valid.map(s => s.toUpperCase());
    }
  }

  // 4. Elegibilidad
  const eligibility = searchParams.eligibility;
  if (eligibility && ["eligible", "ineligible", "review_required"].includes(String(eligibility))) {
    filter.eligibility = String(eligibility) as any;
  }

  // 5. Códigos de bloqueos, cuellos de botella e indicadores
  const blockingCodes = parseArrayParam(searchParams.blockingCodes);
  if (blockingCodes && blockingCodes.length > 0) {
    filter.blockingCodes = blockingCodes;
  }

  const bottleneckCodes = parseArrayParam(searchParams.bottleneckCodes);
  if (bottleneckCodes && bottleneckCodes.length > 0) {
    filter.bottleneckCodes = bottleneckCodes;
  }

  const warningCodes = parseArrayParam(searchParams.warningCodes);
  if (warningCodes && warningCodes.length > 0) {
    filter.warningCodes = warningCodes;
  }

  const indicatorCodes = parseArrayParam(searchParams.indicatorCodes);
  if (indicatorCodes && indicatorCodes.length > 0) {
    filter.indicatorCodes = indicatorCodes;
  }

  // 6. Fechas y modo
  const dateMode = searchParams.dateMode;
  if (dateMode && ["received", "updated", "published"].includes(String(dateMode))) {
    filter.dateMode = String(dateMode) as any;
  }

  if (searchParams.dateFrom) {
    const dateStr = String(searchParams.dateFrom);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      filter.dateFrom = dateStr;
    }
  }

  if (searchParams.dateTo) {
    const dateStr = String(searchParams.dateTo);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      filter.dateTo = dateStr;
    }
  }

  // 7. Rangos de progreso (Validar y limitar a [0, 100])
  if (searchParams.progressMin !== undefined && searchParams.progressMin !== null) {
    const minVal = parseInt(String(searchParams.progressMin), 10);
    if (!isNaN(minVal)) {
      filter.progressMin = Math.max(0, Math.min(100, minVal));
    }
  }

  if (searchParams.progressMax !== undefined && searchParams.progressMax !== null) {
    const maxVal = parseInt(String(searchParams.progressMax), 10);
    if (!isNaN(maxVal)) {
      filter.progressMax = Math.max(0, Math.min(100, maxVal));
    }
  }

  // Intercambiar si min > max
  if (filter.progressMin !== undefined && filter.progressMax !== undefined) {
    if (filter.progressMin > filter.progressMax) {
      const temp = filter.progressMin;
      filter.progressMin = filter.progressMax;
      filter.progressMax = temp;
    }
  }

  // 8. Orden y paginación
  if (searchParams.sort) {
    filter.sort = String(searchParams.sort);
  }

  if (searchParams.page) {
    const pageVal = parseInt(String(searchParams.page), 10);
    if (!isNaN(pageVal) && pageVal >= 1) {
      filter.page = pageVal;
    }
  }

  if (searchParams.pageSize) {
    const sizeVal = parseInt(String(searchParams.pageSize), 10);
    if (!isNaN(sizeVal) && [10, 25, 50, 100].includes(sizeVal)) {
      filter.pageSize = sizeVal;
    }
  }

  return filter;
}

export function serializeContributionFilters(filter: ContributionListFilter): string {
  const params = new URLSearchParams();

  if (filter.search) params.set("search", filter.search);
  if (filter.dni) params.set("dni", filter.dni);
  if (filter.contentTypes && filter.contentTypes.length > 0) {
    params.set("contentTypes", filter.contentTypes.join(","));
  }
  if (filter.authorizationLevels && filter.authorizationLevels.length > 0) {
    params.set("authorizationLevels", filter.authorizationLevels.join(","));
  }
  if (filter.editorialStatuses && filter.editorialStatuses.length > 0) {
    params.set("editorialStatuses", filter.editorialStatuses.join(","));
  }
  if (filter.publicationStatuses && filter.publicationStatuses.length > 0) {
    params.set("publicationStatuses", filter.publicationStatuses.join(","));
  }
  if (filter.eligibility) params.set("eligibility", filter.eligibility);
  if (filter.stages && filter.stages.length > 0) {
    params.set("stages", filter.stages.join(","));
  }
  if (filter.blockingCodes && filter.blockingCodes.length > 0) {
    params.set("blockingCodes", filter.blockingCodes.join(","));
  }
  if (filter.bottleneckCodes && filter.bottleneckCodes.length > 0) {
    params.set("bottleneckCodes", filter.bottleneckCodes.join(","));
  }
  if (filter.warningCodes && filter.warningCodes.length > 0) {
    params.set("warningCodes", filter.warningCodes.join(","));
  }
  if (filter.indicatorCodes && filter.indicatorCodes.length > 0) {
    params.set("indicatorCodes", filter.indicatorCodes.join(","));
  }
  if (filter.progressMin !== undefined) params.set("progressMin", String(filter.progressMin));
  if (filter.progressMax !== undefined) params.set("progressMax", String(filter.progressMax));
  if (filter.dateMode) params.set("dateMode", filter.dateMode);
  if (filter.dateFrom) params.set("dateFrom", filter.dateFrom);
  if (filter.dateTo) params.set("dateTo", filter.dateTo);
  if (filter.sort) params.set("sort", filter.sort);
  if (filter.page) params.set("page", String(filter.page));
  if (filter.pageSize) params.set("pageSize", String(filter.pageSize));

  return params.toString();
}

export function buildContributionListUrl(filter: ContributionListFilter): string {
  const query = serializeContributionFilters(filter);
  return query ? `/admin/aportes?${query}` : "/admin/aportes";
}

export function removeContributionFilterValue(
  filter: ContributionListFilter,
  key: keyof ContributionListFilter,
  value?: string
): ContributionListFilter {
  // Retornar un nuevo objeto para mantener la inmutabilidad
  const copy: Record<string, unknown> = { ...filter } as Record<string, unknown>;

  if (value && Array.isArray(copy[key as string])) {
    const list = copy[key as string] as string[];
    const filteredList = list.filter(v => v !== value);
    if (filteredList.length === 0) {
      delete copy[key as string];
    } else {
      copy[key as string] = filteredList;
    }
  } else {
    delete copy[key as string];
  }

  // Reiniciar la página al modificar filtros
  if (copy.page) {
    copy.page = 1;
  }

  return copy as unknown as ContributionListFilter;
}

export function mergeContributionFilters(
  current: ContributionListFilter,
  changes: Partial<ContributionListFilter>
): ContributionListFilter {
  const merged = { ...current, ...changes };

  // Reiniciar página en cambios de filtros de criterios
  if (changes.page === undefined && merged.page) {
    merged.page = 1;
  }

  return merged;
}

// Lógica de filtrado en memoria consistente con el Dashboard y Motores
export function filterContributionsByListFilter(
  contributions: EvaluatedContribution[],
  filter: ContributionListFilter
): EvaluatedContribution[] {
  return contributions.filter(contrib => {
    // 1. Filtro de búsqueda textual
    if (filter.search) {
      const term = filter.search.toLowerCase();
      const titleMatch = contrib.title && contrib.title.toLowerCase().includes(term);
      const descMatch = contrib.description && contrib.description.toLowerCase().includes(term);
      if (!titleMatch && !descMatch) return false;
    }

    if (filter.dni) {
      const term = filter.dni.toLowerCase();
      const dniMatch = contrib.contributorDni && contrib.contributorDni.toLowerCase().includes(term);
      if (!dniMatch) return false;
    }

    // 2. Tipo de Contenido
    if (filter.contentTypes && filter.contentTypes.length > 0) {
      const type = (contrib.contentType || "").trim().toLowerCase();
      const rawType = (contrib.rawContributionType || "").trim().toLowerCase();
      const filterTypes = filter.contentTypes.map(t => t.toLowerCase());
      if (!filterTypes.includes(type) && !filterTypes.includes(rawType)) return false;
    }

    // 3. Nivel de Autorización
    if (filter.authorizationLevels && filter.authorizationLevels.length > 0) {
      const level = (contrib.authorizationLevel || "").trim().toUpperCase();
      if (!filter.authorizationLevels.map(l => l.toUpperCase()).includes(level)) return false;
    }

    // 4. Estado Editorial
    if (filter.editorialStatuses && filter.editorialStatuses.length > 0) {
      const status = (contrib.editorialStatus || "").trim().toLowerCase();
      if (!filter.editorialStatuses.map(s => s.toLowerCase()).includes(status)) return false;
    }

    // 5. Estado de Publicación (Manejo de "unpublished")
    if (filter.publicationStatuses && filter.publicationStatuses.length > 0) {
      const pub = (contrib.publicationStatus || "").trim().toLowerCase();
      const hasUnpublished = filter.publicationStatuses.map(s => s.toLowerCase()).includes("unpublished");
      
      if (hasUnpublished) {
        // "unpublished" significa que no está publicado
        if (pub === "published") return false;
      } else {
        if (!filter.publicationStatuses.map(s => s.toLowerCase()).includes(pub)) return false;
      }
    }

    // 6. Etapas de Progreso
    if (filter.stages && filter.stages.length > 0) {
      const stage = (contrib.progressResult.currentStage.code || "").trim().toUpperCase();
      if (!filter.stages.map(s => s.toUpperCase()).includes(stage)) return false;
    }

    // 7. Elegibilidad canónica (Basado en el Motor E1-E8)
    if (filter.eligibility) {
      const isEligible = contrib.eligibilityResult.eligibleForPublication;
      const issues = contrib.eligibilityResult.issues || [];
      const hasBlocking = issues.some(iss => iss.severity === "blocking" || iss.severity === "critical");

      if (filter.eligibility === "eligible") {
        if (!isEligible) return false;
      } else if (filter.eligibility === "ineligible") {
        if (isEligible || !hasBlocking) return false;
      } else if (filter.eligibility === "review_required") {
        if (isEligible || hasBlocking) return false;
      }
    }

    // 8. Códigos de Bloqueo
    if (filter.blockingCodes && filter.blockingCodes.length > 0) {
      const matched = filter.blockingCodes.some(code => 
        (contrib.progressResult.blockedItems || []).some(item => item.code === code) ||
        (contrib.eligibilityResult.issues || []).some(iss => iss.code === code && (iss.severity === "blocking" || iss.severity === "critical"))
      );
      if (!matched) return false;
    }

    // 9. Códigos de Cuello de Botella
    if (filter.bottleneckCodes && filter.bottleneckCodes.length > 0) {
      const matched = filter.bottleneckCodes.some(code => 
        (contrib.progressResult.blockedItems || []).some(item => item.code === code)
      );
      if (!matched) return false;
    }

    // 10. Códigos de Advertencia
    if (filter.warningCodes && filter.warningCodes.length > 0) {
      const matched = filter.warningCodes.some(code => {
        if (code === "POST_PUBLICATION_INCONSISTENCY") {
          return contrib.progressResult.hasPostPublicationInconsistencies === true;
        }
        if (code === "HISTORICAL_VALIDATION_CONFLICT") {
          return contrib.progressResult.conflicts.includes("CONFLICT_HISTORICAL_VALIDATION");
        }
        if (code === "UNKNOWN_VALIDATION") {
          return contrib.historicalValidationStatus === "unknown" || !contrib.historicalValidationStatus;
        }
        // Buscar advertencias menores en incidencias
        return (contrib.eligibilityResult.issues || []).some(iss => iss.code === code && iss.severity === "warning");
      });
      if (!matched) return false;
    }

    // 11. Códigos de Indicadores
    if (filter.indicatorCodes && filter.indicatorCodes.length > 0) {
      const matched = filter.indicatorCodes.some(code => {
        // Puede ser por severidad ("critical", "blocking", "warning", "info")
        if (["critical", "blocking", "warning", "info"].includes(code)) {
          return (contrib.activeIndicators || []).some(ind => ind.severity === code);
        }
        // O por código de indicador exacto
        return (contrib.activeIndicators || []).some(ind => ind.code === code);
      });
      if (!matched) return false;
    }

    // 12. Rangos de progreso
    const progress = contrib.progressResult.progress;
    if (filter.progressMin !== undefined && progress < filter.progressMin) return false;
    if (filter.progressMax !== undefined && progress > filter.progressMax) return false;

    // 13. Rangos temporales
    const mode = filter.dateMode || "received";
    let targetDate: string | null = null;
    if (mode === "published") {
      targetDate = contrib.publishedAt;
    } else if (mode === "updated") {
      targetDate = contrib.updatedAt;
    } else {
      targetDate = contrib.receivedAt;
    }

    if (filter.dateFrom && (!targetDate || targetDate < filter.dateFrom)) return false;
    if (filter.dateTo && (!targetDate || targetDate > filter.dateTo)) return false;

    return true;
  });
}
