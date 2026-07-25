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

export const EDITORIAL_ACTION_TARGETS: Record<string, string> = {
  // exact target IDs
  "editorial-description": "editorial-description",
  "editorial-status": "editorial-status",
  "classification": "editorial-classification",
  "internal-notes": "internal-notes",
  "historical-validation": "historical-validation-status",
  "consent": "original-consent",
  "attachments": "original-attachments",
  "publication-settings": "publication-settings",
  "editorial-title": "editorial-title",
  "editorial-context": "editorial-context",
  "historical-validation-status": "historical-validation-status",
  "historical-validation-notes": "historical-validation-notes",
  "publication-title": "publication-title",
  "publication-excerpt": "publication-excerpt",
  "publication-level": "publication-level",
  "publication-credits": "publication-credits",
  "editorial-classification": "editorial-classification",

  // rule codes / names
  description_required: "editorial-description",
  eligible_status_required: "editorial-status",
  classification_required: "editorial-classification",
  internal_notes_required: "internal-notes",
  historical_validation_required: "historical-validation-status",
  consent_required: "original-consent",
  attachments_review_required: "original-attachments",
  publication_ready_required: "publication-settings",

  // progress item codes
  BASIC_INFO: "editorial-classification",
  DESCRIPTION: "editorial-description",
  CONSENT: "original-consent",
  FILES: "original-attachments",
  EDITORIAL_PROCESSING: "editorial-status",
  EDITORIAL_REVIEW: "internal-notes",
  HISTORICAL_VAL: "historical-validation-status",
  INDICATORS: "editorial-status",
  PUBLICATION: "publication-settings",

  // progress recommendation codes
  ADD_CONSENT: "original-consent",
  RESOLVE_BLOCKING_INDICATOR: "editorial-status",
  ADD_REQUIRED_FILE: "original-attachments",
  COMPLETE_DESCRIPTION: "editorial-description",
  START_EDITORIAL_PROCESSING: "editorial-status",
  START_EDITORIAL_REVIEW: "editorial-status",
  ADD_REVIEW_NOTES: "internal-notes",
  REQUEST_HISTORICAL_VALIDATION: "historical-validation-status",
  MARK_READY_FOR_PUBLICATION: "publication-settings",
  PUBLISH_CONTRIBUTION: "publication-settings",

  // issue sources
  authorization: "original-consent",
  files: "original-attachments",
  editorial_status: "editorial-status",
  indicator: "editorial-status",
  publication_status: "publication-settings",
  critical: "editorial-status"
};

export function getEditorialTarget(key: string | null | undefined): string | undefined {
  if (!key) return undefined;
  return EDITORIAL_ACTION_TARGETS[key] || 
         EDITORIAL_ACTION_TARGETS[key.toUpperCase()] || 
         EDITORIAL_ACTION_TARGETS[key.toLowerCase()];
}

export function getQualityRating(score: number): { grade: string; text: string } {
  if (score >= 98) return { grade: "A+", text: "Excelente. Listo para publicar." };
  if (score >= 90) return { grade: "A", text: "Listo para revisión final." };
  if (score >= 80) return { grade: "B", text: "Buen avance. Faltan aspectos menores." };
  if (score >= 70) return { grade: "C", text: "Progreso regular. Requiere revisión estructural." };
  if (score >= 60) return { grade: "D", text: "Necesita atención urgente." };
  return { grade: "F", text: "Estado inicial o incompleto." };
}

export function getTrafficLight(
  eligibleForPublication: boolean,
  score: number,
  hasBlockingIssues: boolean
): "green" | "yellow" | "orange" | "red" {
  if (eligibleForPublication && score >= 90) {
    return "green";
  }
  if (hasBlockingIssues || score < 40) {
    return "red";
  }
  if (score >= 70) {
    return "yellow";
  }
  return "orange";
}

export function calculateHistoricalReliability(input: {
  hasFiles: boolean;
  validationStatus: string | null | undefined;
  descriptionLength: number;
  hasContributorInfo: boolean;
}): { stars: number; label: "Baja" | "Media" | "Alta" } {
  let stars = 1; // Base rating is 1 star

  if (input.hasFiles) {
    stars += 1;
  }

  const vStatus = (input.validationStatus || "").trim().toLowerCase();
  if (vStatus === "validated" || vStatus === "not_required") {
    stars += 2;
  } else if (vStatus === "pending") {
    stars += 1;
  }

  if (input.descriptionLength >= 40) {
    stars += 1;
  }

  if (input.hasContributorInfo) {
    stars += 1;
  }

  stars = Math.max(1, Math.min(5, stars));

  let label: "Baja" | "Media" | "Alta" = "Baja";
  if (stars >= 4) {
    label = "Alta";
  } else if (stars >= 2) {
    label = "Media";
  }

  return { stars, label };
}
