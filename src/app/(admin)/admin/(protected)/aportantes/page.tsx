import { createClient } from '@/utils/supabase/server';
import { Users, Phone, Mail, Check, X, Search, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0; // Evitar caché

interface PageProps {
  searchParams: Promise<{
    search?: string;
  }>;
}

export default async function AdminAportantes({ searchParams }: PageProps) {
  const { search } = await searchParams;
  const supabase = await createClient();

  // 1. Obtener todos los aportantes con sus aportes asociados
  let query = supabase
    .from('contributors')
    .select(`
      *,
      contributions (
        id,
        title,
        contribution_type,
        editorial_status
      )
    `)
    .order('created_at', { ascending: false });

  // Si hay búsqueda en base de datos
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,neighborhood_or_institution.ilike.%${search}%,dni.ilike.%${search}%`);
  }

  const { data: rawContributors, error } = await query;

  if (error) {
    console.error('Error al obtener aportantes:', error);
  }

  // 2. Algoritmo de agrupación en memoria por DNI o Email
  const grouped: { [key: string]: any } = {};

  if (rawContributors) {
    rawContributors.forEach((c: any) => {
      // Clave de agrupación: DNI si existe y es válido, sino Email, sino ID único
      const key = c.dni && c.dni !== '—' && c.dni.trim() !== '' 
        ? `dni:${c.dni.trim()}` 
        : c.email && c.email.trim() !== '' 
          ? `email:${c.email.trim()}` 
          : `id:${c.id}`;

      if (!grouped[key]) {
        grouped[key] = {
          id: c.id,
          dni: c.dni && c.dni !== '—' ? c.dni.trim() : '',
          full_name: c.full_name,
          names: [c.full_name],
          phones: [c.phone],
          emails: [c.email],
          relations: [c.relation_to_city],
          neighborhoods: [c.neighborhood_or_institution],
          contributions: (c.contributions || []).map((contrib: any) => ({
            ...contrib,
            submitted_at: c.created_at,
            allow_contact: c.allow_contact,
            comments: c.comments || '',
          }))
        };
      } else {
        const group = grouped[key];
        
        // Agregar variantes de datos si no existen
        if (!group.names.includes(c.full_name)) group.names.push(c.full_name);
        if (!group.phones.includes(c.phone)) group.phones.push(c.phone);
        if (!group.emails.includes(c.email)) group.emails.push(c.email);
        if (!group.relations.includes(c.relation_to_city)) group.relations.push(c.relation_to_city);
        if (!group.neighborhoods.includes(c.neighborhood_or_institution)) group.neighborhoods.push(c.neighborhood_or_institution);
        
        // Unificar aportes asociando sus metadatos específicos del registro
        if (c.contributions) {
          c.contributions.forEach((contrib: any) => {
            if (!group.contributions.some((gC: any) => gC.id === contrib.id)) {
              group.contributions.push({
                ...contrib,
                submitted_at: c.created_at,
                allow_contact: c.allow_contact,
                comments: c.comments || '',
              });
            }
          });
        }

        // Conservar el nombre más largo/completo como principal
        if (c.full_name.length > group.full_name.length) {
          group.full_name = c.full_name;
        }
      }
    });
  }

  const contributorsList = Object.values(grouped);

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
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem', color: '#0f172a' }}>Registro de Aportantes</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Listado unificado de aportantes. Los registros se agrupan automáticamente por DNI o Correo.
          </p>
        </div>

        {/* Buscador */}
        <form method="GET" style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '350px' }}>
          <div style={{ position: 'relative', flexGrow: 1 }}>
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
              placeholder="Buscar por DNI, nombre, barrio..."
              defaultValue={search || ''}
              className="form-input"
              style={{ paddingLeft: '2.5rem', height: '40px' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: '40px', padding: '0 1.25rem' }}>
            Buscar
          </button>
        </form>
      </div>

      {/* Tabla de Aportantes */}
      <div className="card" style={{ padding: '2rem' }}>
        {contributorsList.length > 0 ? (
          <div className="responsive-table-container">
            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 0.5rem', width: '25%' }}>Aportante</th>
                  <th style={{ padding: '0.75rem 0.5rem', width: '25%' }}>Contacto General</th>
                  <th style={{ padding: '0.75rem 0.5rem', width: '20%' }}>Relación / Barrio</th>
                  <th style={{ padding: '0.75rem 0.5rem', width: '30%' }}>Aportes y Notas</th>
                </tr>
              </thead>
              <tbody>
                {contributorsList.map((c: any, index: number) => {
                  const namesToDisplay = c.names.filter((n: string) => n !== c.full_name);
                  
                  return (
                    <tr key={index} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                      
                      {/* Aportante (Nombre agrupado + Variaciones + DNI) */}
                      <td data-label="Aportante" style={{ padding: '1rem 0.5rem', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>{c.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary-blue)', fontWeight: 600 }}>
                          DNI: {c.dni || '—'}
                        </div>
                        {namesToDisplay.length > 0 && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                            Alias: {namesToDisplay.join(', ')}
                          </div>
                        )}
                      </td>

                      {/* Contacto Agrupado */}
                      <td data-label="Contacto General" style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {c.phones.map((phone: string, pIdx: number) => (
                            <a 
                              key={pIdx}
                              href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
                            >
                              <Phone size={12} /> {phone}
                            </a>
                          ))}
                          {c.emails.map((email: string, eIdx: number) => (
                            <a 
                              key={eIdx}
                              href={`mailto:${email}`} 
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--neutral-grey)' }}
                            >
                              <Mail size={12} /> {email}
                            </a>
                          ))}
                        </div>
                      </td>

                      {/* Relación / Barrio */}
                      <td data-label="Relación / Barrio" style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 500 }}>{Array.from(new Set(c.relations)).join(', ')}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {Array.from(new Set(c.neighborhoods)).join(', ')}
                        </div>
                      </td>

                      {/* Aportes con Cantidad, Fechas de Registro, Permiso de Contacto y Comentarios */}
                      <td data-label="Aportes y Notas" style={{ padding: '1rem 0.5rem', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ marginBottom: '0.25rem' }}>
                            <span style={{ 
                              display: 'inline-block', 
                              backgroundColor: 'var(--primary-blue-light)', 
                              color: 'var(--primary-blue)', 
                              padding: '0.2rem 0.6rem', 
                              borderRadius: '9999px', 
                              fontSize: '0.725rem', 
                              fontWeight: 700 
                            }}>
                              {c.contributions.length} {c.contributions.length === 1 ? 'aporte' : 'aportes'}
                            </span>
                          </div>
                          
                          {/* Listado de tarjetas de aportes individuales (Máximo 3) */}
                          {c.contributions.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {c.contributions.slice(0, 3).map((contrib: any) => (
                                <div key={contrib.id} style={{
                                  padding: '0.5rem 0.75rem',
                                  backgroundColor: '#f8fafc',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.25rem'
                                }}>
                                  {/* Fila Título + Check de Contacto */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                    <Link 
                                      href={`/admin/aportes/${contrib.id}?from=aportantes`} 
                                      target="_blank"
                                      title="Revisar aporte en pestaña nueva"
                                      style={{ 
                                        fontSize: '0.775rem', 
                                        color: 'var(--primary-blue)', 
                                        fontWeight: 700,
                                        textDecoration: 'underline'
                                      }}
                                    >
                                      {contrib.title.length > 25 ? `${contrib.title.substring(0, 25)}...` : contrib.title} ({contrib.contribution_type})
                                    </Link>
                                    
                                    {/* Indicador de contacto para este envío específico */}
                                    <span 
                                      title={contrib.allow_contact ? "Acepta ser contactado para este aporte" : "No permite contacto para este aporte"}
                                      style={{
                                        display: 'inline-flex',
                                        backgroundColor: contrib.allow_contact ? 'var(--hope-green-light)' : '#fee2e2',
                                        color: contrib.allow_contact ? 'var(--hope-green)' : '#b91c1c',
                                        borderRadius: '50%',
                                        padding: '0.15rem',
                                        fontSize: '0.65rem'
                                      }}
                                    >
                                      {contrib.allow_contact ? <Check size={10} strokeWidth={4} /> : <X size={10} strokeWidth={4} />}
                                    </span>
                                  </div>
                                  
                                  {/* Fecha de Registro de este aporte */}
                                  <div style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>
                                    Registrado: {new Date(contrib.submitted_at).toLocaleDateString('es-AR')}
                                  </div>
                                  
                                  {/* Comentario de este aporte */}
                                  {contrib.comments && (
                                    <div style={{ 
                                      fontSize: '0.7rem', 
                                      color: 'var(--neutral-grey)', 
                                      backgroundColor: '#ffffff', 
                                      padding: '0.25rem 0.4rem', 
                                      borderRadius: '4px',
                                      borderLeft: '2px solid var(--primary-blue)',
                                      marginTop: '0.1rem',
                                      whiteSpace: 'normal',
                                      wordBreak: 'break-word'
                                    }}>
                                      <strong>Nota:</strong> {contrib.comments}
                                    </div>
                                  )}
                                </div>
                              ))}
                              
                              {/* Indicador de más aportes ocultos */}
                              {c.contributions.length > 3 && (
                                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '0.5rem' }}>
                                  y {c.contributions.length - 3} aportes más...
                                </span>
                              )}
                            </div>
                          )}

                          {/* Enlace al listado filtrado */}
                          {c.contributions.length > 0 && (
                            <div style={{ marginTop: '0.25rem', paddingTop: '0.25rem', borderTop: '1px solid var(--border-color)' }}>
                              <Link
                                href={c.dni 
                                  ? `/admin/aportes?dni=${c.dni}` 
                                  : `/admin/aportes?search=${encodeURIComponent(c.full_name)}`
                                }
                                target="_blank"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.75rem',
                                  color: 'var(--hope-green-hover)',
                                  fontWeight: 700
                                }}
                              >
                                Ver todos en el listado <ExternalLink size={12} />
                              </Link>
                            </div>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
            <Users size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
            <p style={{ margin: 0 }}>No se encontraron aportantes registrados.</p>
          </div>
        )}
      </div>
    </div>
  );
}
