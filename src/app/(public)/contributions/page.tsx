// Página Pública del Explorador de Memorias (Listado, Búsqueda y Filtros)
// Archivo: src/app/(public)/contributions/page.tsx

import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createContributionExplorerService } from "@/lib/public/explore/server";
import { exploreQueryParamsSchema } from "@/lib/public/explore/schemas";
import { ExploreQueryParams } from "@/lib/public/explore/types";

import SearchBox from "../components/search-box";
import FilterPanel from "../components/filter-panel";
import SearchResults from "../components/search-results";
import Pagination from "../components/pagination";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Configuración de Metadatos SEO con títulos dinámicos condicionales
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const q = typeof resolvedParams.q === "string" ? resolvedParams.q : "";
  const siteUrl = process.env.PUBLIC_SITE_URL || "https://memoriavivapicotruncado.org";

  const title = q
    ? `Resultados para "${q}" | Memoria Viva Pico Truncado`
    : `Archivo Histórico | Memoria Viva Pico Truncado`;

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

// Helper para construir JSON-LD estructurado de Búsqueda y Filtros
function buildSearchJsonLd(siteUrl: string, hasFilters: boolean) {
  const graph: Array<Record<string, unknown>> = [
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
  ];

  if (hasFilters) {
    const listElement = graph[1].itemListElement as Array<Record<string, unknown>>;
    listElement.push({
      "@type": "ListItem",
      "position": 3,
      "name": "Resultados de Búsqueda",
      "item": `${siteUrl}/contributions`,
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export default async function ContributionsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;

  // 1. Validar parámetros estrictamente con Zod
  const rawParams = {
    page: Number(resolvedParams.page || 1),
    pageSize: Number(resolvedParams.pageSize || 12),
    q: typeof resolvedParams.q === "string" && resolvedParams.q.trim() !== "" ? resolvedParams.q : undefined,
    type: typeof resolvedParams.type === "string" && resolvedParams.type.trim() !== "" ? resolvedParams.type : undefined,
    decade: typeof resolvedParams.decade === "string" && resolvedParams.decade.trim() !== "" ? resolvedParams.decade : undefined,
    institution: typeof resolvedParams.institution === "string" && resolvedParams.institution.trim() !== "" ? resolvedParams.institution : undefined,
    person: typeof resolvedParams.person === "string" && resolvedParams.person.trim() !== "" ? resolvedParams.person : undefined,
    place: typeof resolvedParams.place === "string" && resolvedParams.place.trim() !== "" ? resolvedParams.place : undefined,
    sort: typeof resolvedParams.sort === "string" && resolvedParams.sort.trim() !== "" ? resolvedParams.sort : "recent",
  };

  const parsed = exploreQueryParamsSchema.safeParse(rawParams);
  if (!parsed.success) {
    // Si falla la estructura, redirigimos a una consulta limpia
    redirect("/contributions?page=1&pageSize=12&sort=recent");
  }

  const query = parsed.data as ExploreQueryParams;

  // 2. Inicializar cliente y recuperar resultados
  const supabase = await createClient();
  const explorer = createContributionExplorerService(supabase);

  // Ejecutar búsqueda y obtener catálogo en paralelo
  const result = await explorer.search(query);

  const hasActiveFilters = Object.values(result.filters).some(
    (v) => v !== undefined && v !== ""
  );

  const siteUrl = process.env.PUBLIC_SITE_URL || "https://memoriavivapicotruncado.org";
  const jsonLd = buildSearchJsonLd(siteUrl, hasActiveFilters);

  const totalPages = Math.ceil(result.total / result.pageSize);

  return (
    <div
      data-analytics-event="pagination_changed"
      style={{ display: "flex", flexDirection: "column", width: "100%", padding: "2rem 0" }}
    >
      {/* Datos Estructurados JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container">
        {/* Breadcrumbs visuales dinámicos */}
        <nav aria-label="Breadcrumb" style={{ marginBottom: "1.5rem", fontSize: "0.85rem" }}>
          <ol style={{ listStyle: "none", display: "flex", gap: "0.5rem", padding: 0, margin: 0 }}>
            <li>
              <a href="/" style={{ color: "var(--text-muted)" }}>Inicio</a>
            </li>
            <li style={{ color: "var(--text-muted)" }}>/</li>
            <li>
              <a
                href="/contributions"
                style={{
                  color: hasActiveFilters ? "var(--text-muted)" : "var(--text-primary)",
                  fontWeight: hasActiveFilters ? 400 : 600,
                }}
              >
                Archivo de Memorias
              </a>
            </li>
            {hasActiveFilters && (
              <>
                <li style={{ color: "var(--text-muted)" }}>/</li>
                <li style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                  Resultados
                </li>
              </>
            )}
          </ol>
        </nav>

        {/* Encabezado descriptivo */}
        <div style={{ marginBottom: "2.5rem" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Explorador del Archivo
          </h1>
          <p style={{ color: "var(--text-secondary)", maxWidth: "800px", margin: 0, lineHeight: 1.5 }}>
            Recorra el patrimonio de Pico Truncado. Escriba un término general o filtre según la década histórica, institución involucrada, persona o tipo de aporte para descubrir los relatos de la comunidad.
          </p>
        </div>

        {/* Buscador SSR */}
        <SearchBox defaultValue={query.q} />

        {/* Panel de Filtros Dinámicos */}
        <FilterPanel
          availableFilters={result.availableFilters}
          appliedFilters={result.filters}
        />

        {/* Resultados del Listado */}
        <SearchResults
          items={result.items}
          total={result.total}
          sort={query.sort}
          filters={result.filters}
        />

        {/* Control de Paginación */}
        {result.total > 0 && (
          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            totalPages={totalPages}
            totalItems={result.total}
            searchParams={resolvedParams}
          />
        )}
      </div>
    </div>
  );
}
