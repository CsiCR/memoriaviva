// Componente de Resumen de Resultados (Search Summary)
// Archivo: src/app/(public)/components/search-summary.tsx

interface SearchSummaryProps {
  total: number;
  q?: string;
}

export default function SearchSummary({ total, q }: SearchSummaryProps) {
  const queryText = q ? ` para "${q}"` : "";
  const label = total === 1 ? "recuerdo encontrado" : "recuerdos encontrados";

  return (
    <div
      style={{
        marginBottom: "1.5rem",
        fontSize: "1.1rem",
        fontWeight: 600,
        color: "var(--text-primary)",
      }}
      role="status"
      aria-live="polite"
    >
      {total > 0 ? (
        <span>
          {total} {label}
          {queryText}
        </span>
      ) : (
        <span style={{ color: "var(--text-secondary)" }}>
          No encontramos recuerdos con esos criterios
          {queryText}
        </span>
      )}
    </div>
  );
}
