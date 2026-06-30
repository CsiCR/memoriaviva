'use client';

import React, { useState } from 'react';
import { updateContributionStatus } from '@/app/actions/contributions';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';

interface ContributionEditFormProps {
  id: string;
  initialStatus: string;
  initialNotes: string | null;
  initialConsentVerified: boolean;
}

export default function ContributionEditForm({
  id,
  initialStatus,
  initialNotes,
  initialConsentVerified,
}: ContributionEditFormProps) {
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(initialNotes || '');
  const [consentVerified, setConsentVerified] = useState(initialConsentVerified);
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

    try {
      await updateContributionStatus(id, formData);
      setSuccess(true);
      
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
      <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>Gestión Editorial</h3>
      
      {success && (
        <div className="alert alert-success" style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', margin: 0 }}>
          <CheckCircle size={16} />
          <span>¡Cambios guardados con éxito e historial auditado!</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', margin: 0 }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

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
        <label className="form-label">Observaciones Internas</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Escribe observaciones de control histórico, notas sobre la transcripción o comentarios del equipo aquí..."
          className="form-textarea"
          disabled={saving}
          style={{ minHeight: '100px', fontSize: '0.9rem' }}
        />
      </div>

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

      <button
        type="submit"
        className="btn btn-primary"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', padding: '0.75rem' }}
        disabled={saving}
      >
        <Save size={16} /> {saving ? 'Guardando cambios...' : 'Guardar Observaciones'}
      </button>
    </form>
  );
}
