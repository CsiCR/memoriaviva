// Helper Centralizado de Generación de Slugs para Contribuciones
// Archivo: src/lib/public/slugs/canonical-slug.ts
//
// ÚNICA fuente de generación de slugs navegables de contribuciones en todo el sistema.
// Debe usarse en:
//   - Acciones editoriales de publicación (contributions.ts)
//   - Scripts de reparación y rebuild
//   - Tests y comparaciones administrativas
//
// toPublicContribution() NO debe generar slugs navegables propios.

import { normalizeSlug } from "./generator";

/**
 * Construye la cadena fuente que el servicio de identidad pública recibe como "title".
 *
 * Esta cadena es la que se pasa a registerIdentity() / updateTitle() para que el
 * servicio la normalice internamente mediante normalizeSlug(). No llamar a
 * normalizeSlug() sobre este valor antes de pasarlo al servicio, para evitar
 * doble transformación.
 *
 * Formato: "<publicTitle>-<catalogCode|contributionId>"
 */
export function buildContributionSlugSource(
  publicTitle: string,
  catalogCode: string | null,
  contributionId: string
): string {
  const titlePart = publicTitle.trim();
  const suffixPart = (catalogCode || contributionId).trim();
  return `${titlePart}-${suffixPart}`;
}

/**
 * Genera el slug canónico normalizado completo de una contribución.
 *
 * Usar este valor únicamente para comparaciones en scripts de diagnóstico,
 * pruebas locales o fallbacks de solo lectura. No usar para generar URLs
 * navegables sin verificar primero que exista el slug canónico en la base de datos.
 */
export function buildContributionCanonicalSlug(params: {
  publicTitle: string;
  catalogCode: string | null;
  contributionId: string;
}): string {
  const source = buildContributionSlugSource(
    params.publicTitle,
    params.catalogCode,
    params.contributionId
  );
  return normalizeSlug(source);
}
