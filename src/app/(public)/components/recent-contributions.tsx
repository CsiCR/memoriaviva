// Componente de Últimos Aportes
// Archivo: src/app/(public)/components/recent-contributions.tsx

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ContributionCard from "./contribution-card";
import ContributionGrid from "./contribution-grid";
import { ContributionCardModel } from "@/lib/public/explore/types";

interface RecentContributionsProps {
  contributions: ContributionCardModel[];
}

export default function RecentContributions({ contributions }: RecentContributionsProps) {
  return (
    <section
      className="section"
      style={{
        backgroundColor: "var(--white)",
        borderBottom: "1px solid var(--border-warm)",
      }}
      aria-label="Últimas adiciones al archivo"
    >
      <div className="container">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: "3rem",
            flexWrap: "wrap",
            gap: "1.5rem",
          }}
        >
          <div>
            <h2 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Últimos Aportes Compartidos</h2>
            <p style={{ margin: 0, color: "var(--text-secondary)" }}>
              Recorridos fotográficos y testimonios documentales recientemente incorporados por la comunidad.
            </p>
          </div>
          <Link
            href="/contributions"
            className="btn btn-outline"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
            aria-label="Navegar por todas las memorias públicas"
          >
            Ver todo el archivo <ArrowRight size={16} />
          </Link>
        </div>

        {contributions.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "4rem 2rem",
              border: "2px dashed var(--border-warm)",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--warm-white)",
            }}
          >
            <p style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-secondary)" }}>
              Aún no se han publicado aportes en esta sección.
            </p>
          </div>
        ) : (
          <ContributionGrid>
            {contributions.map((contribution) => (
              <ContributionCard key={contribution.id} contribution={contribution} />
            ))}
          </ContributionGrid>
        )}
      </div>
    </section>
  );
}
