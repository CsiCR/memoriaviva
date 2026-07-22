// Componente Contenedor de Resultados (Search Results Wrapper)
// Archivo: src/app/(public)/components/search-results.tsx

import SearchSummary from "./search-summary";
import SortControl from "./sort-control";
import ContributionGrid from "./contribution-grid";
import ContributionCard from "./contribution-card";
import EmptyState from "./empty-state";
import { ContributionCardModel, AppliedFilters } from "@/lib/public/explore/types";

interface SearchResultsProps {
  items: ContributionCardModel[];
  total: number;
  sort: "recent" | "oldest" | "title-asc" | "title-desc";
  filters: AppliedFilters;
}

export default function SearchResults({ items, total, sort, filters }: SearchResultsProps) {
  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== ""
  );

  return (
    <div data-analytics-event="search_completed">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        <SearchSummary total={total} q={filters.q} />
        {total > 0 && <SortControl currentSort={sort} />}
      </div>

      {items.length === 0 ? (
        <div data-analytics-event="empty_result">
          <EmptyState
            message={
              hasActiveFilters
                ? "No encontramos recuerdos que coincidan con la búsqueda o los filtros aplicados."
                : "No se encontraron aportes públicos en este momento."
            }
            showReset={hasActiveFilters}
          />
        </div>
      ) : (
        <ContributionGrid>
          {items.map((item) => (
            <div key={item.id} data-analytics-event="result_opened">
              <ContributionCard contribution={item} />
            </div>
          ))}
        </ContributionGrid>
      )}
    </div>
  );
}
