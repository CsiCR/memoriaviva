// Página de Inicio Pública (Home)
// Archivo: src/app/(public)/page.tsx

import { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { createHomeService } from "@/lib/public/explore/server";
import { generateHomeMetadata, buildHomeJsonLd } from "@/lib/public/explore/seo";

import Hero from "./components/hero";
import SearchBox from "./components/search-box";
import Stats from "./components/stats";
import FeaturedContributions from "./components/featured-contributions";
import RecentContributions from "./components/recent-contributions";
import CTA from "./components/cta";

// Configuración de Metadatos SEO dinámicos
export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.PUBLIC_SITE_URL || "https://memoriavivapicotruncado.org";
  return generateHomeMetadata(siteUrl);
}

export default async function Home() {
  // 1. Inicializar cliente y servicios en el servidor
  const supabase = await createClient();
  const homeService = createHomeService(supabase);

  // 2. Cargar datos consolidados en paralelo
  const homeData = await homeService.load();

  const siteUrl = process.env.PUBLIC_SITE_URL || "https://memoriavivapicotruncado.org";
  const jsonLd = buildHomeJsonLd(siteUrl);

  return (
    <div
      data-analytics-event="home_view"
      style={{ display: "flex", flexDirection: "column", width: "100%" }}
    >
      {/* Datos Estructurados JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Principal */}
      <div data-analytics-event="home_loaded">
        <Hero title={homeData.hero.title} subtitle={homeData.hero.subtitle} />
      </div>

      {/* Buscador Rápido */}
      <div data-analytics-event="search_started">
        <SearchBox />
      </div>

      {/* Estadísticas */}
      <div data-analytics-event="stats_viewed">
        <Stats stats={homeData.stats} />
      </div>

      {/* Aportes Destacados */}
      <div data-analytics-event="featured_viewed">
        <FeaturedContributions contributions={homeData.featured} />
      </div>

      {/* Aportes Recientes */}
      <div data-analytics-event="recent_viewed">
        <RecentContributions contributions={homeData.recent} />
      </div>

      {/* Espacio reservado para futura línea de tiempo y colecciones */}
      {/*
        <div data-analytics-event="timeline_viewed">
          <Timeline contributions={homeData.future?.timeline} />
        </div>
      */}

      {/* CTA Emocional de Invitación */}
      <div data-analytics-event="cta_click">
        <CTA />
      </div>
    </div>
  );
}
