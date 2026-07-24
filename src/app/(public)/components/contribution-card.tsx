// Componente de Tarjeta de Aporte Desacoplada
// Archivo: src/app/(public)/components/contribution-card.tsx

import Link from "next/link";
import { Calendar, FileText, ChevronRight, Image as ImageIcon } from "lucide-react";
import { ContributionCardModel } from "@/lib/public/explore/types";

interface ContributionCardProps {
  contribution: ContributionCardModel;
}

export default function ContributionCard({ contribution }: ContributionCardProps) {
  const detailUrl = `/contributions/${contribution.slug}`;

  // Clamping description text to a safe length for cards
  const summary = contribution.description
    ? contribution.description.length > 120
      ? `${contribution.description.substring(0, 117)}...`
      : contribution.description
    : "Sin descripción disponible.";

  return (
    <article
      className="card museum-card-exhibit"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        border: "1px solid var(--border-warm)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        backgroundColor: "var(--white)",
        transition: "var(--transition-smooth)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      {/* Contenedor de Imagen de Portada / Fallback */}
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingTop: "60%", // Aspect ratio 5:3
          backgroundColor: "#e2e8f0",
          overflow: "hidden",
        }}
      >
        {contribution.imageUrl ? (
          <>
            {/* Fondo difuminado para relleno estético */}
            <img
              src={contribution.imageUrl}
              alt=""
              aria-hidden="true"
              style={{
                position: "absolute",
                top: "-10%",
                left: "-10%",
                width: "120%",
                height: "120%",
                objectFit: "cover",
                filter: "blur(12px) brightness(0.85)",
                opacity: 0.65,
              }}
            />
            {/* Imagen real auto-ajustada sin recortes */}
            <img
              src={contribution.imageUrl}
              alt={`Fotografía o archivo de: ${contribution.title}`}
              loading="lazy"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                zIndex: 1,
              }}
            />
          </>
        ) : (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              backgroundColor: "var(--neutral-grey-light)",
              gap: "0.5rem",
            }}
          >
            <ImageIcon size={36} strokeWidth={1.5} />
            <span style={{ fontSize: "0.8rem", fontWeight: 500 }}>Archivo Histórico</span>
          </div>
        )}

        {/* Insignia / Badge si existe */}
        {contribution.badge && (
          <span
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              padding: "0.3rem 0.75rem",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--white)",
              backgroundColor:
                contribution.badge.variant === "featured"
                  ? "var(--primary-blue)"
                  : contribution.badge.variant === "verified"
                  ? "var(--hope-green)"
                  : "#4b5563",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              zIndex: 2,
            }}
          >
            {contribution.badge.label}
          </span>
        )}
      </div>

      {/* Cuerpo de la Tarjeta */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem",
          flexGrow: 1,
        }}
      >
        {/* Metadatos Rápidos (Tags / Badges de Tipo y Fecha) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              backgroundColor: "var(--primary-blue-light)",
              color: "var(--primary-blue)",
              padding: "0.25rem 0.5rem",
              borderRadius: "4px",
            }}
          >
            <FileText size={12} />
            {contribution.contributionTypeLabel}
          </span>

          {contribution.historicalDateLabel && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                backgroundColor: "var(--hope-green-light)",
                color: "var(--hope-green)",
                padding: "0.25rem 0.5rem",
                borderRadius: "4px",
              }}
            >
              <Calendar size={12} />
              {contribution.historicalDateLabel}
            </span>
          )}
        </div>

        {/* Título de la Contribución */}
        <h3
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            marginBottom: "0.75rem",
            color: "#1a202c",
            lineHeight: 1.3,
          }}
        >
          <Link
            href={detailUrl}
            style={{ color: "inherit", textDecoration: "none" }}
            aria-label={`Ver historia de ${contribution.title}`}
          >
            {contribution.title}
          </Link>
        </h3>

        {/* Resumen */}
        <p
          style={{
            fontSize: "0.95rem",
            color: "var(--text-secondary)",
            lineHeight: 1.5,
            marginBottom: "1.5rem",
            flexGrow: 1,
          }}
        >
          {summary}
        </p>

        {/* Autoría y Botón de Acción */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "1rem",
            borderTop: "1px solid var(--border-warm)",
            marginTop: "auto",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Aportado por
            </span>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
              {contribution.authorName}
            </span>
          </div>

          <Link
            href={detailUrl}
            className="btn btn-outline btn-sm"
            style={{
              padding: "0.4rem 0.8rem",
              fontSize: "0.85rem",
              borderRadius: "6px",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
            aria-label={`Ver historia completa de ${contribution.title}`}
          >
            Ver historia <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
