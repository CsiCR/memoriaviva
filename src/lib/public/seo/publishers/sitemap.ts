// Publicador Dinámico del Sitemap (sitemap.xml)
// Archivo: src/lib/public/seo/publishers/sitemap.ts

import { PublicApiService } from "../../api/service";
import { SitemapEntry } from "../types";

/**
 * Compila el listado completo de URLs canónicas del portal.
 * Integra las páginas estáticas del portal con los aportes históricos públicos de la base de datos.
 */
export async function buildDynamicSitemap(
  apiService: PublicApiService,
  siteUrl: string
): Promise<SitemapEntry[]> {
  const now = new Date().toISOString();

  // 1. Rutas Estáticas Principales del Portal
  const staticRoutes: SitemapEntry[] = [
    {
      url: `${siteUrl}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/proyecto`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/aportar`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/quiero-formar-parte`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/privacidad`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // 2. Rutas Dinámicas de Aportes Públicos (Consulta Optimizada)
  const dbEntries = await apiService.getPublicSitemapEntries();

  const dynamicRoutes: SitemapEntry[] = dbEntries.map((entry) => ({
    url: `${siteUrl}/contributions/${entry.slug}`,
    lastModified: entry.updatedAt,
    changeFrequency: entry.changeFrequency || "weekly",
    priority: entry.priority || 0.7,
  }));

  return [...staticRoutes, ...dynamicRoutes];
}
