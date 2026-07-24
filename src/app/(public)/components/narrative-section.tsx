// Componente Reutilizable de Sección Narrativa (Etapa 3)
// Archivo: src/app/(public)/components/narrative-section.tsx

import React from "react";

interface NarrativeSectionProps {
  id?: string;
  title: string;
  subtitle?: string | React.ReactNode;
  ariaLabel: string;
  backgroundColor?: string;
  borderBottom?: boolean;
  borderTop?: boolean;
  align?: "center" | "left";
  children?: React.ReactNode;
  padding?: string;
}

export default function NarrativeSection({
  id,
  title,
  subtitle,
  ariaLabel,
  backgroundColor = "var(--white)",
  borderBottom = false,
  borderTop = false,
  align = "center",
  children,
  padding = "5rem 0",
}: NarrativeSectionProps) {
  const alignStyle: React.CSSProperties = {
    textAlign: align,
  };

  const textContainerStyle: React.CSSProperties = {
    marginBottom: children ? "3.5rem" : "0",
    display: "flex",
    flexDirection: "column",
    alignItems: align === "center" ? "center" : "flex-start",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "2.25rem",
    fontWeight: 600,
    color: "#1a202c",
    marginBottom: subtitle ? "0.75rem" : "0",
    fontFamily: "var(--font-headings)",
    lineHeight: 1.2,
  };

  const subtitleStyle: React.CSSProperties = {
    maxWidth: "680px",
    margin: align === "center" ? "0 auto" : "0",
    color: "var(--text-secondary)",
    fontSize: "1.1rem",
    lineHeight: 1.6,
    fontFamily: "var(--font-body)",
  };

  return (
    <section
      id={id}
      aria-label={ariaLabel}
      style={{
        backgroundColor,
        borderTop: borderTop ? "1px solid var(--border-warm)" : "none",
        borderBottom: borderBottom ? "1px solid var(--border-warm)" : "none",
        padding,
        width: "100%",
        ...alignStyle,
      }}
    >
      <div className="container">
        <div style={textContainerStyle}>
          <h2 style={titleStyle}>{title}</h2>
          {subtitle && <div style={subtitleStyle}>{subtitle}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}
