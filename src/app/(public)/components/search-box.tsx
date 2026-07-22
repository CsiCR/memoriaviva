// Caja de Búsqueda Rápida (Navegación SSR preservando filtros activos)
// Archivo: src/app/(public)/components/search-box.tsx

"use client";

import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";

interface SearchBoxProps {
  defaultValue?: string;
}

export default function SearchBox({ defaultValue = "" }: SearchBoxProps) {
  const searchParams = useSearchParams();

  // Extraer el resto de parámetros activos para preservarlos en el submit del formulario
  const activeFilters: Array<{ name: string; value: string }> = [];
  const order = ["type", "decade", "institution", "person", "place", "sort"];

  for (const key of order) {
    const val = searchParams.get(key);
    if (val && val.trim() !== "") {
      activeFilters.push({ name: key, value: val });
    }
  }

  return (
    <div
      style={{
        margin: "0.5rem auto 2.5rem",
        maxWidth: "680px",
        padding: "0 1rem",
      }}
    >
      <form
        action="/contributions"
        method="GET"
        style={{
          display: "flex",
          position: "relative",
          alignItems: "center",
          width: "100%",
        }}
        role="search"
        data-analytics-event="search_started"
      >
        {/* Filtros ocultos para preservarlos */}
        {activeFilters.map((filter) => (
          <input key={filter.name} type="hidden" name={filter.name} value={filter.value} />
        ))}
        {/* Reiniciar siempre a página 1 al realizar una nueva búsqueda */}
        <input type="hidden" name="page" value="1" />

        <label htmlFor="search-input" style={{ display: "none" }}>
          Buscar personas, lugares, instituciones o recuerdos
        </label>
        <div
          style={{
            position: "absolute",
            left: "1.25rem",
            color: "var(--text-muted)",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Search size={20} />
        </div>
        <input
          id="search-input"
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder="Buscar personas, lugares, instituciones o recuerdos..."
          style={{
            width: "100%",
            padding: "1rem 6.5rem 1rem 3.25rem",
            fontSize: "1.1rem",
            border: "2px solid var(--border-warm)",
            borderRadius: "var(--radius-lg)",
            backgroundColor: "var(--white)",
            color: "var(--text-primary)",
            boxShadow: "var(--shadow-md)",
            outline: "none",
            fontFamily: "var(--font-body)",
            transition: "var(--transition-smooth)",
          }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{
            position: "absolute",
            right: "0.5rem",
            top: "0.5rem",
            bottom: "0.5rem",
            padding: "0 1.25rem",
            borderRadius: "var(--radius-md)",
            fontSize: "0.9rem",
            height: "calc(100% - 1rem)",
          }}
        >
          Buscar
        </button>
      </form>
    </div>
  );
}
