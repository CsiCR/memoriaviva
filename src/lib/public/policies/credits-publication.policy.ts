// Política de Publicación de Créditos
// Archivo: src/lib/public/policies/credits-publication.policy.ts

import { ContributionInput } from "../../editorial/types";

/**
 * Evalúa si los créditos y autorizaciones de atribución de un aporte son publicables.
 * 
 * Verifica que exista consentimiento verificado y una preferencia de crédito definida.
 */
export function canPublishCredits(contribution: ContributionInput): boolean {
  if (!contribution.consent_verified) {
    return false;
  }

  if (!contribution.credit_preference) {
    return false;
  }

  return true;
}
