// Página de Detalle Público de Aportes
// Archivo: src/app/(public)/contributions/[slug]/page.tsx

import { cache } from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { createAdminClient } from "@/utils/supabase/admin";
import { createUrlResolutionContainer } from "@/lib/public/url/server";
import {
  buildBreadcrumbs,
  buildContributionStructuredData,
  generateEnrichedPublicMetadata,
  generatePublicNotFoundMetadata,
} from "@/lib/public/seo";
import crypto from "crypto";
import { formatDateToAR } from "@/utils/date";
import { Music, Video, FileText, Download, Image as ImageIcon } from "lucide-react";

// Revalidación nativa de Next.js (SSG/ISR) cada 5 minutos
export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Función memoizada para compartir la carga de datos del aporte entre
 * generateMetadata() y el renderizado del componente de página en una misma petición.
 */
const getPublicContributionPageData = cache(async (slug: string) => {
  const startTime = Date.now();
  const supabase = createAdminClient();
  const container = createUrlResolutionContainer(supabase);
  const result = await container.pageService.resolvePageData(slug);
  const pageResolutionDurationMs = Date.now() - startTime;

  return {
    result,
    siteUrl: container.siteUrl,
    pageResolutionDurationMs,
  };
});

/**
 * Genera metadatos dinámicos y la etiqueta <link rel="canonical" href="..." /> en el HTML.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { result, siteUrl } = await getPublicContributionPageData(slug);

  if (result.kind !== "canonical") {
    return generatePublicNotFoundMetadata();
  }

  return generateEnrichedPublicMetadata({
    contribution: result.data,
    siteUrl,
  });
}

/**
 * Componente principal para el renderizado del aporte público.
 */
export default async function ContributionPage({ params }: PageProps) {
  const { slug } = await params;
  const requestId = crypto.randomUUID();

  const { result, pageResolutionDurationMs } = await getPublicContributionPageData(slug);

  // Registrar observabilidad de latencia
  console.log(`[OBSERVABILITY] requestId=${requestId} requestedSlug=${slug} kind=${result.kind} pageResolutionDurationMs=${pageResolutionDurationMs}ms`);

  if (result.kind !== "canonical") {
    notFound();
  }

  const contribution = result.data;
  const { siteUrl } = await getPublicContributionPageData(slug);
  const breadcrumbs = buildBreadcrumbs(contribution.title);
  const structuredData = buildContributionStructuredData({
    version: 1,
    contribution,
    breadcrumbs,
    siteUrl,
  });

  return (
    <div className="container section" style={{ maxWidth: "800px", padding: "2rem 1rem" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Migas de Pan (Breadcrumbs) Visuales */}
      <nav aria-label="Breadcrumb" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        {breadcrumbs.map((item, idx) => (
          <span key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {idx > 0 && <span style={{ color: 'var(--text-muted)' }}>&gt;</span>}
            {item.url ? (
              <a href={item.url} style={{ color: 'var(--primary-blue)', textDecoration: 'none', fontWeight: 500 }}>
                {item.name}
              </a>
            ) : (
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.name}</span>
            )}
          </span>
        ))}
      </nav>

      <article className="card" style={{ padding: "2.5rem", border: "1px solid var(--border-warm)", borderRadius: "12px", backgroundColor: "#FAFAF5" }}>
        <header style={{ marginBottom: "2rem" }}>
          <span style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-secondary)", fontWeight: 600 }}>
            Aporte Público ({contribution.contentType})
          </span>
          <h1 style={{ fontSize: "2.5rem", marginTop: "0.5rem", marginBottom: "1rem", lineHeight: "1.2", color: "var(--text-main)" }}>
            {contribution.title}
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            {contribution.historicalDate?.displayLabel && (
              <span>📅 {contribution.historicalDate.displayLabel}</span>
            )}
            {contribution.catalogCode && (
              <span>🏷️ Código: {contribution.catalogCode}</span>
            )}
          </div>
        </header>

        {contribution.description && (
          <section style={{ marginBottom: "2.5rem" }}>
            <p style={{ fontSize: "1.15rem", lineHeight: "1.7", color: "var(--text-main)", whiteSpace: "pre-line" }}>
              {contribution.description}
            </p>
          </section>
        )}

        {contribution.historicalContext && (
          <section style={{ marginBottom: "2.5rem", padding: "1.5rem", borderLeft: "4px solid var(--primary-blue)", backgroundColor: "rgba(30, 64, 175, 0.02)", borderRadius: "0 8px 8px 0" }}>
            <h3 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.1rem", color: "var(--text-main)" }}>Contexto Histórico</h3>
            <p style={{ margin: 0, fontSize: "1rem", lineHeight: "1.6", color: "var(--text-secondary)" }}>
              {contribution.historicalContext}
            </p>
          </section>
        )}

        {/* Referencias y Menciones */}
        {(contribution.relatedPlace || contribution.mentionedPeople.length > 0 || contribution.mentionedInstitutions.length > 0) && (
          <section style={{ marginBottom: "2.5rem", borderTop: "1px solid var(--border-warm)", paddingTop: "1.5rem" }}>
            <h3 style={{ marginBottom: "1rem", fontSize: "1.2rem", color: "var(--text-main)" }}>Referencias de Catalogación</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "1rem", color: "var(--text-main)" }}>
              {contribution.relatedPlace && (
                <div>
                  <strong>📍 Lugar asociado:</strong> {contribution.relatedPlace.name}
                </div>
              )}
              {contribution.mentionedPeople.length > 0 && (
                <div>
                  <strong>👥 Personas mencionadas:</strong> {contribution.mentionedPeople.map(p => p.displayName).join(", ")}
                </div>
              )}
              {contribution.mentionedInstitutions.length > 0 && (
                <div>
                  <strong>🏛️ Instituciones asociadas:</strong> {contribution.mentionedInstitutions.map(i => i.name).join(", ")}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Galería Multimedia */}
        {contribution.media && contribution.media.length > 0 && (
          <section style={{ marginBottom: "2.5rem", borderTop: "1px solid var(--border-warm)", paddingTop: "1.5rem" }}>
            <h3 style={{ marginBottom: "1.5rem", fontSize: "1.3rem", color: "var(--text-main)" }}>Material Histórico y Archivos</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "2.25rem" }}>
              {contribution.media.map((file) => (
                <div key={file.id} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {file.mediaType === "image" && (
                    <>
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: "var(--primary-blue)",
                        backgroundColor: "rgba(30, 64, 175, 0.06)",
                        padding: "0.3rem 0.6rem",
                        borderRadius: "6px",
                        alignSelf: "flex-start",
                        marginBottom: "0.25rem"
                      }}>
                        <ImageIcon size={14} /> Fotografía Histórica
                      </div>
                      <div style={{ position: "relative", overflow: "hidden", borderRadius: "8px", border: "1px solid var(--border-warm)" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={file.publicUrl}
                          alt={file.altText || file.title || "Fotografía del aporte"}
                          style={{ width: "100%", height: "auto", display: "block" }}
                        />
                      </div>
                    </>
                  )}

                  {file.mediaType === "audio" && (
                    <>
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: "var(--primary-blue)",
                        backgroundColor: "rgba(30, 64, 175, 0.06)",
                        padding: "0.3rem 0.6rem",
                        borderRadius: "6px",
                        alignSelf: "flex-start",
                        marginBottom: "0.25rem"
                      }}>
                        <Music size={14} /> Testimonio de Audio
                      </div>
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                        padding: "1.25rem",
                        backgroundColor: "#F4F4EA",
                        border: "1px solid var(--border-warm)",
                        borderRadius: "8px",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--text-main)" }}>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            backgroundColor: "rgba(30, 64, 175, 0.08)",
                            color: "var(--primary-blue)"
                          }}>
                            <Music size={20} />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>Archivo de Audio</span>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Grabación de audio / testimonio oral</span>
                          </div>
                        </div>
                        <audio controls src={file.publicUrl} style={{ width: "100%", marginTop: "0.5rem" }}>
                          Tu navegador no soporta el elemento de audio.
                        </audio>
                      </div>
                    </>
                  )}

                  {file.mediaType === "video" && (
                    <>
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: "var(--primary-blue)",
                        backgroundColor: "rgba(30, 64, 175, 0.06)",
                        padding: "0.3rem 0.6rem",
                        borderRadius: "6px",
                        alignSelf: "flex-start",
                        marginBottom: "0.25rem"
                      }}>
                        <Video size={14} /> Filmación Histórica
                      </div>
                      <div style={{
                        position: "relative",
                        overflow: "hidden",
                        borderRadius: "8px",
                        border: "1px solid var(--border-warm)",
                        backgroundColor: "#000",
                        maxHeight: "450px"
                      }}>
                        <video
                          controls
                          src={file.publicUrl}
                          style={{ width: "100%", height: "auto", display: "block", maxHeight: "450px" }}
                        >
                          Tu navegador no soporta el elemento de video.
                        </video>
                      </div>
                    </>
                  )}

                  {file.mediaType === "document" && (
                    <>
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: "var(--primary-blue)",
                        backgroundColor: "rgba(30, 64, 175, 0.06)",
                        padding: "0.3rem 0.6rem",
                        borderRadius: "6px",
                        alignSelf: "flex-start",
                        marginBottom: "0.25rem"
                      }}>
                        <FileText size={14} /> Documento Histórico
                      </div>
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                        padding: "1.25rem",
                        backgroundColor: "#F4F4EA",
                        border: "1px solid var(--border-warm)",
                        borderRadius: "8px",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--text-main)" }}>
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "40px",
                              height: "40px",
                              borderRadius: "50%",
                              backgroundColor: "rgba(30, 64, 175, 0.08)",
                              color: "var(--primary-blue)"
                            }}>
                              <FileText size={20} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>Documento Adjunto</span>
                              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                {file.downloadSizeBytes
                                  ? `Archivo PDF / Documento (${(file.downloadSizeBytes / 1024 / 1024).toFixed(2)} MB)`
                                  : "Archivo PDF / Documento"}
                              </span>
                            </div>
                          </div>
                          <a
                            href={file.publicUrl}
                            download={file.title || "documento"}
                            style={{
                              padding: "0.4rem 0.8rem",
                              fontSize: "0.85rem",
                              borderRadius: "6px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              textDecoration: "none",
                              color: "var(--primary-blue)",
                              border: "1px solid var(--primary-blue)",
                              backgroundColor: "transparent",
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                          >
                            <Download size={14} /> Descargar documento
                          </a>
                        </div>
                      </div>
                    </>
                  )}

                  {file.title && <strong style={{ fontSize: "1.05rem", color: "var(--text-main)" }}>{file.title}</strong>}
                  {file.caption && <span style={{ fontSize: "0.95rem", color: "var(--text-secondary)", fontStyle: "italic" }}>{file.caption}</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Créditos y Fechas */}
        {contribution.credits && (
          <footer style={{ borderTop: "1px solid var(--border-warm)", paddingTop: "1.5rem", fontSize: "0.9rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <div>Aporte registrado para la comunidad por: <strong>{contribution.credits.displayName}</strong></div>
            <div>Fecha de publicación: {formatDateToAR(contribution.publishedAt)}</div>
          </footer>
        )}
      </article>
    </div>
  );
}
