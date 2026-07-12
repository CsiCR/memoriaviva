import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getBuenosAiresYear, createBuenosAiresDate } from '@/utils/date';
import { getCategoryFromMimeOrExtension } from '@/utils/uploadConfig';
import { validateStorageFileMagicBytes } from '@/utils/magicBytes';

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticación y rol del operador
    const userSupabase = await createClient();
    const { data: { user } } = await userSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado. Inicie sesión.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await userSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !['admin', 'editor', 'validator', 'interviewer'].includes(profile.role)) {
      return NextResponse.json({ error: 'No autorizado para realizar esta acción.' }, { status: 403 });
    }

    // 2. Parsear JSON del cuerpo
    const body = await req.json();
    const { 
      contributor, 
      contribution, 
      consent, 
      files, 
      consent_upload_uuid, 
      agreement_upload_uuid,
      institutional_agreement_id,
      new_agreement_name,
      new_agreement_institution,
      oversized_files
    } = body;

    if (!contributor || !contribution || !consent) {
      return NextResponse.json({ error: 'Faltan secciones obligatorias en la solicitud.' }, { status: 400 });
    }

    let { dni, full_name, phone = '—', email, relation_to_city, neighborhood_or_institution } = contributor;
    if (email !== undefined) {
      email = email?.trim() || null;
    } else {
      email = null;
    }

    const { title, contribution_type, description, related_place, authorization_level, credit_preference, consent_source, consent_reference, approximate_decade, mentioned_people, related_institution, historical_context } = contribution;

    if (!dni || !full_name || !relation_to_city || !neighborhood_or_institution) {
      return NextResponse.json({ error: 'Faltan datos obligatorios del aportante.' }, { status: 400 });
    }

    if (!title || !contribution_type || !description || !related_place) {
      return NextResponse.json({ error: 'Faltan datos obligatorios del aporte.' }, { status: 400 });
    }

    const isTextOnly = contribution_type === 'Testimonio escrito' || contribution_type === 'Solo texto';
    const totalFilesCount = (files?.length || 0) + (oversized_files?.length || 0);
    if (!isTextOnly && totalFilesCount === 0) {
      return NextResponse.json({ error: 'Este tipo de aporte requiere que adjuntes al menos un archivo histórico o informes archivos grandes.' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const filesToLink = [];
    let finalConsentFilePath = null;
    let finalAgreementId = null;
    let refValue = consent_reference;

    // 3. Procesar Respaldo Legal según el caso
    if (consent_source === 'signed_paper') {
      // Caso 2: Planilla Firmada es OBLIGATORIA
      if (!consent_upload_uuid) {
        return NextResponse.json({ error: 'Debes subir la foto o PDF de la planilla de consentimiento firmada por el aportante.' }, { status: 400 });
      }

      // Validar sesión de planilla firmada
      const { data: session, error: sessionErr } = await adminSupabase
        .from('upload_sessions')
        .select('*')
        .eq('upload_uuid', consent_upload_uuid)
        .single();

      if (sessionErr || !session || session.status !== 'uploaded') {
        return NextResponse.json({ error: 'No se encontró la carga de la planilla firmada o no se completó.' }, { status: 400 });
      }

      const expectedCategory = getCategoryFromMimeOrExtension(session.mime_type, session.storage_path);
      if (expectedCategory !== 'image' && expectedCategory !== 'document') {
        return NextResponse.json({ error: 'El archivo de la planilla firmada debe ser una imagen o PDF.' }, { status: 400 });
      }

      // Validar magic bytes de la planilla
      const magicCheck = await validateStorageFileMagicBytes(adminSupabase, session.storage_path, expectedCategory);
      if (!magicCheck.isValid) {
        return NextResponse.json({ error: `La planilla firmada no pasó el control de formato: ${magicCheck.error}` }, { status: 400 });
      }

      finalConsentFilePath = session.storage_path;

      // Agregar a la lista de archivos a vincular como soporte legal
      filesToLink.push({
        upload_uuid: consent_upload_uuid,
        storage_path: session.storage_path,
        mime_type: session.mime_type,
        size_bytes: session.size_bytes,
        file_role: 'legal_support',
        original_filename: session.storage_path.split('/').pop() || 'planilla_consentimiento'
      });
    } 
    else if (consent_source === 'institutional_agreement') {
      // Caso 3: Convenio Institucional
      if (!institutional_agreement_id) {
        return NextResponse.json({ error: 'Debes seleccionar un convenio institucional o registrar uno nuevo.' }, { status: 400 });
      }

      if (institutional_agreement_id === 'new') {
        // Registrar un NUEVO convenio
        if (!new_agreement_name || !new_agreement_institution || !agreement_upload_uuid) {
          return NextResponse.json({ error: 'Faltan datos obligatorios para registrar el nuevo convenio institucional.' }, { status: 400 });
        }

        const { data: session, error: sessionErr } = await adminSupabase
          .from('upload_sessions')
          .select('*')
          .eq('upload_uuid', agreement_upload_uuid)
          .single();

        if (sessionErr || !session || session.status !== 'uploaded') {
          return NextResponse.json({ error: 'No se encontró la carga del PDF de convenio institucional.' }, { status: 400 });
        }

        const expectedCategory = getCategoryFromMimeOrExtension(session.mime_type, session.storage_path);
        if (expectedCategory !== 'document') {
          return NextResponse.json({ error: 'El archivo del convenio institucional debe ser un documento PDF.' }, { status: 400 });
        }

        // Validar magic bytes del PDF de convenio
        const magicCheck = await validateStorageFileMagicBytes(adminSupabase, session.storage_path, 'document');
        if (!magicCheck.isValid) {
          return NextResponse.json({ error: `El documento de convenio no pasó el control de formato: ${magicCheck.error}` }, { status: 400 });
        }

        // Crear registro en la tabla de convenios
        const { data: agreementData, error: agreementError } = await adminSupabase
          .from('institutional_agreements')
          .insert({
            name: new_agreement_name,
            institution: new_agreement_institution,
            file_path: session.storage_path
          })
          .select()
          .single();

        if (agreementError) {
          console.error('Error al registrar nuevo convenio:', agreementError);
          return NextResponse.json({ error: 'Error al registrar el nuevo convenio institucional.' }, { status: 500 });
        }

        finalAgreementId = agreementData.id;
        finalConsentFilePath = session.storage_path;
        refValue = new_agreement_name;

        // Vincular archivo de convenio como soporte legal
        filesToLink.push({
          upload_uuid: agreement_upload_uuid,
          storage_path: session.storage_path,
          mime_type: session.mime_type,
          size_bytes: session.size_bytes,
          file_role: 'legal_support',
          original_filename: session.storage_path.split('/').pop() || 'convenio_institucional'
        });
      } else {
        // Utilizar convenio EXISTENTE
        const { data: agreementData, error: agreementError } = await adminSupabase
          .from('institutional_agreements')
          .select('name, file_path')
          .eq('id', institutional_agreement_id)
          .single();

        if (agreementError || !agreementData) {
          console.error('Error al buscar convenio existente:', agreementError);
          return NextResponse.json({ error: 'El convenio institucional seleccionado no es válido.' }, { status: 400 });
        }

        finalAgreementId = institutional_agreement_id;
        finalConsentFilePath = agreementData.file_path;
        refValue = agreementData.name;
      }
    } else {
      // Caso 1: Web Form
      refValue = 'Formulario Web';
      finalConsentFilePath = null;
      finalAgreementId = null;
    }

    // 4. Procesar y Validar Archivos Históricos
    if (files && files.length > 0) {
      for (const fileItem of files) {
        const { upload_uuid, file_role = 'original' } = fileItem;

        if (!upload_uuid) {
          return NextResponse.json({ error: 'Falta el identificador de sesión de carga en uno de los archivos.' }, { status: 400 });
        }

        // Obtener detalles de la sesión desde la base de datos
        const { data: session, error: sessionError } = await adminSupabase
          .from('upload_sessions')
          .select('*')
          .eq('upload_uuid', upload_uuid)
          .single();

        if (sessionError || !session) {
          return NextResponse.json({ error: 'No se encontró la sesión de carga para uno de los archivos.' }, { status: 400 });
        }

        if (session.status !== 'uploaded') {
          return NextResponse.json({ error: 'Uno de los archivos no ha finalizado su carga correctamente.' }, { status: 400 });
        }

        if (new Date(session.expires_at) < new Date()) {
          return NextResponse.json({ error: 'La sesión de carga de uno de los archivos ha expirado.' }, { status: 400 });
        }

        if (session.linked_contribution_id) {
          return NextResponse.json({ error: 'Uno de los archivos ya está vinculado a otra contribución.' }, { status: 400 });
        }

        const expectedCategory = getCategoryFromMimeOrExtension(session.mime_type, session.storage_path);
        if (!expectedCategory) {
          return NextResponse.json({ error: 'Categoría de archivo no admitida para vinculación.' }, { status: 400 });
        }

        // Validar magic bytes (sin descargar el archivo completo)
        const magicCheck = await validateStorageFileMagicBytes(adminSupabase, session.storage_path, expectedCategory);
        if (!magicCheck.isValid) {
          console.warn(`Archivo admin ${session.storage_path} falló validación magic bytes: ${magicCheck.error}`);
          
          await adminSupabase
            .from('upload_sessions')
            .update({ status: 'quarantined', updated_at: new Date().toISOString() })
            .eq('upload_uuid', upload_uuid);

          return NextResponse.json({ 
            error: `El archivo ${session.storage_path.split('/').pop()} no pasó el control de integridad de formato: ${magicCheck.error}` 
          }, { status: 400 });
        }

        // Armar metadatos para la transacción RPC
        filesToLink.push({
          upload_uuid,
          storage_path: session.storage_path,
          mime_type: session.mime_type,
          size_bytes: session.size_bytes,
          file_role, // Rol asignado por el administrador
          original_filename: session.storage_path.split('/').pop() || 'archivo_historico'
        });
      }
    }

    // 5. Calcular Catalog Code
    const yearVal = getBuenosAiresYear();
    const typeCodeMap: Record<string, string> = {
      'Testimonio escrito': 'TXT',
      'Fotografía': 'FOT',
      'Documento': 'DOC',
      'Audio': 'AUD',
      'Video': 'VID'
    };
    const typeCode = typeCodeMap[contribution_type] || 'GEN';
    
    const startOfYear = createBuenosAiresDate(yearVal, 0, 1, 0, 0, 0, 0);
    const endOfYear = createBuenosAiresDate(yearVal + 1, 0, 1, 0, 0, 0, 0);
    
    const { count } = await adminSupabase
      .from('contributions')
      .select('*', { count: 'exact', head: true })
      .eq('contribution_type', contribution_type)
      .gte('created_at', startOfYear.toISOString())
      .lt('created_at', endOfYear.toISOString());

    const nextNum = (count || 0) + 1;
    const finalCatalogCode = `MV-${typeCode}-${yearVal}-${String(nextNum).padStart(4, '0')}`;

    // Si es planilla firmada y la referencia está vacía, hacerla igual a la signatura
    if (consent_source === 'signed_paper' && (!refValue || refValue.trim() === '')) {
      refValue = finalCatalogCode;
    }

    // 6. Preparar payloads para el RPC
    const contributorPayload = {
      dni,
      full_name,
      phone,
      email,
      relation_to_city,
      neighborhood_or_institution,
      comments: contributor.comments || '',
      allow_contact: contributor.allow_contact
    };

    const contributionPayload = {
      title,
      contribution_type,
      description,
      exact_date: contribution.exact_date || '',
      approximate_decade,
      related_place,
      mentioned_people,
      related_institution,
      historical_context,
      authorization_level,
      credit_preference,
      consent_reference: refValue || null,
      consent_file_path: finalConsentFilePath,
      consent_verified: false,
      catalog_code: finalCatalogCode,
      consent_source,
      institutional_agreement_id: finalAgreementId
    };

    const consentPayload = {
      owns_or_has_permission: consent.owns_or_has_permission,
      accepts_cataloging: consent.accepts_cataloging,
      consent_text_version: consent.consent_text_version || `Carga Administrativa - Caso: ${consent_source}`
    };

    // 7. Ejecutar transacción atómica RPC en la base de datos
    const { data: rpcResult, error: rpcError } = await adminSupabase.rpc(
      'create_contribution_with_files',
      {
        p_contributor: contributorPayload,
        p_contribution: contributionPayload,
        p_consent: consentPayload,
        p_files: filesToLink,
        p_user_id: user.id, // Flujo administrativo con ID del operador
        p_oversized_files: oversized_files || []
      }
    );

    if (rpcError || !rpcResult?.success) {
      console.error('Error al ejecutar RPC create_contribution_with_files (admin):', rpcError);
      return NextResponse.json({ 
        error: `Error al guardar el aporte en el sistema: ${rpcError?.message || 'Rollback de la transacción ejecutado.'}` 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      contributionId: rpcResult.contribution_id,
      contributorId: rpcResult.contributor_id,
      catalogCode: finalCatalogCode
    });

  } catch (error: any) {
    console.error('Error interno en api/admin/contribute:', error);
    return NextResponse.json({ error: 'Error interno del servidor al procesar el aporte administrativo.' }, { status: 500 });
  }
}
