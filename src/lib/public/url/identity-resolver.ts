// Resolutor de Identidades Públicas para URLs
// Archivo: src/lib/public/url/identity-resolver.ts

import { PublicIdentityService } from "../slugs/service";
import { validateSlug } from "../slugs/validator";
import { PublicUrlIdentityResolution } from "./types";
import { PublicEntityType } from "../slugs/types";

export class PublicUrlIdentityResolver {
  constructor(private identityService: PublicIdentityService) {}

  /**
   * Resuelve el direccionamiento de un slug evaluando si es canónico, alias, fusión o inexistente.
   * 
   * Comportamiento ante cambios de alias y fusiones:
   * - Un alias histórico o identidad fusionada siempre redirige al slug canónico vigente de forma directa (resolución en un solo paso).
   * - Las redirecciones multi-hop se resuelven recursivamente en la base de datos o repositorio
   *   hasta encontrar el destino final activo, evitando que la cadena de redirecciones crezca en el cliente.
   */
  async resolve(
    entityType: PublicEntityType,
    slug: string
  ): Promise<PublicUrlIdentityResolution> {
    // 1. Validaciones estructurales y de seguridad
    if (!slug) {
      return { kind: "not_found", status: 404 };
    }

    // Rechazar explícitamente caracteres de escape de ruta o navegación
    if (slug.includes("/") || slug.includes("\\") || slug.includes("..")) {
      return { kind: "not_found", status: 404 };
    }

    // Validar el patrón estructural (sin alterar mayúsculas/minúsculas antes de la validación)
    const validation = validateSlug(slug);
    if (!validation.isValid) {
      return { kind: "not_found", status: 404 };
    }

    try {
      // 2. Invocar PublicIdentityService para resolver la identidad
      const resolution = await this.identityService.resolveIdentity(entityType, slug);
      if (!resolution) {
        return { kind: "not_found", status: 404 };
      }

      const { identity, canonicalSlug, resolutionType } = resolution;

      // 3. Ocultar identidades eliminadas
      if (identity.status === "deleted") {
        return { kind: "not_found", status: 404 };
      }

      // 4. Determinar redirecciones (aliases o fusiones)
      if (resolutionType === "alias" || resolutionType === "merged") {
        return {
          kind: "redirect",
          canonicalSlug,
          resolutionType,
          status: 301,
        };
      }

      // 5. Determinar estado canónico activo
      return {
        kind: "canonical",
        canonicalSlug,
        resolutionType: "canonical",
        identityId: identity.id,
        entityUuid: identity.entityUuid,
        status: 200,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (
        msg.includes("Circular or deep redirection") ||
        msg.includes("Fusión circular detectada")
      ) {
        return {
          kind: "conflict",
          status: 409,
        };
      }
      console.error("Error resolviendo identidad en resolver:", error);
      return { kind: "not_found", status: 404 };
    }
  }
}
