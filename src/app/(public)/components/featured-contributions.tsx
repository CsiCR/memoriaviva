// Componente de Aportes Destacados
// Archivo: src/app/(public)/components/featured-contributions.tsx

import ContributionCard from "./contribution-card";
import ContributionGrid from "./contribution-grid";
import { ContributionCardModel } from "@/lib/public/explore/types";

interface FeaturedContributionsProps {
  contributions: ContributionCardModel[];
}

export default function FeaturedContributions({ contributions }: FeaturedContributionsProps) {
  if (!contributions || contributions.length === 0) {
    return null;
  }

  return (
    <section
      className="section"
      style={{
        backgroundColor: "var(--neutral-grey-light)",
        borderBottom: "1px solid var(--border-warm)",
      }}
      aria-label="Aportes destacados"
    >
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "2rem" }}>Aportes Destacados</h2>
          <p style={{ maxWidth: "600px", margin: "0 auto", color: "var(--text-secondary)" }}>
            Fotografías y testimonios significativos seleccionados por su relevancia patrimonial para Pico Truncado.
          </p>
        </div>

        <ContributionGrid>
          {contributions.map((contribution) => (
            <ContributionCard key={contribution.id} contribution={contribution} />
          ))}
        </ContributionGrid>
      </div>
    </section>
  );
}
