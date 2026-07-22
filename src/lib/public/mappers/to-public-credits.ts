// Mapper de Créditos Públicos
// Archivo: src/lib/public/mappers/to-public-credits.ts

import { ContributionInput } from "../../editorial/types";
import { PublicCredits } from "../types/credits";
import { canPublishCredits } from "../policies/credits-publication.policy";

/**
 * Obtiene las iniciales de un nombre compuesto respetando tildes y caracteres propios.
 * Ejemplo: "Juan Carlos Pérez" -> "J. C. P."
 * Ejemplo: "Óscar Agustín Di Stéfano" -> "Ó. A. D. S."
 */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => {
      const firstChar = word.charAt(0);
      return firstChar ? firstChar.toUpperCase() + "." : "";
    })
    .filter(Boolean)
    .join(" ");
}

/**
 * Obtiene el nombre de familia a partir del nombre completo.
 * Si el nombre ya comienza con "Familia", lo devuelve tal cual.
 * Ejemplo: "Juan Pérez" -> "Familia Pérez"
 */
export function getFamilyName(name: string): string {
  const clean = name.trim();
  if (/^familia\b/i.test(clean)) {
    return clean;
  }
  const parts = clean.split(/\s+/);
  const lastName = parts[parts.length - 1] || "";
  return lastName ? `Familia ${lastName}` : "Familia Aportante";
}

/**
 * Mapea el aportante editorial a un objeto PublicCredits Whitelist.
 * 
 * Reglas:
 * - Si customDisplayName está presente, fuerza el tipo a "custom".
 * - Transforma de forma segura y controlada de acuerdo a las preferencias del aportante.
 * - Nunca intenta reconstruir iniciales o nombres desde correos o DNI.
 */
export function toPublicCredits(
  contribution: ContributionInput,
  customDisplayName?: string
): PublicCredits {
  if (!canPublishCredits(contribution)) {
    throw new Error("No hay consentimiento de atribución verificado para este aporte.");
  }

  // Sobreescritura manual directa
  if (customDisplayName && customDisplayName.trim().length > 0) {
    return {
      attributionType: "custom",
      displayName: customDisplayName.trim(),
    };
  }

  const preference = contribution.credit_preference || "Anónimo";
  const contributorName = contribution.contributor?.full_name || "";

  // Mapeos basados en la preferencia del aportante
  if (preference === "Nombre completo" && contributorName) {
    return {
      attributionType: "full_name",
      displayName: contributorName.trim(),
    };
  }

  if (preference === "Iniciales" && contributorName) {
    return {
      attributionType: "initials",
      displayName: getInitials(contributorName),
    };
  }

  if (preference === "Familia aportante" && contributorName) {
    return {
      attributionType: "family",
      displayName: getFamilyName(contributorName),
    };
  }

  // Si es institucional
  const contributorRaw = contribution.contributor as unknown as Record<string, unknown>;
  const isInstitution = preference === "Institución" || 
                        (contribution.contributor?.relation_to_city === "Institución" && preference !== "Anónimo");

  if (isInstitution) {
    const rawInst = contributorRaw?.neighborhood_or_institution;
    const instName = typeof rawInst === "string" ? rawInst : contributorName;
    return {
      attributionType: "institution",
      displayName: instName ? instName.trim() : "Institución Aportante",
    };
  }

  // Por defecto (incluido "Anónimo")
  return {
    attributionType: "anonymous",
    displayName: "Aporte anónimo",
  };
}
