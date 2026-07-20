// Evaluación de Puntajes del Motor de Progreso Editorial
// Archivo: src/lib/editorial/progress/progressScore.ts

import { EditorialProgressInput, EditorialProgressDetails } from './progressTypes';
import { DIMENSION_WEIGHTS, VALID_EDITORIAL_STATUS_CODES } from './progressConstants';
import { INVALID_FILE_STATUSES } from '../editorialConstants';

export function isUsableProgressFile(file: { statusCode?: string | null; filePath?: string | null }): boolean {
  if (!file.filePath || file.filePath.trim() === "") {
    return false;
  }
  const status = (file.statusCode || "").trim().toLowerCase();
  return !INVALID_FILE_STATUSES.has(status);
}

export function evaluateBasicIdentificationScore(input: EditorialProgressInput): number {
  let score = 0;
  if (input.title && input.title.trim() !== "") {
    score += 3;
  }
  if (input.contributor && (input.contributor.id || (input.contributor.fullName && input.contributor.fullName.trim() !== ""))) {
    score += 3;
  }
  if (input.contentType && input.contentType.trim() !== "") {
    score += 2;
  }
  if (input.dates?.receivedAt && input.dates.receivedAt.trim() !== "") {
    score += 2;
  }
  return score;
}

export function evaluateEditorialDescriptionScore(input: EditorialProgressInput): number {
  const desc = (input.description || "").trim();
  if (desc.length === 0) {
    return 0;
  }
  if (desc.length < 40) {
    return 4;
  }
  return 10;
}

export function evaluateConsentScore(input: EditorialProgressInput): number {
  if (input.consent?.verified === true) {
    return DIMENSION_WEIGHTS.consent; // 20
  }
  return 0;
}

export function evaluateFilesScore(input: EditorialProgressInput): number {
  const type = (input.contentType || "").trim().toLowerCase();
  if (type === "textual" || type === "testimonio escrito") {
    return DIMENSION_WEIGHTS.files; // 15
  }

  const files = input.files || [];
  const usableFiles = files.filter(isUsableProgressFile);
  if (usableFiles.length > 0) {
    return DIMENSION_WEIGHTS.files; // 15
  }
  
  return 0;
}

export function evaluateEditorialProcessingScore(input: EditorialProgressInput): number {
  const code = (input.editorialStatus?.code || "").trim().toLowerCase();
  if (!code || code === "received" || code === "incomplete") {
    return 0;
  }
  if (VALID_EDITORIAL_STATUS_CODES.has(code)) {
    return DIMENSION_WEIGHTS.editorialProcessing; // 10
  }
  return 0;
}

export function evaluateEditorialReviewScore(input: EditorialProgressInput): number {
  let score = 0;
  // Intervention
  if (input.hasEditorialIntervention === true) {
    score += 4;
  }
  // Notes
  if (input.reviewNotes && input.reviewNotes.trim() !== "") {
    score += 3;
  }
  // Status in review or higher
  const code = (input.editorialStatus?.code || "").trim().toLowerCase();
  if (code && code !== "received" && code !== "incomplete") {
    score += 3;
  }
  return score;
}

export function evaluateHistoricalValidationScore(input: EditorialProgressInput): number {
  const code = (input.historicalValidation?.statusCode || "").trim().toLowerCase();
  switch (code) {
    case "validated":
    case "not_required":
      return 15;
    case "pending":
      return 5;
    case "rejected":
    default:
      return 0;
  }
}

export function evaluateIndicatorsScore(input: EditorialProgressInput): number {
  const indicatorsWereEvaluated =
    !!input.hasEditorialIntervention ||
    (input.indicators || []).length > 0;

  if (!indicatorsWereEvaluated) {
    return 0;
  }

  const activeIndicators = (input.indicators || []).filter(ind => ind.isActive === true);
  if (activeIndicators.length === 0) {
    return 5;
  }

  const hasBlockingOrCritical = activeIndicators.some(
    ind => ind.severity === "blocking" || ind.severity === "critical"
  );
  if (hasBlockingOrCritical) {
    return 0;
  }

  const hasWarning = activeIndicators.some(ind => ind.severity === "warning");
  if (hasWarning) {
    return 2;
  }

  // Only info severity
  return 5;
}

export function evaluatePublicationScore(input: EditorialProgressInput): number {
  const code = (input.publicationStatus?.code || "").trim().toLowerCase();
  switch (code) {
    case "published":
      return 5;
    case "publishable":
    case "ready":
    case "scheduled":
      return 4;
    case "draft":
    case "review":
      return 2;
    default:
      return 0;
  }
}

export function calculateEditorialProgressDetails(input: EditorialProgressInput): EditorialProgressDetails {
  return {
    basicIdentificationScore: evaluateBasicIdentificationScore(input),
    editorialDescriptionScore: evaluateEditorialDescriptionScore(input),
    consentScore: evaluateConsentScore(input),
    filesScore: evaluateFilesScore(input),
    editorialProcessingScore: evaluateEditorialProcessingScore(input),
    editorialReviewScore: evaluateEditorialReviewScore(input),
    historicalValidationScore: evaluateHistoricalValidationScore(input),
    indicatorsScore: evaluateIndicatorsScore(input),
    publicationScore: evaluatePublicationScore(input),
  };
}

export function sumEditorialProgress(details: EditorialProgressDetails): number {
  const sum = 
    details.basicIdentificationScore +
    details.editorialDescriptionScore +
    details.consentScore +
    details.filesScore +
    details.editorialProcessingScore +
    details.editorialReviewScore +
    details.historicalValidationScore +
    details.indicatorsScore +
    details.publicationScore;
  return Math.min(100, Math.max(0, sum));
}
