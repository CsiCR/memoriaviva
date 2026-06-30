'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, X, Shield, FileText, User, Printer, ArrowLeft, AlertCircle, Check } from 'lucide-react';

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'mp3', 'wav', 'm4a', 'mp4', 'mov'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function AdminAportesNuevo() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const consentInputRef = useRef<HTMLInputElement>(null);

  // Estados del Formulario
  const [formData, setFormData] = useState({
    // Consentimiento Administrativo
    consent_source: 'signed_paper', // signed_paper | institutional_agreement | web_form
    consent_reference: '',

    // Aportante
    dni: '',
    full_name: '',
    phone: '',
    email: '',
    relation_to_city: 'Vecino actual',
    neighborhood_or_institution: '',
    comments: '',
    allow_contact: true,

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
    authorization_level: 'A',
    credit_preference: 'Nombre completo',
  });

  const [files, setFiles] = useState<File[]>([]);
  const [consentFile, setConsentFile] = useState<File | null>(null);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

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

  const handleConsentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    if (!['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(extension)) {
      setConsentError('Formato inválido (solo imágenes JPG, PNG, WEBP o documentos PDF).');
      setConsentFile(null);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setConsentError('El archivo supera los 50 MB.');
      setConsentFile(null);
      return;
    }

    setConsentError(null);
    setConsentFile(file);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeConsentFile = () => {
    setConsentFile(null);
    if (consentInputRef.current) consentInputRef.current.value = '';
  };

  const printConsentForm = () => {
    if (!formData.full_name || !formData.dni) {
      alert('Por favor, ingresa el Nombre y el DNI del aportante para pre-rellenar la planilla.');
      return;
    }
    const url = `/admin/print?name=${encodeURIComponent(formData.full_name)}&dni=${encodeURIComponent(formData.dni)}&title=${encodeURIComponent(formData.title || '')}`;
    window.open(url, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    setUploadProgress('Validando datos...');

    if (formData.contribution_type !== 'Testimonio escrito' && files.length === 0) {
      setErrorMsg('Debes adjuntar al menos un archivo para este tipo de aporte.');
      setLoading(false);
      return;
    }

    try {
      const submissionData = new FormData();
      
      // Adjuntar campos básicos
      Object.entries(formData).forEach(([key, value]) => {
        submissionData.append(key, String(value));
      });

      // Adjuntar archivos de aporte
      files.forEach((file) => {
        submissionData.append('files', file);
      });

      // Adjuntar archivo de consentimiento si existe
      if (consentFile) {
        submissionData.append('consent_file', consentFile);
      }

      setUploadProgress('Subiendo archivos y registrando en la base de datos...');

      const response = await fetch('/api/admin/contribute', {
        method: 'POST',
        body: submissionData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ocurrió un error al procesar la carga.');
      }

      router.push('/admin/aportes');
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Botón Volver */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/admin/aportes" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', height: '36px', padding: '0 0.75rem' }}>
          <ArrowLeft size={16} /> Volver a Aportes
        </Link>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem', color: '#0f172a' }}>Cargar Aporte Administrativo</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Ingresar material histórico digitalizado directamente desde el archivo o bajo convenios institucionales.
        </p>
      </div>

      {errorMsg && (
        <div className="alert alert-danger" style={{ marginBottom: '2rem' }}>
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* SECCIÓN 1: DATOS DE LA INGESTA (APORTANTE O INSTITUCIÓN) */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-warm)', paddingBottom: '0.5rem' }}>
            <User size={20} style={{ color: 'var(--primary-blue)' }} /> 1. Datos de la Ingesta (Aportante)
          </h2>

          <div className="form-group">
            <label className="form-label form-label-required">Origen del Aporte</label>
            <select
              name="consent_source"
              required
              className="form-select"
              value={formData.consent_source}
              onChange={handleInputChange}
              disabled={loading}
            >
              <option value="signed_paper">Caso 2: Planilla Firmada en Papel (Digitalizada)</option>
              <option value="institutional_agreement">Caso 3: Convenio Institucional (Biblioteca/Archivo)</option>
              <option value="web_form">Caso 1: Formulario Web (Carga retroactiva)</option>
            </select>
          </div>

          {/* CASO 1 Y 2: DATOS DEL VECINO APORTANTE */}
          {formData.consent_source !== 'institutional_agreement' && (
            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1rem', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', color: '#0f172a', fontWeight: 600 }}>Datos Personales del Aportante</h3>
              
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
                    placeholder="Ej. Juan Pérez"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input
                    type="tel"
                    name="phone"
                    className="form-input"
                    placeholder="Ej. 2974123456"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="form-input"
                    placeholder="juan@email.com"
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
                    <option value="Vecino actual">Vecino actual</option>
                    <option value="Vecino anterior (emigrado)">Vecino anterior (emigrado)</option>
                    <option value="Familiar de pioneros">Familiar de pioneros</option>
                    <option value="Representante de institución local">Representante de institución local</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label form-label-required">Barrio o Institución vinculada</label>
                  <input
                    type="text"
                    name="neighborhood_or_institution"
                    required
                    className="form-input"
                    placeholder="Ej. Barrio YPF / Familia Pérez"
                    value={formData.neighborhood_or_institution}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          )}

          {/* CASO 3: DETALLE DE CONVENIO INSTITUCIONAL */}
          {formData.consent_source === 'institutional_agreement' && (
            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1rem', paddingTop: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label form-label-required">Institución de Origen / Colaboradora</label>
                <input
                  type="text"
                  name="related_institution"
                  required
                  className="form-input"
                  placeholder="Ej. Biblioteca Municipal de Pico Truncado / Archivo Histórico"
                  value={formData.related_institution}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>
            </div>
          )}
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
                placeholder="Ej. Festejos Unión Vecinal YPF 1965"
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

          {/* CARGA DE ARCHIVOS MULTIMEDIA (Se renderiza inmediatamente debajo del tipo si aplica) */}
          {formData.contribution_type && formData.contribution_type !== 'Testimonio escrito' && (
            <div style={{ marginBottom: '1.5rem', padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
              <label className="form-label form-label-required" style={{ fontWeight: 600, display: 'block', marginBottom: '0.75rem' }}>Subir Archivos Históricos Adjuntos</label>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--primary-blue)',
                  borderRadius: '6px',
                  padding: '2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--primary-blue-light)',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <Upload size={32} style={{ color: 'var(--primary-blue)', margin: '0 auto 0.75rem auto' }} />
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>
                  Haga clic para seleccionar archivos históricos
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Imágenes, documentos, audios o videos (hasta 50 MB por archivo).
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

              {/* Errores */}
              {fileErrors.length > 0 && (
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {fileErrors.map((error, idx) => (
                    <div key={idx} style={{ color: 'var(--danger-color)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertCircle size={12} /> <span>{error}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Listado */}
              {files.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                    Archivos seleccionados ({files.length}):
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {files.map((file, index) => (
                      <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                          {file.name} <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          style={{ background: 'none', border: 'none', color: 'var(--neutral-grey)', cursor: 'pointer' }}
                          disabled={loading}
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

          <div style={{ backgroundColor: 'var(--neutral-grey-light)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <label className="form-checkbox-label">
              <input
                type="checkbox"
                name="knows_exact_date"
                checked={formData.knows_exact_date}
                onChange={handleInputChange}
                disabled={loading}
              />
              <strong>¿Se conoce la fecha exacta del material?</strong>
            </label>

            {formData.knows_exact_date ? (
              <div className="form-group" style={{ margin: 0, marginTop: '0.75rem' }}>
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
              <div className="form-group" style={{ margin: 0, marginTop: '0.75rem' }}>
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
                placeholder="Ej. Pioneros fundadores, vecinos del barrio (opcional)"
                value={formData.mentioned_people}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Historia o contexto del aporte (Testimonio / Anécdotas)</label>
            <textarea
              name="historical_context"
              className="form-textarea"
              placeholder="Escribe aquí el relato, historia o anécdota asociada a este recuerdo."
              value={formData.historical_context}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>
        </div>

        {/* SECCIÓN 3: CONSENTIMIENTO LEGAL Y RESPALDOS */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-warm)', paddingBottom: '0.5rem' }}>
            <Shield size={20} style={{ color: 'var(--primary-blue)' }} /> 3. Consentimiento Legal y Respaldos
          </h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', backgroundColor: 'var(--primary-blue-light)', padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--primary-blue-light)' }}>
            <div style={{ flexGrow: 1 }}>
              <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Planilla de Consentimiento Pre-rellenada</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Genera el documento A4 oficial con el nombre y DNI del aportante listo para imprimir y firmar.
              </span>
            </div>
            {formData.consent_source === 'signed_paper' && (
              <button
                type="button"
                onClick={printConsentForm}
                className="btn btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', height: '40px', padding: '0 1rem' }}
                disabled={loading}
              >
                <Printer size={16} /> Imprimir Planilla A4
              </button>
            )}
          </div>

          <div className="grid grid-2">
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
                <option value="A">Nivel A: Público (Web y Catálogos)</option>
                <option value="B">Nivel B: Educativo y Académico</option>
                <option value="C">Nivel C: Interno (Solo consulta en Archivo)</option>
                <option value="D">Nivel D: Restringido (Solo preservación)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label form-label-required">Preferencia de créditos</label>
              <select
                name="credit_preference"
                required
                className="form-select"
                value={formData.credit_preference}
                onChange={handleInputChange}
                disabled={loading}
              >
                <option value="Nombre completo">Nombre completo (Aporte de [Nombre])</option>
                <option value="Iniciales">Iniciales (Aporte de [Iniciales])</option>
                <option value="Familia aportante">Familia aportante (Donación Familia [Barrio/Inst])</option>
                <option value="Anónimo">Anónimo</option>
              </select>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Código de Referencia / Expediente Físico</label>
              <input
                type="text"
                name="consent_reference"
                className="form-input"
                placeholder={formData.consent_source === 'institutional_agreement' ? 'Ej. Convenio Biblioteca-2026' : 'Ej. Folio 45-B'}
                value={formData.consent_reference}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            {/* Subir archivo de respaldo legal (Casos 2 y 3) */}
            {formData.consent_source !== 'web_form' && (
              <div className="form-group">
                <label className="form-label form-label-required" style={{ fontWeight: 600 }}>
                  {formData.consent_source === 'signed_paper' 
                    ? 'Subir Foto/PDF de Planilla Firmada' 
                    : 'Subir PDF del Convenio de Respaldo'}
                </label>
                {!consentFile ? (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <input
                      type="file"
                      ref={consentInputRef}
                      onChange={handleConsentFileChange}
                      accept="image/*,application/pdf"
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => consentInputRef.current?.click()}
                      className="btn btn-outline"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', height: '40px', justifyContent: 'center' }}
                      disabled={loading}
                    >
                      <Upload size={16} /> Seleccionar Archivo Firmado
                    </button>
                    {consentError && <div style={{ color: 'var(--danger-color)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{consentError}</div>}
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', height: '40px' }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                      📄 {consentFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={removeConsentFile}
                      style={{ background: 'none', border: 'none', color: 'var(--neutral-grey)', cursor: 'pointer' }}
                      disabled={loading}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* BOTONES DE ENVÍO */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <Link href="/admin/aportes" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', height: '40px' }}>
            Cancelar
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', height: '40px', padding: '0 1.5rem' }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', marginRight: '0.25rem' }}></span>
                {uploadProgress}
              </>
            ) : (
              <>
                <Check size={18} /> Guardar Aporte en Sistema
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
