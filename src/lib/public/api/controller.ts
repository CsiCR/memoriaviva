// Controlador Next-Agnostic de la API Pública
// Archivo: src/lib/public/api/controller.ts

import { PublicApiService } from "./service";
import { parseQueryParams } from "./query-params";
import { formatApiError } from "./errors";
import { generateHashETag } from "./cache";
import { buildResponseHeaders } from "./response";
import {
  PublicApiControllerResult,
  PublicCollectionResponse,
  PublicDetailResponse,
  PublicApiMeta,
} from "./types";
import { PublicContribution } from "../types/contribution";

export class PublicApiController {
  constructor(private service: PublicApiService) {}

  /**
   * Maneja el listado paginado y filtrado de aportes públicos.
   */
  async handleListContributions(
    searchParams: URLSearchParams,
    requestId: string
  ): Promise<PublicApiControllerResult<PublicCollectionResponse<PublicContribution>>> {
    const generatedAt = new Date().toISOString();
    try {
      // 1. Validar y parsear parámetros estrictos
      const query = parseQueryParams(searchParams);

      // 2. Consultar servicio
      const result = await this.service.listContributions(query);

      // 3. Obtener el máximo updatedAt de los elementos (publicUpdatedAt expuesto por el contrato)
      const maxPublicUpdatedAt =
        result.items.length > 0
          ? result.items.reduce(
              (max, item) => (item.updatedAt > max ? item.updatedAt : max),
              result.items[0].updatedAt
            )
          : "1970-01-01T00:00:00.000Z";

      // 4. Calcular huella ETag para la colección paginada
      const fingerprint = {
        schemaVersion: 1,
        entityType: "contribution",
        normalizedQuery: query.q || null,
        page: query.page,
        pageSize: query.pageSize,
        sort: query.sort,
        direction: query.direction,
        filters: {
          contributionType: query.contributionType || null,
          year: query.year || null,
          collection: query.collection || null,
          from: query.from || null,
          to: query.to || null,
        },
        maxPublicUpdatedAt,
        totalItems: result.total,
      };
      const etag = generateHashETag(fingerprint);

      // 5. Formatear la meta de paginación
      const totalPages = Math.ceil(result.total / query.pageSize);
      const pagination = {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: result.total,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      };

      const meta: PublicApiMeta & { pagination: typeof pagination } = {
        schemaVersion: 1,
        apiVersion: "v1",
        requestId,
        generatedAt,
        pagination,
      };

      const headers = buildResponseHeaders(requestId, {
        cacheType: "collection",
        etag,
      });

      return {
        status: 200,
        body: {
          data: result.items,
          meta,
        },
        headers,
      };
    } catch (error) {
      const errRes = formatApiError(error, requestId, generatedAt);
      const headers = buildResponseHeaders(requestId, { cacheType: "error" });
      return {
        status: errRes.status as 400 | 404 | 409 | 500 | 501,
        body: errRes.body,
        headers,
      };
    }
  }

  /**
   * Maneja el detalle de un aporte por su slug.
   */
  async handleGetContribution(
    slug: string,
    ifNoneMatch: string | null,
    requestId: string
  ): Promise<PublicApiControllerResult<PublicDetailResponse<PublicContribution>>> {
    const generatedAt = new Date().toISOString();
    try {
      // 1. Obtener recurso desde el servicio (resuelve alias)
      const detail = await this.service.getContributionBySlug(slug);
      if (!detail) {
        return {
          status: 404,
          body: {
            error: {
              code: "PUBLIC_NOT_FOUND",
              message: `No se encontró la contribución con el slug solicitado: ${slug}`,
            },
            meta: {
              schemaVersion: 1,
              apiVersion: "v1",
              requestId,
              generatedAt,
            },
          },
          headers: buildResponseHeaders(requestId, { cacheType: "error" }),
        };
      }

      // 2. Calcular ETag usando el SLUG CANÓNICO e updatedAt público del contrato
      const fingerprint = {
        schemaVersion: 1,
        entityType: "contribution",
        canonicalSlug: detail.canonicalSlug,
        publicUpdatedAt: detail.data.updatedAt,
      };
      const etag = generateHashETag(fingerprint);

      // 3. Evaluar If-None-Match para 304 (Not Modified)
      if (ifNoneMatch && ifNoneMatch === etag) {
        const headers = buildResponseHeaders(requestId, {
          cacheType: "detail",
          etag,
        });
        return {
          status: 304,
          body: null,
          headers,
        };
      }

      // 4. Retornar payload completo
      const meta: PublicApiMeta = {
        schemaVersion: 1,
        apiVersion: "v1",
        requestId,
        generatedAt,
      };

      const headers = buildResponseHeaders(requestId, {
        cacheType: "detail",
        etag,
      });

      return {
        status: 200,
        body: {
          data: detail.data,
          meta,
        },
        headers,
      };
    } catch (error) {
      const errRes = formatApiError(error, requestId, generatedAt);
      const headers = buildResponseHeaders(requestId, { cacheType: "error" });
      return {
        status: errRes.status as 400 | 404 | 409 | 500 | 501,
        body: errRes.body,
        headers,
      };
    }
  }
}
