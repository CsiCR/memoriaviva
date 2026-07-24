// Componente de Llamado a la Acción Emocional (CTA - Edición Narrativa)
// Archivo: src/app/(public)/components/cta.tsx

import Link from "next/link";

export default function CTA() {
  return (
    <section
      aria-label="Invitación a participar"
      style={{
        background: "linear-gradient(135deg, #0b2545 0%, #134074 100%)",
        color: "#FAFAF5",
        padding: "6rem 0",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        width: "100%",
        textAlign: "center",
      }}
    >
      <div
        className="container"
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2rem",
        }}
      >
        <div>
          <span
            style={{
              display: "inline-block",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              color: "#FAFAF5",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              padding: "0.4rem 1.2rem",
              borderRadius: "9999px",
              fontSize: "0.8rem",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: "1rem",
              fontFamily: "var(--font-headings)",
            }}
          >
            Construcción Colectiva
          </span>
          <h2
            style={{
              fontSize: "3rem",
              fontWeight: 600,
              color: "#FAFAF5",
              marginBottom: "1rem",
              fontFamily: "var(--font-headings)",
              lineHeight: 1.2,
            }}
          >
            La historia continúa.
          </h2>
          <p
            style={{
              color: "rgba(250, 250, 245, 0.85)",
              fontSize: "1.25rem",
              lineHeight: 1.6,
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            Miles de recuerdos aún esperan ser contados. Vos también podés formar parte.
          </p>
        </div>

        {/* Grupo de Botones Principales */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            flexWrap: "wrap",
            width: "100%",
            marginTop: "1rem",
          }}
        >
          <Link
            href="/contributions"
            className="btn"
            style={{
              backgroundColor: "#FAFAF5",
              color: "#0b2545",
              padding: "0.85rem 2rem",
              boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
              fontWeight: 600,
            }}
            aria-label="Explorar todas las memorias compartidas"
          >
            Explorar Memorias
          </Link>
          <Link
            href="/aportar"
            className="btn btn-green"
            style={{
              padding: "0.85rem 2rem",
              boxShadow: "0 4px 15px rgba(46, 139, 87, 0.25)",
            }}
            aria-label="Compartir un recuerdo con el archivo"
          >
            Aportar una Memoria
          </Link>
        </div>

        {/* Grupo de Botones Secundarios */}
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
            width: "100%",
            marginTop: "0.5rem",
          }}
        >
          <Link
            href="/quiero-formar-parte"
            className="btn btn-outline"
            style={{
              borderColor: "rgba(250, 250, 245, 0.4)",
              color: "#FAFAF5",
              padding: "0.6rem 1.5rem",
              fontSize: "0.9rem",
            }}
            aria-label="Información para sumarse como colaborador voluntario"
          >
            Quiero formar parte
          </Link>
          <Link
            href="/proyecto"
            className="museum-cta-link"
            style={{
              color: "#FAFAF5",
              fontSize: "0.9rem",
              fontWeight: 500,
              textDecoration: "underline",
              transition: "color 0.2s",
            }}
            aria-label="Leer más detalles sobre el proyecto"
          >
            Conocer el Proyecto
          </Link>
        </div>
      </div>
    </section>
  );
}

