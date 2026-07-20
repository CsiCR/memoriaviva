// Reglas y Bloqueos del Motor de Progreso Editorial
// Archivo: src/lib/editorial/progress/progressRules.ts

import { EditorialProgressInput, EditorialProgressItem, EditorialProgressDetails } from './progressTypes';
import { DIMENSION_WEIGHTS } from './progressConstants';

export function buildProgressItems(
  input: EditorialProgressInput,
  details: EditorialProgressDetails
): {
  completed: EditorialProgressItem[];
  pending: EditorialProgressItem[];
  blocked: EditorialProgressItem[];
} {
  const completed: EditorialProgressItem[] = [];
  const pending: EditorialProgressItem[] = [];
  const blocked: EditorialProgressItem[] = [];

  // Helper function to sort item into correct list
  const addItem = (item: EditorialProgressItem) => {
    if (item.status === "completed" || item.status === "not_required") {
      completed.push(item);
    } else if (item.status === "blocked") {
      blocked.push(item);
    } else {
      pending.push(item);
    }
  };

  // 1. Identificación Básica
  const basicEarned = details.basicIdentificationScore;
  addItem({
    code: "BASIC_INFO",
    label: "Identificación básica del material",
    status: basicEarned === 10 ? "completed" : "pending",
    weight: DIMENSION_WEIGHTS.basicIdentification,
    earnedWeight: basicEarned,
    reason: basicEarned === 10 ? undefined : "Faltan datos de título, tipo de aporte, aportante o fecha."
  });

  // 2. Descripción Editorial
  const descEarned = details.editorialDescriptionScore;
  addItem({
    code: "DESCRIPTION",
    label: "Descripción editorial detallada",
    status: descEarned === 10 ? "completed" : "pending",
    weight: DIMENSION_WEIGHTS.editorialDescription,
    earnedWeight: descEarned,
    reason: descEarned === 10 ? undefined : (descEarned === 4 ? "La descripción es muy corta (menos de 40 caracteres)." : "La descripción está ausente.")
  });

  // 3. Consentimiento Válido
  const consentVerified = input.consent?.verified === true;
  addItem({
    code: "CONSENT",
    label: "Consentimiento verificado y firmado",
    status: consentVerified ? "completed" : "blocked",
    weight: DIMENSION_WEIGHTS.consent,
    earnedWeight: details.consentScore,
    reason: consentVerified ? undefined : "Falta el consentimiento verificado y firmado del aportante (BLOCK_NO_CONSENT)."
  });

  // 4. Archivos Digitales
  const contentType = (input.contentType || "").trim().toLowerCase();
  const isTextual = contentType === "textual" || contentType === "testimonio escrito";
  const filesEarned = details.filesScore;
  let fileStatus: EditorialProgressItem["status"] = "pending";
  if (isTextual) {
    fileStatus = "not_required";
  } else if (filesEarned === 15) {
    fileStatus = "completed";
  } else {
    fileStatus = "blocked";
  }
  addItem({
    code: "FILES",
    label: isTextual ? "Archivos digitales (No requeridos para testimonios escritos)" : "Archivos digitales cargados y utilizables",
    status: fileStatus,
    weight: DIMENSION_WEIGHTS.files,
    earnedWeight: filesEarned,
    reason: fileStatus === "completed" || fileStatus === "not_required" ? undefined : "Falta subir al menos un archivo digital utilizable (BLOCK_MISSING_REQUIRED_FILES)."
  });

  // 5. Procesamiento Editorial
  const procEarned = details.editorialProcessingScore;
  addItem({
    code: "EDITORIAL_PROCESSING",
    label: "Procesamiento y clasificación editorial",
    status: procEarned === 10 ? "completed" : "pending",
    weight: DIMENSION_WEIGHTS.editorialProcessing,
    earnedWeight: procEarned,
    reason: procEarned === 10 ? undefined : "El aporte requiere ser clasificado en un estado editorial válido."
  });

  // 6. Revisión Editorial
  const revEarned = details.editorialReviewScore;
  addItem({
    code: "EDITORIAL_REVIEW",
    label: "Revisión editorial y notas internas",
    status: revEarned === 10 ? "completed" : "pending",
    weight: DIMENSION_WEIGHTS.editorialReview,
    earnedWeight: revEarned,
    reason: revEarned === 10 ? undefined : "El aporte debe tener intervención editorial, notas de revisión y estado en revisión o superior."
  });

  // 7. Validación Histórica
  const histCode = (input.historicalValidation?.statusCode || "").trim().toLowerCase();
  let histStatus: EditorialProgressItem["status"] = "pending";
  let histReason: string | undefined;
  if (histCode === "validated" || histCode === "not_required") {
    histStatus = "completed";
  } else if (histCode === "rejected") {
    histStatus = "blocked";
    histReason = "La validación histórica ha sido rechazada (BLOCK_HISTORICAL_REJECTED).";
  } else {
    histStatus = "pending";
    histReason = "La validación histórica del testimonio está pendiente.";
  }
  addItem({
    code: "HISTORICAL_VAL",
    label: histCode === "not_required" ? "Validación histórica (No requerida)" : "Validación histórica completada",
    status: histStatus,
    weight: DIMENSION_WEIGHTS.historicalValidation,
    earnedWeight: details.historicalValidationScore,
    reason: histReason
  });

  // 8. Indicadores
  const activeIndicators = (input.indicators || []).filter(ind => ind.isActive === true);
  const hasBlockingIndicator = activeIndicators.some(
    ind => ind.severity === "blocking" || ind.severity === "critical"
  );
  const indEarned = details.indicatorsScore;
  let indStatus: EditorialProgressItem["status"] = "completed";
  let indReason: string | undefined;
  if (hasBlockingIndicator) {
    indStatus = "blocked";
    indReason = "Existen indicadores de control críticos o bloqueantes activos (BLOCK_ACTIVE_CRITICAL_INDICATORS).";
  } else if (indEarned === 2) {
    indStatus = "pending";
    indReason = "Existen advertencias o incidencias menores activas.";
  }
  addItem({
    code: "INDICATORS",
    label: "Indicadores de control resueltos",
    status: indStatus,
    weight: DIMENSION_WEIGHTS.indicators,
    earnedWeight: indEarned,
    reason: indReason
  });

  // 9. Preparación / Publicación
  const pubEarned = details.publicationScore;
  addItem({
    code: "PUBLICATION",
    label: "Preparación para publicación en portal público",
    status: pubEarned === 5 ? "completed" : "pending",
    weight: DIMENSION_WEIGHTS.publication,
    earnedWeight: pubEarned,
    reason: pubEarned === 5 ? undefined : (pubEarned === 4 ? "Listo para publicar o programado. Pendiente de ser publicado de forma definitiva." : "El aporte requiere ser preparado para publicación (programar o marcar listo).")
  });

  return { completed, pending, blocked };
}

export function detectConflicts(input: EditorialProgressInput): string[] {
  const conflicts: string[] = [];
  const histCode = (input.historicalValidation?.statusCode || "").trim().toLowerCase();
  const activeIndicators = (input.indicators || []).filter(ind => ind.isActive === true);

  const hasPendingIndicator = activeIndicators.some(ind => ind.code === "historical_validation_pending");
  const hasSuccessIndicator = activeIndicators.some(
    ind => ind.code === "historical_validation_completed" || ind.code === "historically_validated"
  );

  // Conflicto de validación histórica:
  // 1. statusCode es "validated" pero existe indicador "historical_validation_pending"
  if (histCode === "validated" && hasPendingIndicator) {
    conflicts.push("CONFLICT_HISTORICAL_VALIDATION");
  }
  // 2. statusCode es "pending" pero existe indicador de éxito "historical_validation_completed" o "historically_validated"
  if (histCode === "pending" && hasSuccessIndicator) {
    conflicts.push("CONFLICT_HISTORICAL_VALIDATION");
  }

  return conflicts;
}
