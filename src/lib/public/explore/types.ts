// Tipos Públicos del Módulo de Exploración
// Archivo: src/lib/public/explore/types.ts

export interface ExploreStats {
  totalContributions: number;
  totalPhotographs: number;
  totalDocuments: number;
  totalInterviewees: number;
  totalInstitutions: number;
  totalContributors: number;
}

export interface AppliedFilters {
  q?: string;
  type?: string;
  decade?: string;
  institution?: string;
  person?: string;
  place?: string;
}

export interface AvailableFilters {
  types: string[];
  decades: string[];
  institutions: string[];
  people: string[];
  places: string[];
}

export interface ExploreQueryParams extends AppliedFilters {
  page: number;
  pageSize: number;
  sort: "recent" | "oldest" | "title-asc" | "title-desc"; // 'relevance' may be added here in the future
}

export interface SearchResult {
  version: 1;
  items: ContributionCardModel[];
  total: number;
  page: number;
  pageSize: number;
  filters: AppliedFilters;
  availableFilters: AvailableFilters;
}

export interface ContributionCardModel {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  historicalDateLabel: string | null;
  contributionTypeLabel: string;
  authorName: string;
  badge?: {
    label: string;
    variant: "new" | "featured" | "verified";
  };
}

export interface HomeData {
  hero: {
    title: string;
    subtitle: string;
  };
  stats: ExploreStats;
  featured: ContributionCardModel[];
  recent: ContributionCardModel[];
  future?: {
    timeline?: Record<string, unknown>;
    collections?: Record<string, unknown>;
    institutions?: Record<string, unknown>;
  };
}
