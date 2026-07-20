/* eslint-disable @typescript-eslint/no-explicit-any */
// Mapeador de Supabase al Contrato del Motor de Progreso Editorial
// Archivo: src/lib/editorial/progress/mapContributionToProgressInput.ts

import { EditorialProgressInput } from './progressTypes';
import { mapStatusToCode, mapContributionTypeToContentType } from '../editorialConstants';

export function mapContributionToProgressInput(
  contribution: any,
  publicationStatusOpt?: any,
  activeIndicatorsWithDetails: any[] = []
): EditorialProgressInput {
  if (!contribution) {
    throw new Error("La contribución para el mapeo de progreso no puede ser nula.");
  }

  // 1. Mapear estado editorial canonical
  const editorialStatusCode = contribution.editorial_status 
    ? mapStatusToCode(String(contribution.editorial_status)) 
    : null;

  // 2. Mapear tipo de contenido canonical
  const contentType = contribution.contribution_type
    ? mapContributionTypeToContentType(contribution.contribution_type)
    : null;

  // 3. Mapear archivos
  const files = (contribution.contribution_files || contribution.files || []).map((f: any) => ({
    id: f.id || "",
    statusCode: f.processing_status || null,
    mimeType: f.file_type || null,
    filePath: f.file_path || null
  }));

  // 4. Mapear indicadores activos
  const indicators = activeIndicatorsWithDetails.map((ind: any) => {
    // Si viene de la base de datos de indicadores con relación opt
    const code = ind.opt?.code || ind.code || null;
    const severity = ind.opt?.metadata?.severity || ind.metadata?.severity || "info";
    const isActive = ind.is_active !== undefined ? !!ind.is_active : (ind.isActive !== undefined ? !!ind.isActive : true);

    return {
      code,
      severity: severity as "info" | "warning" | "blocking" | "critical",
      isActive
    };
  });

  // 5. Determinar validación histórica
  // Validación histórica no requerida: si es "documentary" (Fotografía o Documento) y no tiene contexto histórico detallado
  const isDocumentary = contentType === "documentary";
  const hasHistory = contribution.historical_context && contribution.historical_context.trim().length >= 10;
  
  let histStatusCode: "validated" | "pending" | "not_required" | "rejected" | "unknown" = "unknown";

  const hasPendingIndicator = indicators.some(ind => ind.isActive && ind.code === "historical_validation_pending");
  const hasSuccessIndicator = indicators.some(
    ind => ind.isActive && (ind.code === "historical_validation_completed" || ind.code === "historically_validated")
  );
  const hasRejectedIndicator = indicators.some(ind => ind.isActive && ind.code === "historical_validation_rejected");

  if (editorialStatusCode === "validated" || hasSuccessIndicator) {
    histStatusCode = "validated";
  } else if (hasRejectedIndicator) {
    histStatusCode = "rejected";
  } else if (editorialStatusCode === "in_historical_validation" || hasPendingIndicator) {
    histStatusCode = "pending";
  } else if (isDocumentary && !hasHistory) {
    histStatusCode = "not_required";
  } else if (contribution.historical_validation_status === "not_required") {
    histStatusCode = "not_required";
  } else if (contribution.historical_validation_status === "validated") {
    histStatusCode = "validated";
  } else if (contribution.historical_validation_status === "pending") {
    histStatusCode = "pending";
  } else if (contribution.historical_validation_status === "rejected") {
    histStatusCode = "rejected";
  } else {
    // Default fallback
    histStatusCode = "pending";
  }

  // 6. Intervención editorial
  const hasNotes = contribution.internal_notes && contribution.internal_notes.trim() !== "";
  const isPastReceived = editorialStatusCode && editorialStatusCode !== "received";
  const hasEditorialIntervention = !!(hasNotes || isPastReceived);

  // 7. Mapear estado de publicación
  let publicationStatus = null;
  if (publicationStatusOpt) {
    publicationStatus = {
      id: publicationStatusOpt.id || null,
      code: publicationStatusOpt.code || null,
      name: publicationStatusOpt.name || null
    };
  }

  return {
    contributionId: contribution.id || "",
    title: contribution.title || null,
    description: contribution.description || null,
    contentType,
    contributor: contribution.contributors ? {
      id: contribution.contributors.id || null,
      fullName: contribution.contributors.full_name || null,
      birthDate: contribution.contributors.birth_date || null,
      birthPlace: contribution.contributors.birth_place || null,
      arrivalDate: contribution.contributors.arrival_date || null,
    } : null,
    consent: {
      verified: !!contribution.consent_verified,
      authorizationLevelCode: contribution.authorization_level || null
    },
    files,
    editorialStatus: {
      id: null,
      code: editorialStatusCode,
      name: contribution.editorial_status || null
    },
    publicationStatus,
    historicalValidation: {
      statusCode: histStatusCode,
      validatedAt: null,
      validatorName: null
    },
    indicators,
    hasEditorialIntervention,
    reviewNotes: contribution.internal_notes || null,
    dates: {
      receivedAt: contribution.created_at || null,
      updatedAt: contribution.updated_at || null,
      publishedAt: contribution.published_at || null
    }
  };
}
