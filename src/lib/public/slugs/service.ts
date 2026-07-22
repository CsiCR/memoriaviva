// Servicio de Lógica Comercial de Identidad Pública y Slugs
// Archivo: src/lib/public/slugs/service.ts

import { PublicIdentityRepository } from "./repository";
import {
  PublicEntityType,
  PublicIdentity,
  PublicIdentityOperationResult,
  PublicIdentityResolution,
  SlugAuditMetadata,
} from "./types";
import { generateSlugCandidate, generateUniqueSlug } from "./generator";
import { evaluateSlugChangePolicy } from "./policy";
import { PUBLIC_ROUTE_SCOPES, SLUG_CONFIG } from "./reserved";

export class PublicIdentityService {
  constructor(private repository: PublicIdentityRepository) {}

  /**
   * Registra una nueva entidad editorial en el Portal de Identidad Pública.
   */
  async registerIdentity(
    entityUuid: string,
    entityType: PublicEntityType,
    title: string,
    initialStatus: PublicIdentity["status"] = "draft",
    audit: SlugAuditMetadata = {}
  ): Promise<PublicIdentityOperationResult> {
    let attempts = 0;
    while (attempts < SLUG_CONFIG.MAX_ALLOCATION_ATTEMPTS) {
      const candidate = generateSlugCandidate(title, "title", audit.userId);
      const slug = await generateUniqueSlug(candidate, entityType, entityUuid, this.repository);

      try {
        return await this.repository.registerIdentity(entityUuid, entityType, slug, initialStatus, {
          userId: audit.userId,
          source: audit.source || "system",
          note: audit.note || "Initial registration",
        });
      } catch (error: any) {
        const msg = error.message || "";
        if (
          msg.includes("unique_public_slug violation") ||
          msg.includes("23505") ||
          msg.includes("already exists")
        ) {
          attempts++;
          continue;
        }
        throw error;
      }
    }
    throw new Error(`Se superó el límite de ${SLUG_CONFIG.MAX_ALLOCATION_ATTEMPTS} reintentos de concurrencia al registrar identidad`);
  }

  /**
   * Actualiza el slug canónico de una entidad basándose en un cambio de título, aplicando políticas y colisiones.
   */
  async updateTitle(
    entityUuid: string,
    entityType: PublicEntityType,
    newTitle: string,
    audit: SlugAuditMetadata = {}
  ): Promise<PublicIdentityOperationResult> {
    const identity = await this.repository.findByEntity(entityType, entityUuid);
    if (!identity) {
      throw new Error(`Identidad pública no encontrada para ${entityType} ${entityUuid}`);
    }

    if (identity.isFrozen) {
      throw new Error("La identidad pública está congelada y no puede modificarse");
    }

    const currentCanonicalSlug = await this.repository.getCanonicalSlug(identity.id);
    let attempts = 0;

    while (attempts < SLUG_CONFIG.MAX_ALLOCATION_ATTEMPTS) {
      const candidate = generateSlugCandidate(newTitle, "title", audit.userId);
      const newSlug = await generateUniqueSlug(candidate, entityType, entityUuid, this.repository);

      const decision = evaluateSlugChangePolicy(identity, newSlug, currentCanonicalSlug);
      if (!decision.allowed) {
        throw new Error(decision.reason || "La evaluación de políticas de slug rechazó la modificación");
      }

      // Idempotencia
      if (newSlug === currentCanonicalSlug) {
        return {
          schemaVersion: 1,
          identityId: identity.id,
          canonicalSlug: currentCanonicalSlug,
          aliasesCreated: 0,
          redirectRequired: false,
          hasChanged: false,
          operation: "unchanged",
        };
      }

      const reason = decision.shouldCreateAlias ? "renamed" : "created";

      try {
        return await this.repository.changeCanonicalSlug(identity.id, newSlug, reason, {
          userId: audit.userId,
          source: audit.source || "editor",
          note: audit.note || `Canonical slug changed to ${newSlug}`,
        });
      } catch (error: any) {
        const msg = error.message || "";
        if (
          msg.includes("unique_public_slug violation") ||
          msg.includes("23505") ||
          msg.includes("already exists")
        ) {
          attempts++;
          continue;
        }
        throw error;
      }
    }
    throw new Error(`Se superó el límite de ${SLUG_CONFIG.MAX_ALLOCATION_ATTEMPTS} reintentos de concurrencia al renombrar slug`);
  }

  /**
   * Actualiza únicamente el estado de publicación de la identidad.
   */
  async updateStatus(
    entityUuid: string,
    entityType: PublicEntityType,
    newStatus: PublicIdentity["status"]
  ): Promise<void> {
    const identity = await this.repository.findByEntity(entityType, entityUuid);
    if (!identity) {
      throw new Error(`Identidad pública no encontrada para ${entityType} ${entityUuid}`);
    }

    await this.repository.updateStatus(identity.id, newStatus);
  }

  /**
   * Fusiona de forma atómica la identidad de origen en la de destino.
   */
  async mergeIdentities(
    sourceUuid: string,
    targetUuid: string,
    entityType: PublicEntityType,
    audit: SlugAuditMetadata = {}
  ): Promise<PublicIdentityOperationResult> {
    if (sourceUuid === targetUuid) {
      throw new Error("No se puede fusionar una identidad consigo misma");
    }

    const source = await this.repository.findByEntity(entityType, sourceUuid);
    const target = await this.repository.findByEntity(entityType, targetUuid);

    if (!source || !target) {
      throw new Error("Una o ambas identidades no fueron encontradas en el registro de identidad pública");
    }

    if (source.isFrozen || target.isFrozen) {
      throw new Error("Una o ambas identidades están congeladas y no pueden participar en una fusión");
    }

    if (source.status === "merged") {
      throw new Error("La identidad de origen ya está fusionada");
    }

    if (target.status === "merged") {
      throw new Error("No se puede fusionar hacia una identidad destino que ya está fusionada");
    }

    // Prevención de ciclos: verificar que el destino no apunte de vuelta al origen
    let currentTarget: PublicIdentity | null = target;
    while (currentTarget && currentTarget.status === "merged" && currentTarget.mergedIntoIdentityId) {
      if (currentTarget.mergedIntoIdentityId === source.id) {
        throw new Error("Fusión circular detectada");
      }
      currentTarget = await this.repository.findById(currentTarget.mergedIntoIdentityId);
    }

    return this.repository.mergeIdentities(source.id, target.id, {
      userId: audit.userId,
      source: audit.source || "editor",
      note: audit.note || `Merged source identity ${source.id} into target ${target.id}`,
    });
  }

  /**
   * Resuelve el direccionamiento público e identifica si requiere una redirección.
   */
  async resolveIdentity(
    entityType: PublicEntityType,
    slug: string
  ): Promise<PublicIdentityResolution | null> {
    const res = await this.repository.resolveIdentityBySlug(entityType, slug);
    if (!res) return null;

    const basePath = PUBLIC_ROUTE_SCOPES[res.identity.entityType] || res.identity.entityType;
    const publicUri = `/${basePath}/${res.canonicalSlug}`;
    const redirectStatus = res.resolutionType !== "canonical" ? 301 : null;

    return {
      schemaVersion: 1,
      identity: res.identity,
      requestedSlug: res.requestedSlug,
      canonicalSlug: res.canonicalSlug,
      publicUri,
      resolutionType: res.resolutionType,
      redirectStatus,
      redirectsToIdentityId: res.redirectsToIdentityId,
    };
  }

  /**
   * Busca una identidad por el UUID interno y tipo de la entidad editorial.
   */
  async findByEntity(entityType: PublicEntityType, entityUuid: string): Promise<PublicIdentity | null> {
    return this.repository.findByEntity(entityType, entityUuid);
  }

  /**
   * Congela o descongela una identidad pública para protegerla de cambios.
   */
  async setFrozen(
    entityUuid: string,
    entityType: PublicEntityType,
    isFrozen: boolean
  ): Promise<void> {
    const identity = await this.repository.findByEntity(entityType, entityUuid);
    if (!identity) {
      throw new Error(`Identidad pública no encontrada para ${entityType} ${entityUuid}`);
    }

    await this.repository.setFrozen(identity.id, isFrozen);
  }
}
