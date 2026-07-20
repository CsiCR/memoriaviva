// Mensajes y Recomendaciones del Motor de Progreso Editorial
// Archivo: src/lib/editorial/progress/progressMessages.ts

import { EditorialProgressRecommendation } from './progressTypes';
import { PROGRESS_ACTION_PRIORITY } from './progressConstants';

export const RECOMMENDATIONS_CATALOG: Record<string, Omit<EditorialProgressRecommendation, "code">> = {
  ADD_CONSENT: {
    priority: PROGRESS_ACTION_PRIORITY.ADD_CONSENT,
    severity: "blocking",
    title: "Agregar consentimiento verificado",
    description: "El aporte no tiene un consentimiento verificado por un editor. Es obligatorio para la publicación."
  },
  RESOLVE_BLOCKING_INDICATOR: {
    priority: PROGRESS_ACTION_PRIORITY.RESOLVE_BLOCKING_INDICATOR,
    severity: "blocking",
    title: "Resolver indicadores bloqueantes",
    description: "Existen indicadores críticos o bloqueantes activos que impiden el progreso editorial."
  },
  ADD_REQUIRED_FILE: {
    priority: PROGRESS_ACTION_PRIORITY.ADD_REQUIRED_FILE,
    severity: "blocking",
    title: "Subir archivo digital utilizable",
    description: "El tipo de aporte requiere al menos un archivo digital utilizable cargado y procesado."
  },
  COMPLETE_DESCRIPTION: {
    priority: PROGRESS_ACTION_PRIORITY.COMPLETE_DESCRIPTION,
    severity: "warning",
    title: "Completar descripción editorial",
    description: "La descripción del aporte es inexistente o demasiado corta (menos de 40 caracteres)."
  },
  START_EDITORIAL_PROCESSING: {
    priority: PROGRESS_ACTION_PRIORITY.START_EDITORIAL_PROCESSING,
    severity: "info",
    title: "Iniciar procesamiento editorial",
    description: "El aporte ha sido recibido. Es necesario iniciar su procesamiento editorial para comenzar."
  },
  START_EDITORIAL_REVIEW: {
    priority: PROGRESS_ACTION_PRIORITY.START_EDITORIAL_REVIEW,
    severity: "info",
    title: "Iniciar revisión editorial",
    description: "El procesamiento inicial ha comenzado. Es necesario iniciar la revisión de contenidos."
  },
  ADD_REVIEW_NOTES: {
    priority: PROGRESS_ACTION_PRIORITY.ADD_REVIEW_NOTES,
    severity: "info",
    title: "Agregar notas de revisión",
    description: "El editor debe registrar notas de revisión internas sobre el contenido del aporte."
  },
  REQUEST_HISTORICAL_VALIDATION: {
    priority: PROGRESS_ACTION_PRIORITY.REQUEST_HISTORICAL_VALIDATION,
    severity: "info",
    title: "Completar validación histórica",
    description: "Es necesario realizar o corroborar la validación histórica del testimonio."
  },
  MARK_READY_FOR_PUBLICATION: {
    priority: PROGRESS_ACTION_PRIORITY.MARK_READY_FOR_PUBLICATION,
    severity: "info",
    title: "Marcar como listo para publicar",
    description: "El progreso editorial está avanzado y no hay bloqueos. Se recomienda clasificar la publicación como lista o programada."
  },
  PUBLISH_CONTRIBUTION: {
    priority: PROGRESS_ACTION_PRIORITY.PUBLISH_CONTRIBUTION,
    severity: "info",
    title: "Publicar el aporte",
    description: "El aporte ha cumplido todos los hitos editoriales y de validación y está listo para publicarse."
  }
};

export function getRecommendation(code: string): EditorialProgressRecommendation {
  const catalogEntry = RECOMMENDATIONS_CATALOG[code];
  if (!catalogEntry) {
    return {
      code,
      priority: 0,
      severity: "info",
      title: `Acción: ${code}`,
      description: "Acción sugerida para avanzar el progreso del aporte."
    };
  }
  return {
    code,
    ...catalogEntry
  };
}
