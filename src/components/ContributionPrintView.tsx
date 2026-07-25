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
    <div className="print-only-show" style={{ fontFamily: 'Courier New, Courier, monospace', color: '#000', backgroundColor: '#fff', fontSize: '12pt' }}>
      
      {/* PÁGINA 1: PRUEBA A4 (Borde en contenedor interior) */}
      <div className="print-page" style={{ 
        width: '210mm', 
        height: '297mm', 
        margin: '0', 
        padding: '15mm', 
        boxSizing: 'border-box', 
        overflow: 'hidden', 
        pageBreakAfter: 'always', 
        breakAfter: 'page' 
      }}>
        <div style={{ border: '2px solid #000', padding: '20px', height: '100%', boxSizing: 'border-box' }}>
          <h1 style={{ fontSize: '20pt', fontWeight: 'bold' }}>PÁGINA 1: PRUEBA DE IMPRESIÓN MÍNIMA</h1>
          <p style={{ marginTop: '20px' }}>UNO: ID del Aporte: {id}</p>
          <p>DOS: Título: {editorialTitle || title || 'SIN TÍTULO'}</p>
          <p>TRES: Creado el: {createdAt ? new Date(createdAt).toLocaleDateString('es-AR') : '—'}</p>
        </div>
      </div>

      {/* PÁGINA 2: PRUEBA A4 (Borde en contenedor interior) */}
      <div className="print-page" style={{ 
        width: '210mm', 
        height: '297mm', 
        margin: '0', 
        padding: '15mm', 
        boxSizing: 'border-box', 
        overflow: 'hidden', 
        pageBreakAfter: 'auto', 
        breakAfter: 'auto' 
      }}>
        <div style={{ border: '2px solid #000', padding: '20px', height: '100%', boxSizing: 'border-box' }}>
          <h1 style={{ fontSize: '20pt', fontWeight: 'bold' }}>PÁGINA 2: PRUEBA DE IMPRESIÓN MÍNIMA</h1>
          <p style={{ marginTop: '20px' }}>CUATRO: Editor Responsable: {editorName || '—'}</p>
          <p>CINCO: Estado Editorial: {status || '—'}</p>
          <p>SEIS: Fin del Expediente.</p>
        </div>
      </div>

    </div>
  );
};
