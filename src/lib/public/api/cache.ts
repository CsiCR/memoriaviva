// Utilidades de Caché HTTP y Generación Estables de ETags (SHA-256)
// Archivo: src/lib/public/api/cache.ts

import { createHash } from "crypto";

/**
 * Serializa de forma estable y determinista cualquier valor, ordenando claves de objetos
 * y omitiendo propiedades undefined para asegurar coherencia multiservidor.
 */
export function stableStringify(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "";
  if (typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts = keys
    .map((key) => {
      const val = obj[key];
      if (val === undefined) return null;
      return `${JSON.stringify(key)}:${stableStringify(val)}`;
    })
    .filter((p) => p !== null);

  return "{" + parts.join(",") + "}";
}

/**
 * Genera un ETag fuerte basado en el hash SHA-256 base64url del payload serializado.
 */
export function generateHashETag(payload: unknown): string {
  const serialized = stableStringify(payload);
  const hash = createHash("sha256").update(serialized).digest("base64url");
  return `"${hash}"`;
}
