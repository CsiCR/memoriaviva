// Generación Dinámica de Imagen Open Graph (Nivel 3)
// Archivo: src/app/(public)/contributions/[slug]/opengraph-image.tsx

import { ImageResponse } from 'next/og';
import { createAdminClient } from "@/utils/supabase/admin";
import { createSeoContainer } from "@/lib/public/seo/server";

export const runtime = 'nodejs';
export const alt = 'Archivo Histórico Comunitario Pico Truncado';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let title = "Memoria Viva";
  let subtitle = "Pico Truncado";

  try {
    const supabase = createAdminClient();
    const container = createSeoContainer(supabase);
    const result = await container.apiService.getContributionBySlug(slug);

    if (result) {
      title = result.data.title;
      subtitle = result.data.contentType === "textual" ? "Documento Histórico" : "Aporte Comunitario";
    }
  } catch (error) {
    console.error("Error al obtener datos para opengraph-image:", error);
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FAFAF5', // --warm-white
          border: '24px solid #1588e6', // --primary-blue
          padding: '60px',
        }}
      >
        {/* Cabecera de la Marca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
          <span style={{ fontSize: 32, fontWeight: 700, color: '#1588e6', textTransform: 'uppercase', letterSpacing: '4px' }}>
            Memoria Viva
          </span>
          <span style={{ fontSize: 32, color: '#5A5A5A' }}>|</span>
          <span style={{ fontSize: 24, color: '#5A5A5A', letterSpacing: '2px', fontWeight: 600 }}>PICO TRUNCADO</span>
        </div>

        {/* Título Principal */}
        <div
          style={{
            fontSize: 60,
            fontWeight: 800,
            color: '#2d3748', // --text-primary
            textAlign: 'center',
            lineHeight: 1.3,
            maxHeight: '240px',
            overflow: 'hidden',
            marginBottom: '35px',
            padding: '0 40px',
          }}
        >
          {title}
        </div>

        {/* Subtítulo / Categoría */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#1588e6',
            backgroundColor: '#eef7ff',
            padding: '12px 30px',
            borderRadius: '30px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
          }}
        >
          {subtitle}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
