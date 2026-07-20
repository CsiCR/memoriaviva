import { APP_VERSION, EDITORIAL_ENGINE_VERSION, EDITORIAL_PROGRESS_VERSION, EDITORIAL_DASHBOARD_VERSION } from '@/config/version';
import Link from 'next/link';
import { ArrowLeft, Cpu, HardDrive, ShieldCheck, Calendar } from 'lucide-react';

export default async function SystemInfoPage() {
  const envName = process.env.NODE_ENV === 'production' 
    ? 'Production (Producción)' 
    : process.env.NODE_ENV === 'test' 
      ? 'Staging (Pruebas)' 
      : 'Development (Desarrollo)';

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem 0' }}>
      
      {/* breadcrumb y botón volver */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link href="/admin" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          color: '#0284c7',
          textDecoration: 'none',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          <ArrowLeft size={16} /> Volver al Inicio
        </Link>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Información del Sistema</span>
      </div>

      <div className="card" style={{ padding: '2.5rem', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Información del Sistema</h1>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>Estado, versionado y especificaciones técnicas de la plataforma institucional.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          
          {/* Columna Izquierda: Identidad */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', margin: 0, borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
              Identidad de la Plataforma
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Nombre de la Plataforma</span>
                <strong style={{ fontSize: '1rem', color: '#0f172a' }}>Memoria Viva Pico Truncado</strong>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Versión de la Plataforma</span>
                <span className="badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 700, padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', display: 'inline-block', marginTop: '0.25rem' }}>
                  v{APP_VERSION.version}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Etapa del Proyecto</span>
                <strong style={{ fontSize: '0.95rem', color: '#334155' }}>Etapa {APP_VERSION.stage}</strong>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Codename</span>
                <span style={{ fontStyle: 'italic', color: '#475569', fontSize: '0.95rem' }}>&ldquo;{APP_VERSION.codename}&rdquo;</span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Componentes Técnicos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', margin: 0, borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
              Configuración & Entorno
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Versiones de Motores Editoriales</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <span className="badge" style={{ backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 700, padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', display: 'inline-block', alignSelf: 'flex-start' }}>
                    Motor Editorial &middot; Reglas v{EDITORIAL_ENGINE_VERSION.version} ({EDITORIAL_ENGINE_VERSION.ruleset})
                  </span>
                  <span className="badge" style={{ backgroundColor: '#f5f3ff', color: '#5b21b6', fontWeight: 700, padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', display: 'inline-block', alignSelf: 'flex-start' }}>
                    Progreso Editorial &middot; Reglas v{EDITORIAL_PROGRESS_VERSION.version} ({EDITORIAL_PROGRESS_VERSION.ruleset})
                  </span>
                  <span className="badge" style={{ backgroundColor: '#fff7ed', color: '#c2410c', fontWeight: 700, padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', display: 'inline-block', alignSelf: 'flex-start' }}>
                    Dashboard Editorial &middot; Reglas v{EDITORIAL_DASHBOARD_VERSION.version} ({EDITORIAL_DASHBOARD_VERSION.ruleset})
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Entorno de Ejecución</span>
                <strong style={{ fontSize: '0.95rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                  <HardDrive size={14} style={{ color: '#0284c7' }} />
                  {envName}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Última Actualización / Build</span>
                <strong style={{ fontSize: '0.95rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                  <Calendar size={14} style={{ color: '#0284c7' }} />
                  {APP_VERSION.releasedAt}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
          <ShieldCheck size={20} style={{ color: '#16a34a', flexShrink: 0, marginTop: '0.1rem' }} />
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: '1.4' }}>
            <strong>Trazabilidad y Versionado Oficial:</strong> Esta plataforma se gestiona siguiendo el esquema de Versionado Institucional de la Unión Vecinal Barrio YPF. Las decisiones técnicas de publicación y la elegibilidad automática están auditadas y versionadas de forma estricta.
          </p>
        </div>
      </div>
    </div>
  );
}
