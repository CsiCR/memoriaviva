// Constantes del Motor de Progreso Editorial
// Archivo: src/lib/editorial/progress/progressConstants.ts

import { EditorialProgressStageCode, EditorialProgressStage } from './progressTypes';

export const PROGRESS_ACTION_PRIORITY = {
  ADD_CONSENT: 100,
  RESOLVE_BLOCKING_INDICATOR: 95,
  ADD_REQUIRED_FILE: 90,
  COMPLETE_DESCRIPTION: 80,
  START_EDITORIAL_PROCESSING: 70,
  START_EDITORIAL_REVIEW: 60,
  ADD_REVIEW_NOTES: 50,
  REQUEST_HISTORICAL_VALIDATION: 40,
  MARK_READY_FOR_PUBLICATION: 20,
  PUBLISH_CONTRIBUTION: 10,
} as const;

export const DIMENSION_WEIGHTS = {
  basicIdentification: 10,
  editorialDescription: 10,
  consent: 20,
  files: 15,
  editorialProcessing: 10,
  editorialReview: 10,
  historicalValidation: 15,
  indicators: 5,
  publication: 5,
} as const;

export const STAGES: Record<EditorialProgressStageCode, EditorialProgressStage> = {
  RECEIVED: { code: "RECEIVED", label: "Recibido" },
  EDITORIAL_PROCESSING: { code: "EDITORIAL_PROCESSING", label: "Procesamiento Editorial" },
  DOCUMENTED: { code: "DOCUMENTED", label: "Documentación y Archivos" },
  UNDER_REVIEW: { code: "UNDER_REVIEW", label: "En Revisión Editorial" },
  HISTORICAL_VALIDATION: { code: "HISTORICAL_VALIDATION", label: "Validación Histórica" },
  READY_FOR_PUBLICATION: { code: "READY_FOR_PUBLICATION", label: "Listo para Publicar" },
  PUBLISHED: { code: "PUBLISHED", label: "Publicado" }
};

export const VALID_EDITORIAL_STATUS_CODES = new Set([
  "in_review",
  "in_transcription",
  "transcribed",
  "in_historical_validation",
  "validated",
  "approved_archive",
  "approved_for_archive",
  "approved_book",
  "approved_ebook",
  "restricted",
  "rejected",
  "archived",
  "completed",
]);
