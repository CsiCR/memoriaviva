// Componente de Panel de Filtros (Filter Panel)
// Archivo: src/app/(public)/components/filter-panel.tsx

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";
import FilterSelect from "./filter-select";
import FilterChip from "./filter-chip";
import { AvailableFilters, AppliedFilters } from "@/lib/public/explore/types";

interface FilterPanelProps {
  availableFilters: AvailableFilters;
  appliedFilters: AppliedFilters;
}

export default function FilterPanel({ availableFilters, appliedFilters }: FilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Validar si existe al menos un filtro activo
  const hasActiveFilters = Object.values(appliedFilters).some(
    (v) => v !== undefined && v !== ""
  );

  const handleClearAll = () => {
    // Analytics hook temporal
    const el = document.getElementById("filter-panel-wrapper");
    if (el) {
      el.setAttribute("data-analytics-event", "filters_cleared");
      setTimeout(() => {
        el.removeAttribute("data-analytics-event");
      }, 50);
    }

    router.push("/contributions");
  };

  const filterLabels: Record<keyof AppliedFilters, string> = {
    q: "Búsqueda",
    type: "Tipo",
    decade: "Década",
    institution: "Institución",
    person: "Persona",
    place: "Lugar",
  };

  return (
    <div
      id="filter-panel-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        padding: "1.5rem",
        backgroundColor: "var(--warm-white)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-warm)",
        marginBottom: "2rem",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Grilla de selectores desplegables */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
          gap: "1.25rem",
        }}
      >
        <FilterSelect
          name="type"
          label="Tipo de Aporte"
          options={availableFilters.types}
          value={appliedFilters.type || ""}
        />
        <FilterSelect
          name="decade"
          label="Década"
          options={availableFilters.decades}
          value={appliedFilters.decade || ""}
        />
        <FilterSelect
          name="institution"
          label="Institución"
          options={availableFilters.institutions}
          value={appliedFilters.institution || ""}
        />
        <FilterSelect
          name="person"
          label="Persona"
          options={availableFilters.people}
          value={appliedFilters.person || ""}
        />
        <FilterSelect
          name="place"
          label="Lugar"
          options={availableFilters.places}
          value={appliedFilters.place || ""}
        />
      </div>

      {/* Etiquetas activas (Chips) y botón de Limpieza */}
      {hasActiveFilters && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1.25rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--border-warm)",
          }}
        >
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <span
              style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginRight: "0.5rem",
              }}
            >
              Filtros aplicados:
            </span>
            {Object.entries(appliedFilters).map(([key, value]) => {
              if (!value) return null;
              return (
                <FilterChip
                  key={key}
                  name={key}
                  value={value}
                  label={filterLabels[key as keyof AppliedFilters]}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleClearAll}
            className="btn btn-outline btn-sm"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.85rem",
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-sm)",
              height: "38px",
            }}
            aria-label="Limpiar todas las búsquedas y filtros activos"
          >
            <RotateCcw size={14} /> Volver a ver todo
          </button>
        </div>
      )}
    </div>
  );
}
