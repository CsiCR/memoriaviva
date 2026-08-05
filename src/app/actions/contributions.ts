'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { mapStatusToCode } from '@/lib/editorial/editorialConstants';
import { evaluateContribution } from '@/lib/editorial/evaluateContribution';
import { SupabasePublicIdentityRepository } from '@/lib/public/slugs/repository';
import { PublicIdentityService } from '@/lib/public/slugs/service';
import { buildContributionSlugSource } from '@/lib/public/slugs/canonical-slug';

export async function updateContributionStatus(
  id: string,
  formData: FormData
) {
  const supabase = await createClient();

  // 1. Verificar autenticación de forma segura consultando al servidor Auth de Supabase
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('[ERRORES EDITORIAL] Error de autenticación del usuario:', authError?.message);
    return {
      success: false,
      editorialSaved: false,
      errorCode: 'SESSION_EXPIRED',
      message: 'Tu sesión venció. Volvé a iniciar sesión.'
    };
  }

  // 2. Verificar rol en profiles utilizando el cliente cookies-based del editor
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[ERRORES EDITORIAL] Error al obtener el perfil del usuario:', profileError.message);
  }

  if (!profile || !['admin', 'editor', 'validator', 'interviewer'].includes(profile.role)) {
    return {
      success: false,
      editorialSaved: false,
      errorCode: 'FORBIDDEN',
      message: 'No tenés permisos para realizar esta operación.'
    };
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
  const { data: currentContribution, error: contributionError } = await supabase
    .from('contributions')
    .select('contributor_id, authorization_level, credit_preference, consent_file_path, publication_status_option_id, title, description, consent_verified, consent_source, published_at, catalog_code')
    .eq('id', id)
    .maybeSingle();

  if (contributionError) {
    console.error('[ERRORES EDITORIAL] Error al obtener la contribución actual:', contributionError.message);
  }

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

  // Nuevos campos de la Capa Editorial y Publicación
  const editorialTitle = formData.get('editorial_title') as string;
  const editorialDescription = formData.get('editorial_description') as string;
  const editorialSummary = formData.get('editorial_summary') as string;
  const editorialContext = formData.get('editorial_context') as string;
  const editorialClassification = formData.get('editorial_classification') as string;
  const historicalValidationStatus = formData.get('historical_validation_status') as string;
  const historicalValidationNotes = formData.get('historical_validation_notes') as string;
  const publicationTitle = formData.get('publication_title') as string;
  const publicationExcerpt = formData.get('publication_excerpt') as string;
  const publicationLevel = formData.get('publication_level') as string;
  const publicationCredits = formData.get('publication_credits') as string;

  let activeIndicatorOptionIds: string[] = [];
  if (activeIndicatorOptionIdsRaw) {
    try {
      activeIndicatorOptionIds = JSON.parse(activeIndicatorOptionIdsRaw);
    } catch (e) {
      activeIndicatorOptionIds = [];
    }
  }

  // A. Obtener todas las opciones de estado de publicación para resolver códigos e IDs
  const { data: pubStatuses, error: pubStatusesError } = await supabase
    .from('select_options')
    .select('id, code, name')
    .eq('category', 'publication_status');

  if (pubStatusesError) {
    console.error('[ERRORES EDITORIAL] Error al obtener estados de publicación:', pubStatusesError.message);
  }

  const selectedPubStatus = pubStatuses?.find(opt => opt.id === publicationStatusOptionId);
  const selectedPubCode = selectedPubStatus?.code || 'not_evaluated';

  // B. Obtener archivos y metadata de indicadores del aporte para la evaluación server-side
  const { data: dbFiles } = await supabase
    .from('contribution_files')
    .select('id, file_name, file_size, file_role, processing_status')
    .eq('contribution_id', id);

  let activeIndicators: any[] = [];
  if (activeIndicatorOptionIds.length > 0) {
    const { data: dbOpts } = await supabase
      .from('select_options')
      .select('id, category, value, name, code, metadata')
      .in('id', activeIndicatorOptionIds);
    activeIndicators = dbOpts || [];
  }

  // C. Construir ContributionInput en memoria representando el estado final pretendido
  const targetContributionInput = {
    id,
    title: editorialTitle || currentContribution?.title || 'Aporte',
    description: editorialDescription || currentContribution?.description,
    consent_verified: consentVerified,
    authorization_level: authorizationLevel || currentContribution?.authorization_level,
    credit_preference: creditPreference || currentContribution?.credit_preference,
    consent_source: currentContribution?.consent_source,
    editorial_status: { code: mapStatusToCode(editorialStatus), name: editorialStatus },
    publication_status: { id: publicationStatusOptionId, code: selectedPubCode, name: selectedPubStatus?.name || null },
    files: dbFiles || [],
    active_indicators: activeIndicators
  };

  // D. Evaluar reglas de elegibilidad E1-E8
  const evaluation = evaluateContribution(targetContributionInput);

  let isPublicationRejected = false;
  let finalPublicationStatusOptionId = publicationStatusOptionId;

  if (selectedPubCode === 'published' && !evaluation.eligibleForPublication) {
    isPublicationRejected = true;
    // Revertir al estado de publicación previo
    const notEvaluatedId = pubStatuses?.find(opt => opt.code === 'not_evaluated')?.id || null;
    finalPublicationStatusOptionId = currentContribution?.publication_status_option_id || notEvaluatedId;
  }

  // Si es elegible e intentan publicar (o ya estaba publicado y se está guardando de nuevo):
  const isPublishing = selectedPubCode === 'published' && evaluation.eligibleForPublication;

  // Para la RPC, si vamos a publicar, le pasamos primero el estado anterior (o not_evaluated) para no publicar en la RPC inicial,
  // y luego lo publicaremos en la base de datos en el Paso 3 del orquestador.
  let rpcPublicationStatusOptionId = finalPublicationStatusOptionId;
  if (isPublishing) {
    const notEvaluatedId = pubStatuses?.find(opt => opt.code === 'not_evaluated')?.id || null;
    rpcPublicationStatusOptionId = currentContribution?.publication_status_option_id || notEvaluatedId;
  }

  // 3. Ejecutar actualización transaccional mediante la RPC (signature con 19 parámetros)
  console.info('[EXPEDIENTE][LOAD_PUBLICATION] Iniciando actualización transaccional de aporte', { contributionId: id, rpcPublicationStatusOptionId });
  let { error: rpcError } = await supabase.rpc('update_editorial_dimensions', {
    p_contribution_id: id,
    p_editorial_status: editorialStatus,
    p_publication_status_option_id: rpcPublicationStatusOptionId || null,
    p_publication_notes: publicationNotes || null,
    p_publication_scheduled_at: publicationScheduledAt || null,
    p_internal_notes: internalNotes || null,
    p_active_indicator_option_ids: activeIndicatorOptionIds,
    p_indicator_notes: indicatorNotes || null,
    p_editorial_title: editorialTitle || null,
    p_editorial_description: editorialDescription || null,
    p_editorial_summary: editorialSummary || null,
    p_editorial_context: editorialContext || null,
    p_editorial_classification: editorialClassification || null,
    p_historical_validation_status: historicalValidationStatus || null,
    p_historical_validation_notes: historicalValidationNotes || null,
    p_publication_title: publicationTitle || null,
    p_publication_excerpt: publicationExcerpt || null,
    p_publication_level: publicationLevel || null,
    p_publication_credits: publicationCredits || null
  });

  // Si la RPC con 19 parámetros no existe (PGRST202), intentamos el fallback con la versión anterior (8 parámetros)
  if (rpcError && rpcError.code === 'PGRST202') {
    console.warn('[EXPEDIENTE][SAVE_CONTRIBUTION_RPC_FALLBACK] La firma de RPC de 19 parámetros no se encuentra en la base de datos (migración 20260725000000 pendiente). Ejecutando fallback con 8 parámetros.');
    const fallbackRes = await supabase.rpc('update_editorial_dimensions', {
      p_contribution_id: id,
      p_editorial_status: editorialStatus,
      p_publication_status_option_id: rpcPublicationStatusOptionId || null,
      p_publication_notes: publicationNotes || null,
      p_publication_scheduled_at: publicationScheduledAt || null,
      p_internal_notes: internalNotes || null,
      p_active_indicator_option_ids: activeIndicatorOptionIds,
      p_indicator_notes: indicatorNotes || null
    } as any);
    
    rpcError = fallbackRes.error;
  }

  if (rpcError) {
    console.error('[EXPEDIENTE][SAVE_CONTRIBUTION_ERROR]', {
      contributionId: id,
      code: rpcError.code,
      message: rpcError.message,
      details: rpcError.details,
      hint: rpcError.hint,
    });
    throw new Error('No fue posible guardar los cambios editoriales en la base de datos.');
  }

  console.info('[EXPEDIENTE][SAVE_CONTRIBUTION_SUCCESS]', { contributionId: id });

  // Instanciamos el cliente administrativo servidor con clave service_role, capaz de omitir RLS,
  // únicamente después de haber verificado y garantizado el rol editorial del usuario.
  const adminSupabase = createAdminClient();
  const identityRepo = new SupabasePublicIdentityRepository(adminSupabase);
  const identityService = new PublicIdentityService(identityRepo);

  // Sincronizar estado de identidad pública y slugs en portal público
  if (isPublishing) {
    const rawTitle = publicationTitle || editorialTitle || currentContribution?.title || 'Aporte';
    // buildContributionSlugSource construye la cadena "<título>-<código|id>" que el servicio
    // de identidad recibirá como rawValue para normalizar. Es la ÚNICA fuente de generación
    // de slugs de contribuciones en todo el sistema (ver canonical-slug.ts).
    const slugTitle = buildContributionSlugSource(
      rawTitle,
      currentContribution?.catalog_code ?? null,
      id
    );
    try {
      const identity = await identityService.findByEntity('contribution', id);
      if (!identity) {
        // Registrar nueva identidad en estado published
        await identityService.registerIdentity(id, 'contribution', slugTitle, 'published', {
          userId: user.id,
          source: 'editor',
          note: 'Publicación inicial de aporte'
        });
      } else {
        // Actualizar estado e idempotencia de slug basándose en el título
        await identityService.updateStatus(id, 'contribution', 'published');
        await identityService.updateTitle(id, 'contribution', slugTitle, {
          userId: user.id,
          source: 'editor',
          note: `Título de publicación cambiado a ${rawTitle}`
        });
      }

      // Paso 3: Activar Publicación en base de datos
      const { error: finalUpdateError } = await supabase
        .from('contributions')
        .update({
          publication_status_option_id: publicationStatusOptionId,
          published_at: currentContribution?.published_at || new Date().toISOString(),
          published_by_user_id: user.id
        })
        .eq('id', id);

      if (finalUpdateError) {
        console.error('[ERRORES EDITORIAL] Error al activar publicación en base de datos:', finalUpdateError.message);
        throw finalUpdateError;
      }
    } catch (error: any) {
      console.error('[ERRORES EDITORIAL] Fallo en la orquestación de publicación:', error.message);
      // Compensación: revertir el estado de la identidad pública a 'unpublished' usando el cliente administrativo
      try {
        const identity = await identityService.findByEntity('contribution', id);
        if (identity) {
          await identityService.updateStatus(id, 'contribution', 'unpublished');
        }
      } catch (compensateError: any) {
        console.error('[ERRORES EDITORIAL] Fallo crítico al ejecutar compensación:', compensateError.message);
      }
      
      // Retornar respuesta estructurada informando que los datos editoriales fueron guardados
      // pero la publicación en el portal público falló
      return {
        success: false,
        editorialSaved: true,
        publicationSucceeded: false,
        errorCode: "PUBLIC_IDENTITY_SYNC_FAILED",
        message: 'Los cambios editoriales fueron guardados, pero no pudo completarse la sincronización con el portal público.'
      };
    }
  } else if (selectedPubCode !== 'published') {
    // Si no está publicado, nos aseguramos de que el estado de la identidad sea 'unpublished' usando el cliente administrativo
    try {
      const identity = await identityService.findByEntity('contribution', id);
      if (identity) {
        await identityService.updateStatus(id, 'contribution', 'unpublished');
      }
    } catch (err: any) {
      console.error('[ERRORES EDITORIAL] Fallo en la despublicación de identidad pública:', err.message);
      return {
        success: false,
        editorialSaved: true,
        publicationSucceeded: false,
        errorCode: "PUBLIC_IDENTITY_SYNC_FAILED",
        message: 'Los cambios editoriales fueron guardados, pero ocurrió una falla al despublicar la identidad en el portal.'
      };
    }
  }

  // 4. Si se subió un nuevo archivo de consentimiento, procesarlo
  const fileUploaded = consentFile && consentFile.size > 0;
  if (fileUploaded && currentContribution) {
    const consentTextVersion = `Revalidación manual de Consentimiento con archivo físico`;
    // Actualizar la ruta del archivo de consentimiento en la contribución
    const { error: updateError } = await supabase
      .from('contributions')
      .update({
        consent_file_path: newConsentFilePath,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('[EXPEDIENTE][SAVE_CONSENT_FILE_PATH_ERROR]', {
        contributionId: id,
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      });
      throw new Error('Error al actualizar la ruta del archivo de consentimiento.');
    }

    const { error: insertError } = await supabase
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

    if (insertError) {
      console.error('[EXPEDIENTE][SAVE_CONSENT_RECORD_ERROR]', {
        contributionId: id,
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      throw new Error('Error al registrar el consentimiento.');
    }
  }

  // 5. Revalidar la ruta para mostrar los cambios actualizados
  revalidatePath(`/admin/aportes/${id}`);
  revalidatePath('/admin/aportes');
  revalidatePath('/admin');

  // Revalidar rutas públicas
  revalidatePath('/contributions');
  try {
    const identity = await identityService.findByEntity('contribution', id);
    if (identity) {
      const canonicalSlug = await identityRepo.getCanonicalSlug(identity.id);
      if (canonicalSlug) {
        revalidatePath(`/contributions/${canonicalSlug}`);
      }
    }
  } catch (revalidateErr) {
    console.error('[ERRORES EDITORIAL] Error al revalidar ruta pública:', revalidateErr);
  }

  if (isPublicationRejected) {
    const retainedOption = pubStatuses?.find(opt => opt.id === finalPublicationStatusOptionId) || {
      id: finalPublicationStatusOptionId,
      code: 'not_evaluated',
      name: 'No evaluado'
    };
    return {
      success: false,
      editorialSaved: true,
      publicationRejected: true,
      missingRequirements: evaluation.missingRequirements,
      retainedPublicationStatus: {
        id: retainedOption.id,
        code: retainedOption.code || 'not_evaluated',
        name: retainedOption.name
      }
    };
  }

  return { success: true };
}

