import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

// Extensiones y MIME types permitidos
const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'mp3', 'wav', 'm4a', 'mp4', 'mov'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 Megabytes

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // 1. Obtener y validar datos del Aportante
    const dni = formData.get('dni') as string;
    const fullName = formData.get('full_name') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;
    const relationToCity = formData.get('relation_to_city') as string;
    const neighborhoodOrInstitution = formData.get('neighborhood_or_institution') as string;
    const comments = formData.get('comments') as string || '';
    const allowContact = formData.get('allow_contact') === 'true';

    if (!dni || !fullName || !phone || !email || !relationToCity || !neighborhoodOrInstitution) {
      return NextResponse.json({ error: 'Faltan datos obligatorios del aportante.' }, { status: 400 });
    }

    // 2. Obtener y validar datos del Aporte
    const title = formData.get('title') as string;
    const contributionType = formData.get('contribution_type') as string;
    const description = formData.get('description') as string;
    const exactDateStr = formData.get('exact_date') as string;
    const approximateDecade = formData.get('approximate_decade') as string;
    const relatedPlace = formData.get('related_place') as string;
    const mentionedPeople = formData.get('mentioned_people') as string || '';
    const relatedInstitution = formData.get('related_institution') as string || '';
    const historicalContext = formData.get('historical_context') as string || '';

    if (!title || !contributionType || !description || !relatedPlace) {
      return NextResponse.json({ error: 'Faltan datos obligatorios del aporte.' }, { status: 400 });
    }

    // 3. Obtener y validar datos de Consentimiento
    const authorizationLevel = formData.get('authorization_level') as string;
    const creditPreference = formData.get('credit_preference') as string;
    const ownsOrHasPermission = formData.get('owns_or_has_permission') === 'true';
    const acceptsCataloging = formData.get('accepts_cataloging') === 'true';

    if (!authorizationLevel || !creditPreference || !ownsOrHasPermission || !acceptsCataloging) {
      return NextResponse.json({ error: 'Debes aceptar las declaraciones de consentimiento obligatorias.' }, { status: 400 });
    }

    // 4. Obtener archivos
    const files = formData.getAll('files') as File[];
    
    // Si no es un testimonio escrito, requiere archivos
    if (contributionType !== 'Testimonio escrito' && (!files || files.length === 0 || (files.length === 1 && files[0].size === 0))) {
      return NextResponse.json({ error: 'Este tipo de aporte requiere que adjuntes al menos un archivo.' }, { status: 400 });
    }

    // Validar archivos antes de hacer inserts
    for (const file of files) {
      if (file.size === 0) continue; // Archivo vacío
      
      // Validar tamaño
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `El archivo ${file.name} supera el límite de 50 MB.` }, { status: 400 });
      }

      // Validar extensión
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
        return NextResponse.json({ error: `El formato del archivo ${file.name} no está permitido. Permitidos: jpg, jpeg, png, webp, pdf, doc, docx, mp3, wav, m4a, mp4, mov.` }, { status: 400 });
      }
    }

    // 5. Iniciar inserción en Base de Datos usando Cliente Admin (Service Role)
    const supabase = createAdminClient();

    // A. Insertar Aportante (Contributor)
    const { data: contributorData, error: contributorError } = await supabase
      .from('contributors')
      .insert({
        dni,
        full_name: fullName,
        phone,
        email,
        relation_to_city: relationToCity,
        neighborhood_or_institution: neighborhoodOrInstitution,
        comments,
        allow_contact: allowContact
      })
      .select()
      .single();

    if (contributorError) {
      console.error('Error al insertar aportante:', contributorError);
      return NextResponse.json({ error: 'Error al registrar tus datos. Por favor intenta de nuevo.' }, { status: 500 });
    }

    const contributorId = contributorData.id;

    // B. Insertar Aporte (Contribution)
    const exactDate = exactDateStr ? exactDateStr : null;

    const { data: contributionData, error: contributionError } = await supabase
      .from('contributions')
      .insert({
        contributor_id: contributorId,
        title,
        contribution_type: contributionType,
        description,
        exact_date: exactDate,
        approximate_decade: approximateDecade || null,
        related_place: relatedPlace,
        mentioned_people: mentionedPeople,
        related_institution: relatedInstitution,
        historical_context: historicalContext,
        authorization_level: authorizationLevel,
        credit_preference: creditPreference,
        editorial_status: 'Recibido'
      })
      .select()
      .single();

    if (contributionError) {
      console.error('Error al insertar aporte:', contributionError);
      return NextResponse.json({ error: 'Error al registrar el aporte. Por favor intenta de nuevo.' }, { status: 500 });
    }

    const contributionId = contributionData.id;

    // C. Insertar Registro de Consentimiento (Consent Record)
    const consentTextVersion = "Versión inicial 1.0 - MVP - Junio 2026";
    const { error: consentError } = await supabase
      .from('consent_records')
      .insert({
        contributor_id: contributorId,
        contribution_id: contributionId,
        authorization_level: authorizationLevel,
        credit_preference: creditPreference,
        owns_or_has_permission: ownsOrHasPermission,
        accepts_cataloging: acceptsCataloging,
        consent_text_version: consentTextVersion
      });

    if (consentError) {
      console.error('Error al insertar consentimiento:', consentError);
      // Continuamos pero logueamos el fallo, el aporte y aportante ya están creados
    }

    // D. Subir archivos a Storage y registrar en la tabla
    const uploadedFilesSummary = [];
    for (const file of files) {
      if (file.size === 0) continue;

      const extension = file.name.split('.').pop()?.toLowerCase();
      const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extension}`;
      // Ruta: contributions/[contribution_id]/[file_name]
      const filePath = `contributions/${contributionId}/${uniqueFileName}`;

      const buffer = Buffer.from(await file.arrayBuffer());

      // Subir archivo a bucket privado 'historical-uploads'
      const { error: uploadError } = await supabase.storage
        .from('historical-uploads')
        .upload(filePath, buffer, {
          contentType: file.type,
          duplex: 'half'
        });

      if (uploadError) {
        console.error(`Error al subir archivo ${file.name} a storage:`, uploadError);
        return NextResponse.json({ error: `Error al subir el archivo ${file.name}.` }, { status: 500 });
      }

      // Registrar archivo en base de datos
      const { error: dbFileError } = await supabase
        .from('contribution_files')
        .insert({
          contribution_id: contributionId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          storage_bucket: 'historical-uploads',
          is_original: true
        });

      if (dbFileError) {
        console.error(`Error al registrar archivo ${file.name} en base de datos:`, dbFileError);
        // Continuamos, el archivo físico ya está en storage
      }

      uploadedFilesSummary.push({ name: file.name, path: filePath });
    }



    return NextResponse.json({
      success: true,
      contributionId,
      contributorId,
      files: uploadedFilesSummary
    });

  } catch (error) {
    console.error('Error interno del servidor en endpoint contribute:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
