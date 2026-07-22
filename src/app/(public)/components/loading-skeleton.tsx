// Componente de Marcadores de Carga Animados (Loading Skeletons)
// Archivo: src/app/(public)/components/loading-skeleton.tsx

export function CardSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "380px",
        border: "1px solid var(--border-warm)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        backgroundColor: "var(--white)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Imagen */}
      <div
        className="skeleton-pulse"
        style={{
          width: "100%",
          paddingTop: "60%",
          backgroundColor: "var(--border-warm)",
        }}
      ></div>

      {/* Cuerpo */}
      <div
        style={{
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          flexGrow: 1,
        }}
      >
        {/* Badges */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <div
            className="skeleton-pulse"
            style={{ width: "30%", height: "16px", backgroundColor: "var(--border-warm)", borderRadius: "4px" }}
          ></div>
          <div
            className="skeleton-pulse"
            style={{ width: "20%", height: "16px", backgroundColor: "var(--border-warm)", borderRadius: "4px" }}
          ></div>
        </div>

        {/* Título */}
        <div
          className="skeleton-pulse"
          style={{
            width: "80%",
            height: "22px",
            backgroundColor: "var(--border-warm)",
            borderRadius: "4px",
            marginTop: "0.5rem",
          }}
        ></div>

        {/* Descripción */}
        <div
          className="skeleton-pulse"
          style={{
            width: "100%",
            height: "14px",
            backgroundColor: "var(--border-warm)",
            borderRadius: "4px",
            marginTop: "0.25rem",
          }}
        ></div>
        <div
          className="skeleton-pulse"
          style={{ width: "60%", height: "14px", backgroundColor: "var(--border-warm)", borderRadius: "4px" }}
        ></div>

        {/* Footer de Tarjeta */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "1rem",
            borderTop: "1px solid var(--border-warm)",
            marginTop: "auto",
          }}
        >
          <div
            className="skeleton-pulse"
            style={{ width: "40%", height: "14px", backgroundColor: "var(--border-warm)", borderRadius: "4px" }}
          ></div>
          <div
            className="skeleton-pulse"
            style={{ width: "25%", height: "24px", backgroundColor: "var(--border-warm)", borderRadius: "4px" }}
          ></div>
        </div>
      </div>
    </div>
  );
}

export default function LoadingSkeleton() {
  return (
    <div style={{ width: "100%" }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes skeleton-pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        .skeleton-pulse {
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
      `,
        }}
      />
      <div className="grid grid-3" style={{ gap: "2rem" }}>
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
