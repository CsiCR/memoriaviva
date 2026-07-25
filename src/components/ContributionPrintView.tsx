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
  return (
    <div className="print-only-show" style={{ fontFamily: 'Courier New, Courier, monospace', color: '#000', backgroundColor: '#fff', fontSize: '10pt' }}>
      
      {/* PÁGINA 1: FICHA ARCHIVÍSTICA (PRUEBA A4 TEMPORAL) */}
      <div className="print-page">
        <h1>PRUEBA A4</h1>
        <p>UNO</p>
        <p>DOS</p>
        <p>TRES</p>
      </div>

      {/* PÁGINA 2: LÍNEA DE TIEMPO, BITÁCORA Y FIRMAS */}
      <div className="print-page" style={{
        height: '297mm',
        width: '210mm',
        padding: '20mm',
        boxSizing: 'border-box',
        position: 'relative',
        border: '2px solid #000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div>
          {/* Encabezado repetido */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px' }}>
            <div>
              <strong style={{ fontSize: '1.1rem' }}>MEMORIA VIVA - PICO TRUNCADO</strong>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Archivo Histórico Comunitario</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.9rem' }}>
              <strong>EXPEDIENTE: MV-{createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear()}-{id.substring(0, 6).toUpperCase()}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase', margin: 0 }}>LÍNEA DE TIEMPO Y BITÁCORA</h2>
          </div>

          {/* Línea de tiempo de hitos */}
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>I. HITOS DEL PROCESO ARCHIVÍSTICO</h3>
            <ul style={{ listStyleType: 'none', paddingLeft: 0, fontSize: '0.85rem' }}>
              <li style={{ marginBottom: '8px' }}>
                [ {createdAt ? new Date(createdAt).toLocaleDateString('es-AR') : '—'} ] RECEPCIÓN: Ingreso y registro inicial del aporte original.
              </li>
              <li style={{ marginBottom: '8px' }}>
                [ {consentRecords?.[0]?.accepted_at ? new Date(consentRecords[0].accepted_at).toLocaleDateString('es-AR') : 'PENDIENTE'} ] CONSENTIMIENTO: Aprobación legal de cesión ({consentSource || '—'}).
              </li>
              <li style={{ marginBottom: '8px' }}>
                [ {editorialUpdatedAt ? new Date(editorialUpdatedAt).toLocaleDateString('es-AR') : (updatedAt ? new Date(updatedAt).toLocaleDateString('es-AR') : 'PENDIENTE')} ] TRABAJO EDITORIAL: Normalización y completitud de datos descriptivos.
              </li>
              <li style={{ marginBottom: '8px' }}>
                [ {historicalValidationStatus === 'validated' ? 'COMPLETADO' : historicalValidationStatus === 'not_required' ? 'NO REQUERIDA' : 'PENDIENTE'} ] VALIDACIÓN HISTÓRICA: Corroboración contextual.
              </li>
              <li style={{ marginBottom: '8px' }}>
                [ {publishedAt ? new Date(publishedAt).toLocaleDateString('es-AR') : 'PENDIENTE'} ] PUBLICACIÓN EN PORTAL: Activación de la ficha pública.
              </li>
            </ul>
          </div>

          {/* Bitácora y Observaciones */}
          <div style={{ marginTop: '30px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>II. OBSERVACIONES Y NOTAS INTERNAS</h3>
            <div style={{ border: '1px solid #000', padding: '15px', minHeight: '120px', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
              {notes || 'No existen observaciones editoriales registradas para este expediente.'}
            </div>
          </div>

          {/* Identidad de intervinientes */}
          <div style={{ marginTop: '30px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>III. RESPONSABLES Y FIRMAS DE CONTROL</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginTop: '10px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold', width: '40%' }}>EDITOR RESPONSABLE:</td>
                  <td style={{ padding: '6px 0' }}>{editorName || '—'} (ID: {editorResponsibleUserId || '—'})</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>VALIDADOR HISTÓRICO:</td>
                  <td style={{ padding: '6px 0' }}>{historicalValidationStatusState === 'validated' ? (editorName || '—') : 'Pendiente'} (ID: {validatedByUserId || '—'})</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>AUTORIZADO PARA PUBLICACIÓN:</td>
                  <td style={{ padding: '6px 0' }}>{selectedStatusName === 'Publicado' || selectedStatusName === 'Publicada' || status === 'Aprobado para archivo' || status === 'Aprobado para libro' ? (editorName || '—') : 'Pendiente'} (ID: {publishedByUserId || '—'})</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.8rem', marginTop: '30px' }}>
          <div>Fecha de Impresión: {new Date().toLocaleString('es-AR')}</div>
          <div style={{ width: '180px', borderTop: '1px solid #000', textAlign: 'center', paddingTop: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>Firma Autorizada</div>
        </div>

        <div style={{ borderTop: '2px solid #000', paddingTop: '10px', textAlign: 'center', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>Página 2 de 2</span>
          <span>Archivo Histórico Comunitario Pico Truncado &middot; Memoria Viva</span>
        </div>
      </div>

    </div>
  );
};
