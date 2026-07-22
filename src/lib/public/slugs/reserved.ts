// Configuración, palabras reservadas y constantes para slugs
// Archivo: src/lib/public/slugs/reserved.ts

import { PublicEntityType } from "./types";

export const SLUG_CONFIG = {
  MAX_LENGTH: 150,
  MAX_BASE_LENGTH: 130,
  MAX_ALLOCATION_ATTEMPTS: 20,
  MAX_REDIRECT_DEPTH: 10,
  MIN_LENGTH: 3,
} as const;

export const RESERVED_SLUGS = [
  "admin",
  "login",
  "api",
  "public",
  "editor",
  "dashboard",
  "assets",
  "static",
  "search",
  "robots",
  "favicon",
  "about",
  "contact",
  "help",
  "privacy",
  "terms",
  "rss",
  "feed",
  "json",
  "xml",
  "sitemap",
  "status",
  "auth",
  "oauth",
  "callback",
  "uploads",
  "images",
  "media",
];

/**
 * Valida si un slug coincide con alguna palabra reservada de la plataforma.
 */
export function isReserved(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase().trim());
}

/**
 * Mapeo oficial de tipos de entidad a sus respectivos segmentos de ruta.
 */
export const PUBLIC_ROUTE_SCOPES: Record<PublicEntityType, string> = {
  story: "historias",
  contribution: "aportes",
  person: "personas",
  place: "lugares",
  institution: "instituciones",
  collection: "colecciones",
};
