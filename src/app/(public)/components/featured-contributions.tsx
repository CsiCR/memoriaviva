// Componente de Aportes Destacados (Edición Narrativa)
// Archivo: src/app/(public)/components/featured-contributions.tsx

import ContributionCard from "./contribution-card";
import ContributionGrid from "./contribution-grid";
import NarrativeSection from "./narrative-section";
import { ContributionCardModel } from "@/lib/public/explore/types";

interface FeaturedContributionsProps {
  contributions: ContributionCardModel[];
}

export default function FeaturedContributions({ contributions }: FeaturedContributionsProps) {
  if (!contributions || contributions.length === 0) {
    return null;
  }

  return (
    <NarrativeSection
      title="Historias de la Comunidad"
      subtitle="Fotografías y testimonios significativos compartidos por los vecinos sobre la historia de Pico Truncado."
      ariaLabel="Historias de la comunidad"
      backgroundColor="var(--neutral-grey-light)"
      borderBottom={true}
    >
      <ContributionGrid>
        {contributions.map((contribution) => (
          <ContributionCard key={contribution.id} contribution={contribution} />
        ))}
      </ContributionGrid>
    </NarrativeSection>
  );
}

