// Página de Inicio Pública (Home - Portal Memoria Viva)
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
import NarrativeSection from "./components/narrative-section";

// Configuración de Metadatos SEO dinámicos (Sin alterar contratos existentes)
export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.PUBLIC_SITE_URL || "https://memoriavivapicotruncado.org";
  return generateHomeMetadata(siteUrl);
}

export default async function Home() {
  // 1. Inicializar cliente y servicios en el servidor (Lógica intacta)
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

      {/* 1. Hero Principal: ¿Qué es Memoria Viva? (Emoción / Impacto) */}
      <div data-analytics-event="home_loaded">
        <Hero title={homeData.hero.title} subtitle={homeData.hero.subtitle} />
      </div>

      {/* 2. Sección de Conexión: Cada recuerdo importa */}
      <NarrativeSection
        title="Cada recuerdo cuenta una parte de nuestra historia."
        subtitle="Fotografías. Relatos. Documentos. Videos. Objetos. Cada aporte ayuda a reconstruir la memoria colectiva de Pico Truncado."
        ariaLabel="El valor de la memoria colectiva"
        backgroundColor="var(--white)"
        borderBottom={true}
        padding="3.5rem 0 5rem 0"
      />

      {/* 3. Sección de Contenidos: ¿Qué podés encontrar? */}
      <NarrativeSection
        title="¿Qué podés encontrar?"
        ariaLabel="Tipos de registros en el archivo"
        backgroundColor="var(--neutral-grey-light)"
        borderBottom={true}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            flexWrap: "wrap",
            gap: "2rem",
            width: "100%",
            padding: "1rem 0",
          }}
        >
          {[
            { emoji: "📷", label: "Fotografías" },
            { emoji: "📄", label: "Documentos" },
            { emoji: "🎙", label: "Relatos" },
            { emoji: "🎥", label: "Videos" },
            { emoji: "🗺", label: "Lugares" },
          ].map((item, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1rem",
                minWidth: "140px",
                padding: "1.75rem",
                borderRadius: "var(--radius-lg)",
                backgroundColor: "var(--white)",
                boxShadow: "var(--shadow-sm)",
                border: "1px solid var(--border-warm)",
              }}
            >
              <span style={{ fontSize: "3rem" }} role="img" aria-label={item.label}>
                {item.emoji}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-headings)",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  fontSize: "1rem",
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "3.5rem", textAlign: "center" }}>
          <blockquote
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: "1.45rem",
              color: "var(--text-secondary)",
              maxWidth: "650px",
              margin: "0 auto",
              lineHeight: 1.4,
              border: "none",
              padding: 0,
            }}
          >
            “Cada fotografía guarda una historia que merece ser contada.”
          </blockquote>
        </div>
      </NarrativeSection>

      {/* 4. Buscador Rápido: Explorar el Archivo */}
      <div data-analytics-event="search_started">
        <NarrativeSection
          title="Explorá el Archivo Histórico"
          subtitle="Buscá personas, lugares, instituciones, fechas o acontecimientos."
          ariaLabel="Búsqueda en el archivo público"
          backgroundColor="var(--white)"
          borderBottom={true}
        >
          <SearchBox />
        </NarrativeSection>
      </div>

      {/* 5. Estadísticas: Nuestra memoria compartida (Métricas en cifras) */}
      <div data-analytics-event="stats_viewed">
        <Stats stats={homeData.stats} />
      </div>

      {/* 6. Aportes Históricos (Historias de la Comunidad) */}
      <div data-analytics-event="featured_viewed">
        <FeaturedContributions contributions={homeData.featured} />
      </div>

      {/* 7. Aportes Recientes (Últimos Aportes) */}
      <div data-analytics-event="recent_viewed">
        <RecentContributions contributions={homeData.recent} />
      </div>

      {/* 8. CTA Emocional de Invitación (La historia continúa) */}
      <div data-analytics-event="cta_click">
        <CTA />
      </div>

      {/* 9. Footer Emocional */}
      <div
        style={{
          backgroundColor: "#111827",
          color: "var(--warm-white)",
          padding: "3.5rem 1.5rem",
          textAlign: "center",
          borderBottom: "1px solid #1f2937",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: "1.35rem",
            color: "var(--warm-white)",
            maxWidth: "800px",
            margin: "0 auto",
            lineHeight: 1.5,
          }}
        >
          “La memoria de una ciudad no pertenece al pasado. Pertenece a quienes deciden conservarla.”
        </p>
      </div>
    </div>
  );
}
