// Mapper de Referencias Públicas
// Archivo: src/lib/public/mappers/to-public-reference.ts

import { ContributionInput } from "../../editorial/types";
import {
  PublicReference,
  PublicPersonReference,
  PublicPlaceReference,
  PublicInstitutionReference,
} from "../types/references";

/**
 * Convierte un nombre de texto a una versión slug simplificada y limpia.
 * Ejemplo: "Juan Pérez" -> "juan-perez"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    .replace(/[^a-z0-9\s-]/g, "")    // Quitar caracteres especiales
    .trim()
    .replace(/\s+/g, "-")            // Reemplazar espacios por guiones
    .replace(/-+/g, "-");            // Colapsar guiones repetidos
}

/**
 * Mapea las personas mencionadas en el aporte a referencias públicas tipadas.
 * Parsea cadenas separadas por coma.
 */
export function toPublicPersonReferences(mentionedPeople: string | null | undefined): PublicPersonReference[] {
  if (!mentionedPeople) return [];
  return mentionedPeople
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((name) => ({
      id: null,
      slug: slugify(name),
      displayName: name,
    }));
}

/**
 * Mapea el lugar relacionado a un objeto de referencia público.
 */
export function toPublicPlaceReference(placeName: string | null | undefined): PublicPlaceReference | null {
  if (!placeName || placeName.trim().length === 0) return null;
  const clean = placeName.trim();
  return {
    id: null,
    slug: slugify(clean),
    name: clean,
  };
}

/**
 * Mapea las instituciones relacionadas a objetos de referencia públicos.
 * Parsea cadenas separadas por coma.
 */
export function toPublicInstitutionReferences(
  relatedInstitution: string | null | undefined
): PublicInstitutionReference[] {
  if (!relatedInstitution) return [];
  return relatedInstitution
    .split(",")
    .map((inst) => inst.trim())
    .filter(Boolean)
    .map((name) => ({
      id: null,
      slug: slugify(name),
      name: name,
    }));
}

/**
 * Construye las referencias públicas institucionales del aporte (ej. Convenios).
 * Oculta de manera absoluta cualquier ruta física, bucket o información administrativa del convenio.
 */
export function toPublicReferences(
  contribution: ContributionInput,
  approvedExternalUrl: string | null = null
): PublicReference[] {
  const references: PublicReference[] = [];

  // Si tiene un convenio institucional asociado, mapeamos su existencia pública
  const cRaw = contribution as unknown as Record<string, unknown>;
  const consentReference = typeof cRaw.consent_reference === "string" ? cRaw.consent_reference : null;

  if (contribution.consent_source === "institutional_agreement" && consentReference) {
    references.push({
      type: "institutional_agreement",
      title: `Resguardado bajo el convenio de colaboración recíproca ${consentReference}`,
      sourceName: "Archivo Histórico Municipal de Pico Truncado",
      dateLabel: null,
      externalUrl: approvedExternalUrl, // Solo se incluye si fue explícitamente aprobado y pasado
    });
  }

  // Si hay alguna referencia adicional que desees añadir en el futuro, se puede estructurar aquí
  return references;
}
