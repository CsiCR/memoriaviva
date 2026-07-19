// Reglas de Elegibilidad del Motor Editorial
// Archivo: src/lib/editorial/editorialRules.ts

import { ContributionInput, EditorialIssue, EditorialEvaluation } from './types';
import {
  PUBLIC_AUTHORIZATION_CODES,
  PUBLICATION_ELIGIBLE_EDITORIAL_CODES,
  ACTION_PRIORITY,
  isUsableEditorialFile
} from './editorialConstants';
import { editorialMessages } from './editorialMessages';
import { calculateEditorialScore } from './editorialScore';

export function runEditorialRules(input: ContributionInput): EditorialEvaluation {
  const issues: EditorialIssue[] = [];
  const blockingIndicators: string[] = [];
  const warnings: string[] = [];
  const missingRequirements: string[] = [];
  let eligibleForPublication = true;

  // F.1 Validaciones de entrada básica (Seguridad de fallos de integración)
  if (!input.editorial_status || !input.editorial_status.code) {
    issues.push({
      code: "editorial_status_missing",
      message: "Estado editorial no disponible.",
      severity: "blocking",
      source: "editorial_status"
    });
    eligibleForPublication = false;
    missingRequirements.push("Estado editorial no disponible.");
  }

  if (!input.publication_status || !input.publication_status.code) {
    issues.push({
      code: "publication_status_missing",
      message: "Estado de publicación no disponible.",
      severity: "warning",
      source: "publication_status"
    });
  }

  // E1 — Consentimiento
  if (input.consent_verified === false) {
    eligibleForPublication = false;
    issues.push({
      code: "consent_pending",
      message: editorialMessages.consent_pending,
      severity: "blocking",
      source: "consent"
    });
    missingRequirements.push(editorialMessages.consent_pending);
  }

  // E2 — Autorización
  const isAuthCompatible = PUBLIC_AUTHORIZATION_CODES.has(input.authorization_level ?? "");
  if (!isAuthCompatible) {
    eligibleForPublication = false;
    issues.push({
      code: "auth_not_public",
      message: editorialMessages.auth_not_public,
      severity: "blocking",
      source: "authorization"
    });
    missingRequirements.push(editorialMessages.auth_not_public);
  }

  // E3 — Estado editorial
  if (input.editorial_status && input.editorial_status.code) {
    const isEligibleState = PUBLICATION_ELIGIBLE_EDITORIAL_CODES.has(input.editorial_status.code);
    if (!isEligibleState) {
      eligibleForPublication = false;
      issues.push({
        code: "editorial_status_not_eligible",
        message: `El estado editorial actual (${input.editorial_status.name || input.editorial_status.code}) no es elegible para publicación pública.`,
        severity: "blocking",
        source: "editorial_status"
      });
      missingRequirements.push(`Estado editorial elegible requerido.`);
    }
  }

  // E4 — Indicadores bloqueantes
  const activeInds = input.active_indicators || [];
  for (const ind of activeInds) {
    const blocksPub = ind.metadata?.blocks_publication === true || 
                       ind.metadata?.severity === "blocking" || 
                       ind.metadata?.severity === "critical";
    if (blocksPub) {
      eligibleForPublication = false;
      blockingIndicators.push(ind.name);
      issues.push({
        code: `indicator_${ind.code || ind.id}`,
        message: ind.name,
        severity: (ind.metadata?.severity as "info" | "warning" | "blocking" | "critical") || "blocking",
        source: "indicator"
      });
      missingRequirements.push(ind.name);
    } else {
      // Indicadores no bloqueantes pero activos van como warnings o info
      issues.push({
        code: `indicator_${ind.code || ind.id}`,
        message: ind.name,
        severity: (ind.metadata?.severity as "info" | "warning" | "blocking" | "critical") || "warning",
        source: "indicator"
      });
      warnings.push(ind.name);
    }
  }

  // E5 — Archivos
  const filesList = input.files || [];
  const usableFilesCount = filesList.filter(isUsableEditorialFile).length;
  
  if (!input.content_type) {
    // Caso content_type nulo: comportamiento conservador
    if (filesList.length === 0) {
      eligibleForPublication = false;
      issues.push({
        code: "content_type_missing",
        message: editorialMessages.content_type_missing,
        severity: "blocking",
        source: "files"
      });
      missingRequirements.push(editorialMessages.content_type_missing);
    }
  } else if (input.content_type === "textual") {
    if (usableFilesCount === 0) {
      issues.push({
        code: "files_missing_textual",
        message: editorialMessages.files_missing_textual,
        severity: "warning",
        source: "files"
      });
      warnings.push(editorialMessages.files_missing_textual);
    }
  } else {
    // audiovisual, documentary, mixed
    if (usableFilesCount === 0) {
      eligibleForPublication = false;
      issues.push({
        code: "files_missing_media",
        message: editorialMessages.files_missing_media,
        severity: "blocking",
        source: "files"
      });
      missingRequirements.push(editorialMessages.files_missing_media);
    }
  }

  // Archivos fallidos o defectuosos
  const failedFiles = filesList.filter(f => f.processing_status === "failed");
  if (failedFiles.length > 0) {
    issues.push({
      code: "files_failed",
      message: editorialMessages.files_failed,
      severity: "warning",
      source: "files"
    });
    warnings.push(editorialMessages.files_failed);
  }

  // E6 — Publicado con bloqueo posterior
  const isPublished = input.publication_status?.code === "published";
  const hasBlockingIssues = issues.some(issue => issue.severity === "blocking" || issue.severity === "critical");
  
  if (isPublished && hasBlockingIssues) {
    issues.push({
      code: "published_with_active_blocks",
      message: editorialMessages.published_with_active_blocks,
      severity: "critical",
      source: "publication_status"
    });
    warnings.push(editorialMessages.published_with_active_blocks);
  }

  // E7 — Recomendación de publicación
  let recommendedPublicationStatus: string | null = null;
  if (
    eligibleForPublication &&
    input.publication_status?.code !== "publishable" &&
    input.publication_status?.code !== "published"
  ) {
    recommendedPublicationStatus = "publishable";
  }

  // Recomendación de estado editorial
  let recommendedEditorialStatus: string | null = null;
  const currentEditorialCode = input.editorial_status?.code;
  if (currentEditorialCode === "received") {
    recommendedEditorialStatus = "in_review";
  } else if (currentEditorialCode === "incomplete" && filesList.length > 0) {
    recommendedEditorialStatus = "in_review";
  }

  // E8 — Siguiente acción recomendada por prioridad
  let recommendedNextAction = editorialMessages.action_none;
  let highestPriority = Infinity;

  for (const issue of issues) {
    let sourceKey: string = issue.source;
    if (issue.code === "published_with_active_blocks" || issue.severity === "critical") {
      sourceKey = "critical";
    }

    const priority = ACTION_PRIORITY[sourceKey as keyof typeof ACTION_PRIORITY] ?? 99;
    if (priority < highestPriority) {
      highestPriority = priority;
      
      if (sourceKey === "critical") {
        recommendedNextAction = editorialMessages.action_review_critical;
      } else if (sourceKey === "consent") {
        recommendedNextAction = editorialMessages.action_complete_consent;
      } else if (sourceKey === "authorization") {
        recommendedNextAction = editorialMessages.action_resolve_authorization;
      } else if (sourceKey === "files") {
        recommendedNextAction = editorialMessages.action_retrieve_material;
      } else if (sourceKey === "editorial_status") {
        recommendedNextAction = editorialMessages.action_advance_editorial;
      } else if (sourceKey === "indicator") {
        recommendedNextAction = editorialMessages.action_resolve_indicators;
      } else if (sourceKey === "publication_status") {
        recommendedNextAction = editorialMessages.action_evaluate_publication;
      }
    }
  }

  // Resumen del estado
  let summary = editorialMessages.summary_eligible;
  if (!eligibleForPublication) {
    summary = editorialMessages.summary_blocked;
  }
  if (currentEditorialCode === "received") {
    summary = editorialMessages.summary_received;
  }

  // Detalles informativos
  const details: string[] = [];
  details.push(`Puntaje de calidad alcanzado: ${calculateEditorialScore(input)}/100.`);
  if (eligibleForPublication) {
    details.push("El material cuenta con consentimiento y validación completa.");
  } else {
    details.push(`Presenta ${issues.filter(i => i.severity === "blocking").length} condiciones bloqueantes.`);
  }

  return {
    eligibleForPublication,
    editorialProgress: calculateEditorialScore(input),
    blockingIndicators,
    warnings,
    missingRequirements,
    issues,
    recommendedEditorialStatus,
    recommendedPublicationStatus,
    recommendedNextAction,
    summary,
    details
  };
}
