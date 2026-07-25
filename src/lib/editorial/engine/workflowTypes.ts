// Contratos y Tipos del Motor de Progreso Editorial (Workflow Engine)
// Archivo: src/lib/editorial/engine/workflowTypes.ts

export interface EditorialContribution {
  id: string;
  title: string | null;
  description: string | null;
  contribution_type: string | null;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  editorial_updated_at?: string | null;
  consent_verified: boolean;
  consent_source: string | null;
  consent_reference?: string | null;
  consent_file_path?: string | null;
  consent_records?: Array<{
    id: string;
    accepted_at: string | null;
    authorization_level: string;
    credit_preference: string;
    owns_or_has_permission: boolean;
    accepts_cataloging: boolean;
    consent_text_version: string;
  }>;
  contributors?: {
    id: string;
    full_name: string;
    dni?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  editorial_title?: string | null;
  editorial_description?: string | null;
  editorial_summary?: string | null;
  editorial_context?: string | null;
  editorial_classification?: string | null;
  editorial_status?: string | null;
  historical_validation_status?: string | null;
  historical_validation_notes?: string | null;
  publication_title?: string | null;
  publication_excerpt?: string | null;
  publication_level?: string | null;
  publication_credits?: string | null;
  publication_status_option_id?: string | null;
  publication_scheduled_at?: string | null;
}

export interface PublicationStatusOption {
  id: string;
  code: string | null;
  name: string;
  metadata?: {
    color?: string;
    minimum_conditions?: string;
  } | null;
}

export type BuiltInStage =
  | 'recepcion'
  | 'consentimiento'
  | 'descripcion'
  | 'clasificacion'
  | 'validacion'
  | 'publicacion';

export type EditorialStageKey = BuiltInStage | (string & {});

export type EditorialStageStatus =
  | 'completed'
  | 'in_progress'
  | 'pending'
  | 'blocked'
  | 'not_required';

export type EditorialTaskPriority =
  | 'critical'
  | 'important'
  | 'optional';

export interface EditorialPendingTask {
  field: string;
  label: string;
  reason: string;
  targetFieldId: string;
  priority: EditorialTaskPriority;
  helpText?: string;
}

export interface EditorialStageEvaluation {
  key: EditorialStageKey;
  label: string;
  status: EditorialStageStatus;
  completionPercentage: number;
  startedAt: string | null;
  completedAt: string | null;
  displayDate: string | null;
  pendingTasks: EditorialPendingTask[];
  targetFieldId: string | null;
}

export interface EditorialWorkflowEvaluation {
  overallStatus: EditorialStageStatus;
  completionPercentage: number; // 0 a 100
  publicationEligibility: 'ready' | 'blocked' | 'missingRequirements';
  stages: EditorialStageEvaluation[];
  pendingTasks: EditorialPendingTask[];
  criticalIssues: EditorialPendingTask[];
  warnings: EditorialPendingTask[];
  workflowVersion: number;
  engineVersion: string;
  evaluationDate: string; // ISO string
  summaryText?: string;
}
