import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { FileText, Users, Clock, Database, ChevronRight, File } from 'lucide-react';

export const revalidate = 0; // Evitar cache para que muestre datos actuales

export default async function AdminDashboard() {
  const supabase = await createClient();

  // 1. Obtener métricas
  const { count: totalContributions } = await supabase
    .from('contributions')
    .select('*', { count: 'exact', head: true });

  const { count: pendingContributions } = await supabase
    .from('contributions')
    .select('*', { count: 'exact', head: true })
    .eq('editorial_status', 'Recibido');

  // Obtener aportantes y calcular únicos por DNI o Email
  let totalContributors = 0;
  const { data: contributorsData } = await supabase
    .from('contributors')
    .select('id, dni, email');

  if (contributorsData) {
    const keys = new Set();
    contributorsData.forEach((c: any) => {
      const key = c.dni && c.dni !== '—' && c.dni.trim() !== '' 
        ? `dni:${c.dni.trim()}` 
        : c.email && c.email.trim() !== '' 
          ? `email:${c.email.trim()}` 
          : `id:${c.id}`;
      keys.add(key);
    });
    totalContributors = keys.size;
  }

  const { count: totalFiles } = await supabase
    .from('contribution_files')
    .select('*', { count: 'exact', head: true });

  // 2. Obtener los últimos 5 aportes recibidos
  const { data: recentContributions, error } = await supabase
    .from('contributions')
    .select(`
      id,
      title,
      contribution_type,
      created_at,
      editorial_status,
      contributors (
        full_name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem', color: '#0f172a' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Resumen actual de la recolección comunitaria de material histórico.
        </p>
      </div>

      {/* Grid de Tarjetas de Métricas */}
      <div className="grid grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '2rem' }}>
        
        {/* Total Aportes */}
        <Link href="/admin/aportes" className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            backgroundColor: 'var(--primary-blue-light)',
            color: 'var(--primary-blue)',
            padding: '0.75rem',
            borderRadius: '12px'
          }}>
            <FileText size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block' }}>Total Aportes</span>
            <strong style={{ fontSize: '1.75rem', color: '#0f172a' }}>{totalContributions || 0}</strong>
          </div>
        </Link>

        {/* Pendientes de Revisión */}
        <Link href="/admin/aportes?status=Recibido" className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            backgroundColor: 'var(--status-review)',
            color: 'var(--status-review-text)',
            padding: '0.75rem',
            borderRadius: '12px'
          }}>
            <Clock size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block' }}>Por Revisar</span>
            <strong style={{ fontSize: '1.75rem', color: '#0f172a' }}>{pendingContributions || 0}</strong>
          </div>
        </Link>

        {/* Aportantes */}
        <Link href="/admin/aportantes" className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            backgroundColor: 'var(--hope-green-light)',
            color: 'var(--hope-green)',
            padding: '0.75rem',
            borderRadius: '12px'
          }}>
            <Users size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block' }}>Aportantes</span>
            <strong style={{ fontSize: '1.75rem', color: '#0f172a' }}>{totalContributors || 0}</strong>
          </div>
        </Link>

        {/* Archivos Cargados */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            backgroundColor: '#f1f5f9',
            color: '#475569',
            padding: '0.75rem',
            borderRadius: '12px'
          }}>
            <Database size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block' }}>Archivos</span>
            <strong style={{ fontSize: '1.75rem', color: '#0f172a' }}>{totalFiles || 0}</strong>
          </div>
        </div>

      </div>

      {/* Contenido Secundario - Últimos Aportes */}
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.75rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Últimos Aportes Recibidos</h2>
          <Link href="/admin/aportes" style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            Ver todos <ChevronRight size={16} />
          </Link>
        </div>

        {recentContributions && recentContributions.length > 0 ? (
          <div className="responsive-table-container">
            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Título</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Tipo</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Aportante</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Fecha de Carga</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Estado</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {recentContributions.map((contribution: any) => {
                  const statusBadgeClass = `badge badge-${contribution.editorial_status.toLowerCase().replace(/á/g, 'a').replace(/ó/g, 'o').replace(/ /g, '-')}`;
                  
                  return (
                    <tr key={contribution.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                      <td data-label="Título" style={{ padding: '1rem 0.5rem', fontWeight: 600, color: '#0f172a' }}>{contribution.title}</td>
                      <td data-label="Tipo" style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{contribution.contribution_type}</td>
                      <td data-label="Aportante" style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>
                        {contribution.contributors?.full_name || 'Desconocido'}
                      </td>
                      <td data-label="Fecha de Carga" style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>
                        {new Date(contribution.created_at).toLocaleDateString('es-AR')}
                      </td>
                      <td data-label="Estado" style={{ padding: '1rem 0.5rem' }}>
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
            <File size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
            <p style={{ margin: 0 }}>No se han recibido aportes todavía.</p>
          </div>
        )}
      </div>
    </div>
  );
}
