// Página de No Encontrado (404) para Aportes
// Archivo: src/app/(public)/contributions/[slug]/not-found.tsx

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container section" style={{ maxWidth: "600px", textAlign: "center", padding: "4rem 1rem" }}>
      <h1 style={{ fontSize: "4rem", marginBottom: "1rem", color: "var(--primary-blue)", fontWeight: 700 }}>404</h1>
      <h2 style={{ fontSize: "1.6rem", marginBottom: "1.5rem", color: "var(--text-main)" }}>Aporte no disponible</h2>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2.5rem", lineHeight: "1.6", fontSize: "1.05rem" }}>
        El aporte solicitado no se encuentra disponible públicamente. Puede que no exista, haya sido despublicado o no cuente con el consentimiento necesario.
      </p>
      <Link href="/" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
        <ArrowLeft size={18} /> Volver al inicio
      </Link>
    </div>
  );
}
