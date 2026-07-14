'use client';

import React, { useState, useEffect } from 'react';
import { Sliders, Plus, Edit2, Trash2, Check, X, Loader2, Save, ArrowUpDown } from 'lucide-react';

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
  description: string | null;
  created_at: string;
}

const CATEGORIES = [
  { id: 'contribution_type', label: 'Tipos de Material', desc: 'Define los formatos de archivos y recuerdos aceptados (FOT, TXT, etc.)' },
  { id: 'relation_to_city', label: 'Relaciones con la Ciudad', desc: 'Opciones del vínculo biográfico del aportante con Pico Truncado' },
  { id: 'authorization_level', label: 'Niveles de Autorización', desc: 'Niveles legales de cesión de derechos (A, B, C, D)' },
  { id: 'credit_preference', label: 'Preferencias de Créditos', desc: 'Formatos para citar la autoría del aportante al publicar' },
  { id: 'editorial_indicator', label: 'Indicadores Editoriales', desc: 'Alertas y banderas para el control del procesamiento de aportes' },
  { id: 'publication_status', label: 'Estados de Publicación', desc: 'Estados de disponibilidad pública y programación de aportes' }
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
    name: '',
    code: '',
    display_order: 0,
    is_active: true,
    is_default: false,
    is_system: false,
    description: '',
    // Metadata específica
    color: 'gray',
    icon: 'circle',
    blocks_publication: false,
    activation_criteria: '',
    resolution_instructions: '',
    minimum_conditions: '',
    allows_public_visibility: false,
    requires_publication_date: false,
    help_key: ''
  });

  // Estados para nueva opción
  const [showAddForm, setShowAddForm] = useState(false);
  const [newForm, setNewForm] = useState({
    value: '',
    name: '',
    code: '',
    display_order: 0,
    is_active: true,
    is_default: false,
    is_system: false,
    description: '',
    // Metadata específica
    color: 'gray',
    icon: 'circle',
    blocks_publication: false,
    activation_criteria: '',
    resolution_instructions: '',
    minimum_conditions: '',
    allows_public_visibility: false,
    requires_publication_date: false,
    help_key: ''
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
    const meta = opt.metadata || {};
    setEditingId(opt.id);
    setEditForm({
      value: opt.value,
      name: opt.name,
      code: opt.code || '',
      display_order: opt.display_order,
      is_active: opt.is_active,
      is_default: opt.is_default || false,
      is_system: opt.is_system || false,
      description: opt.description || '',
      color: meta.color || 'gray',
      icon: meta.icon || 'circle',
      blocks_publication: meta.blocks_publication === true,
      activation_criteria: meta.activation_criteria || '',
      resolution_instructions: meta.resolution_instructions || '',
      minimum_conditions: meta.minimum_conditions || '',
      allows_public_visibility: meta.allows_public_visibility === true,
      requires_publication_date: meta.requires_publication_date === true,
      help_key: meta.help_key || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editForm.value.trim() || !editForm.name.trim()) {
      setErrorMsg('El valor técnico y el nombre no pueden estar vacíos.');
      return;
    }

    setActionLoading(id);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Reconstruir objeto metadata
    const metadata: Record<string, any> = {};
    if (activeTab === 'editorial_indicator') {
      metadata.color = editForm.color;
      metadata.icon = editForm.icon;
      metadata.blocks_publication = editForm.blocks_publication;
      metadata.activation_criteria = editForm.activation_criteria;
      metadata.resolution_instructions = editForm.resolution_instructions;
      metadata.help_key = editForm.help_key;
    } else if (activeTab === 'publication_status') {
      metadata.color = editForm.color;
      metadata.icon = editForm.icon;
      metadata.minimum_conditions = editForm.minimum_conditions;
      metadata.allows_public_visibility = editForm.allows_public_visibility;
      metadata.requires_publication_date = editForm.requires_publication_date;
      metadata.help_key = editForm.help_key;
    }

    try {
      const response = await fetch('/api/select-options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          value: editForm.value,
          name: editForm.name,
          code: editForm.code,
          display_order: editForm.display_order,
          is_active: editForm.is_active,
          is_default: editForm.is_default,
          is_system: editForm.is_system,
          description: editForm.description || null,
          metadata
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Error al actualizar la opción.');
      }

      setSuccessMsg('Opción actualizada con éxito.');
      setEditingId(null);
      fetchOptions();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al actualizar la opción.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.value.trim() || !newForm.name.trim()) {
      setErrorMsg('El valor técnico y el nombre no pueden estar vacíos.');
      return;
    }

    setActionLoading('new');
    setErrorMsg(null);
    setSuccessMsg(null);

    const metadata: Record<string, any> = {};
    if (activeTab === 'editorial_indicator') {
      metadata.color = newForm.color;
      metadata.icon = newForm.icon;
      metadata.blocks_publication = newForm.blocks_publication;
      metadata.activation_criteria = newForm.activation_criteria;
      metadata.resolution_instructions = newForm.resolution_instructions;
      metadata.help_key = newForm.help_key;
    } else if (activeTab === 'publication_status') {
      metadata.color = newForm.color;
      metadata.icon = newForm.icon;
      metadata.minimum_conditions = newForm.minimum_conditions;
      metadata.allows_public_visibility = newForm.allows_public_visibility;
      metadata.requires_publication_date = newForm.requires_publication_date;
      metadata.help_key = newForm.help_key;
    }

    try {
      const response = await fetch('/api/select-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: activeTab,
          value: newForm.value,
          name: newForm.name,
          code: newForm.code,
          display_order: newForm.display_order,
          is_active: newForm.is_active,
          is_default: newForm.is_default,
          is_system: newForm.is_system,
          description: newForm.description || null,
          metadata
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Error al registrar la opción.');
      }

      setSuccessMsg('Nueva opción registrada con éxito.');
      setShowAddForm(false);
      setNewForm({
        value: '',
        name: '',
        code: '',
        display_order: options.length + 1,
        is_active: true,
        is_default: false,
        is_system: false,
        description: '',
        color: 'gray',
        icon: 'circle',
        blocks_publication: false,
        activation_criteria: '',
        resolution_instructions: '',
        minimum_conditions: '',
        allows_public_visibility: false,
        requires_publication_date: false,
        help_key: ''
      });
      fetchOptions();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al guardar la nueva opción.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Está seguro de que desea eliminar la opción "${name}"? Si está asociada a aportes se realizará una baja lógica.`)) {
      return;
    }

    setActionLoading(`delete-${id}`);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await fetch(`/api/select-options?id=${id}`, {
        method: 'DELETE'
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Error al eliminar la opción.');
      }

      setSuccessMsg(resData.message || 'Opción eliminada con éxito.');
      fetchOptions();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al eliminar la opción.');
    } finally {
      setActionLoading(null);
    }
  };

  const currentCategoryObj = CATEGORIES.find(c => c.id === activeTab);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={24} style={{ color: 'var(--primary-blue)' }} /> Configuración de Tablas Auxiliares
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Administración de opciones de campos, clasificaciones legales y dimensiones del flujo editorial.
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setNewForm(prev => ({ ...prev, display_order: options.length + 1 }));
          }}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.6rem 1rem' }}
        >
          <Plus size={16} /> {showAddForm ? 'Cerrar Formulario' : 'Nueva Opción'}
        </button>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div className="alert alert-success" style={{ padding: '0.6rem 0.85rem', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          <Check size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-danger" style={{ padding: '0.6rem 0.85rem', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          <X size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '2px' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            style={{
              padding: '0.6rem 1.2rem',
              border: 'none',
              backgroundColor: activeTab === cat.id ? '#eff6ff' : 'transparent',
              color: activeTab === cat.id ? '#2563eb' : '#475569',
              fontWeight: activeTab === cat.id ? 700 : 500,
              borderBottom: activeTab === cat.id ? '2px solid #2563eb' : 'none',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '0.85rem',
              transition: 'all 0.15s'
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
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600 }}>Crear Nueva Opción en {currentCategoryObj?.label}</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label form-label-required" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Valor Técnico*</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: Foto, Vecino, approved"
                  value={newForm.value}
                  onChange={e => setNewForm(prev => ({ ...prev, value: e.target.value }))}
                  style={{ height: '36px', fontSize: '0.85rem' }}
                  required
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label form-label-required" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nombre (Pantalla)*</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: Fotografía histórica"
                  value={newForm.name}
                  onChange={e => setNewForm(prev => ({ ...prev, name: e.target.value }))}
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
                    placeholder="Ej: FOT"
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
                  value={newForm.display_order}
                  onChange={e => setNewForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                  style={{ height: '36px', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* Campo de descripción general */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Descripción General de la Opción</label>
              <textarea
                className="form-textarea"
                placeholder="Escribe una explicación para esta opción. Se mostrará en el Manual Editorial Contextual ⓘ..."
                value={newForm.description}
                onChange={e => setNewForm(prev => ({ ...prev, description: e.target.value }))}
                style={{ minHeight: '50px', fontSize: '0.85rem' }}
              />
            </div>

            {/* Campos de Metadata Específica */}
            {(activeTab === 'editorial_indicator' || activeTab === 'publication_status') && (
              <div style={{ padding: '1rem', backgroundColor: '#fafaf9', borderRadius: '6px', border: '1px solid #e7e5e4', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Color del Tag</label>
                  <select
                    value={newForm.color}
                    onChange={e => setNewForm(prev => ({ ...prev, color: e.target.value }))}
                    className="form-select"
                    style={{ height: '36px', fontSize: '0.85rem' }}
                  >
                    <option value="gray">Gris (Neutral)</option>
                    <option value="blue">Azul (Información)</option>
                    <option value="green">Verde (Éxito)</option>
                    <option value="orange">Naranja (Advertencia)</option>
                    <option value="amber">Ámbar (Atención)</option>
                    <option value="red">Rojo (Bloqueo/Alerta)</option>
                    <option value="purple">Púrpura (Validación)</option>
                    <option value="indigo">Índigo (Técnico)</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Icono</label>
                  <select
                    value={newForm.icon}
                    onChange={e => setNewForm(prev => ({ ...prev, icon: e.target.value }))}
                    className="form-select"
                    style={{ height: '36px', fontSize: '0.85rem' }}
                  >
                    <option value="circle">Círculo vacío</option>
                    <option value="check-circle">Círculo verificado</option>
                    <option value="x-circle">Círculo con cruz</option>
                    <option value="file-warning">Archivo con alerta</option>
                    <option value="file-text">Documento de texto</option>
                    <option value="history">Reloj / Historial</option>
                    <option value="phone">Teléfono</option>
                    <option value="shield-alert">Escudo de alerta</option>
                    <option value="settings">Engranaje</option>
                    <option value="lock">Candado</option>
                    <option value="calendar">Calendario</option>
                    <option value="eye">Ojo abierto</option>
                    <option value="eye-off">Ojo tachado</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Clave de Ayuda Contextual (Help Key)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: missing_files"
                    value={newForm.help_key}
                    onChange={e => setNewForm(prev => ({ ...prev, help_key: e.target.value }))}
                    style={{ height: '36px', fontSize: '0.85rem' }}
                  />
                </div>

                {activeTab === 'editorial_indicator' && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '1rem 0 0 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={newForm.blocks_publication}
                        onChange={e => setNewForm(prev => ({ ...prev, blocks_publication: e.target.checked }))}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span>🛡️ Bloquea publicación</span>
                    </label>
                  </div>
                )}

                {activeTab === 'publication_status' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '1rem 0 0 0' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={newForm.requires_publication_date}
                          onChange={e => setNewForm(prev => ({ ...prev, requires_publication_date: e.target.checked }))}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <span>📅 Requiere fecha programada</span>
                      </label>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', padding: '1rem 0 0 0' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={newForm.is_default}
                          onChange={e => setNewForm(prev => ({ ...prev, is_default: e.target.checked }))}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <span>⭐ Opción por Defecto</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Descripciones Textarea para metadata */}
            {(activeTab === 'editorial_indicator' || activeTab === 'publication_status') && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {activeTab === 'editorial_indicator' ? (
                  <>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Criterio de Activación (Metadata)</label>
                      <textarea
                        className="form-textarea"
                        placeholder="Define cuándo se debe prender este indicador..."
                        value={newForm.activation_criteria}
                        onChange={e => setNewForm(prev => ({ ...prev, activation_criteria: e.target.value }))}
                        style={{ minHeight: '60px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Instrucciones de Resolución (Metadata)</label>
                      <textarea
                        className="form-textarea"
                        placeholder="Explica qué pasos seguir para resolverlo..."
                        value={newForm.resolution_instructions}
                        onChange={e => setNewForm(prev => ({ ...prev, resolution_instructions: e.target.value }))}
                        style={{ minHeight: '60px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Condiciones Mínimas (Metadata)</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Explica los requisitos que debe tener un aporte para pasar a este estado..."
                      value={newForm.minimum_conditions}
                      onChange={e => setNewForm(prev => ({ ...prev, minimum_conditions: e.target.value }))}
                      style={{ minHeight: '60px', fontSize: '0.85rem' }}
                    />
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn btn-outline"
                style={{ height: '36px', fontSize: '0.85rem', padding: '0 1.5rem' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={actionLoading === 'new'}
                style={{ height: '36px', fontSize: '0.85rem', padding: '0 1.5rem' }}
              >
                {actionLoading === 'new' ? <Loader2 className="animate-spin" size={16} /> : 'Guardar Opción'}
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
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', minWidth: '900px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem', width: '8%' }}><ArrowUpDown size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />Orden</th>
                  <th style={{ padding: '0.75rem 1rem', width: '18%' }}>Valor Técnico</th>
                  <th style={{ padding: '0.75rem 1rem', width: '22%' }}>Nombre (Pantalla)</th>
                  <th style={{ padding: '0.75rem 1rem', width: '24%' }}>Descripción General</th>
                  {activeTab === 'contribution_type' && (
                    <th style={{ padding: '0.75rem 1rem', width: '10%' }}>Código Prefijo</th>
                  )}
                  {(activeTab === 'editorial_indicator' || activeTab === 'publication_status') && (
                    <th style={{ padding: '0.75rem 1rem', width: '12%' }}>Tag / Visual</th>
                  )}
                  <th style={{ padding: '0.75rem 1rem', width: '8%' }}>Estado</th>
                  <th style={{ padding: '0.75rem 1rem', width: '10%', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {options.map((opt) => {
                  const isEditing = editingId === opt.id;
                  const isSystem = opt.is_system;
                  const color = opt.metadata?.color || 'gray';

                  return (
                    <tr key={opt.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isEditing ? '#f8fafc' : 'transparent' }}>
                      
                      {/* Orden */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isEditing ? (
                          <input
                            type="number"
                            className="form-input"
                            value={editForm.display_order}
                            onChange={e => setEditForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                            style={{ height: '32px', fontSize: '0.85rem', padding: '0.25rem', width: '60px' }}
                          />
                        ) : (
                          <strong style={{ color: '#334155' }}>{opt.display_order}</strong>
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
                            disabled={isSystem}
                            title={isSystem ? 'Las claves técnicas de sistema son inmutables' : ''}
                          />
                        ) : (
                          <code style={{ backgroundColor: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem', color: '#0f172a' }}>
                            {opt.value}
                          </code>
                        )}
                      </td>

                      {/* Nombre en Pantalla */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isEditing ? (
                          <input
                            type="text"
                            className="form-input"
                            value={editForm.name}
                            onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            style={{ height: '32px', fontSize: '0.85rem', padding: '0.25rem' }}
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ fontWeight: 500 }}>{opt.name}</span>
                            {opt.is_default && (
                              <span style={{ fontSize: '0.65rem', backgroundColor: '#fef3c7', color: '#b45309', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 'bold' }}>
                                Predet.
                              </span>
                            )}
                            {isSystem && (
                              <span style={{ fontSize: '0.65rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 'bold' }}>
                                Sistema
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Descripción General */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isEditing ? (
                          <textarea
                            className="form-textarea"
                            value={editForm.description}
                            onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                            style={{ height: '32px', fontSize: '0.85rem', padding: '0.25rem', minHeight: '32px' }}
                          />
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.8rem', display: 'block', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={opt.description || ''}>
                            {opt.description || '—'}
                          </span>
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
                              disabled={isSystem}
                            />
                          ) : (
                            <span style={{ fontWeight: 'bold', fontFamily: 'monospace', color: '#2563eb' }}>
                              {opt.code || '-'}
                            </span>
                          )}
                        </td>
                      )}

                      {/* Tag Visual (Solo Indicadores y Publicación) */}
                      {(activeTab === 'editorial_indicator' || activeTab === 'publication_status') && (
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {isEditing ? (
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Editar metadatos abajo...</span>
                          ) : (
                            <span className="badge" style={{
                              backgroundColor: color === 'red' ? '#fee2e2' : color === 'orange' ? '#ffedd5' : color === 'blue' ? '#dbeafe' : color === 'purple' ? '#f3e8ff' : color === 'amber' ? '#fef3c7' : color === 'indigo' ? '#e0e7ff' : color === 'green' ? '#dcfce7' : '#f1f5f9',
                              color: color === 'red' ? '#b91c1c' : color === 'orange' ? '#c2410c' : color === 'blue' ? '#1d4ed8' : color === 'purple' ? '#6b21a8' : color === 'amber' ? '#b45309' : color === 'indigo' ? '#3730a3' : color === 'green' ? '#15803d' : '#475569',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontWeight: 600,
                              fontSize: '0.75rem'
                            }}>
                              <span>{opt.name}</span>
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
                                onClick={() => handleDelete(opt.id, opt.name)}
                                disabled={actionLoading === `delete-${opt.id}`}
                                className="btn btn-outline"
                                title={isSystem ? 'Las opciones del sistema se desactivarán lógicamente' : 'Eliminar opción'}
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
          </div>
        )}
      </div>

      {/* Sección Expandida para Edición de Metadata */}
      {editingId && (activeTab === 'editorial_indicator' || activeTab === 'publication_status') && (
        <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#fafaf9' }}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600 }}>Edición de Metadatos de "{editForm.name}"</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Color del Tag</label>
                <select
                  value={editForm.color}
                  onChange={e => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                  className="form-select"
                  style={{ height: '36px', fontSize: '0.85rem' }}
                >
                  <option value="gray">Gris (Neutral)</option>
                  <option value="blue">Azul (Información)</option>
                  <option value="green">Verde (Éxito)</option>
                  <option value="orange">Naranja (Advertencia)</option>
                  <option value="amber">Ámbar (Atención)</option>
                  <option value="red">Rojo (Bloqueo/Alerta)</option>
                  <option value="purple">Púrpura (Validación)</option>
                  <option value="indigo">Índigo (Técnico)</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Icono</label>
                <select
                  value={editForm.icon}
                  onChange={e => setEditForm(prev => ({ ...prev, icon: e.target.value }))}
                  className="form-select"
                  style={{ height: '36px', fontSize: '0.85rem' }}
                >
                  <option value="circle">Círculo vacío</option>
                  <option value="check-circle">Círculo verificado</option>
                  <option value="x-circle">Círculo con cruz</option>
                  <option value="file-warning">Archivo con alerta</option>
                  <option value="file-text">Documento de texto</option>
                  <option value="history">Reloj / Historial</option>
                  <option value="phone">Teléfono</option>
                  <option value="shield-alert">Escudo de alerta</option>
                  <option value="settings">Engranaje</option>
                  <option value="lock">Candado</option>
                  <option value="calendar">Calendario</option>
                  <option value="eye">Ojo abierto</option>
                  <option value="eye-off">Ojo tachado</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Clave de Ayuda Contextual (Help Key)</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.help_key}
                  onChange={e => setEditForm(prev => ({ ...prev, help_key: e.target.value }))}
                  style={{ height: '36px', fontSize: '0.85rem' }}
                />
              </div>

              {activeTab === 'editorial_indicator' && (
                <div style={{ display: 'flex', alignItems: 'center', padding: '1rem 0 0 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editForm.blocks_publication}
                      onChange={e => setEditForm(prev => ({ ...prev, blocks_publication: e.target.checked }))}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span>🛡️ Bloquea publicación</span>
                  </label>
                </div>
              )}

              {activeTab === 'publication_status' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '1rem 0 0 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editForm.requires_publication_date}
                        onChange={e => setEditForm(prev => ({ ...prev, requires_publication_date: e.target.checked }))}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span>📅 Requiere fecha programada</span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', padding: '1rem 0 0 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editForm.is_default}
                        onChange={e => setEditForm(prev => ({ ...prev, is_default: e.target.checked }))}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span>⭐ Opción por Defecto</span>
                    </label>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {activeTab === 'editorial_indicator' ? (
                <>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Criterio de Activación (Metadata)</label>
                    <textarea
                      className="form-textarea"
                      value={editForm.activation_criteria}
                      onChange={e => setEditForm(prev => ({ ...prev, activation_criteria: e.target.value }))}
                      style={{ minHeight: '60px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Instrucciones de Resolución (Metadata)</label>
                    <textarea
                      className="form-textarea"
                      value={editForm.resolution_instructions}
                      onChange={e => setEditForm(prev => ({ ...prev, resolution_instructions: e.target.value }))}
                      style={{ minHeight: '60px', fontSize: '0.85rem' }}
                    />
                  </div>
                </>
              ) : (
                <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Condiciones Mínimas (Metadata)</label>
                  <textarea
                    className="form-textarea"
                    value={editForm.minimum_conditions}
                    onChange={e => setEditForm(prev => ({ ...prev, minimum_conditions: e.target.value }))}
                    style={{ minHeight: '60px', fontSize: '0.85rem' }}
                  />
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="btn btn-outline"
                style={{ height: '32px', fontSize: '0.85rem' }}
              >
                Cerrar Panel de Metadatos
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
