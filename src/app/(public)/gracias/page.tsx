'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, ArrowLeft, Plus, Heart, AlertTriangle, FileWarning } from 'lucide-react';

export default function Gracias() {
  const searchParams = useSearchParams();
  const source = searchParams.get('source');
  const hasOversized = searchParams.get('oversized') === 'true';

  const isRegistration = source === 'quiero-formar-parte';
  
  const [oversizedInfo, setOversizedInfo] = useState<{
    catalogCode: string | null;
    files: { name: string; size: number }[];
  } | null>(null);

  useEffect(() => {
    if (hasOversized) {
      try {
        const stored = sessionStorage.getItem('last_oversized_files');
        if (stored) {
          setOversizedInfo(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Error reading oversized files from session storage:', err);
      }
    }
  }, [hasOversized]);

  return (
    <div className="container section" style={{ maxWidth: '600px', textAlign: 'center', marginTop: '2rem', paddingBottom: '4rem' }}>
      <div style={{ 
        display: 'inline-flex', 
        backgroundColor: isRegistration ? '#f0f9ff' : (hasOversized ? '#fffbeb' : 'var(--hope-green-light)'), 
        color: isRegistration ? '#0284c7' : (hasOversized ? '#d97706' : 'var(--hope-green)'), 
        padding: '1.25rem', 
        borderRadius: '50%',
        marginBottom: '1.5rem'
      }}>
        {isRegistration ? <Heart size={48} /> : (hasOversized ? <FileWarning size={48} /> : <CheckCircle size={48} />)}
      </div>
      
      {isRegistration ? (
        <>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            ¡Bienvenido!
          </h1>
          
          <p style={{ fontSize: '1.2rem', color: '#1e293b', fontWeight: 600, lineHeight: 1.6, marginBottom: '1rem' }}>
            Desde este momento ya sos parte de Memoria Viva Pico Truncado.
          </p>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
            A partir de hoy podremos construir juntos la historia de nuestra ciudad.
          </p>
          <p style={{ fontSize: '1.15rem', color: '#0284c7', fontWeight: 700, fontStyle: 'italic', marginBottom: '2.5rem' }}>
            Tu historia recién comienza.
          </p>

          <div className="card" style={{ padding: '1.5rem', marginBottom: '2.5rem', textAlign: 'left', backgroundColor: 'var(--white)', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: '#0f172a', fontWeight: 600 }}>¿Qué sucede ahora?</h3>
            <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <li>Tu registro de aportante fue cargado de manera segura en nuestro Panel Editorial.</li>
              <li>Un entrevistador de nuestro equipo revisará tus datos y tu comentario inicial.</li>
              <li>Nos pondremos en contacto contigo por WhatsApp o e-mail para coordinar un encuentro, charlar en detalle o programar la digitalización de fotos o documentos familiares si deseas compartirlos.</li>
            </ol>
          </div>
        </>
      ) : (
        <>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '1rem', color: '#0f172a' }}>
            {hasOversized ? 'El aporte fue guardado correctamente' : '¡Muchas gracias por tu aporte!'}
          </h1>
          
          {hasOversized ? (
            <div className="card" style={{ 
              padding: '1.5rem', 
              marginBottom: '2rem', 
              textAlign: 'left', 
              backgroundColor: '#fffbeb', 
              border: '1px solid #fde68a', 
              borderRadius: '8px' 
            }}>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <AlertTriangle size={20} style={{ color: '#d97706', flexShrink: 0 }} />
                <span style={{ fontWeight: 600, color: '#b45309', fontSize: '0.95rem' }}>
                  Aviso de Archivos Pendientes
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#78350f', lineHeight: 1.6, margin: '0 0 1rem 0' }}>
                Uno o más archivos superaron el máximo actual de 50 MB y no pudieron cargarse por este medio. 
                El equipo de <strong>Memoria Viva</strong> recibió un aviso y se comunicará con usted para coordinar la entrega o preparar una versión adecuada.
              </p>
              <p style={{ fontSize: '0.9rem', color: '#78350f', lineHeight: 1.6, margin: '0 0 1rem 0' }}>
                También puede comunicarse de manera directa a: <a href="mailto:memoriavivapicotruncado@gmail.com" style={{ fontWeight: 600, color: '#b45309', textDecoration: 'underline' }}>memoriavivapicotruncado@gmail.com</a>
              </p>

              {oversizedInfo && (
                <div style={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #f3f4f6', 
                  padding: '1rem', 
                  borderRadius: '6px',
                  fontSize: '0.85rem'
                }}>
                  {oversizedInfo.catalogCode && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: '#374151' }}>Código de Catalogación:</strong>{' '}
                      <code style={{ backgroundColor: '#f3f4f6', padding: '0.1rem 0.4rem', borderRadius: '4px', color: '#1f2937' }}>
                        {oversizedInfo.catalogCode}
                      </code>
                    </div>
                  )}
                  <strong style={{ color: '#374151', display: 'block', marginBottom: '0.5rem' }}>Archivos pendientes ({oversizedInfo.files.length}):</strong>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#4b5563', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {oversizedInfo.files.map((file, idx) => (
                      <li key={idx}>
                        {file.name} <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
              Hemos recibido tu material e información de contacto de forma segura. El equipo editorial de <strong>Memoria Viva Pico Truncado</strong> revisará tu aporte respetando rigurosamente el nivel de consentimiento y la preferencia de créditos que seleccionaste.
            </p>
          )}

          <div className="card" style={{ padding: '1.5rem', marginBottom: '2.5rem', textAlign: 'left', backgroundColor: 'var(--white)', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: '#0f172a', fontWeight: 600 }}>¿Qué sucede ahora?</h3>
            <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <li>El aporte ingresa al panel en estado <strong>Recibido</strong>.</li>
              <li>Un validador histórico del equipo revisará la descripción, fecha y personas mencionadas.</li>
              {hasOversized ? (
                <li style={{ color: '#b45309', fontWeight: 550 }}>Coordinaremos la recepción offline de los archivos que superan los 50 MB.</li>
              ) : null}
              <li>Si autorizaste a ser contactado, es posible que te enviemos un mensaje de WhatsApp o correo electrónico para ampliar la historia o coordinar una entrevista grabada.</li>
              <li>El material será archivado digitalmente y quedará catalogado para su posible publicación en el libro u otros medios autorizados.</li>
            </ol>
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={18} /> Volver al inicio
        </Link>
        {isRegistration ? (
          <Link href="/aportar" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Compartir un recuerdo o foto
          </Link>
        ) : (
          <Link href="/aportar" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Aportar otro material
          </Link>
        )}
      </div>
    </div>
  );
}
