'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateContributionStatus(
  id: string,
  formData: FormData
) {
  const supabase = await createClient();

  // 1. Verificar autenticación
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No autorizado.');
  }

  // 2. Verificar rol en profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!profile || !['admin', 'editor', 'validator', 'interviewer'].includes(profile.role)) {
    throw new Error('No tienes permisos suficientes.');
  }

  const editorialStatus = formData.get('editorial_status') as string;
  const internalNotes = formData.get('internal_notes') as string;
  const consentVerified = formData.get('consent_verified') === 'true';

  if (!editorialStatus) {
    throw new Error('El estado editorial es requerido.');
  }

  // 3. Ejecutar actualización (RLS controlará que estemos autenticados)
  const { error } = await supabase
    .from('contributions')
    .update({
      editorial_status: editorialStatus,
      internal_notes: internalNotes || null,
      consent_verified: consentVerified,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('Error al actualizar aporte en Server Action:', error);
    throw new Error('Error al guardar los cambios en la base de datos.');
  }

  // 4. Revalidar la ruta para mostrar los cambios actualizados
  revalidatePath(`/admin/aportes/${id}`);
  revalidatePath('/admin/aportes');
  revalidatePath('/admin');

  return { success: true };
}
