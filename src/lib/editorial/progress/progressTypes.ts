// Definición de Tipos del Motor de Progreso Editorial
// Archivo: src/lib/editorial/progress/progressTypes.ts

export interface EditorialProgressInput {
  contributionId: string;

  title?: string | null;
  description?: string | null;
  contentType?: string | null;

  contributor?: {
    id?: string | null;
    fullName?: string | null;
    birthDate?: string | null;
    birthPlace?: string | null;
    arrivalDate?: string | null;
  } | null;

  consent?: {
    verified: boolean;
    authorizationLevelCode?: string | null;
  } | null;

  files?: Array<{
    id: string;
    statusCode?: string | null;
    mimeType?: string | null;
    filePath?: string | null;
  }>;

  editorialStatus?: {
    id?: string | null;
    code?: string | null;
    name?: string | null;
  } | null;

  publicationStatus?: {
    id?: string | null;
    code?: string | null;
    name?: string | null;
  } | null;

  historicalValidation?: {
    statusCode?: string | null; // "validated" | "pending" | "not_required" | "rejected" | "unknown"
    validatedAt?: string | null;
    validatorName?: string | null;
  } | null;

  indicators?: Array<{
    code: string;
    severity?: "info" | "warning" | "blocking" | "critical";
    isActive?: boolean;
  }>;

  hasEditorialIntervention?: boolean;
  reviewNotes?: string | null;

  dates?: {
    receivedAt?: string | null;
    updatedAt?: string | null;
    publishedAt?: string | null;
  };
}

export type EditorialProgressStageCode =
  | "RECEIVED"
  | "EDITORIAL_PROCESSING"
  | "DOCUMENTED"
  | "UNDER_REVIEW"
  | "HISTORICAL_VALIDATION"
  | "READY_FOR_PUBLICATION"
  | "PUBLISHED";

export interface EditorialProgressStage {
  code: EditorialProgressStageCode;
  label: string;
}

export interface EditorialProgressItem {
  code: string;
  label: string;
  status: "completed" | "pending" | "blocked" | "not_required";
  weight: number;
  earnedWeight: number;
  reason?: string;
}

export interface EditorialProgressRecommendation {
  code: string;
  priority: number;
  severity: "info" | "warning" | "blocking";
  title: string;
  description: string;
}

export interface EditorialProgressDetails {
  basicIdentificationScore: number;
  editorialDescriptionScore: number;
  consentScore: number;
  filesScore: number;
  editorialProcessingScore: number;
  editorialReviewScore: number;
  historicalValidationScore: number;
  indicatorsScore: number;
  publicationScore: number;
}

export interface EditorialProgressResult {
  progress: number; // 0-100

  currentStage: EditorialProgressStage;
  nextStage: EditorialProgressStage | null;

  completedItems: EditorialProgressItem[];
  pendingItems: EditorialProgressItem[];
  blockedItems: EditorialProgressItem[];

  recommendations: EditorialProgressRecommendation[];

  nextAction: EditorialProgressRecommendation | null;
  nextMilestone: string | null;

  completedWeight: number;
  totalWeight: number;

  remainingSteps: number;

  summary: string;

  details: EditorialProgressDetails;

  isPublished: boolean;
  hasPostPublicationInconsistencies: boolean;
  conflicts: string[];
}
