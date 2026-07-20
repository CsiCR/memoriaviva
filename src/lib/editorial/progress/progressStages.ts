// Determinación de Etapas del Motor de Progreso Editorial
// Archivo: src/lib/editorial/progress/progressStages.ts

import { EditorialProgressInput, EditorialProgressStage, EditorialProgressDetails } from './progressTypes';
import { STAGES } from './progressConstants';

export function determineEditorialStage(
  input: EditorialProgressInput,
  progress: number,
  details: EditorialProgressDetails
): EditorialProgressStage {
  // 1. Si el estado de publicación es publicado, forzar la etapa a PUBLISHED
  const pubCode = (input.publicationStatus?.code || "").trim().toLowerCase();
  if (pubCode === "published") {
    return STAGES.PUBLISHED;
  }

  // 2. Determinar etapa inicial según el porcentaje obtenido
  let stageCode: keyof typeof STAGES = "RECEIVED";
  if (progress >= 90) {
    stageCode = "READY_FOR_PUBLICATION";
  } else if (progress >= 70) {
    stageCode = "HISTORICAL_VALIDATION";
  } else if (progress >= 50) {
    stageCode = "UNDER_REVIEW";
  } else if (progress >= 30) {
    stageCode = "DOCUMENTED";
  } else if (progress >= 15) {
    stageCode = "EDITORIAL_PROCESSING";
  }

  // 3. Aplicar capado por hitos obligatorios (limitaciones de etapa sin alterar el porcentaje)
  
  // Hito A: Procesamiento editorial inicial
  if (details.editorialProcessingScore === 0) {
    // Si no tiene una clasificación válida, no avanza de RECIBIDO
    stageCode = "RECEIVED";
  }

  // Hito B: Descripción mínima
  if (stageCode !== "RECEIVED" && details.editorialDescriptionScore < 10) {
    // Si no tiene descripción suficiente (menos de 10 puntos), se capará en EDITORIAL_PROCESSING
    stageCode = "EDITORIAL_PROCESSING";
  }

  // Hito C: Archivos usables (si no es textual, requiere al menos un archivo usable)
  if (stageCode !== "RECEIVED" && stageCode !== "EDITORIAL_PROCESSING" && details.filesScore === 0) {
    stageCode = "DOCUMENTED";
  }

  // Hito D: Consentimiento e Indicadores Críticos
  const consentVerified = input.consent?.verified === true;
  const activeIndicators = (input.indicators || []).filter(ind => ind.isActive === true);
  const hasBlockingOrCriticalIndicator = activeIndicators.some(
    ind => ind.severity === "blocking" || ind.severity === "critical"
  );
  
  if (stageCode !== "RECEIVED" && stageCode !== "EDITORIAL_PROCESSING" && stageCode !== "DOCUMENTED") {
    if (!consentVerified || hasBlockingOrCriticalIndicator) {
      stageCode = "UNDER_REVIEW";
    }
  }

  // Hito E: Validación Histórica
  const histCode = (input.historicalValidation?.statusCode || "").trim().toLowerCase();
  if (stageCode === "READY_FOR_PUBLICATION") {
    if (histCode === "pending" || histCode === "rejected" || !histCode || histCode === "unknown") {
      stageCode = "HISTORICAL_VALIDATION";
    }
  }

  return STAGES[stageCode];
}

export function getNextStage(stageCode: string): EditorialProgressStage | null {
  switch (stageCode) {
    case "RECEIVED":
      return STAGES.EDITORIAL_PROCESSING;
    case "EDITORIAL_PROCESSING":
      return STAGES.DOCUMENTED;
    case "DOCUMENTED":
      return STAGES.UNDER_REVIEW;
    case "UNDER_REVIEW":
      return STAGES.HISTORICAL_VALIDATION;
    case "HISTORICAL_VALIDATION":
      return STAGES.READY_FOR_PUBLICATION;
    case "READY_FOR_PUBLICATION":
      return STAGES.PUBLISHED;
    case "PUBLISHED":
    default:
      return null;
  }
}

export function getNextMilestoneLabel(stageCode: string): string | null {
  const next = getNextStage(stageCode);
  return next ? next.label : null;
}
