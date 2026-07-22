// Servicio de Carga y Validación de Aportes Públicos para Páginas
// Archivo: src/lib/public/url/page-service.ts

import { PublicUrlIdentityResolver } from "./identity-resolver";
import { PublicApiService } from "../api/service";
import { PublicContribution } from "../types/contribution";
import { PublicUrlResolution } from "./types";
import { publicContributionSchema } from "../validation/contribution.schema";

export class PublicContributionPageService {
  constructor(
    private identityResolver: PublicUrlIdentityResolver,
    private apiService: PublicApiService
  ) {}

  /**
   * Resuelve y valida por completo el contrato del aporte solicitado.
   */
  async resolvePageData(
    slug: string
  ): Promise<PublicUrlResolution<PublicContribution>> {
    // 1. Obtener la resolución de la identidad
    const identityRes = await this.identityResolver.resolve("contribution", slug);

    if (identityRes.kind === "not_found") {
      return { kind: "not_found", status: 404 };
    }

    if (identityRes.kind === "conflict") {
      return {
        kind: "conflict",
        status: 409,
        internalCode: "PUBLIC_IDENTITY_CONFLICT",
      };
    }

    if (identityRes.kind === "gone") {
      return { kind: "gone", status: 410 };
    }

    if (identityRes.kind === "redirect" && identityRes.canonicalSlug) {
      const destinationPath = `/contributions/${identityRes.canonicalSlug}`;
      return {
        kind: "redirect",
        requestedSlug: slug,
        canonicalSlug: identityRes.canonicalSlug,
        destinationPath,
        status: 301,
        resolutionType: identityRes.resolutionType as "alias" | "merged",
      };
    }

    // 2. Obtener el aporte de forma autoritativa mediante el servicio de lectura
    try {
      const detail = await this.apiService.getContributionBySlug(identityRes.canonicalSlug!);
      if (!detail) {
        return { kind: "not_found", status: 404 };
      }

      // 3. Validar el contrato público resultante usando Zod estricto
      const validatedData = publicContributionSchema.parse(detail.data);

      return {
        kind: "canonical",
        requestedSlug: slug,
        canonicalSlug: identityRes.canonicalSlug!,
        identityId: identityRes.identityId!,
        data: validatedData,
      };
    } catch (error) {
      console.error("Error al obtener la contribución pública en el PageService:", error);
      return { kind: "not_found", status: 404 };
    }
  }
}
