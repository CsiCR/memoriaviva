import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'mp3', 'wav', 'm4a', 'mp4', 'mov'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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

    // 2. Parsear FormData
    const formData = await req.formData();

    const consentSource = formData.get('consent_source') as string || 'signed_paper';
    const consentReference = formData.get('consent_reference') as string || '';

    // Datos del Aportante
    let dni = formData.get('dni') as string;
    let fullName = formData.get('full_name') as string;
    let phone = formData.get('phone') as string || '—';
    let email = formData.get('email') as string || '—';
    let relationToCity = formData.get('relation_to_city') as string;
    let neighborhoodOrInstitution = formData.get('neighborhood_or_institution') as string;
    const comments = formData.get('comments') as string || '';
    const allowContact = formData.get('allow_contact') === 'true';

    // Si es Caso 3 (Convenio Institucional), usamos los datos de la institución como aportante
    if (consentSource === 'institutional_agreement') {
      const institutionName = formData.get('related_institution') as string || 'Institución Colaboradora';
      dni = 'Convenio';
      fullName = institutionName;
      relationToCity = 'Representante de institución local';
      neighborhoodOrInstitution = institutionName;
    }

    if (!dni || !fullName || !relationToCity || !neighborhoodOrInstitution) {
      return NextResponse.json({ error: 'Faltan datos obligatorios del aportante o de la institución.' }, { status: 400 });
    }

    // Datos del Aporte
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

    // Consentimiento
    const authorizationLevel = formData.get('authorization_level') as string || 'A';
    const creditPreference = formData.get('credit_preference') as string || 'Nombre completo';

    // Obtener archivo de firma de consentimiento (Caso 2)
    const consentFile = formData.get('consent_file') as File | null;

    // Obtener archivos históricos
    const files = formData.getAll('files') as File[];
    
    if (contributionType !== 'Testimonio escrito' && (!files || files.length === 0 || (files.length === 1 && files[0].size === 0))) {
      return NextResponse.json({ error: 'Este tipo de aporte requiere que adjuntes al menos un archivo histórico.' }, { status: 400 });
    }

    // Validar archivos históricos
    for (const file of files) {
      if (file.size === 0) continue;
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `El archivo ${file.name} supera el límite de 50 MB.` }, { status: 400 });
      }
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
        return NextResponse.json({ error: `El formato del archivo ${file.name} no está permitido.` }, { status: 400 });
      }
    }

    const adminSupabase = createAdminClient();

    // Variables legales
    let finalAgreementId = null;
    let finalConsentFilePath = null;
    let finalConsentReference = consentReference;

    // 3. Procesar Respaldos según Caso Legal
    if (consentSource === 'signed_paper') {
      // Caso 2: Planilla Firmada es OBLIGATORIA
      if (!consentFile || consentFile.size === 0) {
        return NextResponse.json({ error: 'Debes subir la foto o PDF de la planilla de consentimiento firmada por el aportante.' }, { status: 400 });
      }

      // Validar tipo de archivo
      const extension = consentFile.name.split('.').pop()?.toLowerCase();
      if (!extension || !['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(extension)) {
        return NextResponse.json({ error: 'Formato de planilla no permitido (solo imágenes o PDF).' }, { status: 400 });
      }

      // Subir archivo
      const uniqueFileName = `${Date.now()}_consent_${Math.random().toString(36).substring(2, 9)}.${extension}`;
      const filePath = `consents/temp_${uniqueFileName}`; // Se moverá o asignará
      const buffer = Buffer.from(await consentFile.arrayBuffer());

      const { error: uploadError } = await adminSupabase.storage
        .from('historical-uploads')
        .upload(filePath, buffer, {
          contentType: consentFile.type,
          duplex: 'half'
        });

      if (uploadError) {
        console.error('Error al subir planilla firmada:', uploadError);
        return NextResponse.json({ error: 'Error al subir el archivo de autorización.' }, { status: 500 });
      }

      finalConsentFilePath = filePath;
    } 
    else if (consentSource === 'institutional_agreement') {
      // Caso 3: Convenio Institucional
      const institutionalAgreementId = formData.get('institutional_agreement_id') as string;

      if (!institutionalAgreementId) {
        return NextResponse.json({ error: 'Debes seleccionar un convenio institucional o registrar uno nuevo.' }, { status: 400 });
      }

      if (institutionalAgreementId === 'new') {
        // Registrar un NUEVO convenio
        const newAgreementName = formData.get('new_agreement_name') as string;
        const newAgreementInstitution = formData.get('new_agreement_institution') as string;
        const newAgreementFile = formData.get('new_agreement_file') as File | null;

        if (!newAgreementName || !newAgreementInstitution || !newAgreementFile || newAgreementFile.size === 0) {
          return NextResponse.json({ error: 'Faltan datos obligatorios para registrar el nuevo convenio.' }, { status: 400 });
        }

        const extension = newAgreementFile.name.split('.').pop()?.toLowerCase();
        if (!extension || extension !== 'pdf') {
          return NextResponse.json({ error: 'El archivo del convenio institucional debe ser un documento PDF.' }, { status: 400 });
        }

        // Subir convenio
        const uniqueFileName = `${Date.now()}_agreement_${Math.random().toString(36).substring(2, 9)}.pdf`;
        const filePath = `agreements/${uniqueFileName}`;
        const buffer = Buffer.from(await newAgreementFile.arrayBuffer());

        const { error: uploadError } = await adminSupabase.storage
          .from('historical-uploads')
          .upload(filePath, buffer, {
            contentType: 'application/pdf',
            duplex: 'half'
          });

        if (uploadError) {
          console.error('Error al subir PDF de convenio:', uploadError);
          return NextResponse.json({ error: 'Error al subir el PDF del convenio.' }, { status: 500 });
        }

        // Insertar convenio en BD
        const { data: agreementData, error: agreementError } = await adminSupabase
          .from('institutional_agreements')
          .insert({
            name: newAgreementName,
            institution: newAgreementInstitution,
            file_path: filePath
          })
          .select()
          .single();

        if (agreementError) {
          console.error('Error al guardar convenio en BD:', agreementError);
          return NextResponse.json({ error: `Error al registrar convenio: ${agreementError.message}` }, { status: 500 });
        }

        finalAgreementId = agreementData.id;
        finalConsentFilePath = filePath;
        finalConsentReference = newAgreementName;
      } else {
        // Utilizar convenio EXISTENTE
        const { data: agreementData, error: agreementError } = await adminSupabase
          .from('institutional_agreements')
          .select('name, file_path')
          .eq('id', institutionalAgreementId)
          .single();

        if (agreementError || !agreementData) {
          console.error('Error al buscar convenio existente:', agreementError);
          return NextResponse.json({ error: 'El convenio institucional seleccionado no es válido.' }, { status: 400 });
        }

        finalAgreementId = institutionalAgreementId;
        finalConsentFilePath = agreementData.file_path;
        finalConsentReference = agreementData.name;
      }
    } else {
      // Caso 1: Web Form
      finalConsentReference = 'Formulario Web';
      finalConsentFilePath = null;
      finalAgreementId = null;
    }

    // 4. Inserción en Base de Datos

    // A. Insertar Aportante
    const { data: contributorData, error: contributorError } = await adminSupabase
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
      console.error('Error al insertar aportante (admin):', contributorError);
      return NextResponse.json({ error: 'Error al registrar el aportante.' }, { status: 500 });
    }

    const contributorId = contributorData.id;

    // B. Insertar Aporte (Calcular catalog_code en Next.js por seguridad como fallback)
    const yearVal = new Date().getFullYear();
    const typeCodeMap: Record<string, string> = {
      'Testimonio escrito': 'TXT',
      'Fotografía': 'FOT',
      'Documento': 'DOC',
      'Audio': 'AUD',
      'Video': 'VID'
    };
    const typeCode = typeCodeMap[contributionType] || 'GEN';
    
    const { count } = await adminSupabase
      .from('contributions')
      .select('*', { count: 'exact', head: true })
      .eq('contribution_type', contributionType)
      .gte('created_at', `${yearVal}-01-01T00:00:00Z`)
      .lte('created_at', `${yearVal}-12-31T23:59:59Z`);

    const nextNum = (count || 0) + 1;
    const finalCatalogCode = `MV-${typeCode}-${yearVal}-${String(nextNum).padStart(4, '0')}`;

    // Si es Caso 2 (signed_paper) y la referencia está vacía, hacerla igual a la signatura
    let refValue = finalConsentReference;
    if (consentSource === 'signed_paper' && (!refValue || refValue.trim() === '')) {
      refValue = finalCatalogCode;
    }

    const exactDate = exactDateStr ? exactDateStr : null;

    const { data: contributionData, error: contributionError } = await adminSupabase
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
        consent_source: consentSource,
        consent_reference: refValue || null,
        consent_file_path: finalConsentFilePath,
        institutional_agreement_id: finalAgreementId,
        catalog_code: finalCatalogCode,
        consent_verified: false,
        editorial_status: 'Recibido'
      })
      .select()
      .single();

    if (contributionError) {
      console.error('Error al insertar aporte (admin):', contributionError);
      return NextResponse.json({ error: 'Error al registrar el aporte.' }, { status: 500 });
    }

    const contributionId = contributionData.id;

    // C. Si era Caso 2, mover/renombrar archivo en Storage a su ruta definitiva con contributionId
    if (consentSource === 'signed_paper' && finalConsentFilePath) {
      const extension = finalConsentFilePath.split('.').pop()?.toLowerCase();
      const newFilePath = `consents/${contributionId}/${Date.now()}_consent.${extension}`;
      
      const { error: moveError } = await adminSupabase.storage
        .from('historical-uploads')
        .copy(finalConsentFilePath, newFilePath);

      if (!moveError) {
        // Eliminar el temporal
        await adminSupabase.storage.from('historical-uploads').remove([finalConsentFilePath]);
        finalConsentFilePath = newFilePath;
        
        // Actualizar el registro del aporte con la ruta definitiva
        await adminSupabase
          .from('contributions')
          .update({ consent_file_path: newFilePath })
          .eq('id', contributionId);
      }
    }

    // D. Registrar Consentimiento (consent_records)
    const consentTextVersion = `Carga Administrativa - Caso: ${consentSource} - Ref: ${finalConsentReference || '—'}`;
    const { error: consentError } = await adminSupabase
      .from('consent_records')
      .insert({
        contributor_id: contributorId,
        contribution_id: contributionId,
        authorization_level: authorizationLevel,
        credit_preference: creditPreference,
        owns_or_has_permission: true,
        accepts_cataloging: true,
        consent_text_version: consentTextVersion,
        consent_file_path: finalConsentFilePath
      });

    if (consentError) {
      console.error('Error al insertar registro consentimiento (admin):', consentError);
    }

    // E. Subir archivos históricos
    const uploadedFilesSummary = [];
    for (const file of files) {
      if (file.size === 0) continue;

      const extension = file.name.split('.').pop()?.toLowerCase();
      const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extension}`;
      const filePath = `contributions/${contributionId}/${uniqueFileName}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await adminSupabase.storage
        .from('historical-uploads')
        .upload(filePath, buffer, {
          contentType: file.type,
          duplex: 'half'
        });

      if (uploadError) {
        console.error(`Error al subir archivo histórico ${file.name}:`, uploadError);
        return NextResponse.json({ error: `Error al subir el archivo ${file.name}.` }, { status: 500 });
      }

      const { error: dbFileError } = await adminSupabase
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
        console.error(`Error al registrar archivo histórico ${file.name} en BD:`, dbFileError);
      }

      uploadedFilesSummary.push({ name: file.name, path: filePath });
    }

    return NextResponse.json({
      success: true,
      contributionId,
      contributorId,
      files: uploadedFilesSummary,
      consentFilePath: finalConsentFilePath
    });

  } catch (error) {
    console.error('Error interno del servidor en endpoint admin/contribute:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
