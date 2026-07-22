// Validador de Estructura y Palabras Reservadas para Slugs
// Archivo: src/lib/public/slugs/validator.ts

import { SLUG_CONFIG, isReserved } from "./reserved";

export interface SlugValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Valida de forma estricta la estructura y pertenencia de un slug.
 */
export function validateSlug(slug: string): SlugValidationResult {
  if (!slug || slug.trim() === "") {
    return { isValid: false, error: "El slug no puede estar vacío" };
  }

  const cleanSlug = slug.trim();

  // Validar longitud mínima
  if (cleanSlug.length < SLUG_CONFIG.MIN_LENGTH) {
    return {
      isValid: false,
      error: `El slug debe tener al menos ${SLUG_CONFIG.MIN_LENGTH} caracteres`,
    };
  }

  // Validar longitud máxima
  if (cleanSlug.length > SLUG_CONFIG.MAX_LENGTH) {
    return {
      isValid: false,
      error: `El slug no puede superar los ${SLUG_CONFIG.MAX_LENGTH} caracteres`,
    };
  }

  // Validar formato alfanumérico con guiones simples
  const allowedPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!allowedPattern.test(cleanSlug)) {
    return {
      isValid: false,
      error: "El slug contiene caracteres inválidos o guiones mal formateados",
    };
  }

  // Validar exclusión de palabras reservadas
  if (isReserved(cleanSlug)) {
    return {
      isValid: false,
      error: `El slug '${cleanSlug}' es una palabra reservada del sistema`,
    };
  }

  return { isValid: true };
}
