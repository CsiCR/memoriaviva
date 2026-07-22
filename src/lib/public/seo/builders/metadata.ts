// Generador de Metadatos Enriquecidos de Next.js
// Archivo: src/lib/public/seo/builders/metadata.ts

import { clientEnv } from "@/lib/config/env";
import { Metadata } from "next";
import { PublicContribution } from "../../types/contribution";
import { buildPublicCanonicalUrl } from "../../url/canonical-url";
import { resolveOpenGraphImageUrl } from "../og/image";

/**
 * Genera metadatos dinámicos enriquecidos de SEO, Open Graph y Twitter Cards.
 */
export function generateEnrichedPublicMetadata({
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

  const title = `${contribution.title} — Memoria Viva Pico Truncado`;
  const description = contribution.description || "Aporte histórico de la comunidad de Pico Truncado.";
  const ogImageUrl = resolveOpenGraphImageUrl({ contribution, siteUrl });

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
      locale: "es_AR",
      siteName: "Memoria Viva Pico Truncado",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: contribution.title,
        },
      ],
      publishedTime: contribution.publishedAt,
      modifiedTime: contribution.updatedAt || contribution.publishedAt,
      authors: [contribution.credits?.displayName || "Vecino Colaborador"],
      section: "Historia Local",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

/**
 * Metadatos de error (404, conflictos) no indexables.
 */
export function generatePublicNotFoundMetadata(): Metadata {
  return {
    title: "Aporte no encontrado — Memoria Viva Pico Truncado",
    robots: {
      index: false,
      follow: false,
    },
  };
}
