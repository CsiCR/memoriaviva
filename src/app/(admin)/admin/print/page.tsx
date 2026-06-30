import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import PrintFormClient from './PrintFormClient';

export const revalidate = 0; // Evitar caché

export default async function PrintPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  // Si no está logueado, redirigir al login administrativo
  if (!session) {
    redirect('/admin/login');
  }

  // Verificar que tenga un perfil válido
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!profile || !['admin', 'editor', 'validator', 'interviewer'].includes(profile.role)) {
    redirect('/admin/login?error=unauthorized');
  }

  return <PrintFormClient />;
}
