// Interfaz y e Implementaciones de Repositorios para Identidad Pública
// Archivo: src/lib/public/slugs/repository.ts

import { SupabaseClient } from "@supabase/supabase-js";
import {
  PublicEntityType,
  PublicIdentity,
  PublicIdentityOperationResult,
  SlugAuditMetadata,
  SlugKind,
  SlugReason,
  IdentityStatus,
} from "./types";
import { SLUG_CONFIG } from "./reserved";

export interface PublicIdentityRepository {
  /**
   * Registra una nueva identidad y su slug canónico inicial de forma atómica.
   */
  registerIdentity(
    entityUuid: string,
    entityType: PublicEntityType,
    slug: string,
    status: IdentityStatus,
    audit: SlugAuditMetadata
  ): Promise<PublicIdentityOperationResult>;

  /**
   * Cambia el slug canónico de una identidad de forma atómica, transicionando el anterior.
   */
  changeCanonicalSlug(
    identityId: string,
    newSlug: string,
    reason: SlugReason,
    audit: SlugAuditMetadata
  ): Promise<PublicIdentityOperationResult>;

  /**
   * Fusiona la identidad de origen con la de destino de forma atómica.
   */
  mergeIdentities(
    sourceId: string,
    targetId: string,
    audit: SlugAuditMetadata
  ): Promise<PublicIdentityOperationResult>;

  /**
   * Resuelve una identidad y su ruta a partir de un slug solicitado.
   */
  resolveIdentityBySlug(
    entityType: PublicEntityType,
    slug: string
  ): Promise<{
    identity: PublicIdentity;
    requestedSlug: string;
    canonicalSlug: string;
    resolutionType: "canonical" | "alias" | "merged";
    redirectsToIdentityId: string | null;
  } | null>;

  /**
   * Busca una identidad por su ID primario.
   */
  findById(id: string): Promise<PublicIdentity | null>;

  /**
   * Busca una identidad por el UUID interno y tipo de la entidad editorial.
   */
  findByEntity(entityType: PublicEntityType, entityUuid: string): Promise<PublicIdentity | null>;

  /**
   * Comprueba si un slug ya se encuentra reservado para un tipo de entidad.
   */
  isSlugTaken(slug: string, entityType: PublicEntityType, excludeEntityUuid?: string): Promise<boolean>;

  /**
   * Obtiene el slug canónico activo de una identidad pública.
   */
  getCanonicalSlug(identityId: string): Promise<string | null>;

  /**
   * Actualiza únicamente el estado de publicación de la identidad.
   */
  updateStatus(id: string, status: IdentityStatus): Promise<void>;

  /**
   * Congela o descongela una identidad pública.
   */
  setFrozen(id: string, isFrozen: boolean): Promise<void>;
}

// === IMPLEMENTACIÓN CONCURRENTE EN MEMORIA (IN MEMORY MUTEX) ===

class SimpleMutex {
  private queue: Promise<void> = Promise.resolve();

  async acquire(): Promise<() => void> {
    let release: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const current = this.queue;
    this.queue = next;
    await current;
    return release!;
  }
}

const globalLocks = new Map<string, SimpleMutex>();
function getIdentityLock(id: string): SimpleMutex {
  let lock = globalLocks.get(id);
  if (!lock) {
    lock = new SimpleMutex();
    globalLocks.set(id, lock);
  }
  return lock;
}

export class InMemoryPublicIdentityRepository implements PublicIdentityRepository {
  public identities = new Map<string, PublicIdentity>();
  public slugs: Array<{
    id: string;
    identityId: string;
    entityType: PublicEntityType;
    slug: string;
    kind: SlugKind;
    reason: SlugReason;
    redirectsToIdentityId: string | null;
    userId: string | null;
    source: string | null;
    operationId: string | null;
    note: string | null;
    createdAt: string;
  }> = [];

  async registerIdentity(
    entityUuid: string,
    entityType: PublicEntityType,
    slug: string,
    status: IdentityStatus,
    audit: SlugAuditMetadata
  ): Promise<PublicIdentityOperationResult> {
    // Validar restricción única en base de datos: unique_public_entity
    for (const idObj of this.identities.values()) {
      if (idObj.entityType === entityType && idObj.entityUuid === entityUuid) {
        throw new Error(`unique_public_entity violation: ${entityType} ${entityUuid}`);
      }
    }

    // Validar restricción única global: unique_public_slug
    const cleanSlug = slug.toLowerCase().trim();
    const exists = this.slugs.some((s) => s.entityType === entityType && s.slug === cleanSlug);
    if (exists) {
      throw new Error(`unique_public_slug violation: ${entityType} ${slug}`);
    }

    const identityId = crypto.randomUUID();
    const now = new Date().toISOString();
    const operationId = crypto.randomUUID();

    const newIdentity: PublicIdentity = {
      id: identityId,
      entityType,
      entityUuid,
      status,
      isFrozen: false,
      hasEverBeenPublished: status === "published",
      mergedIntoIdentityId: null,
      createdAt: now,
      updatedAt: now,
    };

    this.identities.set(identityId, newIdentity);

    this.slugs.push({
      id: crypto.randomUUID(),
      identityId,
      entityType,
      slug,
      kind: "canonical",
      reason: "created",
      redirectsToIdentityId: null,
      userId: audit.userId || null,
      source: audit.source || null,
      operationId,
      note: audit.note || null,
      createdAt: now,
    });

    return {
      schemaVersion: 1,
      identityId,
      canonicalSlug: slug,
      aliasesCreated: 0,
      redirectRequired: false,
      hasChanged: true,
      operation: "registered",
    };
  }

  async changeCanonicalSlug(
    identityId: string,
    newSlug: string,
    reason: SlugReason,
    audit: SlugAuditMetadata
  ): Promise<PublicIdentityOperationResult> {
    const release = await getIdentityLock(identityId).acquire();
    try {
      const identity = this.identities.get(identityId);
      if (!identity) {
        throw new Error(`Identity not found: ${identityId}`);
      }

      if (identity.isFrozen) {
        throw new Error("Identity is frozen and cannot be modified");
      }

      const currentCanonical = this.slugs.find(
        (s) => s.identityId === identityId && s.kind === "canonical"
      );

      // Idempotencia
      if (currentCanonical && currentCanonical.slug === newSlug) {
        return {
          schemaVersion: 1,
          identityId,
          canonicalSlug: currentCanonical.slug,
          aliasesCreated: 0,
          redirectRequired: false,
          hasChanged: false,
          operation: "unchanged",
        };
      }

      // Validar formato
      const formatPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
      if (!formatPattern.test(newSlug) || newSlug.length < SLUG_CONFIG.MIN_LENGTH || newSlug.length > SLUG_CONFIG.MAX_LENGTH) {
        throw new Error(`valid_slug_format constraint violation: ${newSlug}`);
      }

      // Validar colisión de forma síncrona
      const cleanNewSlug = newSlug.toLowerCase().trim();
      const isTaken = this.slugs.some((s) => {
        if (s.entityType !== identity.entityType || s.slug !== cleanNewSlug) return false;
        const ownerIdentity = this.identities.get(s.identityId);
        if (ownerIdentity && ownerIdentity.entityUuid === identity.entityUuid) return false;
        return true;
      });
      if (isTaken) {
        throw new Error(`unique_public_slug violation: ${identity.entityType} ${newSlug}`);
      }

      const now = new Date().toISOString();
      const operationId = crypto.randomUUID();
      let aliasesCreated = 0;

      if (currentCanonical) {
        if (!identity.hasEverBeenPublished) {
          // Si nunca ha sido publicado: eliminación física
          this.slugs = this.slugs.filter((s) => s.id !== currentCanonical.id);
        } else {
          // Publicado alguna vez: convertir a alias
          currentCanonical.kind = "alias";
          currentCanonical.reason = "renamed";
          currentCanonical.userId = audit.userId || null;
          currentCanonical.source = audit.source || null;
          currentCanonical.operationId = operationId;
          currentCanonical.note = "Retired from canonical";
          aliasesCreated = 1;
        }
      }

      // Insertar nuevo canónico
      this.slugs.push({
        id: crypto.randomUUID(),
        identityId,
        entityType: identity.entityType,
        slug: newSlug,
        kind: "canonical",
        reason,
        redirectsToIdentityId: null,
        userId: audit.userId || null,
        source: audit.source || null,
        operationId,
        note: audit.note || null,
        createdAt: now,
      });

      // Actualizar updated_at
      identity.updatedAt = now;

      return {
        schemaVersion: 1,
        identityId,
        canonicalSlug: newSlug,
        aliasesCreated,
        redirectRequired: true,
        hasChanged: true,
        operation: "renamed",
      };
    } finally {
      release();
    }
  }

  async mergeIdentities(
    sourceId: string,
    targetId: string,
    audit: SlugAuditMetadata
  ): Promise<PublicIdentityOperationResult> {
    if (sourceId === targetId) {
      throw new Error("Cannot merge an identity into itself");
    }

    // Bloqueo ordenado por UUID para evitar deadlocks
    const [id1, id2] = [sourceId, targetId].sort();
    const release1 = await getIdentityLock(id1).acquire();
    const release2 = await getIdentityLock(id2).acquire();

    try {
      const source = this.identities.get(sourceId);
      const target = this.identities.get(targetId);

      if (!source || !target) {
        throw new Error("One or both identities not found");
      }

      if (source.isFrozen || target.isFrozen) {
        throw new Error("One or both identities are frozen");
      }

      if (source.entityType !== target.entityType) {
        throw new Error("Cannot merge identities of different entity types");
      }

      if (source.status === "merged") {
        throw new Error("Source identity is already merged");
      }

      if (target.status === "merged") {
        throw new Error("Cannot merge into an already merged target identity");
      }

      const targetCanonical = this.slugs.find(
        (s) => s.identityId === targetId && s.kind === "canonical"
      );

      if (!targetCanonical) {
        throw new Error("Target identity has no canonical slug");
      }

      const now = new Date().toISOString();
      const operationId = crypto.randomUUID();
      let aliasesCreated = 0;

      // Actualizar todos los slugs de la identidad origen
      this.slugs.forEach((s) => {
        if (s.identityId === sourceId) {
          s.kind = "alias";
          s.reason = "merged";
          s.redirectsToIdentityId = targetId;
          s.userId = audit.userId || null;
          s.source = audit.source || null;
          s.operationId = operationId;
          s.note = audit.note || "Merged into target identity";
          aliasesCreated++;
        }
      });

      // Actualizar estado de identidad origen
      source.status = "merged";
      source.mergedIntoIdentityId = targetId;
      source.updatedAt = now;

      // Actualizar target updated_at
      target.updatedAt = now;

      return {
        schemaVersion: 1,
        identityId: targetId,
        canonicalSlug: targetCanonical.slug,
        aliasesCreated,
        redirectRequired: true,
        hasChanged: true,
        operation: "merged",
      };
    } finally {
      release2();
      release1();
    }
  }

  async resolveIdentityBySlug(
    entityType: PublicEntityType,
    slug: string
  ): Promise<{
    identity: PublicIdentity;
    requestedSlug: string;
    canonicalSlug: string;
    resolutionType: "canonical" | "alias" | "merged";
    redirectsToIdentityId: string | null;
  } | null> {
    const record = this.slugs.find(
      (s) => s.entityType === entityType && s.slug === slug.toLowerCase().trim()
    );

    if (!record) return null;

    const identity = this.identities.get(record.identityId);
    if (!identity) return null;

    if (record.kind === "canonical") {
      return {
        identity: { ...identity },
        requestedSlug: slug,
        canonicalSlug: record.slug,
        resolutionType: "canonical",
        redirectsToIdentityId: null,
      };
    }

    // Es un alias
    if (record.redirectsToIdentityId) {
      // Fusión: seguir de forma recursiva hasta resolver el destino final activo
      let currentTargetId = record.redirectsToIdentityId;
      let depth = 0;

      while (depth < SLUG_CONFIG.MAX_REDIRECT_DEPTH) {
        const targetIdentity = this.identities.get(currentTargetId);
        if (!targetIdentity) {
          throw new Error(`Dangling redirection to identity ${currentTargetId}`);
        }

        if (targetIdentity.status === "merged" && targetIdentity.mergedIntoIdentityId) {
          currentTargetId = targetIdentity.mergedIntoIdentityId;
          depth++;
        } else {
          // Encontrado destino activo
          const canonical = this.slugs.find(
            (s) => s.identityId === targetIdentity.id && s.kind === "canonical"
          );
          if (!canonical) {
            throw new Error(`Target identity ${targetIdentity.id} has no canonical slug`);
          }
          return {
            identity: { ...targetIdentity },
            requestedSlug: slug,
            canonicalSlug: canonical.slug,
            resolutionType: "merged",
            redirectsToIdentityId: record.redirectsToIdentityId,
          };
        }
      }

      throw new Error(`Circular or deep redirection exceeded MAX_REDIRECT_DEPTH: ${slug}`);
    } else {
      // Renombre simple: resolver al canónico activo de su propia identidad
      const canonical = this.slugs.find(
        (s) => s.identityId === record.identityId && s.kind === "canonical"
      );
      if (!canonical) {
        throw new Error(`Identity ${record.identityId} has no canonical slug`);
      }
      return {
        identity: { ...identity },
        requestedSlug: slug,
        canonicalSlug: canonical.slug,
        resolutionType: "alias",
        redirectsToIdentityId: null,
      };
    }
  }

  async findById(id: string): Promise<PublicIdentity | null> {
    const res = this.identities.get(id);
    return res ? { ...res } : null;
  }

  async findByEntity(entityType: PublicEntityType, entityUuid: string): Promise<PublicIdentity | null> {
    for (const identity of this.identities.values()) {
      if (identity.entityType === entityType && identity.entityUuid === entityUuid) {
        return { ...identity };
      }
    }
    return null;
  }

  async isSlugTaken(slug: string, entityType: PublicEntityType, excludeEntityUuid?: string): Promise<boolean> {
    const searchSlug = slug.toLowerCase().trim();
    const record = this.slugs.find((s) => s.entityType === entityType && s.slug === searchSlug);
    if (!record) return false;

    if (excludeEntityUuid) {
      const ownerIdentity = this.identities.get(record.identityId);
      if (ownerIdentity && ownerIdentity.entityUuid === excludeEntityUuid) {
        return false; // El slug ya le pertenece a la misma entidad
      }
    }

    return true;
  }

  async getCanonicalSlug(identityId: string): Promise<string | null> {
    const slugObj = this.slugs.find((s) => s.identityId === identityId && s.kind === "canonical");
    return slugObj ? slugObj.slug : null;
  }

  async updateStatus(id: string, status: IdentityStatus): Promise<void> {
    const identity = this.identities.get(id);
    if (!identity) throw new Error("Identity not found");

    if (identity.isFrozen) {
      throw new Error("Identity is frozen and cannot be modified");
    }

    // Trigger sim: has_ever_been_published reset validation
    if (identity.hasEverBeenPublished && status === "draft") {
      // Wait, is it draft? If it's draft, does has_ever_been_published revert? No, it remains true!
      // But status can change. However, hasEverBeenPublished cannot be reset to false.
    }

    const previousStatus = identity.status;
    
    // Validar restricción valid_identity_merge_state
    if (
      (status === "merged" && (!identity.mergedIntoIdentityId || identity.mergedIntoIdentityId === id)) ||
      (status !== "merged" && identity.mergedIntoIdentityId !== null)
    ) {
      throw new Error("valid_identity_merge_state constraint violation");
    }

    identity.status = status;
    if (status === "published") {
      identity.hasEverBeenPublished = true;
    }
    
    if (previousStatus !== status) {
      identity.updatedAt = new Date().toISOString();
    }
  }

  async setFrozen(id: string, isFrozen: boolean): Promise<void> {
    const identity = this.identities.get(id);
    if (!identity) throw new Error("Identity not found");
    identity.isFrozen = isFrozen;
    identity.updatedAt = new Date().toISOString();
  }
}

// === IMPLEMENTACIÓN SUPABASE (SUPABASE CLIENT RPC) ===

export class SupabasePublicIdentityRepository implements PublicIdentityRepository {
  constructor(private supabase: SupabaseClient) {}

  async registerIdentity(
    entityUuid: string,
    entityType: PublicEntityType,
    slug: string,
    status: IdentityStatus,
    audit: SlugAuditMetadata
  ): Promise<PublicIdentityOperationResult> {
    const { data, error } = await this.supabase.rpc("register_public_identity", {
      p_entity_uuid: entityUuid,
      p_entity_type: entityType,
      p_slug: slug,
      p_status: status,
      p_user_id: audit.userId || null,
      p_source: audit.source || null,
      p_note: audit.note || null,
    });

    if (error) {
      throw new Error(`RPC register_public_identity failed: ${error.message}`);
    }

    const row = data?.[0] || data;
    if (!row) throw new Error("No output returned from RPC register_public_identity");

    return {
      schemaVersion: 1,
      identityId: row.identity_id,
      canonicalSlug: row.canonical_slug,
      aliasesCreated: row.aliases_created || 0,
      redirectRequired: row.redirect_required || false,
      hasChanged: row.has_changed || false,
      operation: row.operation,
    };
  }

  async changeCanonicalSlug(
    identityId: string,
    newSlug: string,
    reason: SlugReason,
    audit: SlugAuditMetadata
  ): Promise<PublicIdentityOperationResult> {
    const { data, error } = await this.supabase.rpc("change_canonical_public_slug", {
      p_identity_id: identityId,
      p_new_slug: newSlug,
      p_reason: reason,
      p_user_id: audit.userId || null,
      p_source: audit.source || null,
      p_note: audit.note || null,
    });

    if (error) {
      throw new Error(`RPC change_canonical_public_slug failed: ${error.message}`);
    }

    const row = data?.[0] || data;
    if (!row) throw new Error("No output returned from RPC change_canonical_public_slug");

    return {
      schemaVersion: 1,
      identityId: row.identity_id,
      canonicalSlug: row.canonical_slug,
      aliasesCreated: row.aliases_created || 0,
      redirectRequired: row.redirect_required || false,
      hasChanged: row.has_changed || false,
      operation: row.operation,
    };
  }

  async mergeIdentities(
    sourceId: string,
    targetId: string,
    audit: SlugAuditMetadata
  ): Promise<PublicIdentityOperationResult> {
    const { data, error } = await this.supabase.rpc("merge_public_identities", {
      p_source_id: sourceId,
      p_target_id: targetId,
      p_user_id: audit.userId || null,
      p_source: audit.source || null,
      p_note: audit.note || null,
    });

    if (error) {
      throw new Error(`RPC merge_public_identities failed: ${error.message}`);
    }

    const row = data?.[0] || data;
    if (!row) throw new Error("No output returned from RPC merge_public_identities");

    return {
      schemaVersion: 1,
      identityId: row.identity_id,
      canonicalSlug: row.canonical_slug,
      aliasesCreated: row.aliases_created || 0,
      redirectRequired: row.redirect_required || false,
      hasChanged: row.has_changed || false,
      operation: row.operation,
    };
  }

  async resolveIdentityBySlug(
    entityType: PublicEntityType,
    slug: string
  ): Promise<{
    identity: PublicIdentity;
    requestedSlug: string;
    canonicalSlug: string;
    resolutionType: "canonical" | "alias" | "merged";
    redirectsToIdentityId: string | null;
  } | null> {
    // 1. Obtener la asignación de slugs y unir con identidad
    const cleanSlug = slug.toLowerCase().trim();
    const { data, error } = await this.supabase
      .from("public_slugs")
      .select("*, public_identities(*)")
      .eq("entity_type", entityType)
      .eq("slug", cleanSlug)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to resolve slug by database query: ${error.message}`);
    }

    if (!data) return null;

    const rawIdentity = data.public_identities;
    if (!rawIdentity) return null;

    const identity: PublicIdentity = {
      id: rawIdentity.id,
      entityType: rawIdentity.entity_type,
      entityUuid: rawIdentity.entity_uuid,
      status: rawIdentity.status,
      isFrozen: rawIdentity.is_frozen,
      hasEverBeenPublished: rawIdentity.has_ever_been_published,
      mergedIntoIdentityId: rawIdentity.merged_into_identity_id,
      createdAt: rawIdentity.created_at,
      updatedAt: rawIdentity.updated_at,
    };

    if (data.kind === "canonical") {
      return {
        identity,
        requestedSlug: slug,
        canonicalSlug: data.slug,
        resolutionType: "canonical",
        redirectsToIdentityId: null,
      };
    }

    // Es un alias
    if (data.redirects_to_identity_id) {
      // Fusión: Resolver destino de forma recursiva (soporta múltiples saltos con límite)
      let currentTargetId = data.redirects_to_identity_id;
      let depth = 0;

      while (depth < SLUG_CONFIG.MAX_REDIRECT_DEPTH) {
        const { data: targetData, error: targetError } = await this.supabase
          .from("public_identities")
          .select("*, public_slugs(*)")
          .eq("id", currentTargetId)
          .maybeSingle();

        if (targetError || !targetData) {
          throw new Error(`Target identity ${currentTargetId} not found or query failed`);
        }

        const targetIdentity: PublicIdentity = {
          id: targetData.id,
          entityType: targetData.entity_type,
          entityUuid: targetData.entity_uuid,
          status: targetData.status,
          isFrozen: targetData.is_frozen,
          hasEverBeenPublished: targetData.has_ever_been_published,
          mergedIntoIdentityId: targetData.merged_into_identity_id,
          createdAt: targetData.created_at,
          updatedAt: targetData.updated_at,
        };

        if (targetIdentity.status === "merged" && targetIdentity.mergedIntoIdentityId) {
          currentTargetId = targetIdentity.mergedIntoIdentityId;
          depth++;
        } else {
          // Destino activo
          const canonicalRecord = (targetData.public_slugs as any[] || []).find(
            (s) => s.kind === "canonical"
          );
          if (!canonicalRecord) {
            throw new Error(`Target identity ${targetIdentity.id} has no canonical slug`);
          }
          return {
            identity: targetIdentity,
            requestedSlug: slug,
            canonicalSlug: canonicalRecord.slug,
            resolutionType: "merged",
            redirectsToIdentityId: data.redirects_to_identity_id,
          };
        }
      }

      throw new Error(`Circular or deep redirection exceeded MAX_REDIRECT_DEPTH: ${slug}`);
    } else {
      // Renombre simple: Obtener el slug canónico actual de la misma identidad
      const { data: canonicalRecord, error: canonicalError } = await this.supabase
        .from("public_slugs")
        .select("slug")
        .eq("identity_id", data.identity_id)
        .eq("kind", "canonical")
        .maybeSingle();

      if (canonicalError || !canonicalRecord) {
        throw new Error(`Failed to resolve canonical slug for identity ${data.identity_id}`);
      }

      return {
        identity,
        requestedSlug: slug,
        canonicalSlug: canonicalRecord.slug,
        resolutionType: "alias",
        redirectsToIdentityId: null,
      };
    }
  }

  async findById(id: string): Promise<PublicIdentity | null> {
    const { data, error } = await this.supabase
      .from("public_identities")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`Query findById failed: ${error.message}`);
    if (!data) return null;

    return {
      id: data.id,
      entityType: data.entity_type,
      entityUuid: data.entity_uuid,
      status: data.status,
      isFrozen: data.is_frozen,
      hasEverBeenPublished: data.has_ever_been_published,
      mergedIntoIdentityId: data.merged_into_identity_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async findByEntity(entityType: PublicEntityType, entityUuid: string): Promise<PublicIdentity | null> {
    const { data, error } = await this.supabase
      .from("public_identities")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_uuid", entityUuid)
      .maybeSingle();

    if (error) throw new Error(`Query findByEntity failed: ${error.message}`);
    if (!data) return null;

    return {
      id: data.id,
      entityType: data.entity_type,
      entityUuid: data.entity_uuid,
      status: data.status,
      isFrozen: data.is_frozen,
      hasEverBeenPublished: data.has_ever_been_published,
      mergedIntoIdentityId: data.merged_into_identity_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async isSlugTaken(slug: string, entityType: PublicEntityType, excludeEntityUuid?: string): Promise<boolean> {
    const cleanSlug = slug.toLowerCase().trim();
    if (excludeEntityUuid) {
      // Consultar si pertenece a otra identidad distinta a la excluida
      const { data, error } = await this.supabase
        .from("public_slugs")
        .select("identity_id, public_identities(entity_uuid)")
        .eq("entity_type", entityType)
        .eq("slug", cleanSlug)
        .maybeSingle();

      if (error) throw new Error(`Query isSlugTaken failed: ${error.message}`);
      if (!data) return false;

      const ownerUuid = (data.public_identities as any)?.entity_uuid;
      return ownerUuid !== excludeEntityUuid;
    } else {
      // Simplemente ver si existe
      const { count, error } = await this.supabase
        .from("public_slugs")
        .select("*", { count: "exact", head: true })
        .eq("entity_type", entityType)
        .eq("slug", cleanSlug);

      if (error) throw new Error(`Query isSlugTaken failed: ${error.message}`);
      return (count || 0) > 0;
    }
  }

  async getCanonicalSlug(identityId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("public_slugs")
      .select("slug")
      .eq("identity_id", identityId)
      .eq("kind", "canonical")
      .maybeSingle();

    if (error) throw new Error(`Query getCanonicalSlug failed: ${error.message}`);
    return data ? data.slug : null;
  }

  async updateStatus(id: string, status: IdentityStatus): Promise<void> {
    const { error } = await this.supabase
      .from("public_identities")
      .update({ status })
      .eq("id", id);

    if (error) throw new Error(`Update status failed: ${error.message}`);
  }

  async setFrozen(id: string, isFrozen: boolean): Promise<void> {
    const { error } = await this.supabase
      .from("public_identities")
      .update({ is_frozen: isFrozen })
      .eq("id", id);

    if (error) throw new Error(`Update is_frozen failed: ${error.message}`);
  }
}
