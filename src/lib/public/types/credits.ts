// Contratos Públicos — Tipos de Atribución y Créditos
// Archivo: src/lib/public/types/credits.ts

export interface PublicCredits {
  attributionType: "full_name" | "initials" | "family" | "institution" | "anonymous" | "custom";
  displayName: string | null;
}
