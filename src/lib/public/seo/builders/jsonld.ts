// Generador Consolidado de Datos Estructurados JSON-LD (Schema.org)
// Archivo: src/lib/public/seo/builders/jsonld.ts

import { JsonLdGraph } from "../types";
import { PublicContribution } from "../../types/contribution";
import { BreadcrumbItem } from "../types";

export interface StructuredDataOptions {
  version: 1;
  contribution: PublicContribution;
  breadcrumbs: BreadcrumbItem[];
  siteUrl: string;
}

/**
 * Construye el grafo JSON-LD consolidador para un aporte público.
 * Cumple con los esquemas Organization, BreadcrumbList y Article/CreativeWork.
 */
export function buildContributionStructuredData(options: StructuredDataOptions): JsonLdGraph {
  const { contribution, breadcrumbs, siteUrl } = options;

  const contributionUrl = `${siteUrl}/contributions/${contribution.slug}`;

  // Buscar imágenes válidas para Open Graph/Structured Data
  const imageUrls = (contribution.media || [])
    .filter((m) => m.mediaType === "image")
    .map((m) => `${siteUrl}${m.publicUrl}`);

  // 1. Esquema de la Organización
  const organizationSchema = {
    "@type": "Organization" as const,
    "@id": `${siteUrl}/#organization`,
    "name": "Memoria Viva Pico Truncado",
    "url": siteUrl,
    "logo": {
      "@type": "ImageObject" as const,
      "url": `${siteUrl}/icon-192.png`,
    },
  };

  // 2. Esquema de Migas de Pan (Breadcrumbs)
  const breadcrumbSchema = {
    "@type": "BreadcrumbList" as const,
    "@id": `${contributionUrl}/#breadcrumb`,
    "itemListElement": breadcrumbs.map((item, index) => ({
      "@type": "ListItem" as const,
      "position": index + 1,
      "name": item.name,
      "item": item.url ? `${siteUrl}${item.url}` : contributionUrl,
    })),
  };

  // 3. Esquema del Artículo / Obra Creativa
  // Mapear el tipo de contenido publico a una entidad adecuada
  const articleSchema = {
    "@type": contribution.contentType === "textual" ? ("Article" as const) : ("CreativeWork" as const),
    "@id": `${contributionUrl}/#article`,
    "headline": contribution.title,
    "description": contribution.description || "Aporte histórico de la comunidad de Pico Truncado.",
    "mainEntityOfPage": contributionUrl,
    "datePublished": contribution.publishedAt,
    "dateModified": contribution.updatedAt || contribution.publishedAt,
    "author": [
      {
        "@type": "Person" as const,
        "name": contribution.credits?.displayName || "Vecino Pionero",
      },
    ],
    "publisher": {
      "@type": "Organization" as const,
      "@id": `${siteUrl}/#organization`,
    },
    "image": imageUrls.length > 0 ? imageUrls : undefined,
  };

  return {
    "@context": "https://schema.org",
    "@graph": [organizationSchema, breadcrumbSchema, articleSchema],
  };
}
