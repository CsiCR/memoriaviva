// Mapper de Medios Públicos
// Archivo: src/lib/public/mappers/to-public-media.ts

import { PublicMediaInput, PublicMedia, PublicMediaDerivative } from "../types/media";
import { canPublishMedia } from "../policies/media-publication.policy";

/**
 * Normaliza el tipo de archivo (MIME type) a una de las categorías públicas admitidas.
 */
export function getMediaType(mimeType: string): "image" | "audio" | "video" | "document" {
  const lower = mimeType.toLowerCase();
  if (lower.startsWith("image/")) {
    return "image";
  }
  if (lower.startsWith("audio/")) {
    return "audio";
  }
  if (lower.startsWith("video/")) {
    return "video";
  }
  return "document";
}

/**
 * Asigna el rol del archivo público en base a su rol original o su tipo.
 */
export function getMediaRole(
  originalRole: string | null | undefined,
  mediaType: "image" | "audio" | "video" | "document"
): "cover" | "gallery" | "attachment" | "audio" | "video" {
  const role = originalRole?.toLowerCase();
  if (role === "cover") return "cover";
  if (role === "gallery") return "gallery";
  if (role === "attachment") return "attachment";
  if (mediaType === "audio") return "audio";
  if (mediaType === "video") return "video";
  if (mediaType === "image") return "gallery";
  return "attachment";
}

/**
 * Genera una ruta pública controlada para el portal, evitando exponer
 * la ubicación física (file_path) del bucket privado.
 */
export function getSafePublicUrl(id: string): string {
  return `/api/public/media/${id}`;
}

/**
 * Mapea un archivo de aporte a la interfaz PublicMedia Whitelist.
 * 
 * Reglas:
 * - Oculta completamente el nombre original del archivo (file_name) para prevenir fugas de DNI o datos personales.
 * - Oculta la ruta física (file_path) y los nombres de los buckets.
 * - Permite enriquecer metadatos (altText, caption, title) desde los parámetros.
 */
export function toPublicMedia(
  file: PublicMediaInput,
  overrides?: {
    title?: string | null;
    caption?: string | null;
    altText?: string | null;
    role?: "cover" | "gallery" | "attachment" | "audio" | "video";
    publicUrl?: string;
    thumbnailUrl?: string | null;
    downloadSizeBytes?: number | null;
    derivatives?: PublicMediaDerivative[];
  }
): PublicMedia {
  if (!canPublishMedia(file)) {
    throw new Error(`El archivo ${file.id || file.file_name} no está autorizado para exposición pública.`);
  }

  const mediaType = getMediaType(file.file_type);
  const resolvedRole = overrides?.role || getMediaRole(file.file_role, mediaType);
  const resolvedPublicUrl = overrides?.publicUrl || getSafePublicUrl(file.id);

  // downloadSizeBytes se expone únicamente si se solicita explícitamente o es de tipo adjunto descargable
  const resolvedDownloadSize = overrides?.downloadSizeBytes !== undefined 
    ? overrides.downloadSizeBytes 
    : (resolvedRole === "attachment" ? file.file_size : null);

  return {
    id: file.id,
    mediaType: mediaType,
    publicUrl: resolvedPublicUrl,
    thumbnailUrl: overrides?.thumbnailUrl || null,
    title: overrides?.title || null,
    caption: overrides?.caption || null,
    altText: overrides?.altText || null,
    mimeType: file.file_type,
    role: resolvedRole,
    downloadSizeBytes: resolvedDownloadSize,
    derivatives: overrides?.derivatives || [],
  };
}
