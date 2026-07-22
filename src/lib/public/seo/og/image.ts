// Lógica de Selección y Resolución de Imágenes Open Graph (3 Niveles)
// Archivo: src/lib/public/seo/og/image.ts

import { PublicContribution } from "../../types/contribution";

/**
 * Resuelve la URL absoluta de la imagen para Open Graph y Twitter Cards.
 * Aplica la jerarquía de 3 niveles:
 * 1. Portada oficial (rol cover, tipo image).
 * 2. Primer archivo fotográfico de galería (tipo image).
 * 3. Imagen dinámica institucional (/contributions/[slug]/opengraph-image).
 */
export function resolveOpenGraphImageUrl({
  contribution,
  siteUrl,
}: {
  contribution: PublicContribution;
  siteUrl: string;
}): string {
  // Nivel 1: Portada Oficial (role: 'cover')
  const coverMedia = contribution.media?.find(
    (m) => m.role === "cover" && m.mediaType === "image"
  );
  if (coverMedia) {
    return `${siteUrl}${coverMedia.publicUrl}`;
  }

  // Nivel 2: Fotografía Histórica Destacada (primera imagen de galería disponible)
  const galleryMedia = contribution.media?.find(
    (m) => m.mediaType === "image"
  );
  if (galleryMedia) {
    return `${siteUrl}${galleryMedia.publicUrl}`;
  }

  // Nivel 3: Imagen Dinámica Institucional de Next.js
  return `${siteUrl}/contributions/${contribution.slug}/opengraph-image`;
}
