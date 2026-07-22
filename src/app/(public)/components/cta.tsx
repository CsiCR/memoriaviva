// Componente de Llamado a la Acción Emocional (CTA)
// Archivo: src/app/(public)/components/cta.tsx

import Link from "next/link";
import { Heart, Compass, UploadCloud } from "lucide-react";

export default function CTA() {
  return (
    <section
      className="section"
      style={{
        background: "linear-gradient(135deg, #FAFAF5 0%, #eef7ff 100%)",
        borderTop: "1px solid var(--border-warm)",
        borderBottom: "1px solid var(--border-warm)",
        paddingTop: "5rem",
        paddingBottom: "5rem",
      }}
      aria-label="Invitación a participar"
    >
      <div className="container" style={{ maxWidth: "900px", textAlign: "center" }}>
        <div style={{ marginBottom: "3.5rem" }}>
          <h2 style={{ fontSize: "2.25rem", color: "#1a202c", marginBottom: "0.75rem" }}>
            Preservemos Juntos Nuestra Historia
          </h2>
          <p
            style={{
              maxWidth: "700px",
              margin: "0 auto",
              color: "var(--text-secondary)",
              fontSize: "1.1rem",
              lineHeight: 1.6,
            }}
          >
            La memoria colectiva de Pico Truncado se reconstruye con los retazos de recuerdos, vivencias y registros de cada una de nuestras familias.
          </p>
        </div>

        <div className="grid grid-3" style={{ gap: "2rem", marginBottom: "3.5rem" }}>
          <div
            className="card"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              border: "1px solid var(--border-warm)",
              padding: "2rem",
              backgroundColor: "var(--white)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", color: "var(--primary-blue)" }}>
              <Heart size={36} strokeWidth={1.5} />
            </div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>¿Por qué participar?</h3>
            <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Para asegurar que el patrimonio cultural, el esfuerzo de los pioneros y la identidad de nuestros barrios perdure.
            </p>
          </div>

          <div
            className="card"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              border: "1px solid var(--border-warm)",
              padding: "2rem",
              backgroundColor: "var(--white)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", color: "var(--hope-green)" }}>
              <Compass size={36} strokeWidth={1.5} />
            </div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>¿Qué resguardamos?</h3>
            <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Fotografías, audios de pioneros, actas y cartas. Todo catalogado y tratado bajo riguroso consentimiento.
            </p>
          </div>

          <div
            className="card"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              border: "1px solid var(--border-warm)",
              padding: "2rem",
              backgroundColor: "var(--white)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", color: "#db2777" }}>
              <UploadCloud size={36} strokeWidth={1.5} />
            </div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>¿Cómo colaborar?</h3>
            <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Cargando archivos directamente, narrando un recuerdo escrito, o contactándonos para digitalizar fotos en papel.
            </p>
          </div>
        </div>

        <div>
          <Link
            href="/aportar"
            className="btn btn-primary"
            style={{
              padding: "1rem 2.5rem",
              fontSize: "1.1rem",
              boxShadow: "var(--shadow-md)",
            }}
            aria-label="Compartir un recuerdo o historia"
          >
            Compartir mi historia
          </Link>
        </div>
      </div>
    </section>
  );
}
