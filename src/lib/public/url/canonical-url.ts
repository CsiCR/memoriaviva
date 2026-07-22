// Utilidad de Construcción de URLs Canónicas
// Archivo: src/lib/public/url/canonical-url.ts

import { publicSiteUrlSchema } from "./schemas";
import { PublicEntityType } from "../slugs/types";
import { clientEnv } from "@/lib/config/env";

/**
 * Valida la variable de entorno PUBLIC_SITE_URL al iniciar.
 */
export function validatePublicSiteUrl(url: string | undefined): string {
  const targetUrl = (url && url !== "undefined") ? url : (clientEnv.NEXT_PUBLIC_SITE_URL || "https://memoriavivapicotruncado.org");
  const parsed = publicSiteUrlSchema.safeParse(targetUrl);
  if (!parsed.success) {
    throw new Error(`PUBLIC_SITE_URL is invalid: ${parsed.error.message}`);
  }
  return parsed.data;
}


/**
 * Construye de manera segura y absoluta el URL canónico de una entidad.
 */
export function buildPublicCanonicalUrl({
  entityType,
  canonicalSlug,
}: {
  entityType: PublicEntityType;
  canonicalSlug: string;
}): string {
  const siteUrl = validatePublicSiteUrl(process.env.PUBLIC_SITE_URL || clientEnv.NEXT_PUBLIC_SITE_URL);
  
  if (entityType === "contribution") {
    const relativePath = `/contributions/${canonicalSlug}`;
    return new URL(relativePath, siteUrl).toString();
  }
  
  throw new Error(`Public route for entity type ${entityType} is not implemented yet.`);
}


