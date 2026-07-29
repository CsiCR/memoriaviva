'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ContributionPrintView } from './ContributionPrintView';
import { updateContributionStatus } from '@/app/actions/contributions';
import { 
  Save, 
  CheckCircle, 
  AlertCircle, 
  Shield, 
  Globe, 
  FileWarning, 
  HelpCircle, 
  FileText, 
  History, 
  Phone, 
  ShieldAlert, 
  Settings, 
  Lock, 
  Circle, 
  XCircle, 
  CheckCircle2, 
  Calendar, 
  Eye, 
  EyeOff,
  Info,
  AlertTriangle
} from 'lucide-react';
import EditorialHelp from './EditorialHelp';
import { 
  evaluateContribution, 
  ContributionInput, 
  mapContributionToProgressInput, 
  evaluateEditorialProgress,
  evaluateEditorialWorkflow
} from '@/lib/editorial';
import { mapStatusToCode, mapContributionTypeToContentType, getQualityRating } from '@/lib/editorial/editorialConstants';
import { EDITORIAL_ENGINE_VERSION, EDITORIAL_PROGRESS_VERSION } from '@/config/version';

interface SelectOption {
  id: string;
  category: string;
  value: string;
  name: string;
  code: string | null;
  display_order: number;
  is_active: boolean;
  is_default: boolean;
  is_system: boolean;
  metadata: any;
}

interface ContributionEditFormProps {
  id: string;
  initialStatus: string;
  initialNotes: string | null;
  initialConsentVerified: boolean;
  initialLevel: string;
  initialCredits: string;
  consentSource: string;
  initialPublicationStatusOptionId: string | null;
  initialPublicationNotes: string | null;
  initialPublicationScheduledAt: string | null;
  initialActiveIndicatorOptionIds: string[];
  // Campos adicionales para el Motor Editorial
  description?: string | null;
  contributionType?: string | null;
  files?: Array<{
    id?: string;
    file_name: string;
    file_size?: number;
    file_role?: string | null;
    processing_status?: string | null;
  }>;
  consentRecords?: Array<{
    accepted_at?: string | null;
    authorization_level?: string | null;
  }>;
  contributor?: Record<string, unknown> | null;
  historicalContext?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
  title?: string | null;
  historicalValidationStatus?: string | null;
  editorName?: string | null;
  // Campos de la Capa Editorial y Publicación
  initialEditorialTitle?: string | null;
  initialEditorialDescription?: string | null;
  initialEditorialSummary?: string | null;
  initialEditorialContext?: string | null;
  initialEditorialClassification?: string | null;
  initialHistoricalValidationNotes?: string | null;
  initialPublicationTitle?: string | null;
  initialPublicationExcerpt?: string | null;
  initialPublicationLevel?: string | null;
  initialPublicationCredits?: string | null;
  editorResponsibleUserId?: string | null;
  validatedByUserId?: string | null;
  publishedByUserId?: string | null;
  editorialUpdatedAt?: string | null;
}

// Mapear nombres de iconos de base de datos a componentes Lucide
const getStatusIcon = (iconName: string) => {
  const iconStyle = { display: 'inline-block', flexShrink: 0 };
  switch (iconName) {
    case 'file-warning': return <FileWarning size={15} style={{ ...iconStyle, color: '#f97316' }} />;
    case 'help-circle': return <HelpCircle size={15} style={{ ...iconStyle, color: '#f97316' }} />;
    case 'file-text': return <FileText size={15} style={{ ...iconStyle, color: '#3b82f6' }} />;
    case 'history': return <History size={15} style={{ ...iconStyle, color: '#a855f7' }} />;
    case 'phone': return <Phone size={15} style={{ ...iconStyle, color: '#f59e0b' }} />;
    case 'shield-alert': return <ShieldAlert size={15} style={{ ...iconStyle, color: '#ef4444' }} />;
    case 'settings': return <Settings size={15} style={{ ...iconStyle, color: '#6366f1' }} />;
    case 'lock': return <Lock size={15} style={{ ...iconStyle, color: '#ef4444' }} />;
    case 'circle': return <Circle size={15} style={{ ...iconStyle, color: '#64748b' }} />;
    case 'x-circle': return <XCircle size={15} style={{ ...iconStyle, color: '#ef4444' }} />;
    case 'check-circle': return <CheckCircle2 size={15} style={{ ...iconStyle, color: '#3b82f6' }} />;
    case 'calendar': return <Calendar size={15} style={{ ...iconStyle, color: '#f59e0b' }} />;
    case 'eye': return <Eye size={15} style={{ ...iconStyle, color: '#22c55e' }} />;
    case 'eye-off': return <EyeOff size={15} style={{ ...iconStyle, color: '#64748b' }} />;
    default: return <Info size={15} style={{ ...iconStyle, color: '#3b82f6' }} />;
  }
};

export default function ContributionEditForm({
  id,
  initialStatus,
  initialNotes,
  initialConsentVerified,
  initialLevel,
  initialCredits,
  consentSource,
  initialPublicationStatusOptionId,
  initialPublicationNotes,
  initialPublicationScheduledAt,
  initialActiveIndicatorOptionIds,
  description,
  contributionType,
  files = [],
  consentRecords = [],
  contributor,
  historicalContext,
  createdAt,
  updatedAt,
  publishedAt,
  title,
  historicalValidationStatus,
  editorName = 'Coordinador',
  initialEditorialTitle,
  initialEditorialDescription,
  initialEditorialSummary,
  initialEditorialContext,
  initialEditorialClassification,
  initialHistoricalValidationNotes,
  initialPublicationTitle,
  initialPublicationExcerpt,
  initialPublicationLevel,
  initialPublicationCredits,
  editorResponsibleUserId,
  validatedByUserId,
  publishedByUserId,
  editorialUpdatedAt
}: ContributionEditFormProps) {
  const [status, setStatus] = useState(initialStatus);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const handleBeforePrint = () => {
      const portal = document.getElementById('print-portal-root');
      const show = document.querySelector('.print-only-show');
      console.info("BeforePrint styles:", {
        portalDisplay: portal ? getComputedStyle(portal).display : 'null',
        showDisplay: show ? getComputedStyle(show).display : 'null',
        portalVisibility: portal ? getComputedStyle(portal).visibility : 'null',
        showVisibility: show ? getComputedStyle(show).visibility : 'null',
      });
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    return () => window.removeEventListener('beforeprint', handleBeforePrint);
  }, []);
  const [notes, setNotes] = useState(initialNotes || '');
  const [consentVerified, setConsentVerified] = useState(initialConsentVerified);
  
  // Nivel y Créditos Originales (Solo Lectura)
  const [level] = useState(initialLevel);
  const [credits] = useState(initialCredits);

  // Estados del Formulario (Nuevas Dimensiones de Publicación)
  const [publicationStatusOptionId, setPublicationStatusOptionId] = useState(initialPublicationStatusOptionId || '');
  const [publicationNotes, setPublicationNotes] = useState(initialPublicationNotes || '');
  const [publicationScheduledAt, setPublicationScheduledAt] = useState(
    initialPublicationScheduledAt ? new Date(initialPublicationScheduledAt).toISOString().slice(0, 16) : ''
  );
  const [activeIndicatorOptionIds, setActiveIndicatorOptionIds] = useState<string[]>(initialActiveIndicatorOptionIds);
  const [indicatorNotes, setIndicatorNotes] = useState('');

  // Nuevos Estados de la Capa Editorial
  const [editorialTitle, setEditorialTitle] = useState(initialEditorialTitle || '');
  const [editorialDescription, setEditorialDescription] = useState(initialEditorialDescription || '');
  const [editorialSummary, setEditorialSummary] = useState(initialEditorialSummary || '');
  const [editorialContext, setEditorialContext] = useState(initialEditorialContext || '');
  const [editorialClassification, setEditorialClassification] = useState(initialEditorialClassification || '');
  const [historicalValidationStatusState, setHistoricalValidationStatusState] = useState(historicalValidationStatus || 'not_evaluated');
  const [historicalValidationNotes, setHistoricalValidationNotes] = useState(initialHistoricalValidationNotes || '');

  // Nuevos Estados de Preparación de Publicación
  const [publicationTitle, setPublicationTitle] = useState(initialPublicationTitle || '');
  const [publicationExcerpt, setPublicationExcerpt] = useState(initialPublicationExcerpt || '');
  const [publicationLevel, setPublicationLevel] = useState(initialPublicationLevel || '');
  const [publicationCredits, setPublicationCredits] = useState(initialPublicationCredits || '');

  // Opciones dinámicas de base de datos
  const [dbOptions, setDbOptions] = useState<Record<string, SelectOption[]>>({
    authorization_level: [],
    credit_preference: [],
    editorial_indicator: [],
    publication_status: []
  });

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicationRejectedAlert, setPublicationRejectedAlert] = useState<{
    missingRequirements: string[];
    retainedStatus: { id: string; code: string; name: string };
  } | null>(null);

  const editorialStatuses = [
    'Recibido', 'Datos incompletos', 'En revisión', 'En transcripción', 'Transcripto',
    'En validación histórica', 'Validado', 'Aprobado para archivo', 'Aprobado para libro',
    'Aprobado para e-book', 'Restringido', 'Rechazado', 'Archivado'
  ];

  useEffect(() => {
    const loadDbOptions = async () => {
      try {
        setLoadingOptions(true);
        const res = await fetch('/api/select-options');
        if (res.ok) {
          const data = await res.json();
          setDbOptions({
            authorization_level: data.authorization_level || [],
            credit_preference: data.credit_preference || [],
            editorial_indicator: data.editorial_indicator || [],
            publication_status: data.publication_status || []
          });

          // Si no hay un estado de publicación inicial, seleccionar el default del catálogo si existe
          if (!initialPublicationStatusOptionId && data.publication_status) {
            const defaultOpt = data.publication_status.find((opt: SelectOption) => opt.is_default);
            if (defaultOpt) {
              setPublicationStatusOptionId(defaultOpt.id);
            }
          }
        }
      } catch (err) {
        console.error('Error loading options in ContributionEditForm:', err);
      } finally {
        setLoadingOptions(false);
      }
    };
    loadDbOptions();
  }, [initialPublicationStatusOptionId]);

  // Filtrar opciones activas o mantener la seleccionada actualmente para visualización histórica
  const getSelectableOptions = (options: SelectOption[], currentValueId: string) => {
    return options.filter(opt => opt.is_active || opt.id === currentValueId);
  };

  // Detectar si el estado de publicación seleccionado requiere fecha programada
  const selectedStatusOpt = dbOptions.publication_status.find(opt => opt.id === publicationStatusOptionId);
  const requiresDate = selectedStatusOpt?.metadata?.requires_publication_date === true;

  const isDirty = useMemo(() => {
    const initialIndsSorted = [...initialActiveIndicatorOptionIds].sort().join(',');
    const currentIndsSorted = [...activeIndicatorOptionIds].sort().join(',');

    const initialDateStr = initialPublicationScheduledAt
      ? new Date(initialPublicationScheduledAt).toISOString().slice(0, 16)
      : '';
    const currentDateStr = publicationScheduledAt
      ? new Date(publicationScheduledAt).toISOString().slice(0, 16)
      : '';

    return (
      status !== initialStatus ||
      notes !== (initialNotes || '') ||
      consentVerified !== initialConsentVerified ||
      publicationStatusOptionId !== (initialPublicationStatusOptionId || '') ||
      publicationNotes !== (initialPublicationNotes || '') ||
      currentDateStr !== initialDateStr ||
      currentIndsSorted !== initialIndsSorted ||
      editorialTitle !== (initialEditorialTitle || '') ||
      editorialDescription !== (initialEditorialDescription || '') ||
      editorialSummary !== (initialEditorialSummary || '') ||
      editorialContext !== (initialEditorialContext || '') ||
      editorialClassification !== (initialEditorialClassification || '') ||
      historicalValidationStatusState !== (historicalValidationStatus || 'not_evaluated') ||
      historicalValidationNotes !== (initialHistoricalValidationNotes || '') ||
      publicationTitle !== (initialPublicationTitle || '') ||
      publicationExcerpt !== (initialPublicationExcerpt || '') ||
      publicationLevel !== (initialPublicationLevel || '') ||
      publicationCredits !== (initialPublicationCredits || '')
    );
  }, [
    status, initialStatus,
    notes, initialNotes,
    consentVerified, initialConsentVerified,
    publicationStatusOptionId, initialPublicationStatusOptionId,
    publicationNotes, initialPublicationNotes,
    publicationScheduledAt, initialPublicationScheduledAt,
    activeIndicatorOptionIds, initialActiveIndicatorOptionIds,
    editorialTitle, initialEditorialTitle,
    editorialDescription, initialEditorialDescription,
    editorialSummary, initialEditorialSummary,
    editorialContext, initialEditorialContext,
    editorialClassification, initialEditorialClassification,
    historicalValidationStatusState, historicalValidationStatus,
    historicalValidationNotes, initialHistoricalValidationNotes,
    publicationTitle, initialPublicationTitle,
    publicationExcerpt, initialPublicationExcerpt,
    publicationLevel, initialPublicationLevel,
    publicationCredits, initialPublicationCredits
  ]);

  const savedProgressResult = useMemo(() => {
    if (loadingOptions) return null;
    try {
      const savedContribution = {
        id,
        title: title || null,
        description: description || null,
        internal_notes: initialNotes || null,
        contribution_type: contributionType,
        consent_verified: initialConsentVerified,
        authorization_level: level,
        credit_preference: credits,
        consent_source: consentSource,
        files: files || [],
        contributors: contributor,
        historical_context: historicalContext,
        created_at: createdAt,
        updated_at: updatedAt,
        published_at: publishedAt,
        editorial_status: initialStatus,
        historical_validation_status: historicalValidationStatus,
        editorial_title: initialEditorialTitle || null,
        editorial_description: initialEditorialDescription || null,
        editorial_summary: initialEditorialSummary || null,
        editorial_context: initialEditorialContext || null,
        editorial_classification: initialEditorialClassification || null,
        historical_validation_notes: initialHistoricalValidationNotes || null,
        publication_title: initialPublicationTitle || null,
        publication_excerpt: initialPublicationExcerpt || null,
        publication_level: initialPublicationLevel || null,
        publication_credits: initialPublicationCredits || null
      };
      
      const savedPubStatusOpt = dbOptions.publication_status.find((o: SelectOption) => o.id === initialPublicationStatusOptionId);
      const savedActiveIndicators = dbOptions.editorial_indicator
        .filter((opt: SelectOption) => initialActiveIndicatorOptionIds.includes(opt.id))
        .map((opt: SelectOption) => ({
          indicator_option_id: opt.id,
          is_active: true,
          opt
        }));

      const progressInput = mapContributionToProgressInput(savedContribution, savedPubStatusOpt, savedActiveIndicators);
      return evaluateEditorialProgress(progressInput);
    } catch (e) {
      console.error("Error calculating saved progress:", e);
      return null;
    }
  }, [
    id, description, initialNotes, contributionType, initialConsentVerified, level, credits, consentSource,
    files, contributor, historicalContext, createdAt, updatedAt, publishedAt,
    dbOptions, initialPublicationStatusOptionId, initialActiveIndicatorOptionIds, loadingOptions,
    title, initialStatus, historicalValidationStatus,
    initialEditorialTitle, initialEditorialDescription, initialEditorialSummary,
    initialEditorialContext, initialEditorialClassification, initialHistoricalValidationNotes,
    initialPublicationTitle, initialPublicationExcerpt, initialPublicationLevel, initialPublicationCredits
  ]);



  const workflowResult = useMemo(() => {
    if (loadingOptions) return null;
    try {
      const contributionData = {
        id,
        title: title || null,
        description: description || null,
        contribution_type: contributionType || null,
        created_at: createdAt || new Date().toISOString(),
        updated_at: updatedAt || new Date().toISOString(),
        published_at: publishedAt || null,
        editorial_updated_at: editorialUpdatedAt || null,
        consent_verified: consentVerified,
        consent_source: consentSource,
        consent_records: (consentRecords || []).map((c: any) => ({
          id: c.id || 'dummy-consent-id',
          accepted_at: c.accepted_at || null,
          authorization_level: c.authorization_level || 'A',
          credit_preference: c.credit_preference || 'Público',
          owns_or_has_permission: c.owns_or_has_permission ?? true,
          accepts_cataloging: c.accepts_cataloging ?? true,
          consent_text_version: c.consent_text_version || '1.0'
        })),
        contributors: contributor ? {
          id: String(contributor.id || ''),
          full_name: String(contributor.full_name || 'Anónimo'),
          dni: contributor.dni ? String(contributor.dni) : null,
          phone: contributor.phone ? String(contributor.phone) : null,
          email: contributor.email ? String(contributor.email) : null
        } : null,
        editorial_title: editorialTitle || null,
        editorial_description: editorialDescription || null,
        editorial_summary: editorialSummary || null,
        editorial_context: editorialContext || null,
        editorial_classification: editorialClassification || null,
        editorial_status: status || null,
        historical_validation_status: historicalValidationStatusState || null,
        historical_validation_notes: historicalValidationNotes || null,
        publication_title: publicationTitle || null,
        publication_excerpt: publicationExcerpt || null,
        publication_level: publicationLevel || null,
        publication_credits: publicationCredits || null,
        publication_status_option_id: publicationStatusOptionId || null,
        publication_scheduled_at: publicationScheduledAt || null
      };

      const currentPubStatusOpt = dbOptions.publication_status.find((o: SelectOption) => o.id === publicationStatusOptionId);
      const pubOptParsed = currentPubStatusOpt ? {
        id: currentPubStatusOpt.id,
        code: currentPubStatusOpt.code,
        name: currentPubStatusOpt.name,
        metadata: currentPubStatusOpt.metadata
      } : null;

      return evaluateEditorialWorkflow(contributionData, pubOptParsed);
    } catch (e) {
      console.error("[WORKFLOW_ENGINE] Error calculating workflow:", e);
      return null;
    }
  }, [
    loadingOptions, id, title, description, contributionType, createdAt, updatedAt, publishedAt, editorialUpdatedAt,
    consentVerified, consentSource, consentRecords, contributor,
    editorialTitle, editorialDescription, editorialSummary, editorialContext,
    editorialClassification, status, historicalValidationStatusState, historicalValidationNotes,
    publicationTitle, publicationExcerpt, publicationLevel, publicationCredits,
    publicationStatusOptionId, publicationScheduledAt, dbOptions.publication_status
  ]);

  const workflowTrafficLight = useMemo(() => {
    if (!workflowResult) return 'yellow';
    if (workflowResult.overallStatus === 'completed') return 'green';
    if (workflowResult.overallStatus === 'blocked') return 'red';
    if (workflowResult.overallStatus === 'in_progress') return 'orange';
    return 'yellow';
  }, [workflowResult]);

  const workflowNextTask = useMemo(() => {
    if (!workflowResult) return null;
    return (
      workflowResult.criticalIssues?.[0] ||
      workflowResult.pendingTasks?.[0] ||
      workflowResult.warnings?.[0] ||
      null
    );
  }, [workflowResult]);

  const recommendedNextAction = useMemo(() => {
    return workflowNextTask
      ? `Completar ${workflowNextTask.label.toLowerCase()}`
      : 'Todo el proceso editorial está completado';
  }, [workflowNextTask]);

  const recommendedNextActionDescription = useMemo(() => {
    return workflowNextTask
      ? workflowNextTask.reason
      : 'El expediente está listo para revisión final o publicación.';
  }, [workflowNextTask]);

  const recommendedNextActionTarget = useMemo(() => {
    return workflowNextTask
      ? workflowNextTask.targetFieldId
      : null;
  }, [workflowNextTask]);

  const qualityRating = useMemo(() => {
    return getQualityRating(workflowResult?.completionPercentage || 0);
  }, [workflowResult?.completionPercentage]);

  const historicalReliabilityStars = useMemo(() => {
    if (historicalValidationStatusState === 'validated' || historicalValidationStatusState === 'not_required') {
      return 5;
    }
    if (historicalValidationStatusState === 'rejected') {
      return 1;
    }
    return 3;
  }, [historicalValidationStatusState]);

  const historicalReliabilityLabel = useMemo(() => {
    if (historicalValidationStatusState === 'validated' || historicalValidationStatusState === 'not_required') {
      return 'Alta';
    }
    if (historicalValidationStatusState === 'rejected') {
      return 'Baja';
    }
    return 'Pendiente';
  }, [historicalValidationStatusState]);

  // Checklist de Revisión Profesional (Manual)
  const [reviewProfessionalChecklist, setReviewProfessionalChecklist] = useState({
    names: false,
    spelling: false,
    attachmentsQuality: false,
    publicationLevel: false,
    sensitiveData: false
  });
  
  // Conteo manual
  const manualCheckedCount = Object.values(reviewProfessionalChecklist).filter(Boolean).length;

  const handleNavigation = (targetId: string, label?: string) => {
    if (!targetId) return;

    // Agregar temporalmente registros de diagnóstico
    console.info("Editorial navigation", {
      label: label || targetId,
      target: targetId,
      matches: document.querySelectorAll(`#${CSS.escape(targetId)}`).length
    });

    // Verificación defensiva
    const matches = document.querySelectorAll(`#${CSS.escape(targetId)}`);
    if (matches.length !== 1) {
      console.error(`Target inválido o duplicado: ${targetId}`, matches.length);
      return;
    }

    const element = matches[0] as HTMLElement;

    // 1. Abrir contenedores colapsados
    let parent = element.parentElement;
    while (parent) {
      if (parent.tagName === 'DETAILS') {
        (parent as HTMLDetailsElement).open = true;
      }
      if (parent.classList.contains('collapsed')) {
        parent.classList.remove('collapsed');
      }
      if (parent.getAttribute('aria-expanded') === 'false') {
        parent.setAttribute('aria-expanded', 'true');
      }
      parent = parent.parentElement;
    }

    // 2. Scroll suave y centrado (o al inicio para el asistente)
    if (targetId === 'editorial-assistant-section') {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // 3. Resaltar campo
    element.classList.remove('field-highlight');
    const existingBadge = element.querySelector('.recommended-field-badge');
    if (existingBadge) {
      existingBadge.remove();
    }

    // Forzar reflow
    void element.offsetWidth;
    element.classList.add('field-highlight');

    // Agregar etiqueta flotante temporal
    const isReadOnly = targetId.startsWith('original-');
    const badge = document.createElement('span');
    badge.className = 'recommended-field-badge';
    if (isReadOnly) {
      badge.innerText = 'ℹ Evidencia del aporte original (Solo Lectura).';
      badge.style.backgroundColor = '#64748b'; // slate grey
    } else {
      badge.innerText = '✔ Ahora estás editando este requisito editorial.';
    }
    
    const originalPosition = element.style.position;
    if (!originalPosition || originalPosition === 'static') {
      element.style.position = 'relative';
    }
    element.appendChild(badge);

    // 4. Focus si es editable y no está inhabilitado
    if (!isReadOnly) {
      const input = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT'
        ? element
        : element.querySelector('input:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled]), select:not([disabled])');

      if (input && !(input as HTMLInputElement).disabled && !(input as HTMLInputElement).readOnly) {
        setTimeout(() => {
          (input as HTMLElement).focus();
        }, 400);
      }
    }

    // Limpiar clases y badge a los 3 segundos
    setTimeout(() => {
      element.classList.remove('field-highlight');
      badge.remove();
      if (!originalPosition || originalPosition === 'static') {
        element.style.position = originalPosition;
      }
    }, 3000);
  };

  // Atajos de Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Shift + M: ir al Asistente Editorial
      if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'M') {
        e.preventDefault();
        handleNavigation('editorial-assistant-section');
      }
      // Ctrl + Shift + P: ir al Progreso Editorial
      else if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'P') {
        e.preventDefault();
        handleNavigation('editorial-progress-section');
      }
      // Alt + ArrowRight (Alt + →): Siguiente acción recomendada
      else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        if (recommendedNextActionTarget) {
          handleNavigation(recommendedNextActionTarget);
        }
      }
      // Alt + ArrowLeft (Alt + ←): Volver al Asistente Editorial
      else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNavigation('editorial-assistant-section');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [recommendedNextActionTarget]);

  const handleIndicatorCheckboxChange = (indicatorId: string, checked: boolean) => {
    if (checked) {
      if (!activeIndicatorOptionIds.includes(indicatorId)) {
        setActiveIndicatorOptionIds([...activeIndicatorOptionIds, indicatorId]);
      }
    } else {
      setActiveIndicatorOptionIds(activeIndicatorOptionIds.filter(id => id !== indicatorId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);

    // Validaciones básicas de fechas en el cliente
    if (requiresDate && !publicationScheduledAt) {
      setError('El estado de publicación "Programado" requiere especificar la fecha.');
      setSaving(false);
      return;
    }

    const formData = new FormData();
    formData.append('editorial_status', status);
    formData.append('internal_notes', notes);
    formData.append('consent_verified', String(consentVerified));
    formData.append('authorization_level', level);
    formData.append('credit_preference', credits);
    
    // Nuevas dimensiones
    formData.append('publication_status_option_id', publicationStatusOptionId);
    formData.append('publication_notes', publicationNotes);
    formData.append('publication_scheduled_at', publicationScheduledAt ? new Date(publicationScheduledAt).toISOString() : '');
    formData.append('active_indicator_option_ids', JSON.stringify(activeIndicatorOptionIds));
    formData.append('indicator_notes', indicatorNotes);

    // Nuevos campos de la Capa Editorial y Publicación
    formData.append('editorial_title', editorialTitle);
    formData.append('editorial_description', editorialDescription);
    formData.append('editorial_summary', editorialSummary);
    formData.append('editorial_context', editorialContext);
    formData.append('editorial_classification', editorialClassification);
    formData.append('historical_validation_status', historicalValidationStatusState);
    formData.append('historical_validation_notes', historicalValidationNotes);
    formData.append('publication_title', publicationTitle);
    formData.append('publication_excerpt', publicationExcerpt);
    formData.append('publication_level', publicationLevel);
    formData.append('publication_credits', publicationCredits);

    try {
      const res = await updateContributionStatus(id, formData);
      if (res && !res.success && res.publicationRejected) {
        setSuccess(true); // Se guardaron los cambios editoriales
        setPublicationRejectedAlert({
          missingRequirements: res.missingRequirements,
          retainedStatus: res.retainedPublicationStatus
        });
        if (res.retainedPublicationStatus?.id) {
          setPublicationStatusOptionId(res.retainedPublicationStatus.id);
        }
      } else {
        setSuccess(true);
        setPublicationRejectedAlert(null);
        setIndicatorNotes(''); // Limpiar notas temporales de indicadores
        
        // Limpiar mensaje de éxito tras 4 segundos
        setTimeout(() => setSuccess(false), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al guardar los cambios editoriales.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingOptions) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
        Cargando opciones editoriales...
      </div>
    );
  }

  const getActiveStage = () => {
    if (!workflowResult) return "recepcion";
    const firstIncomplete = workflowResult.stages.find(
      s => s.status !== 'completed' && s.status !== 'not_required'
    );
    return firstIncomplete ? firstIncomplete.key : "publicacion";
  };
  const activeStageKey = getActiveStage();

  return (
    <form id="editorial-progress-section" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Alertas de Resultado */}
      {success && !publicationRejectedAlert && (
        <div className="alert alert-success" style={{ padding: '0.6rem 0.85rem', fontSize: '0.85rem', margin: 0 }}>
          <CheckCircle size={16} />
          <span>¡Dimensiones editoriales y de publicación guardadas exitosamente en la base de datos!</span>
        </div>
      )}

      {publicationRejectedAlert && (
        <div className="alert alert-warning" style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', color: '#b45309' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
            <AlertTriangle size={18} />
            <span>Los cambios editoriales fueron guardados, pero el aporte no pudo ser publicado</span>
          </div>
          <div style={{ fontSize: '0.85rem' }}>
            Para poder activar la publicación web pública, el aporte debe cumplir con todos los requisitos de elegibilidad. Requisitos faltantes:
            <ul style={{ margin: '0.35rem 0 0 1.25rem', padding: 0 }}>
              {publicationRejectedAlert.missingRequirements.map((req, idx) => (
                <li key={idx} style={{ listStyleType: 'disc' }}>{req}</li>
              ))}
            </ul>
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 500, marginTop: '0.25rem' }}>
            Se retuvo el estado de publicación anterior: <strong>{publicationRejectedAlert.retainedStatus.name}</strong>.
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ padding: '0.6rem 0.85rem', fontSize: '0.85rem', margin: 0 }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* SECCIÓN DEL ASISTENTE EDITORIAL Y EXPEDIENTE */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* CARÁTULA DEL EXPEDIENTE EDITORIAL (Archivo Histórico Moderno) */}
        <div className="dossier-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <span className="dossier-label">Archivo Histórico Comunitario</span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.25rem 0', color: '#1e293b', fontFamily: 'Courier New, Courier, monospace' }}>
                EXPEDIENTE MV-{createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear()}-{id.substring(0, 6).toUpperCase()}
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                Fondo: <strong>Memoria Viva</strong> &middot; Serie: <strong>Testimonios ({contributionType || 'Mixto'})</strong>
              </p>
            </div>
            <div>
              {/* Sello de Estado */}
              {workflowTrafficLight === 'green' && (
                <span className="dossier-header-stamp dossier-stamp-approved">Aprobado</span>
              )}
              {workflowTrafficLight === 'yellow' && (
                <span className="dossier-header-stamp dossier-stamp-pending">Revisión</span>
              )}
              {workflowTrafficLight === 'orange' && (
                <span className="dossier-header-stamp dossier-stamp-pending">Incompleto</span>
              )}
              {workflowTrafficLight === 'red' && (
                <span className="dossier-header-stamp dossier-stamp-incomplete">No Publicable</span>
              )}
            </div>
          </div>

          <hr style={{ border: 0, borderTop: '2px dashed #cbd5e1', margin: '0 0 1.5rem 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <span className="dossier-label">Título del Testimonio</span>
              <div className="dossier-value" style={{ fontSize: '1rem' }}>{title || 'MV-TESTIMONIO-SIN-TITULO'}</div>
            </div>
            <div>
              <span className="dossier-label">Ingreso y Custodia</span>
              <div className="dossier-value">
                {createdAt ? new Date(createdAt).toLocaleDateString('es-AR') : '—'} &middot; {editorName}
              </div>
            </div>
            <div>
              <span className="dossier-label">Nivel de Acceso Legal</span>
              <div className="dossier-value">
                Nivel {level || 'A'} ({credits || 'Público'})
              </div>
            </div>
            <div>
              <span className="dossier-label">Confiabilidad Histórica</span>
              <div style={{ color: '#eab308', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '1rem', letterSpacing: '0.05em' }}>
                  {'★'.repeat(historicalReliabilityStars)}
                  {'☆'.repeat(5 - historicalReliabilityStars)}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginLeft: '0.25rem' }}>
                  ({historicalReliabilityLabel})
                </span>
              </div>
            </div>
          </div>

          {/* Línea de tiempo archivística */}
          <div style={{ margin: '1.5rem 0' }}>
            <span className="dossier-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Línea de Tiempo del Expediente</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              {workflowResult?.stages.map((stage) => {
                let color = '#94a3b8';
                let icon = '○';
                if (stage.status === 'completed' || stage.status === 'not_required') {
                  color = '#16a34a';
                  icon = '✓';
                } else if (stage.status === 'in_progress') {
                  color = '#d97706';
                  icon = '⏳';
                } else if (stage.status === 'blocked') {
                  color = '#dc2626';
                  icon = '🚫';
                }

                const dateText = stage.displayDate 
                  ? new Date(stage.displayDate).toLocaleDateString('es-AR')
                  : stage.status === 'not_required' ? 'No requerida' : 'Pendiente';

                return (
                  <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem' }}>
                    <span style={{ color, fontWeight: 700 }}>{icon} {stage.label}</span>
                    <span style={{ color: '#64748b', fontSize: '0.7rem' }}>{dateText}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    window.print();
                  });
                });
              }}
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
            >
              🖨️ Imprimir Expediente
            </button>
          </div>
        </div>

        {/* 🤖 ASISTENTE EDITORIAL */}
        <div id="editorial-assistant-section" style={{
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          padding: '1.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          scrollMarginTop: '100px'
        }}>
          {/* Encabezado con Semáforo Editorial */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <h4 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🤖</span> Asistente Editorial 
            </h4>
            
            {/* Semáforo Editorial */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f8fafc', padding: '0.4rem 0.85rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
              <span style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: workflowTrafficLight === 'green' ? '#16a34a' : workflowTrafficLight === 'yellow' ? '#eab308' : workflowTrafficLight === 'orange' ? '#f97316' : '#ef4444',
                boxShadow: `0 0 8px ${workflowTrafficLight === 'green' ? '#16a34a' : workflowTrafficLight === 'yellow' ? '#eab308' : workflowTrafficLight === 'orange' ? '#f97316' : '#ef4444'}`,
                display: 'inline-block'
              }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#334155' }}>
                {workflowResult?.overallStatus === 'completed' && '🟢 Listo para publicar'}
                {workflowResult?.overallStatus === 'pending' && '🟡 Necesita revisión'}
                {workflowResult?.overallStatus === 'in_progress' && '🟠 Incompleto'}
                {workflowResult?.overallStatus === 'blocked' && '🔴 Bloqueado'}
              </span>
            </div>
          </div>

          <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#475569', fontStyle: 'italic' }}>
            {workflowResult?.summaryText}
          </p>

          <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '0 0 1.25rem 0' }} />

          {/* Stepper Interactivo */}
          <div className="stepper-container">
            <div className="stepper-line" />
            {workflowResult?.stages.map((stage, idx) => {
              const isActive = activeStageKey === stage.key;
              const isCompleted = stage.status === 'completed' || stage.status === 'not_required';
              const isBlocked = stage.status === 'blocked';
              
              let className = `stepper-stage ${isActive ? 'active' : ''} `;
              if (isCompleted) {
                className += 'completed';
              } else if (isBlocked) {
                className += 'blocked';
              } else {
                className += 'warning';
              }

              const targetId = stage.targetFieldId || 'editorial-progress-section';

              return (
                <button
                  key={stage.key}
                  type="button"
                  onClick={() => handleNavigation(targetId, `Stepper: ${stage.label}`)}
                  className={className}
                >
                  <div className="stepper-dot">
                    {isCompleted ? '✓' : isBlocked ? '✗' : String(idx + 1)}
                  </div>
                  <span className="stepper-label">{stage.label}</span>
                </button>
              );
            })}
          </div>

          {/* Índice de Calidad Editorial */}
          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', margin: '1.5rem 0' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progreso Editorial</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a' }}>{workflowResult?.completionPercentage || 0}%</span>
                <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>
                  ({workflowResult?.completionPercentage || 0}/100 pts)
                </span>
              </div>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a', backgroundColor: '#eff6ff', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
              💡 {qualityRating.text} (Nivel {qualityRating.grade})
            </span>
          </div>

          {/* Wizard / Próximo Paso */}
          {workflowResult && workflowResult.completionPercentage >= 90 ? (
            /* MODO REVISIÓN FINAL */
            <div style={{
              border: '1px dashed #f59e0b',
              borderRadius: '8px',
              backgroundColor: '#fffbeb',
              padding: '1.25rem',
              marginTop: '1rem'
            }}>
              <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 700, color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>🔎</span> Modo: Revisión Final Profesional
              </h5>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.8', color: '#78350f' }}>
                El progreso básico automatizado es óptimo ({workflowResult.completionPercentage}%). Revise los siguientes puntos de criterio profesional humano antes de publicar:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#451a03', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={reviewProfessionalChecklist.names}
                    onChange={(e) => setReviewProfessionalChecklist(prev => ({ ...prev, names: e.target.checked }))}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Consistencia de nombres propios mencionados.</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#451a03', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={reviewProfessionalChecklist.spelling}
                    onChange={(e) => setReviewProfessionalChecklist(prev => ({ ...prev, spelling: e.target.checked }))}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Ortografía, puntuación y redacción general de la ficha.</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#451a03', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={reviewProfessionalChecklist.attachmentsQuality}
                    onChange={(e) => setReviewProfessionalChecklist(prev => ({ ...prev, attachmentsQuality: e.target.checked }))}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Calidad de los archivos adjuntos y procesamiento de metadatos.</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#451a03', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={reviewProfessionalChecklist.publicationLevel}
                    onChange={(e) => setReviewProfessionalChecklist(prev => ({ ...prev, publicationLevel: e.target.checked }))}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Nivel de publicación y visibilidad adecuados.</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#451a03', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={reviewProfessionalChecklist.sensitiveData}
                    onChange={(e) => setReviewProfessionalChecklist(prev => ({ ...prev, sensitiveData: e.target.checked }))}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Verificación de datos sensibles o confidencialidad del aportante.</span>
                </label>
              </div>

              {Object.values(reviewProfessionalChecklist).every(Boolean) ? (
                <div style={{ marginTop: '1rem', padding: '0.5rem', backgroundColor: '#dcfce7', borderRadius: '4px', border: '1px solid #bbf7d0', color: '#166534', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span>🎉</span> ¡Revisión profesional finalizada con éxito!
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleNavigation('publication-settings')}
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '1rem', fontSize: '0.8rem' }}
                >
                  Continuar a Configuración de Publicación
                </button>
              )}
            </div>
          ) : (
            /* WIZARD: SIGUIENTE PASO */
            recommendedNextActionTarget && (
              <div style={{
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                padding: '1rem',
                marginTop: '1rem'
              }}>
                <span style={{ fontSize: '0.75rem', color: '#1e3a8a', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                  👉 Próximo paso recomendado:
                </span>
                <strong style={{ fontSize: '0.9rem', color: '#1e3a8a', display: 'block' }}>
                  {recommendedNextAction}
                </strong>
                <p style={{ margin: '0.25rem 0 0.75rem 0', fontSize: '0.75rem', color: '#1e40af' }}>
                  <strong>¿Por qué?</strong>: {recommendedNextActionDescription}
                </p>

                {(recommendedNextActionTarget === 'original-consent' || 
                  recommendedNextActionTarget === 'original-attachments') && (
                  <div style={{ 
                    backgroundColor: '#fff2f2', 
                    borderLeft: '4px solid #ef4444', 
                    padding: '0.6rem 0.85rem', 
                    marginTop: '0.5rem', 
                    marginBottom: '0.75rem', 
                    borderRadius: '4px', 
                    fontSize: '0.75rem', 
                    color: '#991b1b', 
                    fontWeight: 600,
                    lineHeight: '1.25'
                  }}>
                    La información original es insuficiente. Complete la interpretación editorial o registre una observación; no modifique el aporte fuente.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleNavigation(recommendedNextActionTarget, `Asistente: ${recommendedNextAction}`)}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
                >
                  Ir al campo
                </button>
              </div>
            )
          )}
        </div>

        {/* DETALLE DE PROGRESO Y CHECKLISTS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          
          {/* TABLA DE PROGRESO POR DIMENSIONES */}
          <div style={{
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            backgroundColor: '#ffffff',
            padding: '1.25rem',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)'
          }}>
            <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
              Avance Desglosado por Dimensión
            </h5>
            <table className="dimension-table">
              <thead>
                <tr>
                  <th>Etapa</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                  <th style={{ textAlign: 'right' }}>Progreso</th>
                </tr>
              </thead>
              <tbody>
                {workflowResult?.stages.map((stage) => {
                  let statusChar = '⏳';
                  if (stage.status === 'completed' || stage.status === 'not_required') {
                    statusChar = '✅';
                  } else if (stage.status === 'in_progress') {
                    statusChar = '⚠️';
                  } else if (stage.status === 'blocked') {
                    statusChar = '🚫';
                  }

                  return (
                    <tr key={stage.key}>
                      <td>{stage.label}</td>
                      <td style={{ textAlign: 'center' }}>{statusChar}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {stage.completionPercentage}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* CHECKLIST DE TAREAS AUTOMATIZADAS */}
          <div style={{
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            backgroundColor: '#ffffff',
            padding: '1.25rem',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)'
          }}>
            <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
              Tareas Pendientes y Advertencias ({ (workflowResult?.criticalIssues.length || 0) + (workflowResult?.pendingTasks.length || 0) + (workflowResult?.warnings.length || 0) } pendientes)
            </h5>
            
            {workflowResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                
                {/* Tareas Críticas (Bloqueantes) */}
                {workflowResult.criticalIssues.map((task, idx) => (
                  <button
                    key={`crit-${task.field}-${idx}`}
                    type="button"
                    onClick={() => handleNavigation(task.targetFieldId, `Crítico: ${task.label}`)}
                    className="checklist-btn"
                    style={{ 
                      color: '#dc2626', 
                      fontWeight: 700, 
                      textAlign: 'left', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.15rem', 
                      padding: '0.5rem', 
                      backgroundColor: '#fef2f2', 
                      border: '1px solid #fee2e2', 
                      borderRadius: '6px' 
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                      <span>🛑</span>
                      <strong>{task.label} (CRÍTICO)</strong>
                    </div>
                    {task.reason && (
                      <span style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 'normal', paddingLeft: '1.2rem' }}>
                        {task.reason}
                      </span>
                    )}
                  </button>
                ))}

                {/* Tareas Importantes */}
                {workflowResult.pendingTasks.map((task, idx) => (
                  <button
                    key={`pend-${task.field}-${idx}`}
                    type="button"
                    onClick={() => handleNavigation(task.targetFieldId, `Importante: ${task.label}`)}
                    className="checklist-btn"
                    style={{ 
                      color: '#d97706', 
                      fontWeight: 600, 
                      textAlign: 'left', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.15rem', 
                      padding: '0.5rem', 
                      backgroundColor: '#fffbeb', 
                      border: '1px solid #fef3c7', 
                      borderRadius: '6px' 
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                      <span>⏳</span>
                      <strong>{task.label}</strong>
                    </div>
                    {task.reason && (
                      <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 'normal', paddingLeft: '1.2rem' }}>
                        {task.reason}
                      </span>
                    )}
                  </button>
                ))}

                {/* Advertencias / Tareas Opcionales */}
                {workflowResult.warnings.map((task, idx) => (
                  <button
                    key={`warn-${task.field}-${idx}`}
                    type="button"
                    onClick={() => handleNavigation(task.targetFieldId, `Opcional: ${task.label}`)}
                    className="checklist-btn"
                    style={{ 
                      color: '#64748b', 
                      fontWeight: 500, 
                      textAlign: 'left', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.15rem', 
                      padding: '0.5rem', 
                      backgroundColor: '#f8fafc', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '6px' 
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                      <span>⚠️</span>
                      <strong>{task.label} (Opcional)</strong>
                    </div>
                    {task.reason && (
                      <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 'normal', paddingLeft: '1.2rem' }}>
                        {task.reason}
                      </span>
                    )}
                  </button>
                ))}

                {/* Mensaje de completitud */}
                {workflowResult.criticalIssues.length === 0 && workflowResult.pendingTasks.length === 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: '#16a34a', fontWeight: 600, padding: '0.5rem', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '6px' }}>
                    <span>✔</span>
                    <span>¡Todos los controles archivísticos y de publicación obligatorios están resueltos!</span>
                  </div>
                )}

              </div>
            )}
          </div>

        </div>

      </div>


      {/* BLOQUE B: Trabajo Editorial */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '2rem' }}>
        <h4 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
          <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', width: '26px', height: '26px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700 }}>B</span>
          Trabajo Editorial (Interpretación del Archivo)
        </h4>

        {/* Título Editorial */}
        <div id="editorial-title" className="form-group" style={{ borderRadius: '4px', padding: '4px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>Título Editorial</label>
            <button type="button" onClick={(e) => { e.preventDefault(); handleNavigation('editorial-assistant-section', 'Retorno al Asistente'); }} className="return-assistant-btn">
              📍 Ver recomendación editorial
            </button>
          </div>
          <input
            type="text"
            value={editorialTitle}
            onChange={(e) => setEditorialTitle(e.target.value)}
            placeholder="Título normalizado y descriptivo para el catálogo del archivo..."
            className="form-input"
            disabled={saving}
            style={{ height: '40px' }}
          />
        </div>

        {/* Descripción Editorial */}
        <div id="editorial-description" className="form-group" style={{ borderRadius: '4px', padding: '4px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>Descripción Editorial</label>
            <button type="button" onClick={(e) => { e.preventDefault(); handleNavigation('editorial-assistant-section', 'Retorno al Asistente'); }} className="return-assistant-btn">
              📍 Ver recomendación editorial
            </button>
          </div>
          <textarea
            value={editorialDescription}
            onChange={(e) => setEditorialDescription(e.target.value)}
            placeholder="Descripción formal y detallada del testimonio, personas y sucesos..."
            className="form-textarea"
            disabled={saving}
            style={{ minHeight: '100px', fontSize: '0.9rem' }}
          />
        </div>

        <div className="grid grid-2" style={{ gap: '1.5rem' }}>
          {/* Clasificación Editorial */}
          <div id="editorial-classification" className="form-group" style={{ borderRadius: '4px', padding: '4px', position: 'relative', margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>Clasificación de Aporte</label>
              <button type="button" onClick={(e) => { e.preventDefault(); handleNavigation('editorial-assistant-section', 'Retorno al Asistente'); }} className="return-assistant-btn">
                📍 Ver recomendación editorial
              </button>
            </div>
            <select
              value={editorialClassification}
              onChange={(e) => setEditorialClassification(e.target.value)}
              className="form-select"
              disabled={saving}
              style={{ height: '40px' }}
            >
              <option value="">-- Seleccionar clasificación --</option>
              <option value="Testimonio escrito">Testimonio escrito</option>
              <option value="Fotografía">Fotografía</option>
              <option value="Documento">Documento</option>
              <option value="Audio">Audio</option>
              <option value="Video">Video</option>
            </select>
          </div>

          {/* Estado Editorial */}
          <div id="editorial-status" className="form-group" style={{ borderRadius: '4px', padding: '4px', position: 'relative', margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>Estado Editorial</label>
              <button type="button" onClick={(e) => { e.preventDefault(); handleNavigation('editorial-assistant-section', 'Retorno al Asistente'); }} className="return-assistant-btn">
                📍 Ver recomendación editorial
              </button>
              <EditorialHelp helpKey="editorialStatus" initialSelectedValue={status} />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="form-select"
              disabled={saving}
              style={{ height: '40px' }}
            >
              {editorialStatuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Resumen e Interpretación */}
        <div id="editorial-summary" className="form-group" style={{ borderRadius: '4px', padding: '4px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>Resumen / Síntesis Corta</label>
            <button type="button" onClick={(e) => { e.preventDefault(); handleNavigation('editorial-assistant-section', 'Retorno al Asistente'); }} className="return-assistant-btn">
              📍 Ver recomendación editorial
            </button>
          </div>
          <textarea
            value={editorialSummary}
            onChange={(e) => setEditorialSummary(e.target.value)}
            placeholder="Resumen ejecutivo del testimonio para catálogos y búsquedas rápidas..."
            className="form-textarea"
            disabled={saving}
            style={{ minHeight: '60px', fontSize: '0.9rem' }}
          />
        </div>

        {/* Contexto Histórico Editorial */}
        <div id="editorial-context" className="form-group" style={{ borderRadius: '4px', padding: '4px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>Contexto Histórico Ampliado</label>
            <button type="button" onClick={(e) => { e.preventDefault(); handleNavigation('editorial-assistant-section', 'Retorno al Asistente'); }} className="return-assistant-btn">
              📍 Ver recomendación editorial
            </button>
          </div>
          <textarea
            value={editorialContext}
            onChange={(e) => setEditorialContext(e.target.value)}
            placeholder="Vinculación del testimonio con hitos históricos locales, geografía, o procesos sociopolíticos de Pico Truncado..."
            className="form-textarea"
            disabled={saving}
            style={{ minHeight: '80px', fontSize: '0.9rem' }}
          />
        </div>

        {/* Validación Histórica */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#f8fafc' }}>
          <h5 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>🕵️</span> Validación Histórica del Relato
          </h5>
          <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
            <div id="historical-validation-status" className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Estado de Validación</label>
              <select
                value={historicalValidationStatusState}
                onChange={(e) => setHistoricalValidationStatusState(e.target.value)}
                className="form-select"
                disabled={saving}
                style={{ height: '40px' }}
              >
                <option value="not_evaluated">No Evaluado</option>
                <option value="pending">Pendiente de Corroboración</option>
                <option value="validated">Validado Históricamente</option>
                <option value="not_required">No Requerida (Folleto/Material Gráfico)</option>
                <option value="rejected">Rechazado (Inconsistencias Graves)</option>
              </select>
            </div>

            <div id="historical-validation-notes" className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Notas de Validación</label>
              <input
                type="text"
                value={historicalValidationNotes}
                onChange={(e) => setHistoricalValidationNotes(e.target.value)}
                placeholder="Evidencia de archivos, cruce de fuentes o notas del validador..."
                className="form-input"
                disabled={saving}
                style={{ height: '40px' }}
              />
            </div>
          </div>
        </div>

        {/* Indicadores Editoriales Checkboxes */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
            Indicadores de Control Activos (Múltiples simultáneos)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
            {dbOptions.editorial_indicator.map((opt) => {
              const isChecked = activeIndicatorOptionIds.includes(opt.id);
              const blocksPub = opt.metadata?.blocks_publication === true;
              const helpKey = opt.metadata?.help_key;

              return (
                <div 
                  key={opt.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem', 
                    border: isChecked ? '1px solid #cbd5e1' : '1px solid #e2e8f0', 
                    borderRadius: '6px', 
                    backgroundColor: isChecked ? '#f8fafc' : '#ffffff',
                    transition: 'all 0.2s'
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, margin: 0, flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleIndicatorCheckboxChange(opt.id, e.target.checked)}
                      disabled={saving}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      {getStatusIcon(opt.metadata?.icon)}
                      <span style={{ textDecoration: opt.is_active ? 'none' : 'line-through', color: opt.is_active ? 'inherit' : '#94a3b8' }}>
                        {opt.name}
                      </span>
                    </span>
                  </label>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {blocksPub && (
                      <span title="Bloquea Publicación" style={{ fontSize: '0.65rem', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 'bold' }}>
                        🛡️ Bloquea
                      </span>
                    )}
                    {helpKey && (
                      <EditorialHelp helpKey={`indicators.${helpKey}`} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notas sobre la resolución del indicador */}
        {activeIndicatorOptionIds.length !== initialActiveIndicatorOptionIds.length && (
          <div className="form-group" style={{ marginTop: '0.5rem' }}>
            <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Nota de Auditoría sobre Indicadores (Opcional, ej: Motivo de alta/resolución)
            </label>
            <input
              type="text"
              value={indicatorNotes}
              onChange={(e) => setIndicatorNotes(e.target.value)}
              placeholder="Ej: Archivos adjuntos re-procesados y verificados."
              className="form-input"
              disabled={saving}
              style={{ fontSize: '0.85rem', height: '36px' }}
            />
          </div>
        )}

        {/* Observaciones Editoriales Internas */}
        <div id="internal-notes" className="form-group" style={{ margin: 0, borderRadius: '4px', padding: '4px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>Observaciones Editoriales Internas (Bitácora)</label>
            <button type="button" onClick={(e) => { e.preventDefault(); handleNavigation('editorial-assistant-section', 'Retorno al Asistente'); }} className="return-assistant-btn">
              📍 Ver recomendación editorial
            </button>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Escribe observaciones de control histórico, notas sobre la transcripción o comentarios internos aquí..."
            className="form-textarea"
            disabled={saving}
            style={{ minHeight: '80px', fontSize: '0.9rem' }}
          />
        </div>
      </div>

      {/* BLOQUE C: Preparación para Publicación */}
      <div id="publication-settings" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', borderRadius: '4px', padding: '4px', position: 'relative' }}>
        <h4 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b', flexWrap: 'wrap' }}>
          <span style={{ backgroundColor: '#fff7ed', color: '#ea580c', width: '26px', height: '26px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700 }}>C</span>
          Preparación para Publicación
          <button type="button" onClick={(e) => { e.preventDefault(); handleNavigation('editorial-assistant-section', 'Retorno al Asistente'); }} className="return-assistant-btn">
            📍 Ver recomendación editorial
          </button>
        </h4>

        {selectedStatusOpt?.code === 'publishable' && workflowResult?.publicationEligibility !== 'ready' && (
          <div style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fef3c7',
            borderRadius: '8px',
            padding: '1rem',
            color: '#b45309',
            fontSize: '0.85rem',
            fontWeight: 500
          }}>
            <strong>⚠️ Advertencia Administrativa</strong>: El estado administrativo indica &ldquo;Publicable&rdquo;, pero el Motor Editorial detecta requisitos pendientes. Revise la evaluación antes de publicar.
          </div>
        )}

        <div className="grid grid-2" style={{ gap: '1.5rem' }}>
          {/* Título Público */}
          <div id="publication-title" className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Título Público en Portal</label>
            <input
              type="text"
              value={publicationTitle}
              onChange={(e) => setPublicationTitle(e.target.value)}
              placeholder="Título atractivo y adecuado para la difusión web pública..."
              className="form-input"
              disabled={saving}
              style={{ height: '40px' }}
            />
          </div>

          {/* Créditos públicos */}
          <div id="publication-credits" className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Créditos de Publicación</label>
            <input
              type="text"
              value={publicationCredits}
              onChange={(e) => setPublicationCredits(e.target.value)}
              placeholder="Ej: Familia González / Aportante Anónimo..."
              className="form-input"
              disabled={saving}
              style={{ height: '40px' }}
            />
          </div>
        </div>

        {/* Extracto Público */}
        <div id="publication-excerpt" className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>Extracto Público (Exhibición Web)</label>
          <textarea
            value={publicationExcerpt}
            onChange={(e) => setPublicationExcerpt(e.target.value)}
            placeholder="Breve introducción o copete para captar la atención del lector en el portal..."
            className="form-textarea"
            disabled={saving}
            style={{ minHeight: '60px', fontSize: '0.9rem' }}
          />
        </div>

        <div className="grid grid-3" style={{ gap: '1rem' }}>
          {/* Nivel de Acceso */}
          <div id="publication-level" className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Nivel de Acceso</label>
            <select
              value={publicationLevel}
              onChange={(e) => setPublicationLevel(e.target.value)}
              className="form-select"
              disabled={saving}
              style={{ height: '40px' }}
            >
              <option value="">-- Seleccionar nivel --</option>
              <option value="A">Nivel A (Acceso Abierto)</option>
              <option value="B">Nivel B (Fines de Investigación)</option>
              <option value="C">Nivel C (Restringido Temporal)</option>
              <option value="D">Nivel D (Confidencialidad Total)</option>
            </select>
          </div>

          {/* Estado de Publicación */}
          <div className="form-group" style={{ margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>Estado de Publicación</label>
              {selectedStatusOpt?.metadata?.help_key && (
                <EditorialHelp helpKey={`publication.${selectedStatusOpt.metadata.help_key}`} />
              )}
            </div>
            <select
              value={publicationStatusOptionId}
              onChange={(e) => setPublicationStatusOptionId(e.target.value)}
              className="form-select"
              disabled={saving}
              style={{ height: '40px' }}
            >
              {getSelectableOptions(dbOptions.publication_status, publicationStatusOptionId).map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
          </div>

          {/* Mostrar condicionalmente campo de fecha programada */}
          {requiresDate && (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                Fecha Programada
              </label>
              <input
                type="datetime-local"
                value={publicationScheduledAt}
                onChange={(e) => setPublicationScheduledAt(e.target.value)}
                className="form-input"
                disabled={saving}
                style={{ height: '40px' }}
                required={true}
              />
            </div>
          )}
        </div>

        {/* Notas de Publicación */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>Notas de Publicación</label>
          <textarea
            value={publicationNotes}
            onChange={(e) => setPublicationNotes(e.target.value)}
            placeholder="Aclaraciones sobre las condiciones de exhibición, autorizaciones especiales o detalles de programación..."
            className="form-textarea"
            disabled={saving}
            style={{ minHeight: '60px', fontSize: '0.9rem' }}
          />
        </div>

        {/* Nota de advertencia legal de publicación */}
        <div style={{ padding: '0.85rem', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', fontSize: '0.8rem', color: '#b45309', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <Shield size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.15rem' }}>Advertencia de Responsabilidad Editorial</span>
            La activación pública de este aporte se realiza bajo responsabilidad directa del equipo editorial de coordinación. Todo material publicado queda sujeto a auditoría automatizada de derechos de autor y elegibilidad posterior.
          </div>
        </div>
      </div>

      {/* Botón de Envió */}
      <button
        type="submit"
        className="btn btn-primary"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', padding: '0.85rem', fontSize: '0.95rem', fontWeight: 600 }}
        disabled={saving}
      >
        <Save size={18} /> {saving ? 'Guardando cambios editoriales...' : 'Guardar Ficha Editorial Multidimensional'}
      </button>

      {/* EXPEDIENTE IMPRIMIBLE A DOS PÁGINAS A4 (RENDEREADO VÍA PORTAL FUERA DEL FORMULARIO) */}
      {mounted && typeof document !== 'undefined' && document.getElementById('print-portal-root') && createPortal(
        <ContributionPrintView
          id={id}
          createdAt={createdAt}
          updatedAt={updatedAt}
          publishedAt={publishedAt}
          editorialUpdatedAt={editorialUpdatedAt}
          title={title}
          editorialTitle={editorialTitle}
          contributionType={contributionType}
          editorialClassification={editorialClassification}
          status={status}
          publicationLevel={publicationLevel}
          level={level}
          editorName={editorName}
          editorResponsibleUserId={editorResponsibleUserId}
          validatedByUserId={validatedByUserId}
          publishedByUserId={publishedByUserId}
          qualityIndex={workflowResult?.completionPercentage || 0}
          qualityText={qualityRating.text}
          historicalReliabilityStars={historicalReliabilityStars}
          historicalReliabilityLabel={historicalReliabilityLabel}
          selectedStatusName={selectedStatusOpt?.name || 'No publicado'}
          notes={notes}
          contributor={contributor}
          consentRecords={consentRecords}
          consentSource={consentSource}
          historicalValidationStatusState={historicalValidationStatusState}
          historicalValidationStatus={historicalValidationStatus}
          workflowResult={workflowResult}
        />,
        document.getElementById('print-portal-root')!
      )}
    </form>
  );
}
