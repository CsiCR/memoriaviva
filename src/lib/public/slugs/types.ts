// Contratos y Tipos para el Servicio de Identidad Pública y Slugs
// Archivo: src/lib/public/slugs/types.ts

export const IDENTITY_STATUSES = ["draft", "published", "unpublished", "deleted", "merged"] as const;
export type IdentityStatus = typeof IDENTITY_STATUSES[number];

export const SLUG_KINDS = ["canonical", "alias"] as const;
export type SlugKind = typeof SLUG_KINDS[number];

export const SLUG_REASONS = ["created", "renamed", "merged", "imported", "migration", "restored"] as const;
export type SlugReason = typeof SLUG_REASONS[number];

export const SLUG_SOURCES = ["editor", "import", "system", "migration"] as const;
export type SlugSource = typeof SLUG_SOURCES[number];

export type PublicEntityType =
  | "story"
  | "contribution"
  | "person"
  | "place"
  | "institution"
  | "collection";

export interface PublicIdentity {
  id: string; // UUID de la identidad
  entityType: PublicEntityType;
  entityUuid: string; // UUID de la entidad editorial interna
  status: IdentityStatus;
  isFrozen: boolean;
  hasEverBeenPublished: boolean;
  mergedIntoIdentityId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SlugAuditMetadata {
  userId?: string;
  source?: SlugSource;
  note?: string;
}

export interface SlugCandidate {
  rawValue: string;
  source: "title" | "manual" | "suggested" | "imported";
  requestedBy?: string | null;
}

export interface PublicIdentityOperationResult {
  schemaVersion: 1;
  identityId: string;
  canonicalSlug: string;
  aliasesCreated: number;
  redirectRequired: boolean;
  hasChanged: boolean;
  operation: "registered" | "renamed" | "merged" | "status_updated" | "unchanged";
}

export interface PublicIdentityResolution {
  schemaVersion: 1;
  identity: PublicIdentity;
  requestedSlug: string;
  canonicalSlug: string;
  publicUri: string;
  resolutionType: "canonical" | "alias" | "merged";
  redirectStatus: 301 | null;
  redirectsToIdentityId: string | null;
}
