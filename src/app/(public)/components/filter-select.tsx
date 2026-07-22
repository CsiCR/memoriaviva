// Componente de Selección Individual de Filtro (Filter Select)
// Archivo: src/app/(public)/components/filter-select.tsx

"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface FilterSelectProps {
  name: string;
  label: string;
  options: string[];
  value: string;
}

export default function FilterSelect({ name, label, options, value }: FilterSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    const val = e.target.value;

    if (val) {
      params.set(name, val);
    } else {
      params.delete(name);
    }

    params.set("page", "1"); // Reiniciar a la página 1 al alterar filtros

    // Limpieza de URL: Omitir vacíos y mantener orden fijo
    const newParams = new URLSearchParams();
    const order = ["page", "pageSize", "q", "type", "decade", "institution", "person", "place", "sort"];

    for (const key of order) {
      const v = params.get(key);
      if (v && v.trim() !== "") {
        newParams.set(key, v);
      }
    }

    router.push(`?${newParams.toString()}`);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.35rem",
        minWidth: "170px",
        flexGrow: 1,
      }}
      data-analytics-event="filter_changed"
    >
      <label
        htmlFor={`filter-${name}`}
        style={{
          fontSize: "0.85rem",
          fontWeight: 600,
          color: "var(--text-secondary)",
        }}
      >
        {label}
      </label>
      <select
        id={`filter-${name}`}
        value={value}
        onChange={handleChange}
        style={{
          padding: "0.6rem 2rem 0.6rem 0.75rem",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border-warm)",
          backgroundColor: "var(--white)",
          fontSize: "0.9rem",
          color: "var(--text-primary)",
          cursor: "pointer",
          outline: "none",
          width: "100%",
        }}
        aria-label={`Filtrar por ${label}`}
      >
        <option value="">Todos</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
