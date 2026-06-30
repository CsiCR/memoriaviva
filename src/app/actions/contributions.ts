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
  
  // Nuevos campos de consentimiento
  const authorizationLevel = formData.get('authorization_level') as string;
  const creditPreference = formData.get('credit_preference') as string;
  const consentFile = formData.get('consent_file') as File | null;

  if (!editorialStatus) {
    throw new Error('El estado editorial es requerido.');
  }

  // 1. Obtener datos actuales del aporte para ver si cambiaron los términos de cesión
  const { data: currentContribution } = await supabase
    .from('contributions')
    .select('contributor_id, authorization_level, credit_preference, consent_file_path')
    .eq('id', id)
    .single();

  let newConsentFilePath = currentContribution?.consent_file_path || null;

  // 2. Si se subió un nuevo archivo de consentimiento, procesarlo
  if (consentFile && consentFile.size > 0) {
    const extension = consentFile.name.split('.').pop()?.toLowerCase();
    const uniqueFileName = `${Date.now()}_consent_renew_${Math.random().toString(36).substring(2, 9)}.${extension}`;
    const filePath = `consents/${id}/${uniqueFileName}`;
    const buffer = Buffer.from(await consentFile.arrayBuffer());

    // Usar cliente Admin para asegurar permisos de subida en storage privado
    const { createAdminClient } = require('@/utils/supabase/admin');
    const adminClient = createAdminClient();
    const { error: uploadError } = await adminClient.storage
      .from('historical-uploads')
      .upload(filePath, buffer, {
        contentType: consentFile.type,
        duplex: 'half'
      });

    if (uploadError) {
      console.error('Error al subir nueva firma de consentimiento:', uploadError);
      throw new Error('Error al subir el nuevo archivo de autorización.');
    }

    newConsentFilePath = filePath;
  }

  // 3. Ejecutar actualización del Aporte
  const { error } = await supabase
    .from('contributions')
    .update({
      editorial_status: editorialStatus,
      internal_notes: internalNotes || null,
      consent_verified: consentVerified,
      authorization_level: authorizationLevel || currentContribution?.authorization_level,
      credit_preference: creditPreference || currentContribution?.credit_preference,
      consent_file_path: newConsentFilePath,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('Error al actualizar aporte en Server Action:', error);
    throw new Error('Error al guardar los cambios en la base de datos.');
  }

  // 4. Si cambió el nivel, los créditos o se subió una nueva firma, escribir en consent_records (Historial)
  const levelChanged = authorizationLevel && currentContribution && currentContribution.authorization_level !== authorizationLevel;
  const creditChanged = creditPreference && currentContribution && currentContribution.credit_preference !== creditPreference;
  const fileUploaded = consentFile && consentFile.size > 0;

  if ((levelChanged || creditChanged || fileUploaded) && currentContribution) {
    const consentTextVersion = `Modificación de Consentimiento por Editor. Caso: Revalidación manual${fileUploaded ? ' con archivo' : ''}`;
    
    await supabase
      .from('consent_records')
      .insert({
        contributor_id: currentContribution.contributor_id,
        contribution_id: id,
        authorization_level: authorizationLevel || currentContribution.authorization_level,
        credit_preference: creditPreference || currentContribution.credit_preference,
        owns_or_has_permission: true,
        accepts_cataloging: true,
        consent_text_version: consentTextVersion,
        consent_file_path: newConsentFilePath
      });
  }

  // 5. Revalidar la ruta para mostrar los cambios actualizados
  revalidatePath(`/admin/aportes/${id}`);
  revalidatePath('/admin/aportes');
  revalidatePath('/admin');

  return { success: true };
}
