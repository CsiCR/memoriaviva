// Contratos y Tipos para SEO Avanzado y Descubrimiento del Portal (Etapa 4.2.3)
// Archivo: src/lib/public/seo/types.ts

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface SitemapEntry {
  url: string;
  lastModified: string;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
}

export interface JsonLdOrganization {
  "@type": "Organization";
  name: string;
  url: string;
  logo?: string;
}

export interface JsonLdListItem {
  "@type": "ListItem";
  position: number;
  name: string;
  item: string;
}

export interface JsonLdBreadcrumbList {
  "@type": "BreadcrumbList";
  itemListElement: JsonLdListItem[];
}

export interface JsonLdArticle {
  "@type": "Article" | "CreativeWork";
  headline: string;
  description: string;
  image?: string[];
  datePublished: string;
  dateModified: string;
  author: {
    "@type": "Person" | "Organization";
    name: string;
  }[];
  publisher: JsonLdOrganization;
  mainEntityOfPage: string;
}

export interface JsonLdGraph {
  "@context": "https://schema.org";
  "@graph": unknown[];
}
