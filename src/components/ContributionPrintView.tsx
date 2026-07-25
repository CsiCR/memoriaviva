import React from 'react';

interface ContributionPrintViewProps {
  id: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
  editorialUpdatedAt?: string | null;
  title?: string | null;
  editorialTitle?: string | null;
  contributionType?: string | null;
  editorialClassification?: string | null;
  status?: string | null;
  publicationLevel?: string | null;
  level?: string | null;
  editorName?: string | null;
  editorResponsibleUserId?: string | null;
  validatedByUserId?: string | null;
  publishedByUserId?: string | null;
  qualityIndex?: string | null;
  qualityText?: string | null;
  historicalReliabilityStars?: number;
  historicalReliabilityLabel?: string | null;
  selectedStatusName?: string | null;
  notes?: string | null;
  contributor?: any;
  consentRecords?: any[] | null;
  consentSource?: string | null;
  historicalValidationStatusState?: string | null;
  historicalValidationStatus?: string | null;
}

export const ContributionPrintView: React.FC<ContributionPrintViewProps> = ({
  id,
  createdAt,
  updatedAt,
  publishedAt,
  editorialUpdatedAt,
  title,
  editorialTitle,
  contributionType,
  editorialClassification,
  status,
  publicationLevel,
  level,
  editorName,
  editorResponsibleUserId,
  validatedByUserId,
  publishedByUserId,
  qualityIndex,
  qualityText,
  historicalReliabilityStars = 0,
  historicalReliabilityLabel,
  selectedStatusName,
  notes,
  contributor,
  consentRecords,
  consentSource,
  historicalValidationStatusState,
  historicalValidationStatus,
}) => {
  const year = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
  const idShort = id.substring(0, 6).toUpperCase();
  const fileCode = `MV-${year}-${idShort}`;

  // Fallbacks seguros
  const safeTitle = editorialTitle || title || "Sin título";
  const safeClassification = editorialClassification || contributionType || "Sin clasificar";
  const safeContributor = contributor?.full_name || "Anónimo";
  const safeEditor = editorName || "Sin asignar";
  const safeNotes = notes || "Sin observaciones registradas";

  // Estrellas limitadas
  const stars = Math.max(0, Math.min(5, historicalReliabilityStars ?? 0));

  return (
    <div className="print-only-show" style={{ fontFamily: 'Courier New, Courier, monospace', color: '#000', backgroundColor: '#fff', fontSize: '10pt' }}>
      
      {/* PÁGINA 1: FICHA ARCHIVÍSTICA */}
      <section className="print-page">
        <div className="print-page-content" style={{ border: '2px solid #000', padding: '15px', height: '100%', boxSizing: 'border-box' }}>
          
          {/* Encabezado */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px' }}>
            <div>
              <strong style={{ fontSize: '1.1rem' }}>MEMORIA VIVA - PICO TRUNCADO</strong>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Archivo Histórico Comunitario</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.9rem' }}>
              <strong>EXPEDIENTE: {fileCode}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase', margin: 0 }}>FICHA ARCHIVÍSTICA DE INGRESO</h2>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', fontSize: '0.9rem' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '8px 0', width: '35%', fontWeight: 'bold' }}>CÓDIGO DE EXPEDIENTE:</td>
                <td style={{ padding: '8px 0' }}>{fileCode}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '8px 0', fontWeight: 'bold' }}>TÍTULO DEL APORTE:</td>
                <td style={{ padding: '8px 0' }}>{safeTitle}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '8px 0', fontWeight: 'bold' }}>NOMBRE DEL APORTANTE:</td>
                <td style={{ padding: '8px 0' }}>{safeContributor}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '8px 0', fontWeight: 'bold' }}>TIPO DE APORTE (ORIGINAL):</td>
                <td style={{ padding: '8px 0' }}>{contributionType || '—'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '8px 0', fontWeight: 'bold' }}>CLASIFICACIÓN EDITORIAL:</td>
                <td style={{ padding: '8px 0' }}>{safeClassification}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '8px 0', fontWeight: 'bold' }}>FECHA DE RECEPCIÓN:</td>
                <td style={{ padding: '8px 0' }}>{createdAt ? new Date(createdAt).toLocaleDateString('es-AR') : '—'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '8px 0', fontWeight: 'bold' }}>ESTADO EDITORIAL ACTUAL:</td>
                <td style={{ padding: '8px 0' }}>{status || '—'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '8px 0', fontWeight: 'bold' }}>NIVEL DE ACCESO:</td>
                <td style={{ padding: '8px 0' }}>Nivel {publicationLevel || level || 'A'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '8px 0', fontWeight: 'bold' }}>RESPONSABLE EDITORIAL:</td>
                <td style={{ padding: '8px 0' }}>{safeEditor} (ID: {editorResponsibleUserId || '—'})</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '8px 0', fontWeight: 'bold' }}>ÍNDICE DE CALIDAD:</td>
                <td style={{ padding: '8px 0' }}>{qualityIndex || '0'} ({qualityText || 'Sin calificar'})</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '8px 0', fontWeight: 'bold' }}>CONFIABILIDAD HISTÓRICA:</td>
                <td style={{ padding: '8px 0' }}>
                  {'★'.repeat(stars)}
                  {'☆'.repeat(5 - stars)} ({historicalReliabilityLabel || 'No evaluado'})
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '8px 0', fontWeight: 'bold' }}>ESTADO DE PUBLICACIÓN:</td>
                <td style={{ padding: '8px 0' }}>{selectedStatusName || 'No publicado'}</td>
              </tr>
            </tbody>
          </table>

          {/* Pie de página */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', paddingTop: '10px', marginTop: '130px', fontSize: '0.8rem' }}>
            <span>Página 1 de 2</span>
            <span>Archivo Histórico Comunitario Pico Truncado &middot; Memoria Viva</span>
          </div>

        </div>
      </section>

      {/* PÁGINA 2: LÍNEA DE TIEMPO, BITÁCORA Y FIRMAS */}
      <section className="print-page">
        <div className="print-page-content" style={{ border: '2px solid #000', padding: '15px', height: '100%', boxSizing: 'border-box' }}>
          
          {/* Encabezado repetido */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px' }}>
            <div>
              <strong style={{ fontSize: '1.1rem' }}>MEMORIA VIVA - PICO TRUNCADO</strong>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Archivo Histórico Comunitario</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.9rem' }}>
              <strong>EXPEDIENTE: {fileCode}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'center', margin: '15px 0' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase', margin: 0 }}>LÍNEA DE TIEMPO Y BITÁCORA</h2>
          </div>

          {/* Línea de tiempo de hitos */}
          <div style={{ marginTop: '15px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>I. HITOS DEL PROCESO ARCHIVÍSTICO</h3>
            <ul style={{ listStyleType: 'none', paddingLeft: 0, fontSize: '0.85rem', lineHeight: '1.4' }}>
              <li style={{ marginBottom: '6px' }}>
                [ {createdAt ? new Date(createdAt).toLocaleDateString('es-AR') : '—'} ] RECEPCIÓN: Ingreso y registro inicial del aporte original.
              </li>
              <li style={{ marginBottom: '6px' }}>
                [ {consentRecords?.[0]?.accepted_at ? new Date(consentRecords[0].accepted_at).toLocaleDateString('es-AR') : 'PENDIENTE'} ] CONSENTIMIENTO: Aprobación legal de cesión ({consentSource || '—'}).
              </li>
              <li style={{ marginBottom: '6px' }}>
                [ {editorialUpdatedAt ? new Date(editorialUpdatedAt).toLocaleDateString('es-AR') : (updatedAt ? new Date(updatedAt).toLocaleDateString('es-AR') : 'PENDIENTE')} ] TRABAJO EDITORIAL: Normalización y completitud de datos descriptivos.
              </li>
              <li style={{ marginBottom: '6px' }}>
                [ {historicalValidationStatus === 'validated' ? 'COMPLETADO' : historicalValidationStatus === 'not_required' ? 'NO REQUERIDA' : 'PENDIENTE'} ] VALIDACIÓN HISTÓRICA: Corroboración contextual.
              </li>
              <li style={{ marginBottom: '6px' }}>
                [ {publishedAt ? new Date(publishedAt).toLocaleDateString('es-AR') : 'PENDIENTE'} ] PUBLICACIÓN EN PORTAL: Activación de la ficha pública.
              </li>
            </ul>
          </div>

          {/* Bitácora y Observaciones */}
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>II. OBSERVACIONES Y NOTAS INTERNAS</h3>
            <div style={{ border: '1px solid #000', padding: '10px', minHeight: '100px', fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: '1.3' }}>
              {safeNotes}
            </div>
          </div>

          {/* Identidad de intervinientes */}
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>III. RESPONSABLES Y FIRMAS DE CONTROL</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginTop: '5px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '5px 0', fontWeight: 'bold', width: '40%' }}>EDITOR RESPONSABLE:</td>
                  <td style={{ padding: '5px 0' }}>{safeEditor} (ID: {editorResponsibleUserId || '—'})</td>
                </tr>
                <tr>
                  <td style={{ padding: '5px 0', fontWeight: 'bold' }}>VALIDADOR HISTÓRICO:</td>
                  <td style={{ padding: '5px 0' }}>{historicalValidationStatusState === 'validated' ? safeEditor : 'Pendiente'} (ID: {validatedByUserId || '—'})</td>
                </tr>
                <tr>
                  <td style={{ padding: '5px 0', fontWeight: 'bold' }}>AUTORIZADO PARA PUBLICACIÓN:</td>
                  <td style={{ padding: '5px 0' }}>{selectedStatusName === 'Publicado' || selectedStatusName === 'Publicada' || status === 'Aprobado para archivo' || status === 'Aprobado para libro' ? safeEditor : 'Pendiente'} (ID: {publishedByUserId || '—'})</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.8rem', marginTop: '30px' }}>
            <div>Fecha de Impresión: {new Date().toLocaleString('es-AR')}</div>
            <div style={{ width: '180px', borderTop: '1px solid #000', textAlign: 'center', paddingTop: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>Firma Autorizada</div>
          </div>

          {/* Pie de página */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', paddingTop: '10px', marginTop: '35px', fontSize: '0.8rem' }}>
            <span>Página 2 de 2</span>
            <span>Archivo Histórico Comunitario Pico Truncado &middot; Memoria Viva</span>
          </div>

        </div>
      </section>

    </div>
  );
};
