// Constantes y Clasificaciones del Motor Editorial
// Archivo: src/lib/editorial/editorialConstants.ts

export const PUBLIC_AUTHORIZATION_CODES = new Set([
  "A",
  "public",
  "public_with_credit",
]);

export const PUBLICATION_ELIGIBLE_EDITORIAL_CODES = new Set([
  "validated",
  "approved_archive",
  "approved_for_archive",
  "completed",
]);

export const INTERMEDIATE_EDITORIAL_CODES = new Set([
  "in_review",
  "in_transcription",
  "transcribed",
  "in_historical_validation",
  "incomplete",
  "editing",
  "historical_validation",
]);

export const INITIAL_EDITORIAL_CODES = new Set([
  "received",
]);

export const HISTORICAL_VALIDATION_SUCCESS_CODES = new Set([
  "historical_validation_completed",
  "historically_validated",
]);

export const INVALID_FILE_STATUSES = new Set([
  "failed",
  "rejected",
  "deleted",
  "missing",
]);

export const ACTION_PRIORITY = {
  critical: 1,
  consent: 2,
  authorization: 3,
  files: 4,
  editorial_status: 5,
  indicator: 6,
  publication_status: 7,
};

export interface ContributionFile {
  id?: string;
  file_name: string;
  file_size?: number;
  file_role?: string | null;
  processing_status?: string | null;
}

export function isUsableEditorialFile(file: ContributionFile): boolean {
  const role = file.file_role || "";
  const isConsent = role.toLowerCase().includes("consent") || role.toLowerCase().includes("legal");
  return (
    !INVALID_FILE_STATUSES.has(file.processing_status ?? "") &&
    !isConsent
  );
}

export function mapStatusToCode(statusName: string | null | undefined): string {
  if (!statusName) return "received";
  const map: Record<string, string> = {
    'Recibido': 'received',
    'Datos incompletos': 'incomplete',
    'En revisión': 'in_review',
    'En transcripción': 'in_transcription',
    'Transcripto': 'transcribed',
    'En validación histórica': 'in_historical_validation',
    'Validado': 'validated',
    'Aprobado para archivo': 'approved_archive',
    'Aprobado para libro': 'approved_book',
    'Aprobado para e-book': 'approved_ebook',
    'Restringido': 'restricted',
    'Rechazado': 'rejected',
    'Archivado': 'archived'
  };
  return map[statusName] || statusName.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

export function mapContributionTypeToContentType(type: string | null | undefined): "textual" | "documentary" | "audiovisual" | "mixed" | null {
  if (!type) return null;
  const lower = type.toLowerCase();
  
  // Normalizaciones para tipos en español del sistema
  if (lower.includes('texto') || lower.includes('escrito') || lower === 'txt' || lower.includes('testimonio escrito')) {
    return 'textual';
  }
  if (lower.includes('audio') || lower.includes('video') || lower.includes('entrevista') || lower === 'aud' || lower === 'vid' || lower.includes('oral')) {
    return 'audiovisual';
  }
  if (lower.includes('foto') || lower.includes('documento') || lower.includes('objeto') || lower === 'fot' || lower === 'doc' || lower === 'obj' || lower.includes('fotografía')) {
    return 'documentary';
  }
  // Si no se puede normalizar, ver si coincide con los literales exactos
  if (['textual', 'documentary', 'audiovisual', 'mixed'].includes(lower)) {
    return lower as "textual" | "documentary" | "audiovisual" | "mixed";
  }
  return 'mixed';
}
