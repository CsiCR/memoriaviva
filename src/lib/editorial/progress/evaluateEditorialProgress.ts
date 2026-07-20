// Orquestador Principal del Motor de Progreso Editorial
// Archivo: src/lib/editorial/progress/evaluateEditorialProgress.ts

import { EditorialProgressInput, EditorialProgressResult, EditorialProgressRecommendation } from './progressTypes';
import { 
  calculateEditorialProgressDetails, 
  sumEditorialProgress 
} from './progressScore';
import { 
  determineEditorialStage, 
  getNextStage, 
  getNextMilestoneLabel 
} from './progressStages';
import { 
  buildProgressItems, 
  detectConflicts 
} from './progressRules';
import { getRecommendation } from './progressMessages';

export function evaluateEditorialProgress(
  input: EditorialProgressInput
): EditorialProgressResult {
  // 1. Normalizar y validar valores básicos
  const normalizedInput: EditorialProgressInput = {
    contributionId: input.contributionId || "unknown-id",
    title: input.title || null,
    description: input.description || null,
    contentType: input.contentType || null,
    contributor: input.contributor ? {
      id: input.contributor.id || null,
      fullName: input.contributor.fullName || null,
      birthDate: input.contributor.birthDate || null,
      birthPlace: input.contributor.birthPlace || null,
      arrivalDate: input.contributor.arrivalDate || null,
    } : null,
    consent: input.consent ? {
      verified: !!input.consent.verified,
      authorizationLevelCode: input.consent.authorizationLevelCode || null,
    } : { verified: false, authorizationLevelCode: null },
    files: input.files || [],
    editorialStatus: input.editorialStatus ? {
      id: input.editorialStatus.id || null,
      code: input.editorialStatus.code || null,
      name: input.editorialStatus.name || null,
    } : null,
    publicationStatus: input.publicationStatus ? {
      id: input.publicationStatus.id || null,
      code: input.publicationStatus.code || null,
      name: input.publicationStatus.name || null,
    } : null,
    historicalValidation: input.historicalValidation ? {
      statusCode: input.historicalValidation.statusCode || null,
      validatedAt: input.historicalValidation.validatedAt || null,
      validatorName: input.historicalValidation.validatorName || null,
    } : null,
    indicators: input.indicators || [],
    hasEditorialIntervention: !!input.hasEditorialIntervention,
    reviewNotes: input.reviewNotes || null,
    dates: input.dates ? {
      receivedAt: input.dates.receivedAt || null,
      updatedAt: input.dates.updatedAt || null,
      publishedAt: input.dates.publishedAt || null,
    } : {}
  };

  // 2. Calcular detalles de puntaje por dimensión
  const details = calculateEditorialProgressDetails(normalizedInput);

  // 3. Sumar puntaje total de progreso (0-100)
  const progress = sumEditorialProgress(details);

  // 4. Determinar la etapa de progreso
  const currentStage = determineEditorialStage(normalizedInput, progress, details);
  const nextStage = getNextStage(currentStage.code);
  const nextMilestone = getNextMilestoneLabel(currentStage.code);

  // 5. Construir listas de tareas
  const { completed, pending, blocked } = buildProgressItems(normalizedInput, details);

  // 6. Detectar conflictos y flags de publicación
  const conflicts = detectConflicts(normalizedInput);
  const pubCode = (normalizedInput.publicationStatus?.code || "").trim().toLowerCase();
  const isPublished = pubCode === "published";

  // Inconsistencias post-publicación
  const hasPostPubInconsistencies = isPublished && (
    normalizedInput.consent?.verified !== true ||
    blocked.length > 0
  );

  // 7. Generar recomendaciones
  const recommendationCodes: string[] = [];

  if (normalizedInput.consent?.verified !== true) {
    recommendationCodes.push("ADD_CONSENT");
  }

  const activeIndicators = (normalizedInput.indicators || []).filter(ind => ind.isActive === true);
  const hasBlockingIndicator = activeIndicators.some(
    ind => ind.severity === "blocking" || ind.severity === "critical"
  );
  if (hasBlockingIndicator) {
    recommendationCodes.push("RESOLVE_BLOCKING_INDICATOR");
  }

  const contentTypeNormalized = (normalizedInput.contentType || "").trim().toLowerCase();
  const isTextual = contentTypeNormalized === "textual" || contentTypeNormalized === "testimonio escrito";
  if (!isTextual && details.filesScore === 0) {
    recommendationCodes.push("ADD_REQUIRED_FILE");
  }

  if (details.editorialDescriptionScore < 10) {
    recommendationCodes.push("COMPLETE_DESCRIPTION");
  }

  if (details.editorialProcessingScore === 0) {
    recommendationCodes.push("START_EDITORIAL_PROCESSING");
  } else if (!normalizedInput.hasEditorialIntervention) {
    recommendationCodes.push("START_EDITORIAL_REVIEW");
  }

  if (!normalizedInput.reviewNotes || normalizedInput.reviewNotes.trim() === "") {
    recommendationCodes.push("ADD_REVIEW_NOTES");
  }

  const histCode = (normalizedInput.historicalValidation?.statusCode || "").trim().toLowerCase();
  if (histCode === "pending" || !histCode || histCode === "unknown") {
    recommendationCodes.push("REQUEST_HISTORICAL_VALIDATION");
  }

  if (!isPublished) {
    if (progress >= 90 && pubCode !== "publishable" && pubCode !== "ready" && pubCode !== "scheduled") {
      recommendationCodes.push("MARK_READY_FOR_PUBLICATION");
    } else if (progress >= 90 || currentStage.code === "READY_FOR_PUBLICATION") {
      recommendationCodes.push("PUBLISH_CONTRIBUTION");
    }
  }

  // Resolver mappers de recomendación y ordenar
  const recommendations: EditorialProgressRecommendation[] = recommendationCodes
    .map(getRecommendation)
    .sort((a, b) => b.priority - a.priority);

  const nextAction = recommendations.length > 0 ? recommendations[0] : null;

  // 8. Calcular pasos restantes (tareas pendientes + bloqueadas)
  const remainingSteps = pending.length + blocked.length;

  // 9. Generar resumen descriptivo
  let summary = "";
  if (isPublished) {
    summary = `El aporte alcanzó el ${progress}% de progreso editorial y se encuentra publicado en el portal público.`;
    if (hasPostPubInconsistencies) {
      summary += " ADVERTENCIA: Se detectan inconsistencias activas post-publicación.";
    }
  } else if (progress === 0) {
    summary = "El aporte está en una etapa inicial. Deben completarse los datos básicos, la descripción y el consentimiento.";
  } else {
    const hasConsentText = normalizedInput.consent?.verified ? "Cuenta con consentimiento" : "Falta consentimiento";
    const hasFilesText = (isTextual || details.filesScore > 0) ? "archivos utilizables" : "sin archivos utilizables";
    const hasClassText = details.editorialProcessingScore > 0 ? "clasificación editorial" : "sin clasificación";

    summary = `El aporte tiene un avance editorial del ${progress}%. ${hasConsentText}, ${hasFilesText} y ${hasClassText}`;

    if (histCode === "pending") {
      summary += ", pero aún requiere validación histórica.";
    } else if (remainingSteps > 0) {
      summary += `, quedan ${remainingSteps} pasos pendientes para su finalización.`;
    } else {
      summary += ". Todo el trabajo editorial básico está completo.";
    }
  }

  return {
    progress,
    currentStage,
    nextStage,
    completedItems: completed,
    pendingItems: pending,
    blockedItems: blocked,
    recommendations,
    nextAction,
    nextMilestone,
    completedWeight: progress, // Como sumEditorialProgress es sobre 100, equivale al peso ganado
    totalWeight: 100,
    remainingSteps,
    summary,
    details,
    isPublished,
    hasPostPublicationInconsistencies: hasPostPubInconsistencies,
    conflicts
  };
}
