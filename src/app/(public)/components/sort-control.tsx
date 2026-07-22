// Componente de Control de Ordenamiento (Sort Control)
// Archivo: src/app/(public)/components/sort-control.tsx

"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface SortControlProps {
  currentSort: string;
}

export default function SortControl({ currentSort }: SortControlProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", e.target.value);
    params.set("page", "1"); // Reiniciar a página 1 al cambiar el orden

    // Regla de limpieza: Omitir vacíos y mantener orden fijo
    const newParams = new URLSearchParams();
    const order = ["page", "pageSize", "q", "type", "decade", "institution", "person", "place", "sort"];

    for (const key of order) {
      const val = params.get(key);
      if (val && val.trim() !== "") {
        newParams.set(key, val);
      }
    }

    router.push(`?${newParams.toString()}`);
  };

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
      data-analytics-event="sort_changed"
    >
      <label
        htmlFor="sort-select"
        style={{
          fontSize: "0.9rem",
          color: "var(--text-secondary)",
          fontWeight: 600,
        }}
      >
        Ordenar por:
      </label>
      <select
        id="sort-select"
        value={currentSort}
        onChange={handleSortChange}
        style={{
          padding: "0.5rem 2rem 0.5rem 1rem",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border-warm)",
          backgroundColor: "var(--white)",
          fontSize: "0.9rem",
          color: "var(--text-primary)",
          cursor: "pointer",
          outline: "none",
        }}
        aria-label="Criterio de ordenamiento para el listado de aportes"
      >
        <option value="recent">Más recientes</option>
        <option value="oldest">Más antiguos</option>
        <option value="title-asc">Título A-Z</option>
        <option value="title-desc">Título Z-A</option>
      </select>
    </div>
  );
}
