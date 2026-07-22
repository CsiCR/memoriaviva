// Contratos y Estructuras de la API Pública de Lectura
// Archivo: src/lib/public/api/types.ts

export type PublicApiVersion = "v1";

export type PublicEntityCollection =
  | "stories"
  | "contributions"
  | "people"
  | "places"
  | "institutions"
  | "collections";

export type PublicSortDirection = "asc" | "desc";

export interface PublicApiMeta {
  schemaVersion: 1;
  apiVersion: "v1";
  requestId: string;
  generatedAt: string;
}

export interface PublicPaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PublicCollectionResponse<T> {
  data: T[];
  meta: PublicApiMeta & {
    pagination: PublicPaginationMeta;
  };
}

export interface PublicDetailResponse<T> {
  data: T;
  meta: PublicApiMeta;
}

export interface PublicApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: PublicApiMeta;
}

export type PublicApiControllerResult<T> =
  | {
      status: 200;
      body: T;
      headers: Readonly<Record<string, string>>;
    }
  | {
      status: 304;
      body: null;
      headers: Readonly<Record<string, string>>;
    }
  | {
      status: 400 | 404 | 409 | 500 | 501;
      body: PublicApiErrorResponse;
      headers: Readonly<Record<string, string>>;
    };

// Estructuras para entidades futuras (Stubs)
export interface PublicPerson {
  id: string;
  slug: string;
  displayName: string;
  birthYear: number | null;
  arrivalYear: number | null;
  occupation: string | null;
  place: string | null;
  description: string | null;
}

export interface PublicPlace {
  id: string;
  slug: string;
  name: string;
  placeType: string | null;
  neighborhood: string | null;
  description: string | null;
}

export interface PublicInstitution {
  id: string;
  slug: string;
  name: string;
  institutionType: string | null;
  foundationYear: number | null;
  description: string | null;
}

export interface PublicCollection {
  id: string;
  slug: string;
  name: string;
  collectionType: string | null;
  featured: boolean;
  description: string | null;
}
