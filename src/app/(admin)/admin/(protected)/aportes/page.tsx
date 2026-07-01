import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { FileText, Search, Filter, RefreshCw, Plus } from 'lucide-react';

export const revalidate = 0; // Evitar caché

interface PageProps {
  searchParams: Promise<{
    search?: string;
    type?: string;
    auth?: string;
    status?: string;
    dni?: string;
  }>;
}

export default async function AdminAportes({ searchParams }: PageProps) {
  const { search, type, auth, status, dni } = await searchParams;
  const supabase = await createClient();

  // 1. Iniciar consulta
  let query = supabase
    .from('contributions')
    .select(`
      id,
      title,
      contribution_type,
      authorization_level,
      editorial_status,
      created_at,
      catalog_code,
      contributors!inner (
        full_name,
        dni
      )
    `)
    .order('created_at', { ascending: false });

  // 2. Aplicar filtros dinámicos
  if (dni) {
    query = query.eq('contributors.dni', dni);
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,related_place.ilike.%${search}%`);
  }
  if (type) {
    query = query.eq('contribution_type', type);
  }
  if (auth) {
    query = query.eq('authorization_level', auth);
  }
  if (status) {
    query = query.eq('editorial_status', status);
  }

  const { data: contributions, error } = await query;

  if (error) {
    console.error('Error al consultar aportes:', error);
  }

  // Listados para filtros
  const contributionTypes = ['Testimonio escrito', 'Fotografía', 'Documento', 'Audio', 'Video'];
  const authLevels = ['A', 'B', 'C', 'D'];
  const editorialStatuses = [
    'Recibido', 'Datos incompletos', 'En revisión', 'En transcripción', 'Transcripto',
    'En validación histórica', 'Validado', 'Aprobado para archivo', 'Aprobado para libro',
    'Aprobado para e-book', 'Restringido', 'Rechazado', 'Archivado'
  ];

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
        <Link href="/admin/aportes/nuevo" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', height: '40px', padding: '0 1.25rem' }}>
          <Plus size={18} /> Cargar Aporte Administrativo
        </Link>
      </div>

      {/* Contenedor de Filtros */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <form method="GET" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Fila 1: Búsqueda */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flexGrow: 1, minWidth: '250px' }}>
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
                defaultValue={search || ''}
                placeholder="Buscar por título, descripción o lugar..."
                className="form-input"
                style={{ paddingLeft: '2.5rem', height: '40px' }}
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
              <select name="type" className="form-select" style={{ height: '36px', padding: '0.25rem 0.5rem' }} defaultValue={type || ''}>
                <option value="">Todos los tipos</option>
                {contributionTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div style={{ flexGrow: 1, minWidth: '150px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Nivel Autorización</label>
              <select name="auth" className="form-select" style={{ height: '36px', padding: '0.25rem 0.5rem' }} defaultValue={auth || ''}>
                <option value="">Cualquier nivel</option>
                {authLevels.map((l) => (
                  <option key={l} value={l}>Nivel {l}</option>
                ))}
              </select>
            </div>

            <div style={{ flexGrow: 1, minWidth: '150px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Estado Editorial</label>
              <select name="status" className="form-select" style={{ height: '36px', padding: '0.25rem 0.5rem' }} defaultValue={status || ''}>
                <option value="">Cualquier estado</option>
                {editorialStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </div>

      {/* Tabla de Aportes */}
      <div className="card" style={{ padding: '2rem' }}>
        {contributions && contributions.length > 0 ? (
          <div className="responsive-table-container">
            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Signatura</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Título</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Tipo</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Aportante</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Nivel Autoriz.</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Fecha de Carga</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Estado Editorial</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((contribution: any) => {
                    const statusBadgeClass = `badge badge-${contribution.editorial_status.toLowerCase().replace(/á/g, 'a').replace(/ó/g, 'o').replace(/ /g, '-')}`;
                    
                    return (
                      <tr key={contribution.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                        <td data-label="Signatura" style={{ padding: '1rem 0.5rem', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary-blue)' }}>
                          {contribution.catalog_code || 'MV-PENDIENTE'}
                        </td>
                        <td data-label="Título" style={{ padding: '1rem 0.5rem', fontWeight: 600, color: '#0f172a' }}>{contribution.title}</td>
                        <td data-label="Tipo" style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{contribution.contribution_type}</td>
                      <td data-label="Aportante" style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>
                        {contribution.contributors?.full_name || 'Desconocido'}
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
                          {contribution.authorization_level}
                        </span>
                      </td>
                      <td data-label="Fecha de Carga" style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>
                        {new Date(contribution.created_at).toLocaleDateString('es-AR')}
                      </td>
                      <td data-label="Estado Editorial" style={{ padding: '1rem 0.5rem' }}>
                        <span className={statusBadgeClass || 'badge badge-default'}>
                          {contribution.editorial_status}
                        </span>
                      </td>
                      <td data-label="Acción" style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                        <Link 
                          href={`/admin/aportes/${contribution.id}`} 
                          className={contribution.editorial_status === 'Recibido' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
                        >
                          {contribution.editorial_status === 'Recibido' ? 'Revisar' : 'Ver Detalle'}
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
            <p style={{ margin: 0 }}>No se encontraron aportes que coincidan con los filtros.</p>
          </div>
        )}
      </div>
    </div>
  );
}
