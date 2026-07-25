// Lógica de Evaluación del Workflow Editorial (Engine Core)
// Archivo: src/lib/editorial/engine/evaluateWorkflow.ts

import { 
  EditorialContribution, 
  PublicationStatusOption, 
  EditorialWorkflowEvaluation, 
  EditorialStageEvaluation, 
  EditorialPendingTask, 
  EditorialStageStatus
} from './workflowTypes';
import { EditorialWorkflowDefinition, FieldDefinition } from './workflowDefinition';

// Versión institucional del motor editorial
const ENGINE_VERSION = '1.0.0';
const WORKFLOW_VERSION = 1;

/**
 * Función central de evaluación del workflow editorial
 */
export function evaluateEditorialWorkflow(
  contribution: EditorialContribution,
  publicationStatusOption?: PublicationStatusOption | null
): EditorialWorkflowEvaluation {
  const evaluationDate = new Date().toISOString();
  
  // Determinar si la publicación es programada
  const pubCode = (publicationStatusOption?.code || '').toLowerCase().trim();
  const pubName = (publicationStatusOption?.name || '').toLowerCase().trim();
  const isScheduled = pubCode === 'scheduled' || pubName === 'programado' || pubName.includes('program');
  const isPublished = Boolean(contribution.published_at) || pubCode === 'published' || pubName === 'publicado';

  const stages: EditorialStageEvaluation[] = [];
  const allCritical: EditorialPendingTask[] = [];
  const allImportant: EditorialPendingTask[] = [];
  const allOptional: EditorialPendingTask[] = [];

  // Recorrer las etapas del workflow declaradas en la definición
  for (const stageDef of EditorialWorkflowDefinition) {
    const stageTasks: EditorialPendingTask[] = [];
    let completedFieldsCount = 0;
    let activeFieldsCount = 0;

    // Evaluar cada campo de la etapa
    for (const fieldDef of stageDef.fields) {
      // Si el campo es la fecha programada, solo es activo/necesario si el estado es programado
      if (fieldDef.field === 'publication_scheduled_at' && !isScheduled) {
        continue;
      }

      activeFieldsCount++;
      const isFieldValid = checkField(contribution, fieldDef, publicationStatusOption);

      if (isFieldValid) {
        completedFieldsCount++;
      } else {
        const task: EditorialPendingTask = {
          field: fieldDef.field,
          label: fieldDef.label,
          reason: fieldDef.reason,
          targetFieldId: fieldDef.targetId,
          priority: fieldDef.priority,
          helpText: fieldDef.helpText
        };
        stageTasks.push(task);

        // Agrupar en las listas globales correspondientes
        if (fieldDef.priority === 'critical') {
          allCritical.push(task);
        } else if (fieldDef.priority === 'important') {
          allImportant.push(task);
        } else {
          allOptional.push(task);
        }
      }
    }

    // Calcular el estado de la etapa
    let stageStatus: EditorialStageStatus = 'pending';
    
    // Reglas de estado personalizadas por etapa
    if (stageDef.key === 'consentimiento') {
      const hasConsentRecords = contribution.consent_records && contribution.consent_records.length > 0;
      const hasUpload = Boolean(contribution.consent_file_path);

      if (contribution.consent_verified) {
        stageStatus = 'completed';
      } else if (hasConsentRecords) {
        // Verificar si fue explícitamente denegado en la planilla
        const isRefused = (contribution.consent_records || []).some(
          r => r.accepts_cataloging === false || r.owns_or_has_permission === false
        );
        stageStatus = isRefused ? 'blocked' : 'in_progress';
      } else if (hasUpload) {
        stageStatus = 'in_progress';
      } else {
        stageStatus = 'pending';
      }
    } else if (stageDef.key === 'validacion') {
      const valStatus = (contribution.historical_validation_status || '').toLowerCase().trim();
      if (valStatus === 'validated' || valStatus === 'not_required') {
        stageStatus = 'completed';
      } else if (valStatus === 'rejected') {
        stageStatus = 'blocked';
      } else if (valStatus === 'pending') {
        stageStatus = 'in_progress';
      } else {
        stageStatus = 'pending';
      }
    } else if (stageDef.key === 'publicacion' && isPublished) {
      stageStatus = 'completed';
    } else {
      // Lógica estándar para recepcion, descripcion, clasificacion y publicacion estándar
      if (completedFieldsCount === activeFieldsCount) {
        stageStatus = 'completed';
      } else if (completedFieldsCount > 0) {
        stageStatus = 'in_progress';
      } else {
        stageStatus = 'pending';
      }
    }

    // Porcentaje de completitud de la etapa (0 a 100)
    let stageCompletion = 0;
    if (stageStatus === 'completed') {
      stageCompletion = 100;
    } else if (stageStatus === 'pending' || stageStatus === 'blocked') {
      stageCompletion = 0;
    } else {
      stageCompletion = activeFieldsCount > 0 
        ? Math.round((completedFieldsCount / activeFieldsCount) * 100) 
        : 100;
    }

    // Resolver fechas de la etapa
    const { startedAt, completedAt, displayDate } = stageDef.resolveDates(contribution, stageStatus);

    // Identificar el primer campo incompleto para el targetFieldId de la etapa
    const targetFieldId = stageTasks.length > 0 ? stageTasks[0].targetFieldId : null;

    stages.push({
      key: stageDef.key,
      label: stageDef.label,
      status: stageStatus,
      completionPercentage: stageCompletion,
      startedAt,
      completedAt,
      displayDate,
      pendingTasks: stageTasks,
      targetFieldId
    });
  }

  // Calcular porcentaje de completitud global ponderado
  let totalWeightedCompletion = 0;
  for (const stage of stages) {
    const stageDef = EditorialWorkflowDefinition.find(d => d.key === stage.key);
    const weight = stageDef ? stageDef.weight : 0;
    totalWeightedCompletion += (stage.completionPercentage * weight) / 100;
  }
  const completionPercentage = Math.round(totalWeightedCompletion);

  // Determinar el estado general (overallStatus)
  let overallStatus: EditorialStageStatus = 'pending';
  if (stages.some(s => s.status === 'blocked')) {
    overallStatus = 'blocked';
  } else if (stages.every(s => s.status === 'completed' || s.status === 'not_required')) {
    overallStatus = 'completed';
  } else if (stages.some(s => s.status === 'completed' || s.status === 'in_progress')) {
    overallStatus = 'in_progress';
  }

  // Elegibilidad para publicación
  let publicationEligibility: 'ready' | 'blocked' | 'missingRequirements' = 'ready';
  if (overallStatus === 'blocked') {
    publicationEligibility = 'blocked';
  } else if (allCritical.length > 0) {
    publicationEligibility = 'missingRequirements';
  }

  // Generar relato narrativo del progreso
  const summaryText = buildSummaryText(stages, completionPercentage, overallStatus);

  return {
    overallStatus,
    completionPercentage,
    publicationEligibility,
    stages,
    pendingTasks: allImportant,
    criticalIssues: allCritical,
    warnings: allOptional,
    workflowVersion: WORKFLOW_VERSION,
    engineVersion: ENGINE_VERSION,
    evaluationDate,
    summaryText
  };
}

/**
 * Ejecuta el validador correspondiente para un campo
 */
function checkField(
  contribution: EditorialContribution,
  fieldDef: FieldDefinition,
  publicationStatusOption?: PublicationStatusOption | null
): boolean {
  const value = (contribution as any)[fieldDef.field];

  switch (fieldDef.validator) {
    case 'requiredText':
      return Boolean(String(value ?? '').trim());

    case 'requiredOption':
      return Boolean(value) && String(value).trim() !== '';

    case 'consent':
      return contribution.consent_verified === true;

    case 'historicalValidation':
      const valStatus = (contribution.historical_validation_status || '').toLowerCase().trim();
      return valStatus === 'validated' || valStatus === 'not_required';

    case 'publicationStatus':
      return Boolean(contribution.publication_status_option_id);

    case 'publicationScheduledAt':
      // Si el estado es programado, requiere fecha programada
      const pubCode = (publicationStatusOption?.code || '').toLowerCase().trim();
      const pubName = (publicationStatusOption?.name || '').toLowerCase().trim();
      const isScheduled = pubCode === 'scheduled' || pubName === 'programado' || pubName.includes('program');
      if (isScheduled) {
        return Boolean(contribution.publication_scheduled_at);
      }
      return true;

    default:
      return false;
  }
}

/**
 * Construye un resumen en texto del estado del expediente
 */
function buildSummaryText(
  stages: EditorialStageEvaluation[],
  completionPercentage: number,
  overallStatus: EditorialStageStatus
): string {
  if (overallStatus === 'completed') {
    return 'Ficha editorial completada y lista. El expediente ha cumplido con la totalidad del proceso archivístico.';
  }
  if (overallStatus === 'blocked') {
    return 'El expediente se encuentra bloqueado debido a inconsistencias graves en el consentimiento legal o la validación histórica.';
  }

  const parts: string[] = [];
  parts.push(`El expediente registra un progreso del ${completionPercentage}%.`);

  const pendingStages = stages.filter(s => s.status !== 'completed' && s.status !== 'not_required');
  if (pendingStages.length > 0) {
    const stageNames = pendingStages.map(s => s.label.toLowerCase()).join(', ');
    parts.push(`Aún quedan tareas pendientes en: ${stageNames}.`);
  }

  return parts.join(' ');
}
