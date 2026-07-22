// Generadores de Metadatos y JSON-LD para Home y Listado de Contribuciones
// Archivo: src/lib/public/explore/seo.ts

import { Metadata } from "next";

/**
 * Genera los metadatos de SEO para la Home Pública del Portal.
 */
export function generateHomeMetadata(siteUrl: string): Metadata {
  const title = "Memoria Viva Pico Truncado — Archivo Histórico Digital Comunitario";
  const description =
    "Archivo Histórico Digital Comunitario impulsado por la Unión Vecinal Barrio YPF. Preservamos testimonios, fotografías y documentos de Pico Truncado.";
  const ogImageUrl = `${siteUrl}/icon-192.png`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/`,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/`,
      type: "website",
      locale: "es_AR",
      siteName: "Memoria Viva Pico Truncado",
      images: [
        {
          url: ogImageUrl,
          width: 192,
          height: 192,
          alt: "Memoria Viva Pico Truncado",
        },
      ],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

/**
 * Genera los metadatos de SEO para el Listado de Contribuciones.
 */
export function generateContributionsMetadata(siteUrl: string): Metadata {
  const title = "Archivo de Memorias — Memoria Viva Pico Truncado";
  const description =
    "Explore el archivo histórico digital de Pico Truncado: testimonios, fotografías, documentos e historias de nuestra comunidad.";
  const ogImageUrl = `${siteUrl}/icon-192.png`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/contributions`,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/contributions`,
      type: "website",
      locale: "es_AR",
      siteName: "Memoria Viva Pico Truncado",
      images: [
        {
          url: ogImageUrl,
          width: 192,
          height: 192,
          alt: "Archivo de Memorias",
        },
      ],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

/**
 * Construye el grafo JSON-LD para la Home Pública.
 */
export function buildHomeJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        "name": "Memoria Viva Pico Truncado",
        "url": siteUrl,
        "logo": {
          "@type": "ImageObject",
          "url": `${siteUrl}/icon-192.png`,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        "name": "Memoria Viva Pico Truncado",
        "url": siteUrl,
        "publisher": {
          "@type": "Organization",
          "@id": `${siteUrl}/#organization`,
        },
      },
    ],
  };
}

/**
 * Construye el grafo JSON-LD para el Listado de Contribuciones.
 */
export function buildContributionsJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        "name": "Memoria Viva Pico Truncado",
        "url": siteUrl,
        "logo": {
          "@type": "ImageObject",
          "url": `${siteUrl}/icon-192.png`,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${siteUrl}/contributions/#breadcrumb`,
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Inicio",
            "item": siteUrl,
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Archivo de Memorias",
            "item": `${siteUrl}/contributions`,
          },
        ],
      },
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/contributions/#webpage`,
        "name": "Archivo de Memorias — Memoria Viva Pico Truncado",
        "url": `${siteUrl}/contributions`,
        "publisher": {
          "@type": "Organization",
          "@id": `${siteUrl}/#organization`,
        },
      },
    ],
  };
}
