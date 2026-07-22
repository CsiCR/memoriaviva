// Mapper Principal de Aportes Públicos
// Archivo: src/lib/public/mappers/to-public-contribution.ts

import { ContributionInput } from "../../editorial/types";
import { mapContributionTypeToContentType } from "../../editorial/editorialConstants";
import { PublicContribution, PublicHistoricalDate } from "../types/contribution";
import { PublicMediaInput } from "../types/media";
import { publicContributionSchema } from "../validation/contribution.schema";
import { assertContributionCanBePublished } from "../policies/contribution-publication.policy";
import { canPublishMedia } from "../policies/media-publication.policy";
import { toPublicCredits } from "./to-public-credits";
import { toPublicMedia } from "./to-public-media";
import {
  toPublicPlaceReference,
  toPublicPersonReferences,
  toPublicInstitutionReferences,
  toPublicReferences,
  slugify,
} from "./to-public-reference";

/**
 * Deduce el MIME type a partir de la extensión del nombre de archivo como fallback seguro.
 */
export function mimeTypeFromFileName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "m4a":
      return "audio/m4a";
    case "mp4":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}

/**
 * Mapea y normaliza las fechas del aporte en un único objeto coherente PublicHistoricalDate.
 * Resuelve incongruencias calculando año y década a partir de la fecha exacta si existe.
 */
function formatArgentinaDate(isoDateStr: string): string {
  const parts = isoDateStr.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return isoDateStr;
}

export function toPublicHistoricalDate(
  exactDate: string | null | undefined,
  approximateDecade: string | null | undefined
): PublicHistoricalDate {
  if (exactDate) {
    const parts = exactDate.split("-");
    const year = parseInt(parts[0], 10);
    if (!isNaN(year)) {
      const decade = Math.floor(year / 10) * 10;
      return {
        precision: "exact",
        isoDate: exactDate,
        year: year,
        decade: decade,
        displayLabel: `Fecha exacta: ${formatArgentinaDate(exactDate)}`,
      };
    }
  }

  if (approximateDecade) {
    const decadeNum = parseInt(approximateDecade.replace(/\D/g, ""), 10);
    if (!isNaN(decadeNum)) {
      return {
        precision: "decade",
        isoDate: null,
        year: null,
        decade: decadeNum,
        displayLabel: `Década de ${decadeNum}`,
      };
    }
  }

  return {
    precision: "unknown",
    isoDate: null,
    year: null,
    decade: null,
    displayLabel: "Fecha desconocida",
  };
}

/**
 * Normaliza los tipos de aporte editorial a las categorías públicas admitidas.
 * Consume la función de normalización del motor editorial central para evitar duplicidad de lógica.
 */
export function mapEditorialTypeToPublicContentType(
  type: string | null | undefined
): "textual" | "documentary" | "audiovisual" | "mixed" {
  const mapped = mapContributionTypeToContentType(type);
  if (mapped === "textual" || mapped === "documentary" || mapped === "audiovisual" || mapped === "mixed") {
    return mapped;
  }
  return "mixed";
}

/**
 * Transforma un aporte del sistema editorial a un contrato público Whitelist.
 * 
 * Este mapper garantiza de forma absoluta que ningún dato privado (email, teléfono,
 * notas internas) o rutas del Storage privado se serialicen en la salida.
 */
export function toPublicContribution(
  contribution: ContributionInput,
  overrides?: {
    customDisplayName?: string;
    approvedExternalUrl?: string | null;
  }
): PublicContribution {
  // 1. Validar políticas de exposición pública
  assertContributionCanBePublished(contribution);

  // 2. Mapeo explícito (Whitelist, sin spread operators sobre entidades editoriales)
  const cRaw = contribution as unknown as Record<string, unknown>;
  const id = contribution.id || "00000000-0000-0000-0000-000000000000";
  const title = contribution.title || "Aporte sin título";
  const catalogCode = typeof cRaw.catalog_code === "string" ? cRaw.catalog_code : null;
  const updatedAt = typeof cRaw.updated_at === "string" ? cRaw.updated_at : new Date().toISOString();
  const slug = `${slugify(title)}-${slugify(catalogCode || id)}`;

  const exactDate = typeof cRaw.exact_date === "string" ? cRaw.exact_date : null;
  const approximateDecade = typeof cRaw.approximate_decade === "string" ? cRaw.approximate_decade : null;
  const relatedPlaceStr = typeof cRaw.related_place === "string" ? cRaw.related_place : null;
  const mentionedPeopleStr = typeof cRaw.mentioned_people === "string" ? cRaw.mentioned_people : null;
  const relatedInstitutionStr = typeof cRaw.related_institution === "string" ? cRaw.related_institution : null;
  const historicalContextStr = typeof cRaw.historical_context === "string" ? cRaw.historical_context : null;

  const files = contribution.files || [];
  const publicMediaList = files
    .map((f) => {
      const fRaw = f as unknown as Record<string, unknown>;
      const mediaInput: PublicMediaInput = {
        id: f.id || "00000000-0000-0000-0000-000000000000",
        file_name: f.file_name,
        file_size: f.file_size || 0,
        file_type: typeof fRaw.file_type === "string" ? fRaw.file_type : mimeTypeFromFileName(f.file_name),
        file_role: f.file_role,
        processing_status: f.processing_status,
        is_original: typeof fRaw.is_original === "boolean" ? fRaw.is_original : undefined,
      };
      return mediaInput;
    })
    .filter(canPublishMedia)
    .map((mediaInput) => toPublicMedia(mediaInput));

  const publicPayload: PublicContribution = {
    id: id,
    slug: slug,
    title: title,
    contentType: mapEditorialTypeToPublicContentType(contribution.content_type),
    description: contribution.description || null,
    historicalDate: toPublicHistoricalDate(exactDate, approximateDecade),
    relatedPlace: toPublicPlaceReference(relatedPlaceStr),
    mentionedPeople: toPublicPersonReferences(mentionedPeopleStr),
    mentionedInstitutions: toPublicInstitutionReferences(relatedInstitutionStr),
    historicalContext: historicalContextStr,
    catalogCode: catalogCode,
    publishedAt: contribution.publication_scheduled_at || updatedAt,
    updatedAt: updatedAt,
    credits: toPublicCredits(contribution, overrides?.customDisplayName),
    media: publicMediaList,
    references: toPublicReferences(contribution, overrides?.approvedExternalUrl),
  };

  // 3. Validación estricta por Zod
  return publicContributionSchema.parse(publicPayload);
}
