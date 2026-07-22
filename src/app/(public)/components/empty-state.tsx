// Componente de Estado Vacío
// Archivo: src/app/(public)/components/empty-state.tsx

import Link from "next/link";
import { Info, RotateCcw } from "lucide-react";

interface EmptyStateProps {
  message?: string;
  showReset?: boolean;
}

export default function EmptyState({
  message = "No se encontraron memorias en esta sección.",
  showReset = false,
}: EmptyStateProps) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "4rem 2rem",
        border: "2px dashed var(--border-warm)",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--white)",
        maxWidth: "600px",
        margin: "3rem auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.5rem",
        boxShadow: "var(--shadow-sm)",
      }}
      role="status"
      aria-live="polite"
    >
      <div style={{ color: "var(--text-muted)" }}>
        <Info size={48} strokeWidth={1.25} />
      </div>
      <div>
        <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem", fontWeight: 700, color: "#1a202c" }}>
          Sin Resultados
        </h3>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          {message}
        </p>
      </div>
      {showReset && (
        <Link
          href="/contributions"
          className="btn btn-outline btn-sm"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            fontSize: "0.85rem",
          }}
          aria-label="Limpiar filtros y volver a ver todos los aportes"
        >
          <RotateCcw size={14} /> Volver a ver todo
        </Link>
      )}
    </div>
  );
}
