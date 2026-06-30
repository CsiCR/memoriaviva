'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Shield, FileText, User, HelpCircle, AlertCircle } from 'lucide-react';

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'mp3', 'wav', 'm4a', 'mp4', 'mov'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function Aportar() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados del Formulario
  const [formData, setFormData] = useState({
    // Aportante
    dni: '',
    full_name: '',
    phone: '',
    email: '',
    relation_to_city: '',
    neighborhood_or_institution: '',
    comments: '',
    allow_contact: false,

    // Aporte
    title: '',
    contribution_type: '',
    description: '',
    knows_exact_date: false,
    exact_date: '',
    approximate_decade: '',
    related_place: '',
    mentioned_people: '',
    related_institution: '',
    historical_context: '',

    // Consentimiento
    authorization_level: '',
    credit_preference: '',
    owns_or_has_permission: false,
    accepts_cataloging: false,
  });

  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Estado para controlar si hay datos previos guardados
  const [hasCachedContributor, setHasCachedContributor] = useState(false);

  // Cargar datos previos si existen
  useEffect(() => {
    const cached = sessionStorage.getItem('last_contributor');
    if (cached) {
      setHasCachedContributor(true);
    }
  }, []);

  const loadCachedContributor = () => {
    const cached = sessionStorage.getItem('last_contributor');
    if (cached) {
      const data = JSON.parse(cached);
      setFormData((prev) => ({
        ...prev,
        dni: data.dni || '',
        full_name: data.full_name || '',
        phone: data.phone || '',
        email: data.email || '',
        relation_to_city: data.relation_to_city || '',
        neighborhood_or_institution: data.neighborhood_or_institution || '',
        allow_contact: data.allow_contact ?? false,
      }));
      setHasCachedContributor(false); // Ocultar prompt tras cargar
    }
  };

  const clearCachedContributor = () => {
    sessionStorage.removeItem('last_contributor');
    setHasCachedContributor(false);
  };

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    const newErrors: string[] = [];
    const validFiles: File[] = [];

    selectedFiles.forEach((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        newErrors.push(`El archivo "${file.name}" no está permitido. Formatos válidos: jpg, jpeg, png, webp, pdf, doc, docx, mp3, wav, m4a, mp4, mov.`);
        return;
      }
      
      if (file.size > MAX_FILE_SIZE) {
        newErrors.push(`El archivo "${file.name}" supera el límite de 50 MB.`);
        return;
      }

      validFiles.push(file);
    });

    setFileErrors(newErrors);
    setFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    setUploadProgress('Validando y preparando el envío...');

    // Validar archivos según tipo de aporte
    if (formData.contribution_type !== 'Testimonio escrito' && files.length === 0) {
      setErrorMsg('Debes adjuntar al menos un archivo para este tipo de aporte.');
      setLoading(false);
      return;
    }

    // Validar consentimiento
    if (!formData.owns_or_has_permission || !formData.accepts_cataloging) {
      setErrorMsg('Debes marcar las declaraciones obligatorias de consentimiento.');
      setLoading(false);
      return;
    }

    try {
      const submissionData = new FormData();
      
      // Adjuntar datos
      Object.entries(formData).forEach(([key, value]) => {
        submissionData.append(key, String(value));
      });

      // Adjuntar archivos
      files.forEach((file) => {
        submissionData.append('files', file);
      });

      setUploadProgress('Subiendo archivos y registrando aporte en Supabase...');

      const response = await fetch('/api/contribute', {
        method: 'POST',
        body: submissionData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ocurrió un error al procesar el aporte.');
      }

      // Guardar datos del aportante en sessionStorage para permitir reutilizarlos en envíos consecutivos
      const contributorInfo = {
        dni: formData.dni,
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email,
        relation_to_city: formData.relation_to_city,
        neighborhood_or_institution: formData.neighborhood_or_institution,
        allow_contact: formData.allow_contact,
      };
      sessionStorage.setItem('last_contributor', JSON.stringify(contributorInfo));

      router.push('/gracias');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error de conexión con el servidor. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container section" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Aportar una Memoria Histórica</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Tu aporte ayuda a rescatar el patrimonio y la identidad de nuestra ciudad de forma segura y privada.
        </p>
      </div>

      {errorMsg && (
        <div className="alert alert-danger" style={{ marginBottom: '2rem' }}>
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* SECCIÓN 1: DATOS PERSONALES */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-warm)', paddingBottom: '0.5rem' }}>
            <User size={20} style={{ color: 'var(--primary-blue)' }} /> 1. Datos del Aportante
          </h2>

          {hasCachedContributor && (
            <div style={{
              backgroundColor: 'var(--primary-blue-light)',
              border: '1px solid rgba(21, 136, 230, 0.15)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#0f172a', fontWeight: 500 }}>
                💡 Detectamos que acabas de realizar un aporte. ¿Quieres rellenar este paso con tus mismos datos personales del envío anterior?
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={loadCachedContributor}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', height: 'auto' }}
                >
                  Sí, mantener mis datos
                </button>
                <button
                  type="button"
                  onClick={clearCachedContributor}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', height: 'auto', backgroundColor: '#ffffff' }}
                >
                  No, es otra persona
                </button>
              </div>
            </div>
          )}
          
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label form-label-required">DNI (Documento Nacional de Identidad)</label>
              <input
                type="text"
                name="dni"
                required
                className="form-input"
                placeholder="Ej. 12345678"
                value={formData.dni}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label form-label-required">Nombre y Apellido</label>
              <input
                type="text"
                name="full_name"
                required
                className="form-input"
                placeholder="Ej. Juan Carlos Pérez"
                value={formData.full_name}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label form-label-required">Teléfono / WhatsApp</label>
              <input
                type="tel"
                name="phone"
                required
                className="form-input"
                placeholder="Ej. 2974123456"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={loading}
              />
              <span className="form-helper">Indicar código de área sin el 15.</span>
            </div>

            <div className="form-group">
              <label className="form-label form-label-required">Email</label>
              <input
                type="email"
                name="email"
                required
                className="form-input"
                placeholder="juan.perez@email.com"
                value={formData.email}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label form-label-required">Relación con Pico Truncado</label>
              <select
                name="relation_to_city"
                required
                className="form-select"
                value={formData.relation_to_city}
                onChange={handleInputChange}
                disabled={loading}
              >
                <option value="">Seleccione una opción...</option>
                <option value="Vecino actual">Vecino actual</option>
                <option value="Vecino anterior (emigrado)">Vecino anterior (emigrado)</option>
                <option value="Familiar de pioneros">Familiar de pioneros</option>
                <option value="Representante de institución local">Representante de institución local</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label form-label-required">Barrio, institución o familia vinculada</label>
            <input
              type="text"
              name="neighborhood_or_institution"
              required
              className="form-input"
              placeholder="Ej. Barrio YPF / Club Defensores / Familia Pérez"
              value={formData.neighborhood_or_institution}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Comentarios adicionales</label>
            <textarea
              name="comments"
              className="form-textarea"
              placeholder="Cualquier información que quieras aclararle al equipo sobre ti."
              value={formData.comments}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>

          <label className="form-checkbox-label" style={{ margin: 0 }}>
            <input
              type="checkbox"
              name="allow_contact"
              checked={formData.allow_contact}
              onChange={handleInputChange}
              disabled={loading}
            />
            <span>Acepto ser contactado por el equipo editorial para profundizar en la historia o realizar una entrevista.</span>
          </label>
        </div>

        {/* SECCIÓN 2: DETALLES DEL APORTE */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-warm)', paddingBottom: '0.5rem' }}>
            <FileText size={20} style={{ color: 'var(--primary-blue)' }} /> 2. Detalles del Aporte Histórico
          </h2>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label form-label-required">Título del recuerdo o material</label>
              <input
                type="text"
                name="title"
                required
                className="form-input"
                placeholder="Ej. Festejos en la Unión Vecinal 1965"
                value={formData.title}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label form-label-required">Tipo de aporte</label>
              <select
                name="contribution_type"
                required
                className="form-select"
                value={formData.contribution_type}
                onChange={handleInputChange}
                disabled={loading}
              >
                <option value="">Seleccione una opción...</option>
                <option value="Testimonio escrito">Testimonio escrito (Solo texto)</option>
                <option value="Fotografía">Fotografía</option>
                <option value="Documento">Documento (Cartas, boletines, planos, etc.)</option>
                <option value="Audio">Audio (Relatos grabados, entrevistas antiguas)</option>
                <option value="Video">Video (Grabaciones familiares, institucionales)</option>
              </select>
            </div>
          </div>

          {/* CARGA DE ARCHIVOS (Aparece inmediatamente abajo de la selección de tipo de aporte) */}
          {formData.contribution_type && formData.contribution_type !== 'Testimonio escrito' && (
            <div style={{ 
              marginBottom: '1.5rem', 
              padding: '1.5rem', 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--radius-md)', 
              backgroundColor: '#f8fafc' 
            }}>
              <label className="form-label form-label-required" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Upload size={18} style={{ color: 'var(--primary-blue)' }} /> Subir Archivos Adjuntos
              </label>

              <div 
                onClick={triggerFileSelect}
                style={{
                  border: '2px dashed var(--primary-blue)',
                  borderRadius: 'var(--radius-md)',
                  padding: '2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--primary-blue-light)',
                  transition: 'var(--transition-smooth)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0f2fe'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-blue-light)'}
              >
                <Upload size={32} style={{ color: 'var(--primary-blue)', margin: '0 auto 0.75rem auto' }} />
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>
                  Haga clic para seleccionar archivos
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Imágenes, documentos, audios o videos de hasta 50 MB por archivo.
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  style={{ display: 'none' }}
                  disabled={loading}
                />
              </div>

              {/* Errores de archivos */}
              {fileErrors.length > 0 && (
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {fileErrors.map((error, idx) => (
                    <div key={idx} style={{ color: 'var(--danger-color)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={14} />
                      <span>{error}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Listado de archivos seleccionados */}
              {files.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                    Archivos seleccionados ({files.length}):
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {files.map((file, index) => (
                      <div 
                        key={index} 
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.5rem 0.75rem',
                          backgroundColor: '#ffffff',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          fontSize: '0.8rem'
                        }}
                      >
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                          {file.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--neutral-grey)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.25rem'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger-color)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--neutral-grey)'}
                          title="Quitar archivo"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label form-label-required">Breve descripción del material</label>
            <input
              type="text"
              name="description"
              required
              className="form-input"
              placeholder="Ej. Foto familiar del almuerzo en el salón vecinal con motivo del aniversario."
              value={formData.description}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>

          <div style={{ backgroundColor: 'var(--neutral-grey-light)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
            <label className="form-checkbox-label">
              <input
                type="checkbox"
                name="knows_exact_date"
                checked={formData.knows_exact_date}
                onChange={handleInputChange}
                disabled={loading}
              />
              <strong>¿Conoces la fecha exacta de este material?</strong>
            </label>

            {formData.knows_exact_date ? (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Fecha Exacta</label>
                <input
                  type="date"
                  name="exact_date"
                  className="form-input"
                  value={formData.exact_date}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>
            ) : (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Década aproximada</label>
                <select
                  name="approximate_decade"
                  className="form-select"
                  value={formData.approximate_decade}
                  onChange={handleInputChange}
                  disabled={loading}
                >
                  <option value="">Seleccione una década...</option>
                  <option value="1920s">Década de 1920</option>
                  <option value="1930s">Década de 1930</option>
                  <option value="1940s">Década de 1940</option>
                  <option value="1950s">Década de 1950</option>
                  <option value="1960s">Década de 1960</option>
                  <option value="1970s">Década de 1970</option>
                  <option value="1980s">Década de 1980</option>
                  <option value="1990s">Década de 1990</option>
                  <option value="2000s">Década de 2000</option>
                  <option value="2010s">Década de 2010</option>
                  <option value="2020s">Década de 2020</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label form-label-required">Lugar relacionado</label>
              <input
                type="text"
                name="related_place"
                required
                className="form-input"
                placeholder="Ej. Unión Vecinal Barrio YPF / Estación del Tren"
                value={formData.related_place}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Personas que aparecen o se mencionan</label>
              <input
                type="text"
                name="mentioned_people"
                className="form-input"
                placeholder="Ej. Edith Gómez, vecinos fundadores (opcional)"
                value={formData.mentioned_people}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Institución relacionada (opcional)</label>
            <input
              type="text"
              name="related_institution"
              className="form-input"
              placeholder="Ej. Unión Vecinal Barrio YPF / Municipalidad / Centro Chileno"
              value={formData.related_institution}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Historia o contexto del aporte (Testimonio / Anécdotas)</label>
            <textarea
              name="historical_context"
              className="form-textarea"
              placeholder="Escribe aquí el relato, historia o anécdota asociada a este recuerdo. Si es un 'Testimonio escrito', este campo es el principal."
              value={formData.historical_context}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>
        </div>

        {/* SECCIÓN 3: CONSENTIMIENTO Y PRIVACIDAD */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-warm)', paddingBottom: '0.5rem' }}>
            <Shield size={20} style={{ color: 'var(--primary-blue)' }} /> 3. Consentimiento y Privacidad
          </h2>

          <div className="form-group">
            <label className="form-label form-label-required">Nivel de autorización de uso</label>
            <select
              name="authorization_level"
              required
              className="form-select"
              value={formData.authorization_level}
              onChange={handleInputChange}
              disabled={loading}
            >
              <option value="">Seleccione un nivel...</option>
              <option value="A">Nivel A — Uso público completo (Libro, Web, Muestras, Redes, Educación)</option>
              <option value="B">Nivel B — Uso editorial y educativo (Libro y escuelas, sin redes sociales)</option>
              <option value="C">Nivel C — Archivo histórico interno (Solo conservación, sin publicación)</option>
              <option value="D">Nivel D — Material restringido (Acceso limitado únicamente al comité)</option>
            </select>
            <span className="form-helper" style={{ display: 'block', marginTop: '0.5rem' }}>
              Para más información sobre los alcances, visite nuestra <a href="/privacidad" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>Página de Privacidad</a>.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label form-label-required">Preferencia de créditos en publicaciones</label>
            <select
              name="credit_preference"
              required
              className="form-select"
              value={formData.credit_preference}
              onChange={handleInputChange}
              disabled={loading}
            >
              <option value="">Seleccione una preferencia...</option>
              <option value="Nombre completo">Nombre completo (Ej. Aporte de Juan Carlos Pérez)</option>
              <option value="Iniciales">Iniciales (Ej. J.C.P.)</option>
              <option value="Familia aportante">Familia aportante (Ej. Aporte de la Familia Pérez-Giménez)</option>
              <option value="Anónimo">Anónimo (Sin mención pública, solo registro interno)</option>
            </select>
          </div>

          <hr style={{ border: 0, borderTop: '1px solid var(--border-warm)', margin: '1.5rem 0' }} />

          <label className="form-checkbox-label">
            <input
              type="checkbox"
              name="owns_or_has_permission"
              checked={formData.owns_or_has_permission}
              onChange={handleInputChange}
              required
              disabled={loading}
            />
            <span style={{ fontSize: '0.85rem' }}>
              <strong>Declaro bajo juramento</strong> que soy titular exclusivo del material aportado o que cuento con las autorizaciones, permisos y licencias suficientes por parte de los titulares del copyright o familiares directos para compartirlo voluntariamente con el Proyecto Memoria Viva Pico Truncado. <span style={{ color: 'var(--danger-color)' }}>*</span>
            </span>
          </label>

          <label className="form-checkbox-label" style={{ marginBottom: 0 }}>
            <input
              type="checkbox"
              name="accepts_cataloging"
              checked={formData.accepts_cataloging}
              onChange={handleInputChange}
              required
              disabled={loading}
            />
            <span style={{ fontSize: '0.85rem' }}>
              <strong>Acepto y autorizo</strong> que el material sea recibido, conservado, catalogado, restaurado y revisado por el equipo de profesionales del proyecto según el nivel de autorización seleccionado anteriormente. <span style={{ color: 'var(--danger-color)' }}>*</span>
            </span>
          </label>
        </div>

        {/* ACCIONES DEL FORMULARIO */}
        <div style={{ textAlign: 'right' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div className="spinner" style={{
                display: 'inline-block',
                width: '24px',
                height: '24px',
                border: '3px solid rgba(21, 136, 230, 0.2)',
                borderTopColor: 'var(--primary-blue)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginRight: '0.75rem',
                verticalAlign: 'middle'
              }}></div>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {uploadProgress}
              </span>
            </div>
          ) : (
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '1rem' }}
            >
              Enviar Aporte de Forma Segura
            </button>
          )}
        </div>

      </form>
    </div>
  );
}
