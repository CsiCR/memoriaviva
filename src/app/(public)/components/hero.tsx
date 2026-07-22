// Componente Hero Principal del Portal
// Archivo: src/app/(public)/components/hero.tsx

import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface HeroProps {
  title: string;
  subtitle: string;
}

export default function Hero({ title, subtitle }: HeroProps) {
  return (
    <section
      className="section"
      style={{
        background: "linear-gradient(135deg, #eef7ff 0%, #FAFAF5 100%)",
        paddingTop: "6rem",
        paddingBottom: "4rem",
        borderBottom: "1px solid var(--border-warm)",
        textAlign: "center",
      }}
      aria-label="Presentación"
    >
      <div className="container" style={{ maxWidth: "800px" }}>
        <span
          style={{
            display: "inline-block",
            backgroundColor: "var(--primary-blue-light)",
            color: "var(--primary-blue)",
            padding: "0.4rem 1rem",
            borderRadius: "9999px",
            fontSize: "0.85rem",
            fontWeight: 600,
            marginBottom: "1.5rem",
            fontFamily: "var(--font-headings)",
          }}
        >
          INICIATIVA COLABORATIVA HISTÓRICA
        </span>
        <h1
          style={{
            fontSize: "3rem",
            fontWeight: 700,
            lineHeight: 1.2,
            color: "#1a202c",
            marginBottom: "1.5rem",
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: "1.2rem",
            color: "var(--text-secondary)",
            marginBottom: "2.5rem",
            lineHeight: 1.6,
          }}
        >
          {subtitle}
        </p>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/contributions"
            className="btn btn-primary"
            style={{ minWidth: "200px" }}
            aria-label="Explorar la galería de memorias colectivas"
          >
            Explorar Memorias <ChevronRight size={18} />
          </Link>
          <Link
            href="/aportar"
            className="btn btn-secondary"
            style={{ minWidth: "200px" }}
            aria-label="Comenzar a aportar su propia memoria"
          >
            Quiero aportar
          </Link>
        </div>
      </div>
    </section>
  );
}
