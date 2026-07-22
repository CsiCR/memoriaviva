// Suite de Pruebas para SEO Avanzado y Descubrimiento del Portal (Etapa 4.2.3)
// Archivo: src/lib/public/tests/public-seo.test.ts

import * as crypto from "crypto";
import { buildBreadcrumbs } from "../seo/builders/breadcrumbs";
import { buildContributionStructuredData } from "../seo/builders/jsonld";
import { generateEnrichedPublicMetadata, generatePublicNotFoundMetadata } from "../seo/builders/metadata";
import { buildDynamicSitemap } from "../seo/publishers/sitemap";
import { buildRobotsDirectives } from "../seo/publishers/robots";
import { buildRssFeed } from "../seo/publishers/rss";
import { resolveOpenGraphImageUrl } from "../seo/og/image";
import { InMemoryPublicApiRepository } from "../api/repository";
import { PublicApiService } from "../api/service";
import { PublicIdentityService } from "../slugs/service";
import { InMemoryPublicIdentityRepository } from "../slugs/repository";
import { cleanContribution } from "./fixtures";
import { ContributionInput } from "../../editorial/types";
import { toPublicContribution } from "../mappers/to-public-contribution";

export async function runPublicSeoTests(assert: (cond: boolean, msg: string) => void) {
  console.log("-> [TESTS] Iniciando pruebas de SEO y Descubrimiento del Portal (v4.2.3)...");

  const originalSiteUrl = process.env.PUBLIC_SITE_URL;
  process.env.PUBLIC_SITE_URL = "https://memoriavivapicotruncado.org";

  const siteUrl = "https://memoriavivapicotruncado.org";

  const identityRepo = new InMemoryPublicIdentityRepository();
  const identityService = new PublicIdentityService(identityRepo);

  const apiRepo = new InMemoryPublicApiRepository();
  const apiService = new PublicApiService(apiRepo, identityService);

  // Registrar aportes de prueba
  const uuid1 = crypto.randomUUID();
  const uuid2 = crypto.randomUUID();
  const uuid3 = crypto.randomUUID();

  await identityService.registerIdentity(uuid1, "contribution", "Estacion de Tren", "published");
  await identityService.registerIdentity(uuid2, "contribution", "El Ferrocarril", "published");
  await identityService.registerIdentity(uuid3, "contribution", "Aporte Borrador", "draft");

  const c1: ContributionInput = {
    ...cleanContribution,
    id: uuid1,
    title: "Estacion de Tren",
    catalog_code: "MV-CON-101",
    description: "Una estacion antigua.",
    updated_at: "2026-07-22T02:00:00.000Z",
    published_at: "2026-07-22T02:00:00.000Z",
    files: [
      { id: crypto.randomUUID(), file_name: "estacion_galeria.jpg", file_size: 500, file_role: "gallery", processing_status: "completed" },
    ],
  } as unknown as ContributionInput;

  const c2: ContributionInput = {
    ...cleanContribution,
    id: uuid2,
    title: "El Ferrocarril",
    catalog_code: "MV-CON-102",
    description: "Un tren de vapor.",
    updated_at: "2026-07-22T03:00:00.000Z",
    published_at: "2026-07-22T03:00:00.000Z",
    files: [
      { id: crypto.randomUUID(), file_name: "portada.jpg", file_size: 1000, file_role: "cover", processing_status: "completed" },
      { id: crypto.randomUUID(), file_name: "tren_galeria.jpg", file_size: 500, file_role: "gallery", processing_status: "completed" },
    ],
  } as unknown as ContributionInput;

  const c3: ContributionInput = {
    ...cleanContribution,
    id: uuid3,
    title: "Aporte Borrador",
    catalog_code: "MV-CON-103",
    publication_status: { id: "pub-draft", code: "draft", name: "Borrador" },
  } as unknown as ContributionInput;

  apiRepo.contributions = [c1, c2, c3];

  // 1. Probar sitemap dinámico
  const sitemapEntries = await buildDynamicSitemap(apiService, siteUrl);
  // Debería tener 5 estáticas + 2 dinámicas (c1 y c2). c3 no debe aparecer por ser borrador.
  assert(sitemapEntries.length === 7, "Sitemap dinámico genera la cantidad correcta de entradas.");
  const contributionUrls = sitemapEntries.filter((e) => e.url.includes("/contributions/"));
  assert(contributionUrls.length === 2, "Sitemap incluye únicamente las URLs de aportes publicados.");
  assert(contributionUrls.some((e) => e.url.endsWith("/estacion-de-tren")), "Sitemap contiene el aporte c1.");
  assert(contributionUrls.every((e) => e.priority === 0.7 && e.changeFrequency === "weekly"), "Sitemap hereda las prioridades y frecuencias correctas.");

  // 2. Probar robots.txt
  const robotsDirectives = buildRobotsDirectives(siteUrl);
  assert(robotsDirectives.sitemap === "https://memoriavivapicotruncado.org/sitemap.xml", "Robots.txt contiene el Sitemap URL absoluto correcto.");
  const mainRule = robotsDirectives.rules[0];
  assert(mainRule.userAgent === "*", "Regla de robots aplica a todos los bots.");
  assert(mainRule.disallow?.includes("/admin") === true, "Robots desactiva indexación del panel de administración.");
  assert(mainRule.disallow?.includes("/api/") === true, "Robots desactiva indexación de rutas de API.");

  // 3. Probar Feed RSS con límite configurable
  const rssXml50 = await buildRssFeed(apiService, siteUrl, { limit: 50 });
  assert(rssXml50.includes("<rss version=\"2.0\""), "RSS genera XML con cabecera RSS 2.0.");
  assert(rssXml50.includes("<channel>"), "RSS contiene canal principal.");
  assert(rssXml50.includes("<title>Memoria Viva Pico Truncado</title>"), "RSS contiene título del canal.");
  assert(rssXml50.includes("<item>"), "RSS contiene elementos individuales.");
  assert(rssXml50.includes("<enclosure"), "RSS contiene enclosure para el aporte con imágenes.");

  // Probar límite configurable
  const rssXml1 = await buildRssFeed(apiService, siteUrl, { limit: 1 });
  const itemCount = (rssXml1.match(/<item>/g) || []).length;
  assert(itemCount === 1, "Feed RSS respeta el límite configurable de aportes.");

  // 4. Probar jerarquía de Open Graph Image (3 niveles)
  const mapped = apiRepo.contributions.map((c) => {
    try {
      return toPublicContribution(c);
    } catch {
      return null;
    }
  }).filter((item): item is ReturnType<typeof toPublicContribution> => item !== null);

  const pubC1 = mapped[0]; // Estacion de Tren (no tiene cover, tiene gallery)
  const pubC2 = mapped[1]; // El Ferrocarril (tiene cover y gallery)

  // Nivel 1: El Ferrocarril tiene cover, por lo que debe retornar la de cover.
  const ogUrlC2 = resolveOpenGraphImageUrl({ contribution: pubC2, siteUrl });
  assert(ogUrlC2 === `${siteUrl}${pubC2.media?.[0].publicUrl}`, "OG Image Nivel 1: Retorna la portada oficial.");

  // Nivel 2: Estacion de Tren no tiene cover pero tiene gallery, debe retornar la de gallery.
  const ogUrlC1 = resolveOpenGraphImageUrl({ contribution: pubC1, siteUrl });
  assert(ogUrlC1 === `${siteUrl}${pubC1.media?.[0].publicUrl}`, "OG Image Nivel 2: Retorna la fotografía de galería destacada ante falta de portada.");

  // Nivel 3: Aporte sin imágenes
  const pubC3WithoutFiles = { ...pubC1, media: [] };
  const ogUrlC3 = resolveOpenGraphImageUrl({ contribution: pubC3WithoutFiles, siteUrl });
  assert(ogUrlC3 === `${siteUrl}/contributions/${pubC3WithoutFiles.slug}/opengraph-image`, "OG Image Nivel 3: Retorna fallback a la ruta dinámica institucional.");

  // 5. SEO Snapshot Test
  const breadcrumbs = buildBreadcrumbs(pubC2.title);
  const structuredData = buildContributionStructuredData({
    version: 1,
    contribution: pubC2,
    breadcrumbs,
    siteUrl,
  });

  const meta = generateEnrichedPublicMetadata({ contribution: pubC2, siteUrl });

  // Validar Snapshot de metadatos de Next.js
  assert(meta.title === "El Ferrocarril — Memoria Viva Pico Truncado", "Snapshot: Título enriquecido correcto.");
  assert(meta.description === "Un tren de vapor.", "Snapshot: Descripción correcta.");
  assert(meta.alternates?.canonical === "https://memoriavivapicotruncado.org/contributions/el-ferrocarril-mv-con-102", "Snapshot: URL canónica consistente.");
  assert(meta.openGraph?.type === "article", "Snapshot: OG type es article.");
  assert(meta.openGraph?.locale === "es_AR", "Snapshot: OG locale es es_AR.");
  
  const ogImages = meta.openGraph?.images as { url: string }[] | undefined;
  assert(ogImages !== undefined && ogImages[0].url === `${siteUrl}${pubC2.media?.[0].publicUrl}`, "Snapshot: OG Image incluye la portada oficial.");
  assert(meta.twitter?.card === "summary_large_image", "Snapshot: Twitter card es summary_large_image.");

  // Validar JSON-LD
  assert(structuredData["@context"] === "https://schema.org", "Snapshot: Contexto JSON-LD correcto.");
  const graph = structuredData["@graph"];
  assert(graph.length === 3, "Snapshot: Grafo JSON-LD contiene exactamente 3 entidades.");

  const org = graph[0] as Record<string, unknown>;
  assert(org["@type"] === "Organization" && org.name === "Memoria Viva Pico Truncado", "Snapshot: Grafo contiene la Organización.");

  const crumbs = graph[1] as Record<string, unknown>;
  assert(crumbs["@type"] === "BreadcrumbList", "Snapshot: Grafo contiene la lista de migas de pan.");
  const itemList = crumbs.itemListElement as unknown[];
  assert(itemList.length === 4, "Snapshot: BreadcrumbList contiene 4 niveles jerárquicos.");

  const art = graph[2] as Record<string, unknown>;
  assert(art["@type"] === "Article", "Snapshot: Grafo contiene el Artículo.");
  assert(art.headline === "El Ferrocarril", "Snapshot: Headline del artículo es correcto.");
  
  const authors = art.author as Array<{ name: string }>;
  assert(authors[0].name === "Edith Gómez", "Snapshot: Nombre del autor del artículo es correcto.");
  
  const publisher = art.publisher as Record<string, unknown>;
  assert(publisher["@id"] === "https://memoriavivapicotruncado.org/#organization", "Snapshot: Publisher del artículo referencia la organización.");

  // Metadatos NotFound
  const meta404 = generatePublicNotFoundMetadata();
  assert(meta404.title === "Aporte no encontrado — Memoria Viva Pico Truncado", "NotFound: Título correcto.");
  const robots404 = meta404.robots as { index?: boolean; follow?: boolean } | null | undefined;
  assert(robots404 !== undefined && robots404?.index === false, "NotFound: No indexado.");

  process.env.PUBLIC_SITE_URL = originalSiteUrl;
  console.log("-> [TESTS] Pruebas de SEO y Descubrimiento del Portal completadas.");
}
