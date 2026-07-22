// Componente de Paginación SSR
// Archivo: src/app/(public)/components/pagination.tsx

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  searchParams?: Record<string, string | string[] | undefined>;
}

export default function Pagination({
  page,
  pageSize,
  totalPages,
  totalItems,
  searchParams = {},
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  // Helper para construir la URL con la página seleccionada conservando otros parámetros
  const buildPageUrl = (targetPage: number) => {
    const urlParams = new URLSearchParams();
    
    // Normalización: Aseguramos que siempre existan page y pageSize
    urlParams.set("page", String(targetPage));
    urlParams.set("pageSize", String(pageSize));

    // Copiar el resto de query params
    for (const [key, val] of Object.entries(searchParams)) {
      if (key === "page" || key === "pageSize" || val === undefined) {
        continue;
      }
      if (Array.isArray(val)) {
        val.forEach((v) => urlParams.append(key, v));
      } else {
        urlParams.append(key, val);
      }
    }

    return `?${urlParams.toString()}`;
  };

  // Generar lista simple de páginas (ej: 1, 2, 3...)
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <nav
      aria-label="Navegación de páginas"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "0.5rem",
        marginTop: "3rem",
        marginBottom: "3rem",
        flexWrap: "wrap",
      }}
    >
      {/* Botón Anterior */}
      {page > 1 ? (
        <Link
          href={buildPageUrl(page - 1)}
          className="btn btn-outline btn-sm"
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "var(--radius-sm)",
            height: "40px",
            display: "inline-flex",
            alignItems: "center",
          }}
          aria-label="Ir a la página anterior"
        >
          <ChevronLeft size={16} /> <span style={{ marginLeft: "0.25rem" }}>Anterior</span>
        </Link>
      ) : (
        <button
          className="btn btn-outline btn-sm"
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "var(--radius-sm)",
            opacity: 0.5,
            cursor: "not-allowed",
            height: "40px",
            display: "inline-flex",
            alignItems: "center",
          }}
          disabled
          aria-label="Página anterior no disponible"
        >
          <ChevronLeft size={16} /> <span style={{ marginLeft: "0.25rem" }}>Anterior</span>
        </button>
      )}

      {/* Números de Página */}
      <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
        {pages.map((p) => {
          const isCurrent = p === page;
          return (
            <Link
              key={p}
              href={buildPageUrl(p)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-sm)",
                fontWeight: 600,
                fontSize: "0.95rem",
                border: isCurrent ? "2px solid var(--primary-blue)" : "1px solid var(--border-warm)",
                backgroundColor: isCurrent ? "var(--primary-blue-light)" : "var(--white)",
                color: isCurrent ? "var(--primary-blue)" : "var(--text-primary)",
                transition: "var(--transition-smooth)",
                outline: "none",
              }}
              aria-current={isCurrent ? "page" : undefined}
              aria-label={`Ir a la página ${p}`}
            >
              {p}
            </Link>
          );
        })}
      </div>

      {/* Botón Siguiente */}
      {page < totalPages ? (
        <Link
          href={buildPageUrl(page + 1)}
          className="btn btn-outline btn-sm"
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "var(--radius-sm)",
            height: "40px",
            display: "inline-flex",
            alignItems: "center",
          }}
          aria-label="Ir a la página siguiente"
        >
          <span style={{ marginRight: "0.25rem" }}>Siguiente</span> <ChevronRight size={16} />
        </Link>
      ) : (
        <button
          className="btn btn-outline btn-sm"
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "var(--radius-sm)",
            opacity: 0.5,
            cursor: "not-allowed",
            height: "40px",
            display: "inline-flex",
            alignItems: "center",
          }}
          disabled
          aria-label="Página siguiente no disponible"
        >
          <span style={{ marginRight: "0.25rem" }}>Siguiente</span> <ChevronRight size={16} />
        </button>
      )}
    </nav>
  );
}
