// Sistema de Puntaje Informativo del Motor Editorial (100 puntos)
// Archivo: src/lib/editorial/editorialScore.ts

import { ContributionInput } from './types';
import {
  PUBLIC_AUTHORIZATION_CODES,
  PUBLICATION_ELIGIBLE_EDITORIAL_CODES,
  INTERMEDIATE_EDITORIAL_CODES,
  HISTORICAL_VALIDATION_SUCCESS_CODES,
  isUsableEditorialFile
} from './editorialConstants';

export function calculateEditorialScore(input: ContributionInput): number {
  let score = 0;

  // 1. Consentimiento y Autorización (Máximo 20 puntos)
  if (input.consent_verified) {
    score += 10;
  }
  const isAuthCompatible = PUBLIC_AUTHORIZATION_CODES.has(input.authorization_level ?? "");
  if (isAuthCompatible) {
    score += 10;
  }

  // 2. Descripción (Máximo 15 puntos)
  const descLength = input.description?.trim().length || 0;
  if (descLength >= 50) {
    score += 15;
  } else if (descLength >= 10) {
    score += 8;
  }

  // 3. Material Requerido (Máximo 20 puntos)
  if (input.content_type === "textual") {
    score += 20; // Aportes textuales no requieren archivos obligatorios para el puntaje
  } else if (input.content_type) {
    // Para documental, audiovisual o mixto, requerimos al menos un archivo útil
    const usableFilesCount = (input.files || []).filter(isUsableEditorialFile).length;
    if (usableFilesCount > 0) {
      score += 20;
    }
  } else {
    // Si no está definido el tipo de aporte, pero tiene archivos útiles, le damos puntos proporcionales
    const usableFilesCount = (input.files || []).filter(isUsableEditorialFile).length;
    if (usableFilesCount > 0) {
      score += 10; // Criterio conservador
    }
  }

  // 4. Indicadores Activos (Máximo 20 puntos)
  let indicatorScore = 20;
  const activeInds = input.active_indicators || [];
  for (const ind of activeInds) {
    const isBlocking = ind.metadata?.blocks_publication === true || 
                       ind.metadata?.severity === "blocking" || 
                       ind.metadata?.severity === "critical";
    if (isBlocking) {
      indicatorScore -= 5;
    } else {
      indicatorScore -= 2;
    }
  }
  score += Math.max(0, indicatorScore);

  // 5. Validación Histórica (Máximo 15 puntos con evidencia positiva)
  const hasHistoricalStatusSuccess = 
    input.historical_validation_status === "validated" || 
    input.historical_validation_status === "not_required";
  
  const hasEditorialStatusSuccess = 
    input.editorial_status?.code === "validated" || 
    PUBLICATION_ELIGIBLE_EDITORIAL_CODES.has(input.editorial_status?.code ?? "");

  const hasActiveIndicatorSuccess = 
    activeInds.some(ind => HISTORICAL_VALIDATION_SUCCESS_CODES.has(ind.code ?? ""));

  if (hasHistoricalStatusSuccess || hasEditorialStatusSuccess || hasActiveIndicatorSuccess) {
    score += 15;
  }

  // 6. Estado Editorial (Máximo 10 puntos)
  const statusCode = input.editorial_status?.code ?? "";
  if (PUBLICATION_ELIGIBLE_EDITORIAL_CODES.has(statusCode) || statusCode === "archived") {
    score += 10;
  } else if (INTERMEDIATE_EDITORIAL_CODES.has(statusCode)) {
    score += 5;
  }

  return score;
}
