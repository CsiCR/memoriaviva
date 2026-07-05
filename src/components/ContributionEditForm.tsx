'use client';

import React, { useState, useEffect } from 'react';
import { updateContributionStatus } from '@/app/actions/contributions';
import { Save, CheckCircle, AlertCircle, Upload, Shield } from 'lucide-react';

interface ContributionEditFormProps {
  id: string;
  initialStatus: string;
  initialNotes: string | null;
  initialConsentVerified: boolean;
  initialLevel: string;
  initialCredits: string;
  consentSource: string;
}

export default function ContributionEditForm({
  id,
  initialStatus,
  initialNotes,
  initialConsentVerified,
  initialLevel,
  initialCredits,
  consentSource,
}: ContributionEditFormProps) {
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(initialNotes || '');
  const [consentVerified, setConsentVerified] = useState(initialConsentVerified);
  const [level, setLevel] = useState(initialLevel);
  const [credits, setCredits] = useState(initialCredits);
  const [consentFile, setConsentFile] = useState<File | null>(null);

  // Opciones dinámicas de base de datos
  const [dbOptions, setDbOptions] = useState<Record<string, { value: string; label: string }[]>>({
    authorization_level: [],
    credit_preference: []
  });

  useEffect(() => {
    const loadDbOptions = async () => {
      try {
        const res = await fetch('/api/select-options');
        if (res.ok) {
          const data = await res.json();
          setDbOptions({
            authorization_level: data.authorization_level || [],
            credit_preference: data.credit_preference || []
          });
        }
      } catch (err) {
        console.error('Error loading options in ContributionEditForm:', err);
      }
    };
    loadDbOptions();
  }, []);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editorialStatuses = [
    'Recibido', 'Datos incompletos', 'En revisión', 'En transcripción', 'Transcripto',
    'En validación histórica', 'Validado', 'Aprobado para archivo', 'Aprobado para libro',
    'Aprobado para e-book', 'Restringido', 'Rechazado', 'Archivado'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);

    const formData = new FormData();
    formData.append('editorial_status', status);
    formData.append('internal_notes', notes);
    formData.append('consent_verified', String(consentVerified));
    formData.append('authorization_level', level);
    formData.append('credit_preference', credits);
    
    if (consentFile) {
      formData.append('consent_file', consentFile);
    }

    try {
      await updateContributionStatus(id, formData);
      setSuccess(true);
      setConsentFile(null); // Limpiar archivo tras éxito
      
      // Limpiar mensaje de éxito tras 4 segundos
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Shield size={18} style={{ color: 'var(--primary-blue)' }} /> Gestión de Estado y Consentimiento
      </h3>
      
      {success && (
        <div className="alert alert-success" style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', margin: 0 }}>
          <CheckCircle size={16} />
          <span>¡Cambios guardados con éxito e historial legal actualizado!</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', margin: 0 }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-2" style={{ gap: '1rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Estado Editorial</label>
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

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Nivel de Autorización</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="form-select"
            disabled={saving}
            style={{ height: '40px' }}
          >
            <option value="">Seleccione un nivel...</option>
            {dbOptions.authorization_level.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: '1rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Preferencia de Créditos</label>
          <select
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
            className="form-select"
            disabled={saving}
            style={{ height: '40px' }}
          >
            <option value="">Seleccione una preferencia...</option>
            {dbOptions.credit_preference.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          {consentSource === 'web_form' ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label className="form-label">Soporte Legal</label>
              <div style={{ padding: '0.6rem 0.75rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '0.8rem', color: '#166534', height: '40px', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                <span>✓ Autorización Digital (No requiere archivo físico)</span>
              </div>
            </div>
          ) : (
            <>
              <label className="form-label">
                {consentSource === 'institutional_agreement' 
                  ? 'Subir PDF del Convenio Firmado (Completar carga)' 
                  : 'Subir Nueva Firma / Consentimiento (Revalidación)'}
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setConsentFile(e.target.files[0]);
                  } else {
                    setConsentFile(null);
                  }
                }}
                className="form-input"
                disabled={saving}
                style={{ height: '40px', padding: '4px 8px', fontSize: '0.85rem' }}
              />
            </>
          )}
        </div>
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Observaciones Internas</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Escribe observaciones de control histórico, notas sobre la transcripción o comentarios del equipo aquí..."
          className="form-textarea"
          disabled={saving}
          style={{ minHeight: '80px', fontSize: '0.9rem' }}
        />
      </div>

      {consentSource !== 'web_form' && (
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={consentVerified}
              onChange={(e) => setConsentVerified(e.target.checked)}
              disabled={saving}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span>Firma / Convenio de autorización física verificado</span>
          </label>
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', padding: '0.75rem' }}
        disabled={saving}
      >
        <Save size={16} /> {saving ? 'Guardando cambios...' : 'Guardar Observaciones y Cambios Legales'}
      </button>
    </form>
  );
}
