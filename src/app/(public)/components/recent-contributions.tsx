// Componente de Últimos Aportes (Edición Narrativa)
// Archivo: src/app/(public)/components/recent-contributions.tsx

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ContributionCard from "./contribution-card";
import ContributionGrid from "./contribution-grid";
import NarrativeSection from "./narrative-section";
import { ContributionCardModel } from "@/lib/public/explore/types";

interface RecentContributionsProps {
  contributions: ContributionCardModel[];
}

export default function RecentContributions({ contributions }: RecentContributionsProps) {
  return (
    <NarrativeSection
      title="Últimos Aportes Compartidos"
      subtitle={
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            flexWrap: "wrap",
            gap: "1.5rem",
          }}
        >
          <span style={{ color: "var(--text-secondary)", fontSize: "1.1rem", maxWidth: "600px", display: "inline-block" }}>
            Recorridos fotográficos y testimonios documentales recientemente incorporados por la comunidad.
          </span>
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
      }
      ariaLabel="Últimas adiciones al archivo"
      backgroundColor="var(--white)"
      borderBottom={true}
      align="left"
    >
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
    </NarrativeSection>
  );
}

