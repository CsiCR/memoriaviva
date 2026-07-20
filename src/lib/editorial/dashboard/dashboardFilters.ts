/* eslint-disable @typescript-eslint/no-explicit-any */
// Filtros Puros del Dashboard de Gestión Editorial
// Archivo: src/lib/editorial/dashboard/dashboardFilters.ts

import { EvaluatedContribution, DashboardFilter } from './dashboardTypes';

export function filterContributions(
  contributions: EvaluatedContribution[],
  filter: DashboardFilter
): EvaluatedContribution[] {
  return contributions.filter((contrib) => {
    // 1. Rango de fechas (recibido, modificado o publicado según timelineMode)
    const mode = filter.timelineMode || "received";
    let targetDate: string | null = null;
    if (mode === "published") {
      targetDate = contrib.publishedAt;
    } else if (mode === "updated") {
      targetDate = contrib.updatedAt;
    } else {
      targetDate = contrib.receivedAt;
    }

    if (filter.dateStart) {
      if (!targetDate || targetDate < filter.dateStart) return false;
    }
    if (filter.dateEnd) {
      if (!targetDate || targetDate > filter.dateEnd) return false;
    }

    // 2. Tipo de contenido
    if (filter.contentType) {
      const type = (contrib.contentType || "").trim().toLowerCase();
      const fType = filter.contentType.trim().toLowerCase();
      if (type !== fType) return false;
    }

    // 3. Estado editorial
    if (filter.editorialStatus) {
      const status = (contrib.editorialStatus || "").trim().toLowerCase();
      const fStatus = filter.editorialStatus.trim().toLowerCase();
      if (status !== fStatus) return false;
    }

    // 4. Estado de publicación
    if (filter.publicationStatus) {
      const pub = (contrib.publicationStatus || "").trim().toLowerCase();
      const fPub = filter.publicationStatus.trim().toLowerCase();
      if (pub !== fPub) return false;
    }

    // 5. Nivel de autorización
    if (filter.authorizationLevel) {
      const auth = (contrib.authorizationLevel || "").trim().toLowerCase();
      const fAuth = filter.authorizationLevel.trim().toLowerCase();
      if (auth !== fAuth) return false;
    }

    // 6. Rango de progreso
    const progress = contrib.progressResult.progress;
    if (filter.progressMin !== undefined && filter.progressMin !== null) {
      if (progress < filter.progressMin) return false;
    }
    if (filter.progressMax !== undefined && filter.progressMax !== null) {
      if (progress > filter.progressMax) return false;
    }

    // 7. Etapa editorial
    if (filter.stage) {
      const stage = (contrib.progressResult.currentStage.code || "").trim().toUpperCase();
      const fStage = filter.stage.trim().toUpperCase();
      if (stage !== fStage) return false;
    }

    // 8. Intervención editorial
    if (filter.hasEditorialIntervention !== undefined && filter.hasEditorialIntervention !== null) {
      if (contrib.hasEditorialIntervention !== filter.hasEditorialIntervention) return false;
    }

    // 9. Código de indicador activo (en los conflictos o en las incidencias del motor)
    if (filter.indicatorCode) {
      const hasIndicator = 
        contrib.progressResult.conflicts.includes(filter.indicatorCode) ||
        (contrib.eligibilityResult.issues || []).some((issue: any) => issue.code === filter.indicatorCode);
      if (!hasIndicator) return false;
    }

    // 10. Código de cuello de botella / bloqueo activo
    if (filter.bottleneckCode) {
      const hasBottleneck = (contrib.progressResult.blockedItems || []).some(
        (item) => item.code === filter.bottleneckCode
      );
      if (!hasBottleneck) return false;
    }

    return true;
  });
}
