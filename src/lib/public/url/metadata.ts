// Generador de Metadatos de Next.js
// Archivo: src/lib/public/url/metadata.ts

import { clientEnv } from "@/lib/config/env";
import { Metadata } from "next";
import { PublicContribution } from "../types/contribution";
import { buildPublicCanonicalUrl } from "./canonical-url";

/**
 * Construye el objeto de metadatos SEO oficial para un aporte canónico.
 */
export function generatePublicMetadata({
  contribution,
  siteUrl,
}: {
  contribution: PublicContribution;
  siteUrl: string;
}): Metadata {
  const canonicalUrl = buildPublicCanonicalUrl({
    entityType: "contribution",
    canonicalSlug: contribution.slug,
  });

  const title = contribution.title;
  // Fallback seguro ante descripción vacía
  const description = contribution.description || "Aporte histórico de la comunidad de Pico Truncado.";

  // Buscar imagen pública de portada (cover)
  const coverMedia = contribution.media?.find(
    (m) => m.role === "cover" && m.mediaType === "image"
  );
  const imageUrl = coverMedia ? `${siteUrl}${coverMedia.publicUrl}` : undefined;

  const isStaging = clientEnv.NEXT_PUBLIC_APP_ENV === "staging";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: !isStaging,
      follow: !isStaging,
    },

    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "article",
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

/**
 * Metadatos para recursos no indexables (404/not_found, conflictos).
 */
export function generateNotFoundMetadata(): Metadata {
  return {
    robots: {
      index: false,
      follow: false,
    },
  };
}
