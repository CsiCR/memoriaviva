'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Info
} from 'lucide-react';
import EditorialHelp from './EditorialHelp';
import { 
  evaluateContribution, 
  ContributionInput, 
  mapContributionToProgressInput, 
  evaluateEditorialProgress 
} from '@/lib/editorial';
import { mapStatusToCode, mapContributionTypeToContentType } from '@/lib/editorial/editorialConstants';
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
  editorName = 'Coordinador'
}: ContributionEditFormProps) {
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(initialNotes || '');
  const [consentVerified, setConsentVerified] = useState(initialConsentVerified);
  
  // Nivel y Créditos (Solo Lectura)
  const [level] = useState(initialLevel);
  const [credits] = useState(initialCredits);

  // Estados del Formulario (Nuevas Dimensiones)
  const [publicationStatusOptionId, setPublicationStatusOptionId] = useState(initialPublicationStatusOptionId || '');
  const [publicationNotes, setPublicationNotes] = useState(initialPublicationNotes || '');
  const [publicationScheduledAt, setPublicationScheduledAt] = useState(
    initialPublicationScheduledAt ? new Date(initialPublicationScheduledAt).toISOString().slice(0, 16) : ''
  );
  const [activeIndicatorOptionIds, setActiveIndicatorOptionIds] = useState<string[]>(initialActiveIndicatorOptionIds);
  const [indicatorNotes, setIndicatorNotes] = useState('');

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

  // CONSTRUCCIÓN DEL MODELO DE ENTRADA Y EVALUACIÓN MEDIANTE EL MOTOR EDITORIAL (v3.0.0)
  const editorialInput = useMemo<ContributionInput>(() => {
    const mappedContentType = mapContributionTypeToContentType(contributionType);
    const currentPubOpt = dbOptions.publication_status.find(o => o.id === publicationStatusOptionId);
    
    return {
      id,
      title: title || null,
      description: description || null,
      internal_notes: notes || null,
      content_type: mappedContentType,
      editorial_status: {
        id: null,
        code: mapStatusToCode(status),
        name: status
      },
      publication_status: {
        id: publicationStatusOptionId || null,
        code: currentPubOpt?.code || null,
        name: currentPubOpt?.name || null
      },
      publication_notes: publicationNotes || null,
      publication_scheduled_at: publicationScheduledAt || null,
      consent_verified: consentVerified,
      authorization_level: level || null,
      credit_preference: credits || null,
      consent_source: consentSource || null,
      files: (files || []).map((f) => ({
        id: f.id,
        file_name: f.file_name || '',
        file_size: f.file_size || 0,
        file_role: f.file_role || null,
        processing_status: f.processing_status || null
      })),
      consent_records: (consentRecords || []).map((c) => ({
        accepted_at: c.accepted_at || null,
        authorization_level: c.authorization_level || null
      })),
      active_indicators: dbOptions.editorial_indicator
        .filter(opt => activeIndicatorOptionIds.includes(opt.id))
        .map(opt => ({
          id: opt.id,
          category: opt.category,
          value: opt.value,
          name: opt.name,
          code: opt.code,
          metadata: opt.metadata
        }))
    };
  }, [
    id,
    description,
    contributionType,
    status,
    publicationStatusOptionId,
    dbOptions,
    notes,
    publicationNotes,
    publicationScheduledAt,
    consentVerified,
    level,
    credits,
    consentSource,
    files,
    consentRecords,
    activeIndicatorOptionIds
  ]);

  const editorialEvaluation = useMemo(() => {
    return evaluateContribution(editorialInput);
  }, [editorialInput]);

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
      currentIndsSorted !== initialIndsSorted
    );
  }, [
    status, initialStatus,
    notes, initialNotes,
    consentVerified, initialConsentVerified,
    publicationStatusOptionId, initialPublicationStatusOptionId,
    publicationNotes, initialPublicationNotes,
    publicationScheduledAt, initialPublicationScheduledAt,
    activeIndicatorOptionIds, initialActiveIndicatorOptionIds
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
        historical_validation_status: historicalValidationStatus
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
    title, initialStatus, historicalValidationStatus
  ]);

  const currentProgressResult = useMemo(() => {
    if (loadingOptions) return null;
    try {
      const currentContribution = {
        id,
        title: title || null,
        description: description || null,
        internal_notes: notes || null,
        contribution_type: contributionType,
        consent_verified: consentVerified,
        authorization_level: level,
        credit_preference: credits,
        consent_source: consentSource,
        files: files || [],
        contributors: contributor,
        historical_context: historicalContext,
        created_at: createdAt,
        updated_at: updatedAt,
        published_at: publishedAt,
        editorial_status: status,
        historical_validation_status: historicalValidationStatus
      };
      
      const currentPubStatusOpt = dbOptions.publication_status.find((o: SelectOption) => o.id === publicationStatusOptionId);
      const currentActiveIndicators = dbOptions.editorial_indicator
        .filter((opt: SelectOption) => activeIndicatorOptionIds.includes(opt.id))
        .map((opt: SelectOption) => ({
          indicator_option_id: opt.id,
          is_active: true,
          opt
        }));

      const progressInput = mapContributionToProgressInput(currentContribution, currentPubStatusOpt, currentActiveIndicators);
      return evaluateEditorialProgress(progressInput);
    } catch (e) {
      console.error("Error calculating current progress:", e);
      return null;
    }
  }, [
    id, description, notes, contributionType, consentVerified, level, credits, consentSource,
    files, contributor, historicalContext, createdAt, updatedAt, publishedAt,
    dbOptions, publicationStatusOptionId, activeIndicatorOptionIds, loadingOptions,
    title, status, historicalValidationStatus
  ]);

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

  const handleNavigation = (targetId: string) => {
    if (!targetId) return;
    const element = document.getElementById(targetId);
    if (!element) {
      console.warn(`Element with id "${targetId}" not found.`);
      return;
    }

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

    // 2. Scroll suave y centrado
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

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
    const badge = document.createElement('span');
    badge.className = 'recommended-field-badge';
    badge.innerText = '✔ Ahora estás editando este requisito editorial.';
    
    const originalPosition = element.style.position;
    if (!originalPosition || originalPosition === 'static') {
      element.style.position = 'relative';
    }
    element.appendChild(badge);

    // 4. Focus si es editable
    const input = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT'
      ? element
      : element.querySelector('input, textarea, select');

    if (input && !(input as HTMLInputElement).disabled) {
      setTimeout(() => {
        (input as HTMLElement).focus();
      }, 400);
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
        if (editorialEvaluation.recommendedNextActionTarget) {
          handleNavigation(editorialEvaluation.recommendedNextActionTarget);
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
  }, [editorialEvaluation.recommendedNextActionTarget]);

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

    try {
      await updateContributionStatus(id, formData);
      setSuccess(true);
      setIndicatorNotes(''); // Limpiar notas temporales de indicadores
      
      // Limpiar mensaje de éxito tras 4 segundos
      setTimeout(() => setSuccess(false), 4000);
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

  const stagePoints = {
    recepcion: {
      earned: (currentProgressResult?.details?.basicIdentificationScore || 0) + (currentProgressResult?.details?.consentScore || 0),
      max: 30,
      label: "Recepción y Consentimiento",
      id: "consent"
    },
    descripcion: {
      earned: (currentProgressResult?.details?.editorialDescriptionScore || 0) + (currentProgressResult?.details?.filesScore || 0),
      max: 25,
      label: "Descripción y Archivos",
      id: "editorial-description"
    },
    clasificacion: {
      earned: (currentProgressResult?.details?.editorialProcessingScore || 0) + (currentProgressResult?.details?.indicatorsScore || 0),
      max: 15,
      label: "Clasificación e Indicadores",
      id: "editorial-status"
    },
    validacion: {
      earned: (currentProgressResult?.details?.editorialReviewScore || 0) + (currentProgressResult?.details?.historicalValidationScore || 0),
      max: 25,
      label: "Revisión y Validación Histórica",
      id: "historical-validation"
    },
    publicacion: {
      earned: currentProgressResult?.details?.publicationScore || 0,
      max: 5,
      label: "Configuración de Publicación",
      id: "publication-settings"
    }
  };

  const getActiveStage = () => {
    if (stagePoints.recepcion.earned < stagePoints.recepcion.max) return "recepcion";
    if (stagePoints.descripcion.earned < stagePoints.descripcion.max) return "descripcion";
    if (stagePoints.clasificacion.earned < stagePoints.clasificacion.max) return "clasificacion";
    if (stagePoints.validacion.earned < stagePoints.validacion.max) return "validacion";
    return "publicacion";
  };
  const activeStageKey = getActiveStage();

  return (
    <form id="editorial-progress-section" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Alertas de Resultado */}
      {success && (
        <div className="alert alert-success" style={{ padding: '0.6rem 0.85rem', fontSize: '0.85rem', margin: 0 }}>
          <CheckCircle size={16} />
          <span>¡Dimensiones editoriales y de publicación guardadas exitosamente en la base de datos!</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ padding: '0.6rem 0.85rem', fontSize: '0.85rem', margin: 0 }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* SECCIÓN DEL ASISTENTE EDITORIAL Y EXPEDIENTE */}
      <div id="editorial-assistant-section" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
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
              {editorialEvaluation.trafficLight === 'green' && (
                <span className="dossier-header-stamp dossier-stamp-approved">Aprobado</span>
              )}
              {editorialEvaluation.trafficLight === 'yellow' && (
                <span className="dossier-header-stamp dossier-stamp-pending">Revisión</span>
              )}
              {editorialEvaluation.trafficLight === 'orange' && (
                <span className="dossier-header-stamp dossier-stamp-pending">Incompleto</span>
              )}
              {editorialEvaluation.trafficLight === 'red' && (
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
                  {'★'.repeat(editorialEvaluation.historicalReliabilityStars)}
                  {'☆'.repeat(5 - editorialEvaluation.historicalReliabilityStars)}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginLeft: '0.25rem' }}>
                  ({editorialEvaluation.historicalReliabilityLabel})
                </span>
              </div>
            </div>
          </div>

          {/* Línea de tiempo archivística */}
          <div style={{ margin: '1.5rem 0' }}>
            <span className="dossier-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Línea de Tiempo del Expediente</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem' }}>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Recepción</span>
                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>{createdAt ? new Date(createdAt).toLocaleDateString('es-AR') : '—'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem' }}>
                <span style={{ color: consentVerified ? '#16a34a' : '#d97706', fontWeight: 700 }}>
                  {consentVerified ? '✓ Consentimiento' : '⏳ Consentimiento'}
                </span>
                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>
                  {consentRecords?.[0]?.accepted_at ? new Date(consentRecords[0].accepted_at).toLocaleDateString('es-AR') : 'Pendiente'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem' }}>
                <span style={{ color: (description && description.length >= 40) ? '#16a34a' : '#d97706', fontWeight: 700 }}>
                  {(description && description.length >= 40) ? '✓ Descripción' : '⏳ Descripción'}
                </span>
                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>
                  {updatedAt ? new Date(updatedAt).toLocaleDateString('es-AR') : 'Pendiente'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem' }}>
                <span style={{ color: (historicalValidationStatus === 'validated' || historicalValidationStatus === 'not_required') ? '#16a34a' : '#d97706', fontWeight: 700 }}>
                  {(historicalValidationStatus === 'validated' || historicalValidationStatus === 'not_required') ? '✓ Validación' : '⏳ Validación'}
                </span>
                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>
                  {historicalValidationStatus === 'validated' ? 'Completado' : historicalValidationStatus === 'not_required' ? 'No requerida' : 'Pendiente'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem' }}>
                <span style={{ color: (status === 'Publicado' || publishedAt) ? '#16a34a' : '#94a3b8', fontWeight: 700 }}>
                  {(status === 'Publicado' || publishedAt) ? '✓ Publicación' : '○ Publicación'}
                </span>
                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>
                  {publishedAt ? new Date(publishedAt).toLocaleDateString('es-AR') : 'Pendiente'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
            >
              🖨️ Imprimir Carátula del Expediente
            </button>
          </div>
        </div>

        {/* 🤖 ASISTENTE EDITORIAL */}
        <div style={{
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          padding: '1.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
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
                backgroundColor: editorialEvaluation.trafficLight === 'green' ? '#16a34a' : editorialEvaluation.trafficLight === 'yellow' ? '#eab308' : editorialEvaluation.trafficLight === 'orange' ? '#f97316' : '#ef4444',
                boxShadow: `0 0 8px ${editorialEvaluation.trafficLight === 'green' ? '#16a34a' : editorialEvaluation.trafficLight === 'yellow' ? '#eab308' : editorialEvaluation.trafficLight === 'orange' ? '#f97316' : '#ef4444'}`,
                display: 'inline-block'
              }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#334155' }}>
                {editorialEvaluation.trafficLight === 'green' && '🟢 Listo para publicar'}
                {editorialEvaluation.trafficLight === 'yellow' && '🟡 Necesita revisión'}
                {editorialEvaluation.trafficLight === 'orange' && '🟠 Incompleto'}
                {editorialEvaluation.trafficLight === 'red' && '🔴 No publicable'}
              </span>
            </div>
          </div>

          <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#475569', fontStyle: 'italic' }}>
            {editorialEvaluation.summary}
          </p>

          <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '0 0 1.25rem 0' }} />

          {/* Stepper Interactivo */}
          <div className="stepper-container">
            <div className="stepper-line" />
            
            <button
              type="button"
              onClick={() => handleNavigation('classification')}
              className={`stepper-stage ${activeStageKey === 'recepcion' ? 'active' : ''} ${stagePoints.recepcion.earned === stagePoints.recepcion.max ? 'completed' : 'warning'}`}
            >
              <div className="stepper-dot">
                {stagePoints.recepcion.earned === stagePoints.recepcion.max ? '✓' : '1'}
              </div>
              <span className="stepper-label">Recepción</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavigation('editorial-description')}
              className={`stepper-stage ${activeStageKey === 'descripcion' ? 'active' : ''} ${stagePoints.descripcion.earned === stagePoints.descripcion.max ? 'completed' : 'warning'}`}
            >
              <div className="stepper-dot">
                {stagePoints.descripcion.earned === stagePoints.descripcion.max ? '✓' : '2'}
              </div>
              <span className="stepper-label">Descripción</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavigation('editorial-status')}
              className={`stepper-stage ${activeStageKey === 'clasificacion' ? 'active' : ''} ${stagePoints.clasificacion.earned === stagePoints.clasificacion.max ? 'completed' : 'warning'}`}
            >
              <div className="stepper-dot">
                {stagePoints.clasificacion.earned === stagePoints.clasificacion.max ? '✓' : '3'}
              </div>
              <span className="stepper-label">Clasificación</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavigation('historical-validation')}
              className={`stepper-stage ${activeStageKey === 'validacion' ? 'active' : ''} ${stagePoints.validacion.earned === stagePoints.validacion.max ? 'completed' : 'warning'}`}
            >
              <div className="stepper-dot">
                {stagePoints.validacion.earned === stagePoints.validacion.max ? '✓' : '4'}
              </div>
              <span className="stepper-label">Validación</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavigation('publication-settings')}
              className={`stepper-stage ${activeStageKey === 'publicacion' ? 'active' : ''} ${stagePoints.publicacion.earned === stagePoints.publicacion.max ? 'completed' : 'warning'}`}
            >
              <div className="stepper-dot">
                {stagePoints.publicacion.earned === stagePoints.publicacion.max ? '✓' : '5'}
              </div>
              <span className="stepper-label">Publicación</span>
            </button>
          </div>

          {/* Índice de Calidad Editorial */}
          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', margin: '1.5rem 0' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Índice de Calidad Editorial</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a' }}>{editorialEvaluation.qualityIndex}</span>
                <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>
                  ({currentProgressResult ? Math.min(100, currentProgressResult.progress + manualCheckedCount * 2) : 0}/100 pts)
                </span>
              </div>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a', backgroundColor: '#eff6ff', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
              💡 {editorialEvaluation.qualityText}
            </span>
          </div>

          {/* Wizard / Próximo Paso */}
          {currentProgressResult && currentProgressResult.progress >= 90 ? (
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
                El progreso básico automatizado es óptimo ({currentProgressResult.progress}%). Revise los siguientes puntos de criterio profesional humano antes de publicar:
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
            editorialEvaluation.recommendedNextActionTarget && (
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
                  {editorialEvaluation.recommendedNextAction}
                </strong>
                <p style={{ margin: '0.25rem 0 0.75rem 0', fontSize: '0.75rem', color: '#1e40af' }}>
                  <strong>¿Por qué?</strong>: {editorialEvaluation.recommendedNextActionDescription}
                </p>
                <button
                  type="button"
                  onClick={() => handleNavigation(editorialEvaluation.recommendedNextActionTarget!)}
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
                  <th style={{ textAlign: 'right' }}>Puntaje</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Recepción y Consentimiento</td>
                  <td style={{ textAlign: 'center' }}>
                    {stagePoints.recepcion.earned === stagePoints.recepcion.max ? '✅' : stagePoints.recepcion.earned > 0 ? '⚠️' : '⏳'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {stagePoints.recepcion.earned} / {stagePoints.recepcion.max}
                  </td>
                </tr>
                <tr>
                  <td>Descripción y Archivos</td>
                  <td style={{ textAlign: 'center' }}>
                    {stagePoints.descripcion.earned === stagePoints.descripcion.max ? '✅' : stagePoints.descripcion.earned > 0 ? '⚠️' : '⏳'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {stagePoints.descripcion.earned} / {stagePoints.descripcion.max}
                  </td>
                </tr>
                <tr>
                  <td>Clasificación e Indicadores</td>
                  <td style={{ textAlign: 'center' }}>
                    {stagePoints.clasificacion.earned === stagePoints.clasificacion.max ? '✅' : stagePoints.clasificacion.earned > 0 ? '⚠️' : '⏳'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {stagePoints.clasificacion.earned} / {stagePoints.clasificacion.max}
                  </td>
                </tr>
                <tr>
                  <td>Revisión y Validación Histórica</td>
                  <td style={{ textAlign: 'center' }}>
                    {stagePoints.validacion.earned === stagePoints.validacion.max ? '✅' : stagePoints.validacion.earned > 0 ? '⚠️' : '⏳'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {stagePoints.validacion.earned} / {stagePoints.validacion.max}
                  </td>
                </tr>
                <tr>
                  <td>Configuración de Publicación</td>
                  <td style={{ textAlign: 'center' }}>
                    {stagePoints.publicacion.earned === stagePoints.publicacion.max ? '✅' : stagePoints.publicacion.earned > 0 ? '⚠️' : '⏳'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {stagePoints.publicacion.earned} / {stagePoints.publicacion.max}
                  </td>
                </tr>
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
              Controles Automatizados ({currentProgressResult?.completedItems.length || 0} de 8 resueltos)
            </h5>
            
            {currentProgressResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                
                {/* Tareas Completadas */}
                {currentProgressResult.completedItems.map(item => (
                  <div key={item.code} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>
                    <span>✔</span>
                    <span>{item.label}</span>
                  </div>
                ))}

                {/* Tareas Pendientes */}
                {currentProgressResult.pendingItems.map(item => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => item.target && handleNavigation(item.target)}
                    className="checklist-btn"
                    style={{ color: '#d97706', fontWeight: 500 }}
                  >
                    <span>○</span>
                    <span>{item.label}</span>
                  </button>
                ))}

                {/* Tareas Bloqueadas */}
                {currentProgressResult.blockedItems.map(item => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => item.target && handleNavigation(item.target)}
                    className="checklist-btn"
                    style={{ color: '#dc2626', fontWeight: 600 }}
                  >
                    <span>🛑</span>
                    <span>{item.label}</span>
                  </button>
                ))}

              </div>
            )}
          </div>

        </div>

      </div>


      {/* BLOQUE A: Gestión Editorial */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
          <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>A</span>
          Gestión Editorial Principal
        </h4>

        <div id="editorial-status" className="form-group" style={{ borderRadius: '4px', padding: '4px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>Estado Editorial único</label>
            <button type="button" onClick={() => handleNavigation('editorial-assistant-section')} className="return-assistant-btn">
              📍 Volver al Asistente
            </button>
            <EditorialHelp helpKey="editorialStatus" initialSelectedValue={status} />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="form-select"
            disabled={saving}
            style={{ height: '40px', maxWidth: '400px' }}
          >
            {editorialStatuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
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

        <div id="internal-notes" className="form-group" style={{ margin: 0, borderRadius: '4px', padding: '4px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>Observaciones Editoriales Internas</label>
            <button type="button" onClick={() => handleNavigation('editorial-assistant-section')} className="return-assistant-btn">
              📍 Volver al Asistente
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

      {/* BLOQUE B: Consentimiento (Solo Lectura) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
            <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>B</span>
            Términos de Consentimiento y Cesión
          </h4>
          <span style={{ fontSize: '0.75rem', color: '#b45309', backgroundColor: '#fef3c7', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>
            🔒 Solo Lectura (Procedimiento Formal Requerido)
          </span>
        </div>

        <div className="grid grid-2" style={{ gap: '1rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Nivel de Autorización</label>
              <EditorialHelp helpKey="authorizationLevel" initialSelectedValue={level} />
            </div>
            <select
              value={level}
              disabled={true}
              className="form-select"
              style={{ height: '40px', backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#475569' }}
            >
              <option value={level}>Nivel {level}</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Preferencia de Créditos</label>
              <EditorialHelp helpKey="creditPreference" initialSelectedValue={credits} />
            </div>
            <select
              value={credits}
              disabled={true}
              className="form-select"
              style={{ height: '40px', backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#475569' }}
            >
              <option value={credits}>{credits}</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Soporte Legal de Respaldo</label>
          {consentSource === 'web_form' ? (
            <div style={{ padding: '0.6rem 0.75rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '0.8rem', color: '#166534', height: '40px', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
              <span>✓ Autorización Digital (Aceptada vía Formulario Web)</span>
            </div>
          ) : (
            <div style={{ padding: '0.6rem 0.75rem', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', fontSize: '0.8rem', color: '#0369a1', height: '40px', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
              <span>📄 Archivo de Respaldo Físico o Convenio cargado en Ficha Legal</span>
            </div>
          )}
          
          <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#fafaf9', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '0.75rem' }}>
            <span style={{ fontWeight: 700, color: 'var(--neutral-grey)', display: 'block', marginBottom: '0.25rem' }}>
              ¿Por qué existe este campo? · Consentimiento firmado
            </span>
            <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text-secondary)' }}>
              El consentimiento firmado es el instrumento legal que faculta a Memoria Viva a conservar, procesar y difundir el material aportado. Protege los derechos del aportante y garantiza la legitimidad pública del archivo.
            </p>
          </div>
        </div>
      </div>

      {/* BLOQUE C: Publicación */}
      <div id="publication-settings" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderRadius: '4px', padding: '4px', position: 'relative' }}>
        <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b', flexWrap: 'wrap' }}>
          <span style={{ backgroundColor: '#fff7ed', color: '#ea580c', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>C</span>
          Configuración de Publicación
          <button type="button" onClick={() => handleNavigation('editorial-assistant-section')} className="return-assistant-btn">
            📍 Volver al Asistente
          </button>
        </h4>
        {selectedStatusOpt?.code === 'publishable' && !editorialEvaluation.eligibleForPublication && (
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

        <div className="grid grid-2" style={{ gap: '1rem' }}>
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
                Fecha de Publicación Programada
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

        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>Notas de Publicación</label>
          <textarea
            value={publicationNotes}
            onChange={(e) => setPublicationNotes(e.target.value)}
            placeholder="Escribe aclaraciones sobre la publicación, motivos de retiro o detalles de programación..."
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
    </form>
  );
}
