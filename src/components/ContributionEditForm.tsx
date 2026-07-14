'use client';

import React, { useState, useEffect } from 'react';
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

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
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

      {/* BLOQUE A: Gestión Editorial */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
          <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>A</span>
          Gestión Editorial Principal
        </h4>

        <div className="form-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
            <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>Estado Editorial único</label>
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

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontWeight: 600 }}>Observaciones Editoriales Internas</label>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
          <span style={{ backgroundColor: '#fff7ed', color: '#ea580c', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>C</span>
          Configuración de Publicación
        </h4>

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
