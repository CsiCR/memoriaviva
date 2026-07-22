// Generador de Rutas Jerárquicas (Breadcrumbs)
// Archivo: src/lib/public/seo/builders/breadcrumbs.ts

import { BreadcrumbItem } from "../types";

/**
 * Genera la estructura de migas de pan para una contribución pública.
 */
export function buildBreadcrumbs(title: string): BreadcrumbItem[] {
  return [
    { name: "Inicio", url: "/" },
    { name: "Memoria Viva", url: "/proyecto" },
    { name: "Contribuciones", url: "/" },
    { name: title, url: "" },
  ];
}
