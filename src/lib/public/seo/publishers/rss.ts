// Publicador del Feed RSS (feed.xml)
// Archivo: src/lib/public/seo/publishers/rss.ts

import { PublicApiService } from "../../api/service";

export interface RssFeedOptions {
  limit?: number;
}

/**
 * Genera el XML del Feed RSS 2.0 con los aportes más recientes.
 * Incluye campos enriquecidos (author, guid, categories, enclosure).
 */
export async function buildRssFeed(
  apiService: PublicApiService,
  siteUrl: string,
  options: RssFeedOptions = {}
): Promise<string> {
  const limit = options.limit ?? 50;

  // Obtener los aportes más recientes aplicando el límite
  const { items } = await apiService.listContributions({
    page: 1,
    pageSize: limit,
    sort: "recent",
    direction: "desc",
  });

  const nowString = new Date().toUTCString();

  let itemsXml = "";
  for (const item of items) {
    const itemUrl = `${siteUrl}/contributions/${item.slug}`;
    const pubDate = new Date(item.publishedAt).toUTCString();
    const author = item.credits?.displayName || "Vecino Pionero";
    const category = item.contentType || "documentary";

    // Generar etiqueta enclosure si dispone de archivos adjuntos
    let enclosureXml = "";
    if (item.media && item.media.length > 0) {
      const firstMedia = item.media[0];
      const absoluteMediaUrl = firstMedia.publicUrl.startsWith("http")
        ? firstMedia.publicUrl
        : `${siteUrl}${firstMedia.publicUrl}`;

      const length = 0; // Fallback ante tamaño no expuesto en contrato público
      const type = firstMedia.mimeType || "image/jpeg";
      enclosureXml = `\n      <enclosure url="${escapeXml(absoluteMediaUrl)}" length="${length}" type="${escapeXml(type)}" />`;
    }

    itemsXml += `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(itemUrl)}</link>
      <guid isPermaLink="true">${escapeXml(itemUrl)}</guid>
      <description>${escapeXml(item.description || "")}</description>
      <pubDate>${pubDate}</pubDate>
      <author>${escapeXml(author)}</author>
      <category>${escapeXml(category)}</category>${enclosureXml}
    </item>`;
  }

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Memoria Viva Pico Truncado</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>Archivo Histórico Comunitario de Pico Truncado</description>
    <language>es-AR</language>
    <pubDate>${nowString}</pubDate>
    <lastBuildDate>${nowString}</lastBuildDate>
    <atom:link href="${escapeXml(siteUrl)}/feed.xml" rel="self" type="application/rss+xml" />${itemsXml}
  </channel>
</rss>`;
}

/**
 * Escapa caracteres especiales incompatibles con XML.
 */
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}
