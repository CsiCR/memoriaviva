// Políticas de Cambio y Congelamiento de Slugs
// Archivo: src/lib/public/slugs/policy.ts

import { PublicIdentity } from "./types";

export interface SlugPolicyDecision {
  allowed: boolean;
  shouldCreateAlias: boolean;
  reason?: string;
}

/**
 * Evalúa si se permite el cambio de slug para una identidad pública según sus políticas de estado.
 */
export function evaluateSlugChangePolicy(
  identity: PublicIdentity,
  newSlug: string,
  currentCanonicalSlug: string | null
): SlugPolicyDecision {
  // Idempotencia
  if (currentCanonicalSlug === newSlug) {
    return { allowed: true, shouldCreateAlias: false };
  }

  // 1. Validar si está congelada
  if (identity.isFrozen) {
    return {
      allowed: false,
      shouldCreateAlias: false,
      reason: "La identidad pública está congelada y no puede modificarse",
    };
  }

  // 2. Validar estados inmutables
  if (identity.status === "deleted") {
    return {
      allowed: false,
      shouldCreateAlias: false,
      reason: "No se puede cambiar el slug de una entidad eliminada",
    };
  }

  if (identity.status === "merged") {
    return {
      allowed: false,
      shouldCreateAlias: false,
      reason: "No se puede cambiar el slug de una entidad fusionada",
    };
  }

  // 3. Evaluar histórico de publicación
  if (!identity.hasEverBeenPublished) {
    // Si nunca ha sido publicada, se permite cambiar el canónico eliminando físicamente el anterior
    return { allowed: true, shouldCreateAlias: false };
  }

  // 4. Si ya fue publicada al menos una vez, cualquier renombre exige la creación de un alias
  return { allowed: true, shouldCreateAlias: true };
}
