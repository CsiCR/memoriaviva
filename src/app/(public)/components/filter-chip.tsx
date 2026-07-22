// Componente de Etiqueta de Filtro Activo (Filter Chip)
// Archivo: src/app/(public)/components/filter-chip.tsx

"use client";

import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

interface FilterChipProps {
  name: string;
  value: string;
  label: string;
}

export default function FilterChip({ name, value, label }: FilterChipProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleRemove = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(name);
    params.set("page", "1"); // Reiniciar a página 1 al remover filtros

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
    <button
      type="button"
      onClick={handleRemove}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        padding: "0.35rem 0.75rem",
        borderRadius: "100px",
        backgroundColor: "var(--primary-blue-light)",
        border: "1px solid var(--primary-blue)",
        color: "var(--primary-blue)",
        fontSize: "0.85rem",
        fontWeight: 500,
        cursor: "pointer",
        transition: "var(--transition-smooth)",
        outline: "none",
      }}
      aria-label={`Remover filtro de ${label}: ${value}`}
    >
      <span>
        {label}: <strong>{value}</strong>
      </span>
      <X size={14} strokeWidth={2.5} />
    </button>
  );
}
