'use client';

import React, { useState, useEffect } from 'react';
import { Sliders, Plus, Edit2, Trash2, Check, X, Loader2, Save, ArrowUpDown } from 'lucide-react';

interface SelectOption {
  id: string;
  category: string;
  value: string;
  label: string;
  code: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = [
  { id: 'contribution_type', label: 'Tipos de Material', desc: 'Define los formatos de archivos y recuerdos aceptados (FOT, TXT, etc.)' },
  { id: 'relation_to_city', label: 'Relaciones con la Ciudad', desc: 'Opciones del vínculo biográfico del aportante con Pico Truncado' },
  { id: 'authorization_level', label: 'Niveles de Autorización', desc: 'Niveles legales de cesión de derechos (A, B, C, D)' },
  { id: 'credit_preference', label: 'Preferencias de Créditos', desc: 'Formatos para citar la autoría del aportante al publicar' }
];

export default function OpcionesConfigurator() {
  const [activeTab, setActiveTab] = useState('contribution_type');
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Estados para fila en edición
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    value: '',
    label: '',
    code: '',
    sort_order: 0,
    is_active: true
  });

  // Estados para nueva opción
  const [showAddForm, setShowAddForm] = useState(false);
  const [newForm, setNewForm] = useState({
    value: '',
    label: '',
    code: '',
    sort_order: 0,
    is_active: true
  });

  const fetchOptions = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/select-options');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener opciones.');
      }
      
      // La API devuelve un objeto agrupado. Aplanamos la categoría activa para mostrarla.
      const list = data[activeTab] || [];
      setOptions(list);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('No se pudieron cargar las opciones de configuración.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
    setEditingId(null);
    setShowAddForm(false);
  }, [activeTab]);

  const handleStartEdit = (opt: SelectOption) => {
    setEditingId(opt.id);
    setEditForm({
      value: opt.value,
      label: opt.label,
      code: opt.code || '',
      sort_order: opt.sort_order,
      is_active: opt.is_active
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editForm.value.trim() || !editForm.label.trim()) {
      setErrorMsg('El valor técnico y la etiqueta no pueden estar vacíos.');
      return;
    }

    setActionLoading(id);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('/api/select-options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editForm })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar la opción.');
      }

      setSuccessMsg('Opción actualizada correctamente.');
      setEditingId(null);
      await fetchOptions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar la opción.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.value.trim() || !newForm.label.trim()) {
      setErrorMsg('El valor técnico y la etiqueta son obligatorios.');
      return;
    }

    setActionLoading('new');
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('/api/select-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: activeTab, ...newForm })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar la opción.');
      }

      setSuccessMsg('Nueva opción guardada correctamente.');
      setShowAddForm(false);
      setNewForm({ value: '', label: '', code: '', sort_order: options.length + 1, is_active: true });
      await fetchOptions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear la opción.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la opción "${label}"?\nEsto podría afectar la carga de datos antiguos vinculados.`)) {
      return;
    }

    setActionLoading(`delete-${id}`);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await fetch(`/api/select-options?id=${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar la opción.');
      }

      setSuccessMsg('Opción eliminada correctamente.');
      await fetchOptions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al eliminar la opción.');
    } finally {
      setActionLoading(null);
    }
  };

  const currentCategoryObj = CATEGORIES.find(c => c.id === activeTab);

  return (
    <div style={{ paddingBottom: '3rem' }}>
      
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a', margin: 0 }}>
            <Sliders size={26} style={{ color: 'var(--primary-blue, #0284c7)' }} /> Configuración de Combos
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
            Gestiona de forma dinámica los menús desplegables del sitio público y panel interno.
          </p>
        </div>
        
        {!showAddForm && (
          <button
            onClick={() => {
              setShowAddForm(true);
              setNewForm({ value: '', label: '', code: '', sort_order: options.length + 1, is_active: true });
            }}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', height: '38px', fontSize: '0.85rem' }}
          >
            <Plus size={16} /> Nueva Opción
          </button>
        )}
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
          ⚠️ {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
          ✅ {successMsg}
        </div>
      )}

      {/* Tabs / Solapas de Categorías */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #cbd5e1', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '1px' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              background: 'none',
              fontSize: '0.9rem',
              fontWeight: activeTab === cat.id ? 600 : 500,
              color: activeTab === cat.id ? 'var(--primary-blue, #0284c7)' : '#64748b',
              borderBottom: activeTab === cat.id ? '2px solid var(--primary-blue, #0284c7)' : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', borderLeft: '3px solid #cbd5e1' }}>
        ℹ️ <strong>{currentCategoryObj?.label}</strong>: {currentCategoryObj?.desc}
      </div>

      {/* Formulario Agregar Nueva Opción */}
      {showAddForm && (
        <form onSubmit={handleSaveNew} className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff' }}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600 }}>Crear Nueva Opción</h4>
          <div style={{ display: 'grid', gridTemplateColumns: activeTab === 'contribution_type' ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label form-label-required" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Valor Técnico*</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Foto, Vecino"
                value={newForm.value}
                onChange={e => setNewForm(prev => ({ ...prev, value: e.target.value }))}
                style={{ height: '36px', fontSize: '0.85rem' }}
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label form-label-required" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Etiqueta (Pantalla)*</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Fotografía histórica"
                value={newForm.label}
                onChange={e => setNewForm(prev => ({ ...prev, label: e.target.value }))}
                style={{ height: '36px', fontSize: '0.85rem' }}
                required
              />
            </div>
            {activeTab === 'contribution_type' && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Código Prefijo</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: FOT (3 letras)"
                  maxLength={3}
                  value={newForm.code}
                  onChange={e => setNewForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  style={{ height: '36px', fontSize: '0.85rem', textTransform: 'uppercase' }}
                />
              </div>
            )}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nro. Orden</label>
              <input
                type="number"
                className="form-input"
                value={newForm.sort_order}
                onChange={e => setNewForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                style={{ height: '36px', fontSize: '0.85rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={actionLoading === 'new'}
                style={{ height: '36px', fontSize: '0.85rem', flexGrow: 1, padding: '0 1rem' }}
              >
                {actionLoading === 'new' ? <Loader2 className="animate-spin" size={16} /> : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn btn-outline"
                style={{ height: '36px', fontSize: '0.85rem', padding: '0 0.75rem' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Listado en Tabla */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 0.5rem auto' }} />
            <span>Cargando opciones...</span>
          </div>
        ) : options.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            No hay opciones registradas en esta categoría. ¡Agrega una nueva!
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 1rem', width: '10%' }}><ArrowUpDown size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />Orden</th>
                <th style={{ padding: '0.75rem 1rem', width: '25%' }}>Valor Técnico</th>
                <th style={{ padding: '0.75rem 1rem', width: '35%' }}>Etiqueta (Pantalla)</th>
                {activeTab === 'contribution_type' && (
                  <th style={{ padding: '0.75rem 1rem', width: '15%' }}>Código Prefijo</th>
                )}
                <th style={{ padding: '0.75rem 1rem', width: '10%' }}>Estado</th>
                <th style={{ padding: '0.75rem 1rem', width: '15%', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {options.map((opt) => {
                const isEditing = editingId === opt.id;
                return (
                  <tr key={opt.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isEditing ? '#f8fafc' : 'transparent' }}>
                    
                    {/* Orden */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          className="form-input"
                          value={editForm.sort_order}
                          onChange={e => setEditForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                          style={{ height: '32px', fontSize: '0.85rem', padding: '0.25rem' }}
                        />
                      ) : (
                        <strong style={{ color: '#334155' }}>{opt.sort_order}</strong>
                      )}
                    </td>

                    {/* Valor Técnico */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          className="form-input"
                          value={editForm.value}
                          onChange={e => setEditForm(prev => ({ ...prev, value: e.target.value }))}
                          style={{ height: '32px', fontSize: '0.85rem', padding: '0.25rem' }}
                        />
                      ) : (
                        <code style={{ backgroundColor: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem', color: '#0f172a' }}>{opt.value}</code>
                      )}
                    </td>

                    {/* Etiqueta */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          className="form-input"
                          value={editForm.label}
                          onChange={e => setEditForm(prev => ({ ...prev, label: e.target.value }))}
                          style={{ height: '32px', fontSize: '0.85rem', padding: '0.25rem' }}
                        />
                      ) : (
                        opt.label
                      )}
                    </td>

                    {/* Código Prefijo (Solo tipo material) */}
                    {activeTab === 'contribution_type' && (
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isEditing ? (
                          <input
                            type="text"
                            className="form-input"
                            maxLength={3}
                            value={editForm.code}
                            onChange={e => setEditForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                            style={{ height: '32px', fontSize: '0.85rem', padding: '0.25rem', textTransform: 'uppercase' }}
                          />
                        ) : (
                          <span style={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--primary-blue, #0284c7)' }}>
                            {opt.code || '-'}
                          </span>
                        )}
                      </td>
                    )}

                    {/* Estado Activo */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {isEditing ? (
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={editForm.is_active}
                            onChange={e => setEditForm(prev => ({ ...prev, is_active: e.target.checked }))}
                            style={{ width: '16px', height: '16px' }}
                          />
                          Activo
                        </label>
                      ) : (
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: opt.is_active ? '#dcfce7' : '#fee2e2',
                          color: opt.is_active ? '#15803d' : '#b91c1c'
                        }}>
                          {opt.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(opt.id)}
                              disabled={actionLoading === opt.id}
                              className="btn btn-outline"
                              title="Guardar cambios"
                              style={{ padding: '0.25rem 0.5rem', height: '28px', color: '#166534', borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }}
                            >
                              {actionLoading === opt.id ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="btn btn-outline"
                              title="Cancelar edición"
                              style={{ padding: '0.25rem 0.5rem', height: '28px', color: '#475569' }}
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEdit(opt)}
                              className="btn btn-outline"
                              title="Editar opción"
                              style={{ padding: '0.25rem 0.5rem', height: '28px' }}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(opt.id, opt.label)}
                              disabled={actionLoading === `delete-${opt.id}`}
                              className="btn btn-outline"
                              title="Eliminar opción"
                              style={{ padding: '0.25rem 0.5rem', height: '28px', color: '#b91c1c', borderColor: '#fee2e2' }}
                            >
                              {actionLoading === `delete-${opt.id}` ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
