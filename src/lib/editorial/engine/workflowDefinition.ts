// Declaración del Workflow Editorial (Esquema Declarativo de Etapas y Campos)
// Archivo: src/lib/editorial/engine/workflowDefinition.ts

import { 
  EditorialContribution, 
  EditorialStageEvaluation, 
  EditorialTaskPriority,
  EditorialStageStatus
} from './workflowTypes';

export type ValidatorType =
  | 'requiredText'
  | 'requiredOption'
  | 'consent'
  | 'historicalValidation'
  | 'publicationStatus'
  | 'publicationScheduledAt';

export interface FieldDefinition {
  field: string;
  label: string;
  reason: string;
  targetId: string;
  priority: EditorialTaskPriority;
  required: boolean;
  validator: ValidatorType;
  helpText?: string;
}

export interface StageDefinition {
  key: EditorialStageEvaluation['key'];
  label: string;
  weight: number; // Porcentaje global de avance
  fields: FieldDefinition[];
  resolveDates: (
    contribution: EditorialContribution,
    status: EditorialStageStatus
  ) => { startedAt: string | null; completedAt: string | null; displayDate: string | null };
}

// Catálogo declarativo de etapas del workflow
export const EditorialWorkflowDefinition: StageDefinition[] = [
  {
    key: 'recepcion',
    label: 'Recepción',
    weight: 10,
    fields: [
      {
        field: 'title',
        label: 'Título del material',
        reason: 'El aporte original debe registrar un título descriptivo inicial.',
        targetId: 'original-classification',
        priority: 'critical',
        required: true,
        validator: 'requiredText',
        helpText: 'Indica el nombre descriptivo que aportó el vecino.'
      },
      {
        field: 'contribution_type',
        label: 'Tipo de aporte',
        reason: 'Se debe clasificar el tipo de formato físico del material.',
        targetId: 'original-classification',
        priority: 'critical',
        required: true,
        validator: 'requiredOption',
        helpText: 'Indica si es fotografía, audio, testimonio escrito, etc.'
      },
      {
        field: 'contributors',
        label: 'Ficha del aportante',
        reason: 'El aporte debe estar vinculado a un aportante en el archivo.',
        targetId: 'original-classification',
        priority: 'important',
        required: true,
        validator: 'requiredOption',
        helpText: 'Identificación de la fuente y procedencia del material.'
      }
    ],
    resolveDates: (contribution) => ({
      startedAt: contribution.created_at,
      completedAt: contribution.created_at,
      displayDate: contribution.created_at
    })
  },
  {
    key: 'consentimiento',
    label: 'Consentimiento',
    weight: 20,
    fields: [
      {
        field: 'consent_verified',
        label: 'Consentimiento firmado',
        reason: 'Falta la verificación legal y firma de cesión de derechos por el aportante.',
        targetId: 'original-consent',
        priority: 'critical',
        required: true,
        validator: 'consent',
        helpText: 'Respaldo legal necesario para la difusión pública.'
      }
    ],
    resolveDates: (contribution, status) => {
      const firstConsent = contribution.consent_records?.[0];
      const completedAt = firstConsent?.accepted_at || contribution.updated_at;
      return {
        startedAt: contribution.created_at,
        completedAt: status === 'completed' ? completedAt : null,
        displayDate: status === 'completed' ? completedAt : (status === 'in_progress' ? contribution.updated_at : null)
      };
    }
  },
  {
    key: 'descripcion',
    label: 'Descripción',
    weight: 20,
    fields: [
      {
        field: 'editorial_title',
        label: 'Título editorial',
        reason: 'El título del expediente en el catálogo debe estar normalizado.',
        targetId: 'editorial-title',
        priority: 'critical',
        required: true,
        validator: 'requiredText',
        helpText: 'Título formal asignado por el equipo archivístico.'
      },
      {
        field: 'editorial_description',
        label: 'Descripción editorial',
        reason: 'Falta redactar la descripción detallada del testimonio.',
        targetId: 'editorial-description',
        priority: 'critical',
        required: true,
        validator: 'requiredText',
        helpText: 'Descripción pormenorizada de personas, lugares y sucesos.'
      },
      {
        field: 'editorial_summary',
        label: 'Resumen editorial corto',
        reason: 'Falta un resumen para mostrar en el portal público.',
        targetId: 'editorial-summary',
        priority: 'important',
        required: true,
        validator: 'requiredText',
        helpText: 'Síntesis ejecutiva de lectura rápida para el catálogo.'
      },
      {
        field: 'editorial_context',
        label: 'Contexto histórico ampliado',
        reason: 'Falta vincular el relato con hitos o procesos históricos locales.',
        targetId: 'editorial-context',
        priority: 'important',
        required: true,
        validator: 'requiredText',
        helpText: 'Contextualización y validación académica del testimonio.'
      }
    ],
    resolveDates: (contribution, status) => {
      const completedAt = contribution.editorial_updated_at || contribution.updated_at;
      return {
        startedAt: contribution.created_at,
        completedAt: status === 'completed' ? completedAt : null,
        displayDate: status === 'completed' ? completedAt : (status === 'in_progress' ? contribution.updated_at : null)
      };
    }
  },
  {
    key: 'clasificacion',
    label: 'Clasificación',
    weight: 15,
    fields: [
      {
        field: 'editorial_classification',
        label: 'Clasificación de aporte',
        reason: 'El expediente requiere una clasificación formal en el catálogo.',
        targetId: 'editorial-classification',
        priority: 'critical',
        required: true,
        validator: 'requiredOption',
        helpText: 'Categorización definitiva para filtros de búsqueda.'
      },
      {
        field: 'editorial_status',
        label: 'Estado editorial',
        reason: 'El expediente debe encontrarse en un estado de procesamiento válido (En revisión o superior).',
        targetId: 'editorial-status',
        priority: 'critical',
        required: true,
        validator: 'requiredOption',
        helpText: 'Control de ciclo de vida del expediente.'
      }
    ],
    resolveDates: (contribution, status) => {
      const completedAt = contribution.editorial_updated_at || contribution.updated_at;
      return {
        startedAt: contribution.created_at,
        completedAt: status === 'completed' ? completedAt : null,
        displayDate: status === 'completed' ? completedAt : (status === 'in_progress' ? contribution.updated_at : null)
      };
    }
  },
  {
    key: 'validacion',
    label: 'Validación',
    weight: 15,
    fields: [
      {
        field: 'historical_validation_status',
        label: 'Validación histórica del relato',
        reason: 'Falta realizar o registrar la corroboración contextual por un validador autorizado.',
        targetId: 'historical-validation-status',
        priority: 'critical',
        required: true,
        validator: 'historicalValidation',
        helpText: 'Garantiza la consistencia testimonial frente a fuentes oficiales.'
      }
    ],
    resolveDates: (contribution, status) => {
      const completedAt = contribution.editorial_updated_at || contribution.updated_at;
      return {
        startedAt: contribution.created_at,
        completedAt: status === 'completed' ? completedAt : null,
        displayDate: status === 'completed' ? completedAt : (status === 'in_progress' ? contribution.updated_at : null)
      };
    }
  },
  {
    key: 'publicacion',
    label: 'Publicación',
    weight: 20,
    fields: [
      {
        field: 'publication_title',
        label: 'Título público en portal',
        reason: 'Falta el título final visible por el público general en la web.',
        targetId: 'publication-title',
        priority: 'important',
        required: true,
        validator: 'requiredText',
        helpText: 'Título público adaptado para motores de búsqueda.'
      },
      {
        field: 'publication_excerpt',
        label: 'Extracto público',
        reason: 'Falta la entradilla o fragmento visible en las tarjetas del portal.',
        targetId: 'publication-excerpt',
        priority: 'important',
        required: true,
        validator: 'requiredText',
        helpText: 'Texto introductorio corto de libre acceso.'
      },
      {
        field: 'publication_level',
        label: 'Nivel de publicación',
        reason: 'Falta configurar el nivel de acceso (por ejemplo, A, B, C) en el portal público.',
        targetId: 'publication-level',
        priority: 'important',
        required: true,
        validator: 'requiredOption',
        helpText: 'Define los permisos de visibilidad pública.'
      },
      {
        field: 'publication_credits',
        label: 'Créditos de publicación',
        reason: 'Falta especificar la atribución o autoría de los créditos en el portal.',
        targetId: 'publication-credits',
        priority: 'important',
        required: true,
        validator: 'requiredText',
        helpText: 'Nombre de autoría o anonimato según la preferencia del aportante.'
      },
      {
        field: 'publication_status_option_id',
        label: 'Estado de publicación',
        reason: 'Falta seleccionar la opción de publicación administrativa (Publicable, Programado, etc.).',
        targetId: 'publication-status',
        priority: 'critical',
        required: true,
        validator: 'publicationStatus',
        helpText: 'Controla si el material ya puede ser servido en el portal web.'
      },
      {
        field: 'publication_scheduled_at',
        label: 'Fecha de publicación programada',
        reason: 'Se seleccionó estado programado, pero no se especificó la fecha.',
        targetId: 'publication-status',
        priority: 'critical',
        required: false, // Depende del estado de publicación
        validator: 'publicationScheduledAt',
        helpText: 'Define la fecha automática de publicación.'
      }
    ],
    resolveDates: (contribution, status) => {
      const completedAt = contribution.published_at || contribution.publication_scheduled_at || contribution.updated_at;
      return {
        startedAt: contribution.created_at,
        completedAt: status === 'completed' ? completedAt : null,
        displayDate: status === 'completed' ? completedAt : (status === 'in_progress' ? contribution.updated_at : null)
      };
    }
  }
];
