import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { signOut } from '@/app/actions/auth';
import { LayoutDashboard, FileText, Users, LogOut, BookOpen, User } from 'lucide-react';

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // 1. Obtener sesión
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/admin/login');
  }

  // 2. Obtener rol en profiles
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', session.user.id)
    .single();

  if (error || !profile) {
    console.log('Detalle del error de perfil:', {
      errorCode: error?.code,
      errorMessage: error?.message,
      errorDetails: error?.details,
      userId: session.user.id
    });
    // Cerrar sesión si hay una inconsistencia
    await supabase.auth.signOut();
    redirect('/admin/login?error=unauthorized');
  }

  const validRoles = ['admin', 'editor', 'validator', 'interviewer'];
  if (!validRoles.includes(profile.role)) {
    await supabase.auth.signOut();
    redirect('/admin/login?error=unauthorized');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      
      {/* Sidebar de Administración */}
      <aside style={{
        width: '260px',
        backgroundColor: '#1e293b',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #334155'
      }}>
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <img src="/icon-192.png" alt="Logo Cerro Pico Truncado" style={{ height: '36px', width: 'auto', borderRadius: '4px' }} />
          <div>
            <h2 style={{ fontSize: '1rem', color: '#f8fafc', margin: 0, fontWeight: 700 }}>Panel Editorial</h2>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Memoria Viva</span>
          </div>
        </div>

        {/* Info Usuario */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #334155',
          backgroundColor: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            backgroundColor: '#334155',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <User size={16} style={{ color: '#cbd5e1' }} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.full_name}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#38bdf8', textTransform: 'capitalize' }}>
              {profile.role === 'validator' ? 'Validador Histórico' : profile.role === 'interviewer' ? 'Entrevistador' : profile.role}
            </div>
          </div>
        </div>

        {/* Navegación Sidebar */}
        <nav style={{ padding: '1.5rem 1rem', flexGrow: 1 }}>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>
              <Link href="/admin" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                color: '#cbd5e1',
                fontSize: '0.9rem',
                fontWeight: 500
              }}
              className="admin-sidebar-link">
                <LayoutDashboard size={18} /> Dashboard
              </Link>
            </li>
            <li>
              <Link href="/admin/aportes" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                color: '#cbd5e1',
                fontSize: '0.9rem',
                fontWeight: 500
              }}
              className="admin-sidebar-link">
                <FileText size={18} /> Aportes Recibidos
              </Link>
            </li>
            <li>
              <Link href="/admin/aportantes" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                color: '#cbd5e1',
                fontSize: '0.9rem',
                fontWeight: 500
              }}
              className="admin-sidebar-link">
                <Users size={18} /> Aportantes
              </Link>
            </li>
          </ul>
        </nav>

        {/* Pie Sidebar / Logout */}
        <div style={{ padding: '1rem', borderTop: '1px solid #334155' }}>
          <form action={signOut}>
            <button type="submit" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#cbd5e1',
              color: '#0f172a',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}>
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main style={{ flexGrow: 1, padding: '2rem', overflowY: 'auto', maxHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}
