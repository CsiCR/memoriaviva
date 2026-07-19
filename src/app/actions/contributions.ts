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

  const publicationStatusOptionId = formData.get('publication_status_option_id') as string;
  const publicationNotes = formData.get('publication_notes') as string;
  const publicationScheduledAt = formData.get('publication_scheduled_at') as string;
  const activeIndicatorOptionIdsRaw = formData.get('active_indicator_option_ids') as string;
  const indicatorNotes = formData.get('indicator_notes') as string;

  let activeIndicatorOptionIds: string[] = [];
  if (activeIndicatorOptionIdsRaw) {
    try {
      activeIndicatorOptionIds = JSON.parse(activeIndicatorOptionIdsRaw);
    } catch (e) {
      activeIndicatorOptionIds = [];
    }
  }

  // 3. Ejecutar actualización transaccional mediante la RPC
  const { error: rpcError } = await supabase.rpc('update_editorial_dimensions', {
    p_contribution_id: id,
    p_editorial_status: editorialStatus,
    p_publication_status_option_id: publicationStatusOptionId || null,
    p_publication_notes: publicationNotes || null,
    p_publication_scheduled_at: publicationScheduledAt || null,
    p_internal_notes: internalNotes || null,
    p_active_indicator_option_ids: activeIndicatorOptionIds,
    p_indicator_notes: indicatorNotes || null
  });

  if (rpcError) {
    console.error('Error al ejecutar RPC update_editorial_dimensions:', rpcError);
    throw new Error(rpcError.message || 'Error al guardar los cambios editoriales.');
  }

  // 4. Si se subió un nuevo archivo de consentimiento, procesarlo
  const fileUploaded = consentFile && consentFile.size > 0;
  if (fileUploaded && currentContribution) {
    const consentTextVersion = `Revalidación manual de Consentimiento con archivo físico`;
    // Actualizar la ruta del archivo de consentimiento en la contribución
    await supabase
      .from('contributions')
      .update({
        consent_file_path: newConsentFilePath,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    await supabase
      .from('consent_records')
      .insert({
        contributor_id: currentContribution.contributor_id,
        contribution_id: id,
        authorization_level: currentContribution.authorization_level,
        credit_preference: currentContribution.credit_preference,
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
