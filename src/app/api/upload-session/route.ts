import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getCategoryFromMimeOrExtension, getMaxSizeForCategory, MAX_FILES_PER_CONTRIBUTION } from '@/utils/uploadConfig';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileName, fileSize, mimeType, fileRole = 'original' } = body;

    if (!fileName || !fileSize || !mimeType) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (fileName, fileSize, mimeType).' }, { status: 400 });
    }

    // 1. Validar Tipo y Categoría de Archivo
    const category = getCategoryFromMimeOrExtension(mimeType, fileName);
    if (!category) {
      return NextResponse.json({
        error: 'El formato de archivo no está permitido. Formatos permitidos: JPG, PNG, WEBP, PDF, DOC, DOCX, MP3, WAV, M4A, MP4, MOV.'
      }, { status: 400 });
    }

    // 2. Validar tamaño máximo permitido (respetando límite de bucket 50MB)
    const maxSize = getMaxSizeForCategory(category);
    if (fileSize > maxSize) {
      const sizeInMB = Math.round(maxSize / (1024 * 1024));
      return NextResponse.json({
        error: `El archivo supera el límite de tamaño permitido para su categoría (${sizeInMB} MB).`
      }, { status: 400 });
    }

    // 3. Determinar autenticación y origen de la carga (Seguridad)
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    
    let uploadSource: 'web_form' | 'admin_panel' = 'web_form';
    let authorizedRole = 'original';

    if (user) {
      // Verificar rol del perfil
      const { data: profile } = await userClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profile && ['admin', 'editor', 'validator', 'interviewer'].includes(profile.role)) {
        uploadSource = 'admin_panel';
        // Asignar el rol solicitado si es válido
        if (['original', 'restored', 'derivative', 'legal_support'].includes(fileRole)) {
          authorizedRole = fileRole;
        }
      }
    }

    // En el flujo público, siempre forzar 'original'
    if (uploadSource === 'web_form') {
      authorizedRole = 'original';
    }

    // 4. Generar UUIDs y ruta de almacenamiento no predecible
    const uploadUuid = crypto.randomUUID();
    const fileUuid = crypto.randomUUID();
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    // temporary/{upload_uuid}/{file_uuid}.{extension}
    const storagePath = `temporary/${uploadUuid}/${fileUuid}.${extension}`;

    // 5. Generar signed upload URL
    const adminSupabase = createAdminClient();
    const { data: signedData, error: signedError } = await adminSupabase.storage
      .from('historical-uploads')
      .createSignedUploadUrl(storagePath);

    if (signedError || !signedData) {
      console.error('Error al crear signed upload URL:', signedError);
      return NextResponse.json({ error: 'Error al iniciar la carga en Supabase Storage.' }, { status: 500 });
    }

    // 6. Registrar la sesión de carga en la base de datos
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hora de vigencia
    
    const { error: sessionError } = await adminSupabase
      .from('upload_sessions')
      .insert({
        upload_uuid: uploadUuid,
        file_uuid: fileUuid,
        storage_path: storagePath,
        mime_type: mimeType,
        size_bytes: fileSize,
        expires_at: expiresAt,
        status: 'pending',
        created_by: user?.id || null,
        upload_source: uploadSource
      });

    if (sessionError) {
      console.error('Error al registrar la sesión de carga:', sessionError);
      return NextResponse.json({ error: 'Error al registrar la sesión de carga en la base de datos.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      signedUrl: signedData.signedUrl,
      token: signedData.token,
      storagePath,
      uploadUuid,
      fileUuid,
      fileRole: authorizedRole,
      uploadSource
    });

  } catch (error) {
    console.error('Error interno en API upload-session:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { uploadUuid, status, checksumSha256 } = body;

    if (!uploadUuid || !status) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (uploadUuid, status).' }, { status: 400 });
    }

    if (!['uploading', 'uploaded', 'failed', 'quarantined'].includes(status)) {
      return NextResponse.json({ error: 'Estado de carga inválido.' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    
    // Validar existencia de la sesión
    const { data: sessionData, error: sessionFetchError } = await adminSupabase
      .from('upload_sessions')
      .select('*')
      .eq('upload_uuid', uploadUuid)
      .single();

    if (sessionFetchError || !sessionData) {
      return NextResponse.json({ error: 'Sesión de carga no encontrada.' }, { status: 404 });
    }

    // Actualizar estado de la sesión
    const updatePayload: any = {
      status,
      last_activity_at: new Date().toISOString()
    };
    if (checksumSha256) {
      updatePayload.checksum_sha256 = checksumSha256;
    }

    const { error: updateError } = await adminSupabase
      .from('upload_sessions')
      .update(updatePayload)
      .eq('upload_uuid', uploadUuid);

    if (updateError) {
      console.error('Error al actualizar estado de sesión:', updateError);
      return NextResponse.json({ error: 'Error al actualizar la sesión de carga.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error interno en PUT upload-session:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
