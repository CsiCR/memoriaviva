// Contratos Públicos — Referencias Históricas e Institucionales
// Archivo: src/lib/public/types/references.ts

export type PublicReferenceType =
  | "institutional_archive"
  | "family_archive"
  | "bibliographic"
  | "newspaper"
  | "oral_testimony"
  | "public_record"
  | "external_source"
  | "institutional_agreement"
  | "other";

export interface PublicReference {
  type: PublicReferenceType;
  title: string;
  sourceName: string | null;
  dateLabel: string | null;
  externalUrl: string | null;
}

export interface PublicPersonReference {
  id: string | null;
  slug: string | null;
  displayName: string;
}

export interface PublicPlaceReference {
  id: string | null;
  slug: string | null;
  name: string;
}

export interface PublicInstitutionReference {
  id: string | null;
  slug: string | null;
  name: string;
}
