'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Calendar, MapPin, Heart, MessageCircle, Shield, Check, Loader2, Info } from 'lucide-react';

export default function QuieroFormarParte() {
  const router = useRouter();

  // Focus ref for the first input field
  const firstNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstNameInputRef.current?.focus();
  }, []);

  // Form states
  const [formData, setFormData] = useState({
    dni: '',
    full_name: '',
    phone: '',
    email: '',
    relation_to_city: '',
    birth_date: '',
    birth_place: '',
    narrative: '',
    allow_contact: true,
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Limpiar error específico al cambiar valor
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      errors.full_name = 'Nombre y apellido es requerido';
    }

    const dniClean = formData.dni.replace(/\D/g, '');
    if (!dniClean) {
      errors.dni = 'DNI es requerido';
    } else if (dniClean.length < 7 || dniClean.length > 9) {
      errors.dni = 'El DNI debe tener entre 7 y 9 números';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Teléfono de contacto es requerido';
    }

    if (!formData.email.trim()) {
      errors.email = 'E-mail de contacto es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'E-mail no tiene un formato válido';
    }

    if (!formData.relation_to_city) {
      errors.relation_to_city = 'Por favor selecciona tu relación con la ciudad';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!validateForm()) {
      setErrorMsg('Por favor completa todos los campos obligatorios marcados con (*).');
      return;
    }

    setLoading(true);

    try {
      const submissionData = new FormData();

      // Mapear los datos de registro de aportante según la especificación del sistema
      submissionData.append('dni', formData.dni.trim());
      submissionData.append('full_name', formData.full_name.trim());
      submissionData.append('phone', formData.phone.trim());
      submissionData.append('email', formData.email.trim());
      submissionData.append('relation_to_city', formData.relation_to_city);
      submissionData.append('neighborhood_or_institution', 'Plataforma Memoria Viva Pico Truncado');
      submissionData.append('comments', 'nuevo registro de aportante');
      submissionData.append('allow_contact', formData.allow_contact ? 'true' : 'false');

      // Campos de la contribución asociada
      const birthPlaceLabel = formData.birth_place.trim() 
        ? `Lugar de nacimiento: ${formData.birth_place.trim()}`
        : 'Lugar de nacimiento: No especificado';
      
      submissionData.append('title', birthPlaceLabel);
      submissionData.append('contribution_type', 'Testimonio escrito');
      submissionData.append('description', 'nuevo registro de aportante');
      
      if (formData.birth_date) {
        submissionData.append('exact_date', formData.birth_date);
      }
      
      submissionData.append('related_place', 'Plataforma Memoria Viva Pico Truncado');
      
      const userNarrative = formData.narrative.trim()
        ? formData.narrative.trim()
        : 'Sin relato inicial (Pendiente de contacto)';
      submissionData.append('historical_context', userNarrative);

      // Cesión y consentimiento digital implícito
      submissionData.append('authorization_level', 'C'); // Interno / Preventivo
      submissionData.append('credit_preference', 'Anónimo');
      submissionData.append('owns_or_has_permission', 'true');
      submissionData.append('accepts_cataloging', 'true');

      const response = await fetch('/api/contribute', {
        method: 'POST',
        body: submissionData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ocurrió un error al enviar el registro.');
      }

      // Guardar datos del aportante en sessionStorage para recordar su sesión
      const contributorInfo = {
        dni: formData.dni,
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email,
        relation_to_city: formData.relation_to_city,
        neighborhood_or_institution: 'Plataforma Memoria Viva Pico Truncado',
        allow_contact: formData.allow_contact,
      };
      sessionStorage.setItem('last_contributor', JSON.stringify(contributorInfo));

      // Redireccionar al agradecimiento público
      router.push('/gracias');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error de conexión con el servidor. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container section" style={{ maxWidth: '780px', paddingBottom: '5rem' }}>
      
      {/* Encabezado */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          width: '56px', 
          height: '56px', 
          borderRadius: '50%', 
          backgroundColor: 'var(--primary-blue-light, #e0f2fe)', 
          color: 'var(--primary-blue, #0284c7)', 
          marginBottom: '1rem' 
        }}>
          <Heart size={28} />
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Quiero formar parte
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.5, maxWidth: '640px', margin: '0 auto' }}>
          ¿Quieres sumar tu voz y recuerdos a la historia de Pico Truncado? Completa este formulario básico para registrarte en el archivo histórico. Nos contactaremos para coordinar encuentros y conversar sobre tus relatos o fotos.
        </p>
      </div>

      {errorMsg && (
        <div className="card" style={{ 
          backgroundColor: '#fef2f2', 
          borderColor: '#fca5a5', 
          color: '#b91c1c', 
          padding: '1rem', 
          marginBottom: '2rem',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.95rem'
        }}>
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Formulario Principal */}
      <form onSubmit={handleSubmit} className="card" style={{ 
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)', 
        borderRadius: '12px', 
        padding: '2.5rem 2rem',
        border: '1px solid var(--border-warm, #e2e8f0)'
      }}>
        
        {/* Sección A: Datos de Contacto */}
        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, borderBottom: '2px solid var(--primary-blue-light, #e0f2fe)', paddingBottom: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={18} style={{ color: 'var(--primary-blue)' }} /> 1. Datos Personales y de Contacto
        </h3>

        <div className="grid grid-2" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label form-label-required" style={{ fontWeight: 550 }}>Nombre y Apellido*</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                name="full_name"
                ref={firstNameInputRef}
                className="form-input"
                placeholder="Nombre completo"
                value={formData.full_name}
                onChange={handleInputChange}
                disabled={loading}
                style={{ paddingLeft: '2.5rem', height: '42px', borderColor: formErrors.full_name ? 'var(--danger-color)' : 'var(--border-color)' }}
              />
              <User size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
            </div>
            {formErrors.full_name && <span style={{ color: 'var(--danger-color)', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>{formErrors.full_name}</span>}
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label form-label-required" style={{ fontWeight: 550 }}>DNI / Cédula*</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                name="dni"
                className="form-input"
                placeholder="Número sin puntos"
                value={formData.dni}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData(prev => ({ ...prev, dni: val }));
                }}
                disabled={loading}
                style={{ paddingLeft: '2.5rem', height: '42px', borderColor: formErrors.dni ? 'var(--danger-color)' : 'var(--border-color)' }}
              />
              <Shield size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
            </div>
            {formErrors.dni && <span style={{ color: 'var(--danger-color)', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>{formErrors.dni}</span>}
          </div>
        </div>

        <div className="grid grid-2" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label form-label-required" style={{ fontWeight: 550 }}>Teléfono / WhatsApp*</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                name="phone"
                className="form-input"
                placeholder="Ej: +54 297 1234567"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={loading}
                style={{ paddingLeft: '2.5rem', height: '42px', borderColor: formErrors.phone ? 'var(--danger-color)' : 'var(--border-color)' }}
              />
              <Phone size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
            </div>
            {formErrors.phone && <span style={{ color: 'var(--danger-color)', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>{formErrors.phone}</span>}
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label form-label-required" style={{ fontWeight: 550 }}>Email de Contacto*</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder="correo@ejemplo.com"
                value={formData.email}
                onChange={handleInputChange}
                disabled={loading}
                style={{ paddingLeft: '2.5rem', height: '42px', borderColor: formErrors.email ? 'var(--danger-color)' : 'var(--border-color)' }}
              />
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
            </div>
            {formErrors.email && <span style={{ color: 'var(--danger-color)', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>{formErrors.email}</span>}
          </div>
        </div>

        <div className="grid grid-2" style={{ gap: '1.25rem', marginBottom: '2.5rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label form-label-required" style={{ fontWeight: 550 }}>Relación con Pico Truncado*</label>
            <select
              name="relation_to_city"
              className="form-select"
              value={formData.relation_to_city}
              onChange={handleInputChange}
              disabled={loading}
              style={{ height: '42px', borderColor: formErrors.relation_to_city ? 'var(--danger-color)' : 'var(--border-color)' }}
            >
              <option value="">Selecciona una opción...</option>
              <option value="Antiguo Poblador">Antiguo Poblador (Más de 30 años en la ciudad)</option>
              <option value="Vecino Residente">Vecino Residente (Nacido o criado aquí)</option>
              <option value="Descendiente">Descendiente de familia pionera</option>
              <option value="Institución o Comercio">Represento a una institución o comercio histórico</option>
              <option value="Otro">Otro vínculo con la localidad</option>
            </select>
            {formErrors.relation_to_city && <span style={{ color: 'var(--danger-color)', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>{formErrors.relation_to_city}</span>}
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 550 }}>Fecha de Nacimiento</label>
            <div style={{ position: 'relative' }}>
              <input
                type="date"
                name="birth_date"
                className="form-input"
                value={formData.birth_date}
                onChange={handleInputChange}
                disabled={loading}
                style={{ paddingLeft: '2.5rem', height: '42px' }}
              />
              <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
            </div>
          </div>
        </div>

        {/* Sección B: Detalles de Origen */}
        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, borderBottom: '2px solid var(--primary-blue-light, #e0f2fe)', paddingBottom: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={18} style={{ color: 'var(--primary-blue)' }} /> 2. Origen e Historia
        </h3>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label" style={{ fontWeight: 550 }}>Lugar de Nacimiento</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              name="birth_place"
              className="form-input"
              placeholder="Ciudad o Provincia de origen (Ej: Pico Truncado, Santa Cruz)"
              value={formData.birth_place}
              onChange={handleInputChange}
              disabled={loading}
              style={{ paddingLeft: '2.5rem', height: '42px' }}
            />
            <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label className="form-label" style={{ fontWeight: 550 }}>
            Deja tu primer comentario o anécdota <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#64748b' }}>(puede ser algo muy breve)</span>
          </label>
          <div style={{ position: 'relative' }}>
            <textarea
              name="narrative"
              className="form-input"
              rows={4}
              placeholder="Cuéntanos brevemente una anécdota, un recuerdo de tu infancia, qué lugares frecuentabas o los nombres de vecinos pioneros que recuerdes..."
              value={formData.narrative}
              onChange={handleInputChange}
              disabled={loading}
              style={{ padding: '0.75rem 0.75rem 0.75rem 2.5rem', minHeight: '120px' }}
            />
            <MessageCircle size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94a3b8' }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.35rem' }}>
            <Info size={12} style={{ color: 'var(--primary-blue)' }} /> No te preocupes por la extensión de este texto, te contactaremos luego para conversar en detalle.
          </span>
        </div>

        {/* Sección C: Envío y Consentimiento */}
        <div style={{ 
          backgroundColor: '#f8fafc', 
          border: '1px solid #cbd5e1', 
          borderRadius: '8px', 
          padding: '1.25rem',
          marginBottom: '2rem'
        }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              name="allow_contact"
              checked={formData.allow_contact}
              onChange={handleInputChange}
              disabled={loading}
              style={{ width: '18px', height: '18px', marginTop: '3px', accentColor: 'var(--primary-blue)' }}
            />
            <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.4 }}>
              <strong>Acepto ser contactado</strong> por el equipo del Archivo Histórico Memoria Viva para coordinar una entrevista presencial, telefónica o para digitalizar mis fotos y documentos del recuerdo.
            </div>
          </label>
        </div>

        {/* Botón de Envío */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.75rem 2rem', 
              fontSize: '1rem', 
              fontWeight: 600,
              height: '46px',
              justifyContent: 'center',
              minWidth: '220px'
            }}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Procesando envío...
              </>
            ) : (
              <>
                <Check size={18} />
                Quiero formar parte
              </>
            )}
          </button>
        </div>

      </form>
      
    </div>
  );
}
