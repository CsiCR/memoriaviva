import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getCategoryFromMimeOrExtension } from '@/utils/uploadConfig';
import { validateStorageFileMagicBytes } from '@/utils/magicBytes';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contributor, contribution, consent, files, oversized_files } = body;

    // 1. Validaciones de Datos Básicos
    if (!contributor || !contribution || !consent) {
      return NextResponse.json({ error: 'Faltan secciones obligatorias en la solicitud.' }, { status: 400 });
    }

    const { dni, full_name, phone, email, relation_to_city, neighborhood_or_institution } = contributor;
    // email ya no es obligatorio en la validación (Alcance Acotado)
    if (!dni || !full_name || !phone || !relation_to_city || !neighborhood_or_institution) {
      return NextResponse.json({ error: 'Faltan datos obligatorios del aportante.' }, { status: 400 });
    }

    const { title, contribution_type, description, related_place, authorization_level, credit_preference } = contribution;
    if (!title || !contribution_type || !description || !related_place || !authorization_level || !credit_preference) {
      return NextResponse.json({ error: 'Faltan datos obligatorios del aporte.' }, { status: 400 });
    }

    const { owns_or_has_permission, accepts_cataloging } = consent;
    if (!owns_or_has_permission || !accepts_cataloging) {
      return NextResponse.json({ error: 'Debes aceptar las declaraciones de consentimiento obligatorias.' }, { status: 400 });
    }

    // Si no es un testimonio escrito, requiere archivos vinculados o al menos un aviso de archivo grande
    const isTextOnly = contribution_type === 'Testimonio escrito' || contribution_type === 'Solo texto';
    const totalFilesCount = (files?.length || 0) + (oversized_files?.length || 0);
    if (!isTextOnly && totalFilesCount === 0) {
      return NextResponse.json({ error: 'Este tipo de aporte requiere que adjuntes al menos un archivo histórico o informes archivos grandes.' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const filesMetadataToLink = [];

    // 2. Validar cada sesión de carga y magic bytes
    if (files && files.length > 0) {
      for (const fileItem of files) {
        const { upload_uuid } = fileItem;

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

        // Validaciones de seguridad en el backend (Requisito 10)
        if (session.status !== 'uploaded') {
          return NextResponse.json({ error: 'Uno de los archivos no ha finalizado su carga correctamente.' }, { status: 400 });
        }

        if (new Date(session.expires_at) < new Date()) {
          return NextResponse.json({ error: 'La sesión de carga del archivo ha expirado. Por favor, intente subirlo nuevamente.' }, { status: 400 });
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
          console.warn(`Archivo ${session.storage_path} falló validación de magic bytes: ${magicCheck.error}`);
          
          // Marcar la sesión de carga como quarantined en la base de datos
          await adminSupabase
            .from('upload_sessions')
            .update({ status: 'quarantined', updated_at: new Date().toISOString() })
            .eq('upload_uuid', upload_uuid);

          return NextResponse.json({ 
            error: `El archivo ${session.storage_path.split('/').pop()} no pasó el control de integridad de formato: ${magicCheck.error}` 
          }, { status: 400 });
        }

        // Armar el metadato del archivo para enviarlo a la transacción RPC
        filesMetadataToLink.push({
          upload_uuid,
          storage_path: session.storage_path,
          mime_type: session.mime_type,
          size_bytes: session.size_bytes,
          file_role: 'original', // Forzado a original por defecto en flujo público (Requisito 2)
          original_filename: session.storage_path.split('/').pop() || 'archivo'
        });
      }
    }

    // 3. Ejecutar transacción atómica en PostgreSQL mediante la función RPC
    const { data: rpcResult, error: rpcError } = await adminSupabase.rpc(
      'create_contribution_with_files',
      {
        p_contributor: contributor,
        p_contribution: contribution,
        p_consent: consent,
        p_files: filesMetadataToLink,
        p_user_id: null, // Flujo público
        p_oversized_files: oversized_files || []
      }
    );

    if (rpcError || !rpcResult?.success) {
      console.error('Error al ejecutar RPC create_contribution_with_files:', rpcError);
      return NextResponse.json({ 
        error: 'Ocurrió un error al guardar el aporte en el sistema. Se revirtieron todos los cambios.' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      contributionId: rpcResult.contribution_id,
      contributorId: rpcResult.contributor_id
    });

  } catch (error: any) {
    console.error('Error interno del servidor en api/contribute:', error);
    return NextResponse.json({ error: 'Error interno del servidor al procesar el aporte.' }, { status: 500 });
  }
}
