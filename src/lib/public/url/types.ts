// Contratos y Tipos para la Resolución de URLs Públicas
// Archivo: src/lib/public/url/types.ts

export type PublicUrlResolution<T> =
  | {
      kind: "canonical";
      requestedSlug: string;
      canonicalSlug: string;
      identityId: string;
      data: T;
    }
  | {
      kind: "redirect";
      requestedSlug: string;
      canonicalSlug: string;
      destinationPath: string;
      status: 301;
      resolutionType: "alias" | "merged";
    }
  | {
      kind: "not_found";
      status: 404;
    }
  | {
      kind: "gone";
      status: 410;
    }
  | {
      kind: "conflict";
      status: 409;
      internalCode: "PUBLIC_IDENTITY_CONFLICT";
    };

export interface PublicUrlIdentityResolution {
  kind: "canonical" | "redirect" | "not_found" | "conflict" | "gone";
  canonicalSlug?: string;
  resolutionType?: "canonical" | "alias" | "merged";
  identityId?: string;
  entityUuid?: string;
  status: number;
}
