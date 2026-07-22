// Manejo Unificado de Errores para la API Pública
// Archivo: src/lib/public/api/errors.ts

import { PublicApiErrorResponse, PublicApiMeta } from "./types";

export class PublicApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "PublicApiError";
    Object.setPrototypeOf(this, PublicApiError.prototype);
  }
}

/**
 * Formatea un error en la estructura del contrato PublicApiErrorResponse.
 */
export function formatApiError(
  error: unknown,
  requestId: string,
  generatedAt: string
): { status: number; body: PublicApiErrorResponse } {
  const meta: PublicApiMeta = {
    schemaVersion: 1,
    apiVersion: "v1",
    requestId,
    generatedAt,
  };

  if (error instanceof PublicApiError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        meta,
      },
    };
  }

  // Errores arrojados por el validador de parámetros
  const errMessage = error instanceof Error ? error.message : String(error);
  if (errMessage.startsWith("PUBLIC_INVALID_QUERY:")) {
    return {
      status: 400,
      body: {
        error: {
          code: "PUBLIC_INVALID_QUERY",
          message: errMessage.replace("PUBLIC_INVALID_QUERY: ", ""),
        },
        meta,
      },
    };
  }

  // Error genérico del servidor
  return {
    status: 500,
    body: {
      error: {
        code: "PUBLIC_INTERNAL_ERROR",
        message: "Ocurrió un error inesperado en el servidor.",
      },
      meta,
    },
  };
}
