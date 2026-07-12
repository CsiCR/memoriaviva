import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, User, FileText, Shield, File, Download, ExternalLink, Calendar, MapPin, Landmark, Heart, History } from 'lucide-react';
import ContributionEditForm from '@/components/ContributionEditForm';
import { formatDateToAR, formatDateTimeToAR, formatDateTimeForAudit } from '@/utils/date';

import AdminAddFilesForm from '@/components/AdminAddFilesForm';

export const revalidate = 0; // Evitar caché

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    from?: string;
  }>;
}

export default async function AdminContributionDetail({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { from } = await searchParams;
  const supabase = await createClient();

  // 1. Obtener el aporte completo (incluyendo avisos de archivos grandes)
  const { data: contribution, error } = await supabase
    .from('contributions')
    .select(`
      *,
      contributors ( * ),
      contribution_files ( * ),
      consent_records ( * ),
      institutional_agreements ( * ),
      oversized_file_notices ( * )
    `)
    .eq('id', id)
    .single();

  if (error || !contribution) {
    console.error('Error al obtener detalle del aporte:', error);
    notFound();
  }

  // 2. Generar Signed URLs para cada archivo cargado (expiran en 15 minutos)
  const filesWithSignedUrls = await Promise.all(
    (contribution.contribution_files || []).map(async (file: any) => {
      const { data, error: signedError } = await supabase.storage
        .from('historical-uploads')
        .createSignedUrl(file.file_path, 900); // 15 minutos (900 segundos)

      if (signedError) {
        console.error(`Error al generar Signed URL para ${file.file_name}:`, signedError.message);
      }

      return {
        ...file,
        signedUrl: data?.signedUrl || null
      };
    })
  );

  // Generar historial de consentimientos ordenados por fecha y obtener sus Signed URLs si tienen archivo
  const consentHistory = await Promise.all(
    (contribution.consent_records || [])
      .sort((a: any, b: any) => new Date(b.accepted_at).getTime() - new Date(a.accepted_at).getTime())
      .map(async (record: any) => {
        let signedUrl = null;
        if (record.consent_file_path) {
          const { data, error: signedError } = await supabase.storage
            .from('historical-uploads')
            .createSignedUrl(record.consent_file_path, 900);

          if (signedError) {
            console.error(`Error al generar Signed URL para consentimiento histórico ${record.id}:`, signedError.message);
          } else {
            signedUrl = data?.signedUrl || null;
          }
        }
        return {
          ...record,
          signedUrl
        };
      })
  );

  const consentSignedUrl = consentHistory[0]?.signedUrl || null;

  // 3. Obtener el historial de cambios (audit_logs)
  let auditLogs: any[] = [];
  const { data: rawAuditLogs, error: auditError } = await supabase
    .from('audit_logs')
    .select('id, action, old_value, new_value, created_at, user_id')
    .eq('table_name', 'contributions')
    .eq('record_id', id)
    .order('created_at', { ascending: false });

  if (!auditError && rawAuditLogs) {
    const userIds = Array.from(new Set(rawAuditLogs.map(l => l.user_id).filter(Boolean)));
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
        
      auditLogs = rawAuditLogs.map(log => ({
        ...log,
        profiles: profiles?.find(p => p.id === log.user_id) || null
      }));
    } else {
      auditLogs = rawAuditLogs.map(log => ({ ...log, profiles: null }));
    }
  } else if (auditError) {
    console.error('Error al obtener bitácora de cambios:', auditError.message);
  }

  // Función para formatear el detalle de los cambios en la bitácora
  function renderAuditLogDescription(log: any) {
    if (log.action === 'INSERT') {
      return 'Aporte recibido e ingresado al sistema.';
    }
    if (log.action === 'DELETE') {
      return 'Aporte eliminado.';
    }
    if (log.action === 'UPDATE') {
      const oldVal = log.old_value || {};
      const newVal = log.new_value || {};
      const changes: string[] = [];
      
      if (oldVal.editorial_status !== newVal.editorial_status) {
        changes.push(`Cambió el estado de "${oldVal.editorial_status || 'Recibido'}" a "${newVal.editorial_status}"`);
      }
      
      if (oldVal.internal_notes !== newVal.internal_notes) {
        const newNotes = newVal.internal_notes ? newVal.internal_notes.trim() : 'ninguna';
        changes.push(`Actualizó las observaciones a: "${newNotes}"`);
      }

      if (changes.length === 0) {
        changes.push('Modificó metadatos del aporte.');
      }
      
      return changes.join(' | ');
    }
    return 'Acción registrada.';
  }

  const statusBadgeClass = `badge badge-${contribution.editorial_status.toLowerCase().replace(/á/g, 'a').replace(/ó/g, 'o').replace(/ /g, '-')}`;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Botón Volver */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href={from === 'aportantes' ? '/admin/aportantes' : '/admin/aportes'} style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.9rem',
          color: 'var(--text-secondary)'
        }}>
          <ArrowLeft size={16} /> {from === 'aportantes' ? 'Volver a Aportantes' : 'Volver a los aportes'}
        </Link>
      </div>

      {/* Encabezado Aporte */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            Aporte ID: {contribution.id}
          </span>
          <h1 style={{ fontSize: '1.8rem', margin: 0, color: '#0f172a' }}>{contribution.title}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Estado actual:</span>
          {contribution.editorial_status === 'Recibido' && contribution.oversized_file_notices?.some((n: any) => n.status === 'pending') ? (
            <span 
              className="badge badge-pendiente-de-archivos" 
              title="Este aporte fue recibido, pero uno o más archivos superaron el límite de 50 MB y requieren coordinación con el aportante."
              style={{ fontSize: '0.85rem', padding: '0.4rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            >
              ⚠️ Recibido · faltan archivos
            </span>
          ) : (
            <span className={statusBadgeClass || 'badge badge-default'} style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
              {contribution.editorial_status}
            </span>
          )}
        </div>
      </div>

      {/* Grid Principal */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '2rem'
      }} className="admin-grid-layout">
        
        {/* Columna Izquierda: Información del Aporte */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Ficha 1: Metadatos Históricos */}
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-warm)', paddingBottom: '0.5rem' }}>
              <FileText size={20} style={{ color: 'var(--primary-blue)' }} /> Ficha Histórica del Material
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Código de Catálogo (Signatura)</span>
                <strong style={{ fontSize: '1rem', color: 'var(--primary-blue)' }}>{contribution.catalog_code || 'MV-GEN-PENDIENTE'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Tipo de Aporte</span>
                <strong style={{ fontSize: '0.95rem' }}>{contribution.contribution_type}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Fecha / Década</span>
                <strong style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Calendar size={14} />
                  {contribution.exact_date 
                    ? formatDateToAR(contribution.exact_date)
                    : contribution.approximate_decade 
                      ? `Aprox. década de ${contribution.approximate_decade.replace('s', '')}` 
                      : 'Desconocido'
                  }
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Lugar Relacionado</span>
                <strong style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <MapPin size={14} /> {contribution.related_place}
                </strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Personas Mencionadas</span>
                <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{contribution.mentioned_people || '—'}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Institución Relacionada</span>
                <strong style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Landmark size={14} /> {contribution.related_institution || '—'}
                </strong>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Breve descripción</span>
              <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{contribution.description}</p>
            </div>

            <div style={{ backgroundColor: '#fafaf6', border: '1px solid var(--border-warm)', borderRadius: '8px', padding: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                Historia / Contexto Aportado:
              </span>
              <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.6', color: '#1a202c', whiteSpace: 'pre-wrap' }}>
                {contribution.historical_context || 'No se aportó historia detallada por escrito.'}
              </p>
            </div>
          </div>

          {/* Ficha 2: Archivos Adjuntos (Signed URLs) */}
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-warm)', paddingBottom: '0.5rem' }}>
              <File size={20} style={{ color: 'var(--primary-blue)' }} /> Archivos Digitales Adjuntos ({filesWithSignedUrls.length})
            </h2>

            {filesWithSignedUrls.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {filesWithSignedUrls.map((file: any) => {
                  const isImage = file.file_type.startsWith('image/');
                  const isAudio = file.file_type.startsWith('audio/');
                  const isVideo = file.file_type.startsWith('video/');

                  return (
                    <div key={file.id} style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.25rem',
                      backgroundColor: '#f8fafc',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                        <div>
                          <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{file.file_name}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                            ({(file.file_size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        {file.signedUrl && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <a href={file.signedUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" style={{ padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
                              <ExternalLink size={12} /> Abrir
                            </a>
                            <a href={file.signedUrl} download={file.file_name} className="btn btn-primary btn-sm" style={{ padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
                              <Download size={12} /> Descargar
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Visualizador Multimedia según tipo */}
                      {file.signedUrl && (
                        <div style={{ marginTop: '0.75rem', textAlign: 'center', backgroundColor: '#e2e8f0', borderRadius: '4px', padding: '0.5rem', overflow: 'hidden' }}>
                          {isImage && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={file.signedUrl}
                              alt={file.file_name}
                              style={{ maxWidth: '100%', maxHeight: '350px', objectFit: 'contain', borderRadius: '4px' }}
                            />
                          )}
                          {isAudio && (
                            <audio controls src={file.signedUrl} style={{ width: '100%', maxWidth: '500px', margin: '0.5rem auto' }} />
                          )}
                          {isVideo && (
                            <video controls src={file.signedUrl} style={{ width: '100%', maxWidth: '600px', maxHeight: '350px', borderRadius: '4px' }} />
                          )}
                          {!isImage && !isAudio && !isVideo && (
                            <div style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                              Visualización no disponible para este tipo de archivo. Descárguelo usando el botón superior.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                No hay archivos adjuntos (aporte de testimonio escrito únicamente).
              </div>
            )}

            {/* Listado de archivos grandes pendientes (Alcance Acotado) */}
            {contribution.oversized_file_notices && contribution.oversized_file_notices.length > 0 && (
              <div style={{
                marginTop: '1.5rem',
                border: '1px solid #fde68a',
                backgroundColor: '#fffbeb',
                borderRadius: '8px',
                padding: '1.25rem'
              }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#b45309', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ⚠️ Avisos de Archivos Grandes Pendientes ({contribution.oversized_file_notices.filter((n: any) => n.status === 'pending').length} activos)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {contribution.oversized_file_notices.map((notice: any) => (
                    <div key={notice.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem'
                    }}>
                      <span style={{ fontWeight: 550, color: notice.status === 'pending' ? '#b45309' : '#10b981' }}>
                        {notice.status === 'pending' ? '⏳' : '✅'}{' '}
                        {notice.original_filename}{' '}
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                          ({(notice.size_bytes / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        backgroundColor: notice.status === 'pending' ? '#fef3c7' : '#d1fae5',
                        color: notice.status === 'pending' ? '#b45309' : '#065f46'
                      }}>
                        {notice.status === 'pending' ? 'Pendiente' : 'Resuelto'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ficha Histórica: Bitácora de Cambios */}
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-warm)', paddingBottom: '0.5rem' }}>
              <History size={20} style={{ color: 'var(--primary-blue)' }} /> Bitácora de Cambios Editoriales
            </h2>

            {auditLogs && auditLogs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {auditLogs.map((log: any) => (
                  <div key={log.id} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                    
                    {/* Línea e icono del timeline */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: log.action === 'INSERT' ? 'var(--hope-green)' : 'var(--primary-blue)',
                        marginTop: '0.25rem',
                        zIndex: 1
                      }} />
                      <div style={{
                        width: '2px',
                        flexGrow: 1,
                        backgroundColor: 'var(--border-warm)',
                        minHeight: '25px',
                        marginTop: '0.25rem'
                      }} />
                    </div>
                    
                    {/* Contenido del evento */}
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <strong>{formatDateTimeForAudit(log.created_at)}</strong> — por {
                          log.profiles?.full_name || (
                            log.action === 'INSERT'
                              ? ((contribution.consent_source === 'web_form' || !contribution.consent_source) ? 'Vecino Aportante (Carga Web)' : 'Gestor del Archivo (Carga Local)')
                              : 'Sistema / Proceso Automático'
                          )
                        }
                      </div>
                      <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: '#0f172a', lineHeight: '1.4' }}>
                        {renderAuditLogDescription(log)}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                No se registran cambios históricos para este aporte.
              </p>
            )}
          </div>

          {/* Carga Posterior de Archivos (Operadores Autorizados) */}
          <AdminAddFilesForm
            contributionId={contribution.id}
            pendingNotices={contribution.oversized_file_notices?.filter((n: any) => n.status === 'pending') || []}
          />
        </div>

        {/* Columna Derecha: Aportante, Consentimiento y Notas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Ficha 3: Datos de Aportante */}
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-warm)', paddingBottom: '0.5rem' }}>
              <User size={20} style={{ color: 'var(--primary-blue)' }} /> Ficha del Aportante
            </h2>

            {contribution.contributors ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Nombre Completo</span>
                  <strong>{contribution.contributors.full_name}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
                    {contribution.contributors.dni === 'Convenio' ? 'Tipo de Respaldo' : 'DNI (Documento)'}
                  </span>
                  {contribution.contributors.dni === 'Convenio' ? (
                    <strong style={{ color: 'var(--primary-blue)', fontWeight: 600 }}>📄 Convenio Institucional</strong>
                  ) : (
                    <strong>{contribution.contributors.dni || '—'}</strong>
                  )}
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Teléfono / WhatsApp</span>
                  <a href={`https://wa.me/${contribution.contributors.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                    <Heart size={12} style={{ color: '#25D366' }} /> {contribution.contributors.phone}
                  </a>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Email</span>
                  {contribution.contributors.email && contribution.contributors.email.trim() !== '' ? (
                    <a href={`mailto:${contribution.contributors.email}`} style={{ fontWeight: 500 }}>
                      {contribution.contributors.email}
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No informado</span>
                  )}
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Relación local</span>
                  <span>{contribution.contributors.relation_to_city}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Barrio/Inst. vinculada</span>
                  <span>{contribution.contributors.neighborhood_or_institution}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>¿Acepta futuras entrevistas?</span>
                  <strong style={{ color: contribution.contributors.allow_contact ? 'var(--hope-green)' : 'red' }}>
                    {contribution.contributors.allow_contact ? 'SÍ, Acepta ser contactado' : 'NO desea ser contactado'}
                  </strong>
                </div>
                {contribution.contributors.comments && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#f1f5f9', borderRadius: '4px', fontSize: '0.8rem' }}>
                    <strong>Comentarios aportante:</strong> {contribution.contributors.comments}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Falta información del aportante.</p>
            )}
          </div>

          {/* Ficha 4: Consentimiento Firmado */}
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-warm)', paddingBottom: '0.5rem' }}>
              <Shield size={20} style={{ color: 'var(--primary-blue)' }} /> Consentimiento Firmado
            </h2>

            {contribution.consent_records && contribution.consent_records.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Nivel de Autorización</span>
                  <strong style={{ fontSize: '1rem', color: 'var(--primary-blue)' }}>Nivel {contribution.consent_records[0].authorization_level}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Preferencia de Créditos</span>
                  <strong style={{ fontSize: '0.95rem' }}>{contribution.consent_records[0].credit_preference}</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'flex-start', color: 'var(--hope-green)', fontWeight: 600 }}>
                  <span>✓</span>
                  <span>Declaró ser titular o contar con autorización del copyright.</span>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'flex-start', color: 'var(--hope-green)', fontWeight: 600 }}>
                  <span>✓</span>
                  <span>Aceptó la recepción, catalogación y preservación del material.</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Firmado el:</span>
                  <span>{formatDateTimeToAR(contribution.consent_records[0].accepted_at)}</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Doc. de Consentimiento: {contribution.consent_records[0].consent_text_version}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                {/* Fallback si no está en la tabla consent_records pero sí en contributions */}
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Nivel Autorización (Fallback)</span>
                  <strong>Nivel {contribution.authorization_level}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Créditos (Fallback)</span>
                  <strong>{contribution.credit_preference}</strong>
                </div>
                <div style={{ color: 'red', fontWeight: 600 }}>
                  ⚠️ Sin registro detallado de consentimiento. Verificar base de datos.
                </div>
              </div>
            )}
          </div>

          {/* Ficha 5: Soporte Legal y Respaldos */}
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-warm)', paddingBottom: '0.5rem' }}>
              <Shield size={20} style={{ color: 'var(--primary-blue)' }} /> Soporte Legal y Respaldos
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Origen del Consentimiento:</span>
                <strong style={{ fontSize: '0.95rem' }}>
                  {contribution.consent_source === 'signed_paper' && 'Caso 2: Planilla Firmada en Papel (Digitalizada)'}
                  {contribution.consent_source === 'institutional_agreement' && 'Caso 3: Convenio Institucional'}
                  {contribution.consent_source === 'web_form' && 'Caso 1: Formulario Web (Aceptación Digital)'}
                  {!contribution.consent_source && 'Caso 1: Formulario Web (Aceptación Digital)'}
                </strong>
              </div>

              {contribution.consent_reference && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Referencia de Planilla / Convenio:</span>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{contribution.consent_reference}</strong>
                </div>
              )}

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Estado de la Firma/Convenio:</span>
                {(contribution.consent_source === 'web_form' || !contribution.consent_source) ? (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    backgroundColor: '#ecfdf5',
                    color: '#059669',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    fontSize: '0.75rem',
                    marginTop: '0.25rem'
                  }}>
                    ✓ Aceptación Digital (Web)
                  </span>
                ) : (contribution.consent_source === 'institutional_agreement') ? (
                  !(contribution.consent_file_path || contribution.institutional_agreements?.file_path) ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                      marginTop: '0.25rem'
                    }}>
                      ⚠️ Falta subir convenio firmado
                    </span>
                  ) : contribution.consent_verified ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      backgroundColor: 'var(--hope-green-light)',
                      color: 'var(--hope-green)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                      marginTop: '0.25rem'
                    }}>
                      ✓ Convenio Verificado
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      backgroundColor: '#fef3c7',
                      color: '#b45309',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                      marginTop: '0.25rem'
                    }}>
                      ⚠️ Convenio pendiente de verificación
                    </span>
                  )
                ) : (
                  !contribution.consent_file_path ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                      marginTop: '0.25rem'
                    }}>
                      ⚠️ Falta subir planilla firmada
                    </span>
                  ) : contribution.consent_verified ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      backgroundColor: 'var(--hope-green-light)',
                      color: 'var(--hope-green)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                      marginTop: '0.25rem'
                    }}>
                      ✓ Firma/Convenio Verificado
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      backgroundColor: '#fef3c7',
                      color: '#b45309',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                      marginTop: '0.25rem'
                    }}>
                      ⚠️ Pendiente de verificación por el editor
                    </span>
                  )
                )}
              </div>

              {/* Historial de Consentimientos (Bitácora de Cesión) */}
              {consentHistory.length > 0 ? (
                <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Historial de Firmas / Convenios:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {consentHistory.map((record: any, idx: number) => (
                      <div key={record.id} style={{
                        fontSize: '0.8rem',
                        padding: '0.6rem 0.75rem',
                        backgroundColor: idx === 0 ? '#f0fdf4' : '#f8fafc',
                        border: idx === 0 ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold', color: idx === 0 ? '#15803d' : 'var(--text-primary)' }}>
                            Nivel {record.authorization_level} {idx === 0 && ' (Activo)'}
                          </span>
                           <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {formatDateTimeToAR(record.accepted_at)}
                           </span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          Créditos: {record.credit_preference}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.25rem', fontStyle: 'italic' }}>
                          {record.consent_text_version}
                        </div>
                        {record.signedUrl && (
                          <div style={{ marginTop: '0.5rem', paddingTop: '0.25rem', borderTop: '1px dashed #e2e8f0' }}>
                            <a
                              href={record.signedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: 'var(--primary-blue)',
                                fontWeight: 'bold',
                                fontSize: '0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                textDecoration: 'none'
                              }}
                            >
                              📄 Ver Planilla Firmada ↗
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                    No se adjuntó archivo de respaldo físico (se autorizó digitalmente mediante el portal web).
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Ficha 6: Formulario de Modificación de Estado y Notas */}
          <div className="card" style={{ padding: '2rem' }}>
            <ContributionEditForm
              id={contribution.id}
              initialStatus={contribution.editorial_status}
              initialNotes={contribution.internal_notes}
              initialConsentVerified={contribution.consent_verified || false}
              initialLevel={contribution.authorization_level}
              initialCredits={contribution.credit_preference}
              consentSource={contribution.consent_source || 'web_form'}
            />
          </div>

        </div>

      </div>
    </div>
  );
}
