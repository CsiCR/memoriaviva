// Archivo de Aportes con Navegación Contextual y Motores Integrados
// Archivo: src/app/(admin)/admin/(protected)/aportes/page.tsx

import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { FileText, Search, Filter, RefreshCw, Plus, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateToAR } from '@/utils/date';
import { 
  parseContributionFilters, 
  filterContributionsByListFilter, 
  buildContributionListUrl, 
  removeContributionFilterValue, 
  mergeContributionFilters,
  ContributionListFilter
} from '@/lib/editorial/navigation';
import { mapContributionToProgressInput } from '@/lib/editorial/progress/mapContributionToProgressInput';
import { mapContributionTypeToContentType, mapStatusToCode } from '@/lib/editorial/editorialConstants';
import { evaluateContribution } from '@/lib/editorial/evaluateContribution';
import { evaluateEditorialProgress } from '@/lib/editorial/progress/evaluateEditorialProgress';
import { EvaluatedContribution } from '@/lib/editorial/dashboard/dashboardTypes';

export const revalidate = 0; // Evitar caché

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminAportes({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const filter = parseContributionFilters(resolvedParams);
  const supabase = await createClient();

  // 1. Consultar todos los aportes con relaciones (igual que el Dashboard para evaluación exacta)
  const { data: contributions, error } = await supabase
    .from('contributions')
    .select(`
      *,
      contributors(*),
      contribution_editorial_indicators(
        *,
        opt: select_options(*)
      ),
      consent_records(*),
      contribution_files(*),
      oversized_file_notices (
        id,
        status
      )
    `);

  if (error) {
    console.error('Error al consultar aportes:', error);
  }

  // 2. Consultar opciones de estado de publicación
  const { data: pubStatusOptions } = await supabase
    .from('select_options')
    .select('*')
    .eq('category', 'publication_status');

  // 3. Evaluar cada aporte una única vez para garantizar consistencia absoluta
  const evaluatedContributions: EvaluatedContribution[] = (contributions || []).map((c: any) => {
    const pubStatusOpt = pubStatusOptions?.find((opt: any) => opt.id === c.publication_status_option_id);
    
    // Extraer indicadores activos
    const activeIndicators = (c.contribution_editorial_indicators || [])
      .filter((ind: any) => ind.is_active)
      .map((ind: any) => ({
        indicator_option_id: ind.indicator_option_id,
        is_active: true,
        opt: ind.opt
      }));

    // Entrada del progreso (Motor P1-P9)
    const progressInput = mapContributionToProgressInput(c, pubStatusOpt, activeIndicators);

    // Entrada del motor editorial (Motor E1-E8)
    const mappedContentType = mapContributionTypeToContentType(c.contribution_type);
    const eligibilityInput = {
      id: c.id,
      title: c.title || null,
      description: c.description || null,
      internal_notes: c.internal_notes || null,
      content_type: mappedContentType,
      editorial_status: {
        id: null,
        code: mapStatusToCode(c.editorial_status),
        name: c.editorial_status
      },
      publication_status: {
        id: c.publication_status_option_id || null,
        code: pubStatusOpt?.code || null,
        name: pubStatusOpt?.name || null
      },
      publication_notes: c.publication_notes || null,
      publication_scheduled_at: c.publication_scheduled_at || null,
      consent_verified: !!c.consent_verified,
      authorization_level: c.authorization_level || null,
      credit_preference: c.credit_preference || null,
      consent_source: c.consent_source || null,
      files: (c.contribution_files || []).map((f: any) => ({
        id: f.id,
        file_name: f.file_name || '',
        file_size: f.file_size || 0,
        file_role: f.file_role || null,
        processing_status: f.processing_status || null
      })),
      consent_records: (c.consent_records || []).map((rec: any) => ({
        accepted_at: rec.accepted_at || null,
        authorization_level: rec.authorization_level || null
      })),
      activeIndicators: activeIndicators.map((i: any) => ({
        code: i.opt?.code || null,
        severity: i.opt?.metadata?.severity || 'info'
      }))
    };

    const eligibilityResult = evaluateContribution(eligibilityInput);
    const progressResult = evaluateEditorialProgress(progressInput);

    return {
      id: c.id,
      title: c.title || 'Sin título',
      description: c.description || '',
      contentType: mappedContentType || 'unknown',
      rawContributionType: c.contribution_type || 'unknown',
      editorialStatus: c.editorial_status || 'Recibido',
      publicationStatus: pubStatusOpt?.code || 'not_evaluated',
      authorizationLevel: c.authorization_level || 'A',
      receivedAt: c.created_at,
      updatedAt: c.updated_at || c.created_at,
      publishedAt: c.published_at || null,
      catalogCode: c.catalog_code || null,
      contributorFullName: c.contributors?.full_name || 'Desconocido',
      contributorDni: c.contributors?.dni || null,
      hasEditorialIntervention: !!progressInput.hasEditorialIntervention,
      historicalValidationStatus: progressInput.historicalValidation?.statusCode || 'pending',
      eligibilityResult,
      progressResult,
      activeIndicators: eligibilityInput.activeIndicators,
      oversizedFileNotices: c.oversized_file_notices || []
    };
  });

  // 4. Aplicar filtros en memoria
  const filtered = filterContributionsByListFilter(evaluatedContributions, filter);

  // 5. Paginación en memoria
  const page = filter.page || 1;
  const pageSize = filter.pageSize || 25;
  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedContributions = filtered.slice((page - 1) * pageSize, page * pageSize);

  // 6. Listados para selectores de filtros tradicionales
  const contributionTypes = ['Testimonio escrito', 'Fotografía', 'Documento', 'Audio', 'Video'];
  const authLevels = ['A', 'B', 'C', 'D'];
  const editorialStatuses = [
    'Recibido', 'Datos incompletos', 'En revisión', 'En transcripción', 'Transcripto',
    'En validación histórica', 'Validado', 'Aprobado para archivo', 'Aprobado para libro',
    'Aprobado para e-book', 'Restringido', 'Rechazado', 'Archivado'
  ];

  // 7. Construir listado de Chips visuales activos
  const chips: { key: keyof ContributionListFilter; value?: string; text: string; href: string }[] = [];

  if (filter.search) {
    chips.push({
      key: 'search',
      text: `Búsqueda: "${filter.search}"`,
      href: buildContributionListUrl(removeContributionFilterValue(filter, 'search'))
    });
  }
  if (filter.dni) {
    chips.push({
      key: 'dni',
      text: `DNI Aportante: ${filter.dni}`,
      href: buildContributionListUrl(removeContributionFilterValue(filter, 'dni'))
    });
  }
  if (filter.contentTypes) {
    filter.contentTypes.forEach(val => {
      chips.push({
        key: 'contentTypes',
        value: val,
        text: `Tipo: ${val}`,
        href: buildContributionListUrl(removeContributionFilterValue(filter, 'contentTypes', val))
      });
    });
  }
  if (filter.authorizationLevels) {
    filter.authorizationLevels.forEach(val => {
      chips.push({
        key: 'authorizationLevels',
        value: val,
        text: `Autorización: ${val}`,
        href: buildContributionListUrl(removeContributionFilterValue(filter, 'authorizationLevels', val))
      });
    });
  }
  if (filter.editorialStatuses) {
    filter.editorialStatuses.forEach(val => {
      chips.push({
        key: 'editorialStatuses',
        value: val,
        text: `Estado Editorial: ${val}`,
        href: buildContributionListUrl(removeContributionFilterValue(filter, 'editorialStatuses', val))
      });
    });
  }
  if (filter.publicationStatuses) {
    filter.publicationStatuses.forEach(val => {
      chips.push({
        key: 'publicationStatuses',
        value: val,
        text: `Publicación: ${val === 'unpublished' ? 'No publicado' : val}`,
        href: buildContributionListUrl(removeContributionFilterValue(filter, 'publicationStatuses', val))
      });
    });
  }
  if (filter.eligibility) {
    const label = filter.eligibility === 'eligible' ? 'Publicable' : filter.eligibility === 'ineligible' ? 'No publicable' : 'Requiere revisión';
    chips.push({
      key: 'eligibility',
      text: `Elegibilidad: ${label}`,
      href: buildContributionListUrl(removeContributionFilterValue(filter, 'eligibility'))
    });
  }
  if (filter.stages) {
    filter.stages.forEach(val => {
      chips.push({
        key: 'stages',
        value: val,
        text: `Etapa: ${val}`,
        href: buildContributionListUrl(removeContributionFilterValue(filter, 'stages', val))
      });
    });
  }
  if (filter.blockingCodes) {
    filter.blockingCodes.forEach(val => {
      chips.push({
        key: 'blockingCodes',
        value: val,
        text: `Bloqueo: ${val}`,
        href: buildContributionListUrl(removeContributionFilterValue(filter, 'blockingCodes', val))
      });
    });
  }
  if (filter.bottleneckCodes) {
    filter.bottleneckCodes.forEach(val => {
      chips.push({
        key: 'bottleneckCodes',
        value: val,
        text: `Cuello de botella: ${val}`,
        href: buildContributionListUrl(removeContributionFilterValue(filter, 'bottleneckCodes', val))
      });
    });
  }
  if (filter.warningCodes) {
    filter.warningCodes.forEach(val => {
      chips.push({
        key: 'warningCodes',
        value: val,
        text: `Advertencia: ${val}`,
        href: buildContributionListUrl(removeContributionFilterValue(filter, 'warningCodes', val))
      });
    });
  }
  if (filter.indicatorCodes) {
    filter.indicatorCodes.forEach(val => {
      chips.push({
        key: 'indicatorCodes',
        value: val,
        text: `Indicador: ${val}`,
        href: buildContributionListUrl(removeContributionFilterValue(filter, 'indicatorCodes', val))
      });
    });
  }
  if (filter.progressMin !== undefined && filter.progressMax !== undefined) {
    if (filter.progressMin > 0 || filter.progressMax < 100) {
      chips.push({
        key: 'progressMin',
        text: `Progreso: ${filter.progressMin}% a ${filter.progressMax}%`,
        href: buildContributionListUrl(removeContributionFilterValue(removeContributionFilterValue(filter, 'progressMin'), 'progressMax'))
      });
    }
  }
  if (filter.dateFrom || filter.dateTo) {
    chips.push({
      key: 'dateFrom',
      text: `Rango: ${filter.dateFrom || '*'} a ${filter.dateTo || '*'}`,
      href: buildContributionListUrl(removeContributionFilterValue(removeContributionFilterValue(filter, 'dateFrom'), 'dateTo'))
    });
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem', color: '#0f172a' }}>Archivo de Aportes</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Revisa, edita los estados editoriales y audita los materiales históricos enviados por la comunidad.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a
            href="/admin/print?blank=true"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', height: '40px', padding: '0 1.25rem', textDecoration: 'none' }}
          >
            <Printer size={18} /> Planilla de Entrevista
          </a>
          <Link href="/admin/aportes/nuevo" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', height: '40px', padding: '0 1.25rem' }}>
            <Plus size={18} /> Cargar Aporte Administrativo
          </Link>
        </div>
      </div>

      {/* Contenedor de Filtros */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <form method="GET" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Conservar filtros canónicos no expuestos en selects mediante campos hidden */}
          {Object.entries(filter).map(([key, value]) => {
            if (['search', 'dni', 'contentTypes', 'authorizationLevels', 'editorialStatuses', 'page', 'pageSize'].includes(key)) {
              return null;
            }
            if (Array.isArray(value)) {
              return <input type="hidden" key={key} name={key} value={value.join(',')} />;
            }
            return <input type="hidden" key={key} name={key} value={String(value)} />;
          })}
          
          {/* Fila 1: Búsqueda y DNI */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flexGrow: 2, minWidth: '250px' }}>
              <Search size={18} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }} />
              <input
                type="text"
                name="search"
                defaultValue={filter.search || ''}
                placeholder="Buscar por título o descripción..."
                className="form-input"
                style={{ paddingLeft: '2.5rem', height: '40px' }}
              />
            </div>

            <div style={{ position: 'relative', flexGrow: 1, minWidth: '150px' }}>
              <input
                type="text"
                name="dni"
                defaultValue={filter.dni || ''}
                placeholder="DNI del aportante..."
                className="form-input"
                style={{ height: '40px' }}
              />
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ height: '40px' }}>
              Filtrar
            </button>
            
            <Link href="/admin/aportes" className="btn btn-outline" style={{ height: '40px', padding: '0 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <RefreshCw size={14} /> Limpiar
            </Link>
          </div>

          {/* Fila 2: Filtros Selectores */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flexGrow: 1, minWidth: '150px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Tipo Material</label>
              <select name="contentTypes" className="form-select" style={{ height: '36px', padding: '0.25rem 0.5rem' }} defaultValue={filter.contentTypes?.[0] || ''}>
                <option value="">Todos los tipos</option>
                {contributionTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div style={{ flexGrow: 1, minWidth: '150px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Nivel Autorización</label>
              <select name="authorizationLevels" className="form-select" style={{ height: '36px', padding: '0.25rem 0.5rem' }} defaultValue={filter.authorizationLevels?.[0] || ''}>
                <option value="">Cualquier nivel</option>
                {authLevels.map((l) => (
                  <option key={l} value={l}>Nivel {l}</option>
                ))}
              </select>
            </div>

            <div style={{ flexGrow: 1, minWidth: '150px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Estado Editorial</label>
              <select name="editorialStatuses" className="form-select" style={{ height: '36px', padding: '0.25rem 0.5rem' }} defaultValue={filter.editorialStatuses?.[0] || ''}>
                <option value="">Cualquier estado</option>
                {editorialStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </div>

      {/* Chips de Filtros Activos */}
      {chips.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          alignItems: 'center',
          backgroundColor: '#f8fafc',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginRight: '0.25rem' }}>Filtros activos:</span>
          {chips.map((chip, idx) => (
            <Link 
              href={chip.href} 
              key={`${String(chip.key)}-${idx}`} 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.6rem',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                color: '#1e293b',
                textDecoration: 'none',
                fontWeight: 600,
                transition: 'all 0.15s ease',
                cursor: 'pointer'
              }}
              title={`Eliminar filtro: ${chip.text}`}
              className="filter-chip"
            >
              {chip.text} <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.85rem' }}>&times;</span>
            </Link>
          ))}
          <Link 
            href="/admin/aportes" 
            style={{
              fontSize: '0.75rem',
              color: '#ef4444',
              fontWeight: 700,
              textDecoration: 'none',
              marginLeft: '0.5rem',
              borderBottom: '1px dashed #ef4444'
            }}
          >
            Limpiar todos los filtros
          </Link>
        </div>
      )}

      {/* Tabla de Aportes */}
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
            Mostrando <strong>{paginatedContributions.length}</strong> de <strong>{totalCount}</strong> aportes
          </span>
          
          {/* Paginador Simplificado */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link 
                href={buildContributionListUrl(mergeContributionFilters(filter, { page: Math.max(1, page - 1) }))}
                className={`btn btn-outline btn-sm ${page === 1 ? 'disabled' : ''}`}
                style={{ pointerEvents: page === 1 ? 'none' : 'auto', opacity: page === 1 ? 0.5 : 1, padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center' }}
                title="Página anterior"
              >
                <ChevronLeft size={16} />
              </Link>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                Pág. {page} de {totalPages}
              </span>
              <Link 
                href={buildContributionListUrl(mergeContributionFilters(filter, { page: Math.min(totalPages, page + 1) }))}
                className={`btn btn-outline btn-sm ${page === totalPages ? 'disabled' : ''}`}
                style={{ pointerEvents: page === totalPages ? 'none' : 'auto', opacity: page === totalPages ? 0.5 : 1, padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center' }}
                title="Página siguiente"
              >
                <ChevronRight size={16} />
              </Link>
            </div>
          )}
        </div>

        {paginatedContributions && paginatedContributions.length > 0 ? (
          <div className="responsive-table-container">
            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Signatura</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Título</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Tipo</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Aportante</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Nivel Autoriz.</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Progreso</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Estado Editorial</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {paginatedContributions.map((contribution: EvaluatedContribution) => {
                  const statusBadgeClass = `badge badge-${contribution.editorialStatus?.toLowerCase().replace(/á/g, 'a').replace(/ó/g, 'o').replace(/ /g, '-')}`;
                  const progressVal = contribution.progressResult?.progress ?? 0;
                  const isEligible = contribution.eligibilityResult?.eligibleForPublication ?? false;

                  return (
                    <tr key={contribution.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                      <td data-label="Signatura" style={{ padding: '1rem 0.5rem', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary-blue)' }}>
                        {contribution.catalogCode || 'MV-PENDIENTE'}
                      </td>
                      <td data-label="Título" style={{ padding: '1rem 0.5rem', fontWeight: 600, color: '#0f172a' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{contribution.title}</span>
                          {!isEligible && (
                            <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 500 }}>
                              ⚠️ No publicable · {contribution.eligibilityResult.issues.length} incidencias
                            </span>
                          )}
                        </div>
                      </td>
                      <td data-label="Tipo" style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{contribution.rawContributionType}</td>
                      <td data-label="Aportante" style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>
                        {contribution.contributorFullName}
                      </td>
                      <td data-label="Nivel Autoriz." style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px'
                        }}>
                          {contribution.authorizationLevel}
                        </span>
                      </td>
                      <td data-label="Progreso" style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', width: '35px', textAlign: 'right' }}>
                            {progressVal}%
                          </span>
                          <div style={{ width: '50px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${progressVal}%`, backgroundColor: progressVal === 100 ? '#16a34a' : '#3b82f6' }} />
                          </div>
                        </div>
                      </td>
                      <td data-label="Estado Editorial" style={{ padding: '1rem 0.5rem' }}>
                        {contribution.editorialStatus === 'Recibido' && contribution.oversizedFileNotices?.some((n: any) => n.status === 'pending') ? (
                          <span 
                            className="badge badge-pendiente-de-archivos" 
                            title="Este aporte fue recibido, pero uno o más archivos superaron el límite de 50 MB y requieren coordinación con el aportante."
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            ⚠️ Recibido · faltan archivos
                          </span>
                        ) : (
                          <span className={statusBadgeClass || 'badge badge-default'}>
                            {contribution.editorialStatus}
                          </span>
                        )}
                      </td>
                      <td data-label="Acción" style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                        <Link 
                          href={`/admin/aportes/${contribution.id}`} 
                          className={contribution.editorialStatus === 'Recibido' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
                        >
                          {contribution.editorialStatus === 'Recibido' ? 'Revisar' : 'Ver Detalle'}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
            <FileText size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
            <p style={{ margin: 0 }}>No se encontraron aportes que coincidan con los filtros activos.</p>
          </div>
        )}

        {/* Selector de Tamaño de Página en el pie */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            * Nota: La evaluación completa de reglas y progreso se realiza en memoria sobre la colección actual como solución de diagnóstico inicial.
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
            <span>Mostrar:</span>
            {[10, 25, 50, 100].map((size) => (
              <Link 
                key={size}
                href={buildContributionListUrl(mergeContributionFilters(filter, { page: 1, pageSize: size }))}
                style={{
                  fontWeight: (filter.pageSize || 25) === size ? 'bold' : 'normal',
                  textDecoration: (filter.pageSize || 25) === size ? 'none' : 'underline',
                  color: (filter.pageSize || 25) === size ? '#0f172a' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                {size}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
