// Política de Publicación de Medios
// Archivo: src/lib/public/policies/media-publication.policy.ts

import { PublicMediaInput } from "../types/media";
import { isUsableEditorialFile } from "../../editorial/editorialConstants";

/**
 * Evalúa si un archivo multimedia individual es apto para exposición pública.
 * 
 * Filtros aplicados consumiendo el motor editorial:
 * - No debe estar en estado fallido, rechazado, eliminado o perdido.
 * - No debe ser un documento legal, planilla firmada o de consentimiento interno.
 */
export function canPublishMedia(file: PublicMediaInput): boolean {
  return isUsableEditorialFile({
    id: file.id,
    file_name: file.file_name,
    file_size: file.file_size,
    file_role: file.file_role,
    processing_status: file.processing_status,
  });
}
