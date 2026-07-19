// Definición de Tipos del Motor Editorial
// Archivo: src/lib/editorial/types.ts

export interface ContributionInput {
  id?: string;
  title?: string | null;
  description?: string | null;
  internal_notes?: string | null;

  content_type?:
    | "textual"
    | "documentary"
    | "audiovisual"
    | "mixed"
    | null;

  editorial_status: {
    id?: string | null;
    code: string | null;
    name: string | null;
  } | null;

  publication_status: {
    id: string | null;
    code: string | null;
    name: string | null;
  } | null;

  publication_notes?: string | null;
  publication_scheduled_at?: string | null;

  consent_verified: boolean;
  authorization_level: string | null;
  credit_preference: string | null;
  consent_source: string | null;

  historical_validation_status?:
    | "not_evaluated"
    | "pending"
    | "validated"
    | "not_required"
    | null;

  contributor?: {
    full_name: string;
    email?: string | null;
    phone?: string | null;
    relation_to_city?: string | null;
  } | null;

  files?: Array<{
    id?: string;
    file_name: string;
    file_size?: number;
    file_role?: string | null;
    processing_status?: string | null;
  }>;

  consent_records?: Array<{
    accepted_at?: string | null;
    authorization_level?: string | null;
  }>;

  active_indicators?: Array<{
    id: string;
    category: string;
    value: string;
    name: string;
    code: string | null;
    metadata?: {
      blocks_publication?: boolean;
      help_key?: string;
      severity?: "info" | "warning" | "blocking" | "critical";
    } | null;
  }>;
}

export interface EditorialIssue {
  code: string;
  message: string;
  severity: "info" | "warning" | "blocking" | "critical";
  source:
    | "consent"
    | "authorization"
    | "files"
    | "indicator"
    | "editorial_status"
    | "publication_status";
}

export interface EditorialEvaluation {
  eligibleForPublication: boolean;
  editorialProgress: number;
  blockingIndicators: string[];
  warnings: string[];
  missingRequirements: string[];
  issues: EditorialIssue[];
  recommendedEditorialStatus: string | null;
  recommendedPublicationStatus: string | null;
  recommendedNextAction: string;
  summary: string;
  details: string[];
}
