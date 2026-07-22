// Política de Publicación de Aportes
// Archivo: src/lib/public/policies/contribution-publication.policy.ts

import { ContributionInput } from "../../editorial/types";
import { PUBLIC_AUTHORIZATION_CODES } from "../../editorial/editorialConstants";
import { evaluateContribution } from "../../editorial/evaluateContribution";

/**
 * Valida si el nivel de autorización permite la publicación pública.
 * Consume la clasificación central del motor editorial para evitar duplicidad de lógica.
 */
export function canPublishUnderAuthorizationLevel(level: string | null): boolean {
  return PUBLIC_AUTHORIZATION_CODES.has(level ?? "");
}

/**
 * Evalúa si una contribución cumple con todos los requisitos para ser expuesta públicamente.
 * 
 * Criterios obligatorios:
 * - Consentimiento verificado (consent_verified === true)
 * - Nivel de autorización público homologado
 * - Estado de publicación exacto a "published" (exclusivamente publicado)
 * - Elegibilidad aprobada por el motor editorial existente
 */
export function canPublishContribution(contribution: ContributionInput): boolean {
  if (!contribution.consent_verified) {
    return false;
  }

  if (!canPublishUnderAuthorizationLevel(contribution.authorization_level)) {
    return false;
  }

  if (contribution.publication_status?.code !== "published") {
    return false;
  }

  // Consumir el motor editorial existente
  const evaluation = evaluateContribution(contribution);
  if (!evaluation.eligibleForPublication) {
    return false;
  }

  return true;
}

/**
 * Lanza un error si la contribución no cumple las condiciones para ser publicada.
 */
export function assertContributionCanBePublished(contribution: ContributionInput): void {
  if (!canPublishContribution(contribution)) {
    throw new Error("La contribución no cumple con los criterios de exposición pública.");
  }
}
