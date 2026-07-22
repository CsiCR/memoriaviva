// Algoritmos de Normalización, Transliteración y Colisión de Slugs
// Archivo: src/lib/public/slugs/generator.ts

import { SLUG_CONFIG, isReserved } from "./reserved";
import { SlugCandidate, PublicEntityType } from "./types";
import { PublicIdentityRepository } from "./repository";

/**
 * Translitera de forma explícita caracteres especiales que NFD no descompone por defecto.
 */
export function transliterateSpecialChars(text: string): string {
  const mappings: Record<string, string> = {
    "Æ": "ae", "æ": "ae",
    "Œ": "oe", "œ": "oe",
    "ß": "ss",
    "Ł": "l", "ł": "l",
    "Ø": "o", "ø": "o",
  };
  return text
    .split("")
    .map((char) => mappings[char] || char)
    .join("");
}

/**
 * Normaliza y sanitiza un texto para convertirlo en un slug limpio y seguro.
 */
export function normalizeSlug(text: string): string {
  if (!text) return "";

  // 1. Transliterar caracteres complejos
  const transliterated = transliterateSpecialChars(text);

  // 2. Normalización NFD para quitar tildes/acentos
  const normalized = transliterated
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // 3. Quitar caracteres que no sean alfanuméricos, espacios o guiones
  const clean = normalized.replace(/[^a-z0-9\s-]/g, "");

  // 4. Espacios a guiones, colapsar repetidos y quitar extremos
  const slugified = clean
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  // 5. Truncar a longitud máxima base (130 caracteres) para dar margen a sufijos
  if (slugified.length > SLUG_CONFIG.MAX_BASE_LENGTH) {
    return slugified.substring(0, SLUG_CONFIG.MAX_BASE_LENGTH).replace(/-+$/g, "");
  }

  return slugified;
}

/**
 * Crea una estructura candidata para procesar y asignar un slug.
 */
export function generateSlugCandidate(
  rawValue: string,
  source: SlugCandidate["source"],
  requestedBy?: string | null
): SlugCandidate {
  return {
    rawValue,
    source,
    requestedBy: requestedBy || null,
  };
}

export class SlugAllocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SlugAllocationError";
  }
}

/**
 * Genera un slug único para un tipo de entidad resolviendo colisiones secuenciales.
 */
export async function generateUniqueSlug(
  candidate: SlugCandidate,
  entityType: PublicEntityType,
  entityUuid: string,
  repository: PublicIdentityRepository
): Promise<string> {
  const baseSlug = normalizeSlug(candidate.rawValue);

  if (!baseSlug || baseSlug.trim() === "") {
    throw new Error("No se pudo generar un slug a partir de una cadena vacía");
  }

  if (isReserved(baseSlug)) {
    throw new Error(`El slug '${baseSlug}' es una palabra reservada del sistema`);
  }

  let slug = baseSlug;
  let counter = 1;

  while (await repository.isSlugTaken(slug, entityType, entityUuid)) {
    counter++;
    if (counter > SLUG_CONFIG.MAX_ALLOCATION_ATTEMPTS) {
      throw new SlugAllocationError(
        `Se superó el límite de ${SLUG_CONFIG.MAX_ALLOCATION_ATTEMPTS} intentos para resolver colisión de slug: ${baseSlug}`
      );
    }
    // Como baseSlug ya está truncado a 130, concatenar "-20" no superará el límite de 150.
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
}
