'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

function PrintFormContent() {
  const searchParams = useSearchParams();
  const isBlank = searchParams.get('blank') === 'true';
  const name = searchParams.get('name') || '________________________________________';
  const dni = searchParams.get('dni') || '____________________';
  const title = searchParams.get('title') || '________________________________________';
  const code = searchParams.get('code') || 'MV-PENDIENTE';

  useEffect(() => {
    document.title = isBlank
      ? 'Planilla de Entrevista en Blanco - Memoria Viva Pico Truncado'
      : `${code} - Planilla de Consentimiento - Memoria Viva Pico Truncado`;
    
    // Solo disparar impresión automática si es un documento cargado específico
    if (!isBlank) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [code, isBlank]);

  const [quantity, setQuantity] = React.useState(1);
  const [suggestedCode, setSuggestedCode] = React.useState('MV-FORM-00001');
  const [loadingCode, setLoadingCode] = React.useState(true);

  useEffect(() => {
    if (!isBlank) {
      setLoadingCode(false);
      return;
    }

    const fetchNextFormCode = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('contributions')
          .select('consent_reference')
          .like('consent_reference', 'MV-FORM-%')
          .order('consent_reference', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          const lastCode = data[0].consent_reference;
          const match = lastCode.match(/MV-FORM-(\d+)/);
          if (match) {
            const nextNum = parseInt(match[1], 10) + 1;
            setSuggestedCode(`MV-FORM-${String(nextNum).padStart(5, '0')}`);
          }
        }
      } catch (err) {
        console.error('Error al calcular siguiente código:', err);
      } finally {
        setLoadingCode(false);
      }
    };

    fetchNextFormCode();
  }, [isBlank]);

  if (isBlank) {
    if (loadingCode) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
          Cargando secuenciador de planillas de campo...
        </div>
      );
    }

    // Calcular el rango de códigos a imprimir
    const startNum = parseInt(suggestedCode.replace('MV-FORM-', ''), 10) || 1;
    const pages = Array.from({ length: quantity }, (_, i) => {
      const currentNum = startNum + i;
      const currentCode = `MV-FORM-${String(currentNum).padStart(5, '0')}`;
      const qrData = typeof window !== 'undefined'
        ? `${window.location.origin}/admin/aportes?search=${currentCode}`
        : currentCode;
      
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrData)}`;

      return { code: currentCode, qrUrl };
    });

    return (
      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {/* Barra de Herramientas de Control (no imprimible) */}
        <div className="no-print" style={{
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '1rem 1.5rem',
          maxWidth: '820px',
          margin: '0 auto 1.5rem auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>Imprimir Planillas de Campo en Lote</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
              Código secuencial inicial sugerido: <strong>{suggestedCode}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 500 }}>
              Cantidad de hojas a imprimir:
              <input
                type="number"
                min="1"
                max="50"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                style={{ width: '60px', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 'bold' }}
              />
            </label>
            <button
              onClick={() => window.print()}
              style={{
                backgroundColor: 'var(--primary-blue, #0284c7)',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              🖨️ Imprimir Lote A4
            </button>
          </div>
        </div>

        {/* Estilos CSS específicos para impresión en lote */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            .no-print {
              display: none !important;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
            }
            body {
              padding: 0 !important;
              margin: 0 !important;
            }
          }
        `}} />

        {/* Renderizado de páginas */}
        {pages.map((p, idx) => (
          <div 
            key={p.code} 
            className="page-break" 
            style={{
              color: '#000000',
              lineHeight: 1.35,
              padding: '1.5rem',
              maxWidth: '820px',
              margin: '0 auto',
              fontSize: '9.5pt',
              boxSizing: 'border-box',
              minHeight: idx < pages.length - 1 ? '100vh' : 'auto'
            }}
          >
            {/* Encabezado */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #000000', paddingBottom: '0.4rem', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img src="/icon-192.png" alt="Logo" style={{ height: '42px', width: 'auto' }} />
                <div>
                  <h1 style={{ fontSize: '13pt', margin: 0, fontWeight: 'bold' }}>Memoria Viva Pico Truncado</h1>
                  <span style={{ fontSize: '7.5pt', color: '#555555' }}>Archivo Histórico Comunitario de Pico Truncado</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'right' }}>
                <div style={{ fontSize: '7.5pt', color: '#555555' }}>
                  <div>Planilla de Registro y Cesión de Aportes</div>
                  <strong style={{ fontSize: '10pt', color: '#000000', fontFamily: 'monospace' }}>{p.code}</strong>
                </div>
                <img src={p.qrUrl} alt="QR Code" style={{ width: '55px', height: '55px', border: '1px solid #e2e8f0', padding: '2px' }} />
              </div>
            </div>

            <h2 style={{ textAlign: 'center', fontSize: '10pt', fontWeight: 'bold', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Planilla de Registro de Entrevistas y Cesión de Derechos
            </h2>

            {/* Sección 1: Datos del Aportante */}
            <div style={{ marginBottom: '0.6rem' }}>
              <h3 style={{ fontSize: '9pt', fontWeight: 'bold', borderBottom: '1px solid #cccccc', paddingBottom: '0.15rem', marginBottom: '0.35rem', color: '#0f172a' }}>
                1. Datos del Aportante / Filiación
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1rem' }}>
                <div>Nombre Completo: <span style={{ color: '#555' }}>____________________________________</span></div>
                <div>DNI: <span style={{ color: '#555' }}>________________________</span></div>
                <div>Teléfono / WhatsApp: <span style={{ color: '#555' }}>__________________________</span></div>
                <div>E-mail: <span style={{ color: '#555' }}>________________________</span></div>
                <div>Barrio / Institución: <span style={{ color: '#555' }}>__________________________</span></div>
                <div>Relación local: <span style={{ fontSize: '8.5pt' }}>[ ] Vecino &nbsp; [ ] Antiguo Poblador &nbsp; [ ] Descendiente &nbsp; [ ] Otro</span></div>
              </div>
            </div>

            {/* Sección 2: Detalle del Material Aportado */}
            <div style={{ marginBottom: '0.6rem' }}>
              <h3 style={{ fontSize: '9pt', fontWeight: 'bold', borderBottom: '1px solid #cccccc', paddingBottom: '0.15rem', marginBottom: '0.35rem', color: '#0f172a' }}>
                2. Detalle del Material Histórico
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div>Título / Identificación del Material: <span style={{ color: '#555' }}>______________________________________________________</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                  <div>Tipo: <span style={{ fontSize: '8.5pt' }}>[ ] Foto &nbsp; [ ] Documento &nbsp; [ ] Audio &nbsp; [ ] Video &nbsp; [ ] Testimonio Escrito</span></div>
                  <div>Fecha/Década aprox.: <span style={{ color: '#555' }}>________________________</span></div>
                </div>
                <div>Lugar / Relación geográfica: <span style={{ color: '#555' }}>___________________________________________________________</span></div>
                <div>Personas retratadas / Detalles: <span style={{ color: '#555' }}>__________________________________________________________</span></div>
                <div>Relato o contexto histórico breve: <span style={{ color: '#555' }}>____________________________________________________________</span></div>
                <div style={{ height: '14px', borderBottom: '1px dashed #cccccc' }}></div>
              </div>
            </div>

            {/* Sección 3: Niveles de Autorización */}
            <div style={{ marginBottom: '0.6rem' }}>
              <h3 style={{ fontSize: '9pt', fontWeight: 'bold', borderBottom: '1px solid #cccccc', paddingBottom: '0.15rem', marginBottom: '0.35rem', color: '#0f172a' }}>
                3. Declaración y Nivel de Autorización (Marque con una X la opción elegida)
              </h3>
              <p style={{ fontSize: '8pt', margin: '0 0 0.35rem 0', textAlign: 'justify' }}>
                Declaro bajo juramento ser el legítimo propietario o poseedor de la autorización correspondiente de los materiales cedidos, eximiendo al proyecto de todo reclamo de terceros, y autorizo su uso bajo la siguiente categoría:
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ border: '1px solid #000000' }}>
                    <td style={{ border: '1px solid #000000', padding: '0.25rem', textAlign: 'center', width: '8%', fontWeight: 'bold' }}>[ &nbsp; ]</td>
                    <td style={{ border: '1px solid #000000', padding: '0.25rem', width: '20%', fontWeight: 'bold', fontSize: '8.5pt' }}>Nivel A (Público)</td>
                    <td style={{ border: '1px solid #000000', padding: '0.25rem', fontSize: '8pt' }}>
                      Publicación del material en internet (web, redes sociales, catálogos digitales) y medios impresos para divulgación cultural.
                    </td>
                  </tr>
                  <tr style={{ border: '1px solid #000000' }}>
                    <td style={{ border: '1px solid #000000', padding: '0.25rem', textAlign: 'center', fontWeight: 'bold' }}>[ &nbsp; ]</td>
                    <td style={{ border: '1px solid #000000', padding: '0.25rem', fontWeight: 'bold', fontSize: '8.5pt' }}>Nivel B (Educativo)</td>
                    <td style={{ border: '1px solid #000000', padding: '0.25rem', fontSize: '8pt' }}>
                      Uso exclusivo para fines pedagógicos, educativos, escolares, académicos o de investigación sin fines de lucro.
                    </td>
                  </tr>
                  <tr style={{ border: '1px solid #000000' }}>
                    <td style={{ border: '1px solid #000000', padding: '0.25rem', textAlign: 'center', fontWeight: 'bold' }}>[ &nbsp; ]</td>
                    <td style={{ border: '1px solid #000000', padding: '0.25rem', fontWeight: 'bold', fontSize: '8.5pt' }}>Nivel C (Interno)</td>
                    <td style={{ border: '1px solid #000000', padding: '0.25rem', fontSize: '8pt' }}>
                      Consulta únicamente física o privada dentro del archivo histórico, sin autorización para publicarse en redes ni páginas web.
                    </td>
                  </tr>
                  <tr style={{ border: '1px solid #000000' }}>
                    <td style={{ border: '1px solid #000000', padding: '0.25rem', textAlign: 'center', fontWeight: 'bold' }}>[ &nbsp; ]</td>
                    <td style={{ border: '1px solid #000000', padding: '0.25rem', fontWeight: 'bold', fontSize: '8.5pt' }}>Nivel D (Restringido)</td>
                    <td style={{ border: '1px solid #000000', padding: '0.25rem', fontSize: '8pt' }}>
                      Solo con fines de preservación digital a largo plazo. No se autoriza su consulta pública ni educativa hasta nuevo aviso.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Sección 4: Preferencia de Créditos */}
            <div style={{ marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '9pt', fontWeight: 'bold', borderBottom: '1px solid #cccccc', paddingBottom: '0.15rem', marginBottom: '0.35rem', color: '#0f172a' }}>
                4. Preferencia de Créditos (Marque con una X la opción elegida)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.3rem 1rem', paddingLeft: '0.5rem' }}>
                <div style={{ fontSize: '8.5pt' }}>[ &nbsp; ] <strong>Nombre Completo</strong> <span style={{ fontSize: '7.5pt', color: '#555555' }}>(Aporte de [Nombre])</span></div>
                <div style={{ fontSize: '8.5pt' }}>[ &nbsp; ] <strong>Iniciales</strong> <span style={{ fontSize: '7.5pt', color: '#555555' }}>(Aporte de [Iniciales])</span></div>
                <div style={{ fontSize: '8.5pt' }}>[ &nbsp; ] <strong>Familia Aportante</strong> <span style={{ fontSize: '7.5pt', color: '#555555' }}>(Donación Familia [Barrio/Inst])</span></div>
                <div style={{ fontSize: '8.5pt' }}>[ &nbsp; ] <strong>Anónimo</strong> <span style={{ fontSize: '7.5pt', color: '#555555' }}>(El material se muestra sin mencionar su nombre)</span></div>
              </div>
            </div>

            {/* Firmas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginTop: '1.25rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderBottom: '1px solid #000000', height: '26px', marginBottom: '0.35rem' }}></div>
                <span style={{ fontSize: '8.5pt', fontWeight: 'bold', display: 'block' }}>Firma del Aportante</span>
                <span style={{ fontSize: '8pt', color: '#333333', display: 'block', marginTop: '0.2rem' }}>Aclaración: ___________________________________</span>
                <span style={{ fontSize: '8pt', color: '#333333', display: 'block', marginTop: '0.2rem' }}>DNI N.º: _____________________________________</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderBottom: '1px solid #000000', height: '26px', marginBottom: '0.35rem' }}></div>
                <span style={{ fontSize: '8.5pt', fontWeight: 'bold', display: 'block' }}>Recepción del Operador</span>
                <span style={{ fontSize: '8pt', color: '#333333', display: 'block', marginTop: '0.2rem' }}>Aclaración/Firma: ____________________________</span>
                <span style={{ fontSize: '8pt', color: '#333333', display: 'block', marginTop: '0.2rem' }}>Fecha: _____ / _____ / 202___</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#000000',
      lineHeight: 1.4,
      padding: '1rem 1.5rem',
      maxWidth: '820px',
      margin: '0 auto',
      fontSize: '10.5pt'
    }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #000000', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/icon-192.png" alt="Logo" style={{ height: '50px', width: 'auto' }} />
          <div>
            <h1 style={{ fontSize: '14pt', margin: 0, fontWeight: 'bold' }}>Memoria Viva Pico Truncado</h1>
            <span style={{ fontSize: '8.5pt', color: '#555555' }}>Archivo Histórico Comunitario de Pico Truncado</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '8.5pt', color: '#555555' }}>
          <div>Documento de Cesión y Consentimiento</div>
          <strong style={{ fontSize: '10pt', color: '#000000', fontFamily: 'monospace' }}>{code}</strong>
        </div>
      </div>

      <h2 style={{ textAlign: 'center', fontSize: '11.5pt', fontWeight: 'bold', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Planilla de Autorización de Uso y Cesión de Derechos
      </h2>

      {/* Datos del Aportante */}
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ textIndent: '2rem', textAlign: 'justify', margin: '0 0 0.5rem 0' }}>
          Por medio de la presente, yo <strong>{name}</strong>, con DNI N.º <strong>{dni}</strong>, en mi carácter de propietario, autor/a y/o de derecho habiente legítimo de los materiales históricos que aporto al archivo comunitario, declaro ceder y autorizar el uso del material detallado a continuación:
        </p>
        <p style={{ paddingLeft: '2rem', margin: '0.5rem 0', lineHeight: 1.5 }}>
          <strong>Título/Identificación del Material:</strong> {title} <br />
          <strong>Código de Catálogo (Signatura):</strong> <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{code}</span>
        </p>
      </div>

      {/* Declaración de Autoría */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '10pt', fontWeight: 'bold', borderBottom: '1px solid #cccccc', paddingBottom: '0.2rem', marginBottom: '0.5rem' }}>
          1. Declaraciones del Aportante (Obligatorio)
        </h3>
        <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', margin: 0 }}>
          <li>Declaro bajo juramento ser el legítimo propietario o poseer la autorización correspondiente del titular de los derechos de autor para realizar este aporte.</li>
          <li>Acepto que el material sea digitalizado, catalogado y archivado por el equipo editorial del proyecto.</li>
          <li>Libero de toda responsabilidad al proyecto Memoria Viva Pico Truncado ante reclamos de terceros sobre la titularidad del material aportado.</li>
        </ul>
      </div>

      {/* Niveles de Autorización */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '10pt', fontWeight: 'bold', borderBottom: '1px solid #cccccc', paddingBottom: '0.2rem', marginBottom: '0.5rem' }}>
          2. Nivel de Autorización Seleccionado (Marque con una X la opción elegida)
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.25rem' }}>
          <tbody>
            <tr style={{ border: '1px solid #000000' }}>
              <td style={{ border: '1px solid #000000', padding: '0.35rem', textAlign: 'center', width: '8%', fontWeight: 'bold' }}>[ &nbsp; ]</td>
              <td style={{ border: '1px solid #000000', padding: '0.35rem', width: '20%', fontWeight: 'bold' }}>Nivel A (Público)</td>
              <td style={{ border: '1px solid #000000', padding: '0.35rem', fontSize: '9pt' }}>
                Autorizo la publicación del material en internet (web, redes sociales, catálogos digitales) y medios impresos para su divulgación cultural y comunitaria.
              </td>
            </tr>
            <tr style={{ border: '1px solid #000000' }}>
              <td style={{ border: '1px solid #000000', padding: '0.35rem', textAlign: 'center', fontWeight: 'bold' }}>[ &nbsp; ]</td>
              <td style={{ border: '1px solid #000000', padding: '0.35rem', fontWeight: 'bold' }}>Nivel B (Educativo)</td>
              <td style={{ border: '1px solid #000000', padding: '0.35rem', fontSize: '9pt' }}>
                Autorizo el uso del material exclusivamente para fines pedagogicos, educativos, escolares, académicos o de investigación sin fines de lucro.
              </td>
            </tr>
            <tr style={{ border: '1px solid #000000' }}>
              <td style={{ border: '1px solid #000000', padding: '0.35rem', textAlign: 'center', fontWeight: 'bold' }}>[ &nbsp; ]</td>
              <td style={{ border: '1px solid #000000', padding: '0.35rem', fontWeight: 'bold' }}>Nivel C (Interno)</td>
              <td style={{ border: '1px solid #000000', padding: '0.35rem', fontSize: '9pt' }}>
                El material solo podrá ser consultado físicamente o de manera privada dentro del archivo histórico, sin autorización para publicarse en redes ni páginas web.
              </td>
            </tr>
            <tr style={{ border: '1px solid #000000' }}>
              <td style={{ border: '1px solid #000000', padding: '0.35rem', textAlign: 'center', fontWeight: 'bold' }}>[ &nbsp; ]</td>
              <td style={{ border: '1px solid #000000', padding: '0.35rem', fontWeight: 'bold' }}>Nivel D (Restringido)</td>
              <td style={{ border: '1px solid #000000', padding: '0.35rem', fontSize: '9pt' }}>
                Material bajo embargo. Solo se conserva con fines de preservación digital. No se autoriza su consulta pública ni educativa hasta nuevo aviso.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Preferencia de Créditos */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '10pt', fontWeight: 'bold', borderBottom: '1px solid #cccccc', paddingBottom: '0.2rem', marginBottom: '0.5rem' }}>
          3. Preferencia de Créditos al Publicar (Marque con una X la opción elegida)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem 1rem', paddingLeft: '1rem' }}>
          <div>[ &nbsp; ] <strong>Nombre Completo</strong> <span style={{ fontSize: '8.5pt', color: '#555555' }}>(Ej. <i>"Aporte de Juan Pérez"</i>)</span></div>
          <div>[ &nbsp; ] <strong>Iniciales</strong> <span style={{ fontSize: '8.5pt', color: '#555555' }}>(Ej. <i>"Aporte de J. P."</i>)</span></div>
          <div>[ &nbsp; ] <strong>Familia Aportante</strong> <span style={{ fontSize: '8.5pt', color: '#555555' }}>(Ej. <i>"Donación Familia Pérez"</i>)</span></div>
          <div>[ &nbsp; ] <strong>Anónimo</strong> <span style={{ fontSize: '8.5pt', color: '#555555' }}>(El material se muestra sin mencionar su nombre)</span></div>
        </div>
      </div>

      {/* Firmas y DNI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginTop: '2.5rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderBottom: '1px solid #000000', height: '35px', marginBottom: '0.5rem' }}></div>
          <span style={{ fontSize: '9pt', fontWeight: 'bold', display: 'block' }}>Firma del Aportante</span>
          <span style={{ fontSize: '8.5pt', color: '#333333', display: 'block', marginTop: '0.25rem' }}>Aclaración: ___________________________________</span>
          <span style={{ fontSize: '8.5pt', color: '#333333', display: 'block', marginTop: '0.25rem' }}>DNI N.º: <strong>{dni}</strong></span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderBottom: '1px solid #000000', height: '35px', marginBottom: '0.5rem' }}></div>
          <span style={{ fontSize: '9pt', fontWeight: 'bold', display: 'block' }}>Recepción del Operador</span>
          <span style={{ fontSize: '8.5pt', color: '#333333', display: 'block', marginTop: '0.25rem' }}>Aclaración/Firma: ____________________________</span>
          <span style={{ fontSize: '8.5pt', color: '#333333', display: 'block', marginTop: '0.25rem' }}>Fecha: _____ / _____ / 202___</span>
        </div>
      </div>
    </div>
  );
}

export default function PrintFormClient() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Cargando planilla de impresión...</div>}>
      <PrintFormContent />
    </Suspense>
  );
}
