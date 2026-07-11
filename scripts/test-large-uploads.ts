import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as tus from 'tus-js-client';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BASE_URL = 'http://localhost:3000';

async function main() {
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Faltan credenciales en .env.local');
    process.exit(1);
  }

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
  const clientSupabase = createClient(supabaseUrl, anonKey);

  console.log('=== INICIANDO PRUEBAS DE CARGA DIRECTA Y TRANSACCIONES ===\n');

  // PRUEBA 1: Crear sesión de carga para archivo estándar (<= 6 MB)
  console.log('Prueba 1: Creando sesión de carga estándar (<= 6 MB)...');
  const sessionRes = await fetch(`${BASE_URL}/api/upload-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: 'test_imagen.png',
      fileSize: 1024,
      mimeType: 'image/png',
      fileRole: 'original'
    })
  });

  if (!sessionRes.ok) {
    console.error('  -> ERROR al crear sesión de carga:', await sessionRes.text());
    process.exit(1);
  }

  const sessionData = await sessionRes.json();
  console.log('  -> [ÉXITO] Sesión creada.');
  console.log(`  -> UUID de Carga: ${sessionData.uploadUuid}`);
  console.log(`  -> Ruta de Almacenamiento: ${sessionData.storagePath}`);

  // PRUEBA 2: Subir archivo estándar usando la signedUrl (Simulación del cliente standard)
  console.log('\nPrueba 2: Subiendo archivo de 1 KB con signed URL...');
  // Magic bytes válidos de PNG: 89 50 4E 47
  const validPngBuffer = Buffer.alloc(1024);
  validPngBuffer.writeUInt32BE(0x89504E47, 0); // Escribir cabecera PNG
  
  const validPngFile = new File([validPngBuffer], 'test_imagen.png', { type: 'image/png' });
  const { data: uploadData, error: uploadError } = await clientSupabase.storage
    .from('historical-uploads')
    .uploadToSignedUrl(sessionData.storagePath, sessionData.token, validPngFile, {
      upsert: false
    });

  if (uploadError) {
    console.error('  -> ERROR al subir archivo físico con uploadToSignedUrl:', uploadError.message);
    process.exit(1);
  }
  console.log('  -> [ÉXITO] Archivo físico subido a Storage con uploadToSignedUrl.');

  // Actualizar estado de carga a 'uploaded' en la sesión
  const updateSessionRes = await fetch(`${BASE_URL}/api/upload-session`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploadUuid: sessionData.uploadUuid,
      status: 'uploaded'
    })
  });

  if (!updateSessionRes.ok) {
    console.error('  -> ERROR al actualizar estado de sesión:', await updateSessionRes.text());
    process.exit(1);
  }
  console.log('  -> [ÉXITO] Estado de la sesión actualizado a "uploaded".');

  // PRUEBA 3: Crear sesión de carga con magic bytes inconsistentes (Simulación de quarantined)
  console.log('\nPrueba 3: Probando validación de magic bytes (intento de subir archivo corrupto)...');
  const sessionResCorrupt = await fetch(`${BASE_URL}/api/upload-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: 'hacker.png',
      fileSize: 1024,
      mimeType: 'image/png',
      fileRole: 'original'
    })
  });

  const sessionDataCorrupt = await sessionResCorrupt.json();
  
  // Subir archivo con cabecera incorrecta (ej. texto puro "hola")
  const corruptBuffer = Buffer.from('hola mundo este no es un png válido');
  const uploadResCorrupt = await fetch(sessionDataCorrupt.signedUrl, {
    method: 'PUT',
    body: corruptBuffer,
    headers: { 'Content-Type': 'image/png' }
  });

  await fetch(`${BASE_URL}/api/upload-session`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploadUuid: sessionDataCorrupt.uploadUuid,
      status: 'uploaded'
    })
  });

  // Intentar crear la contribución con el archivo corrupto
  const contributeCorruptRes = await fetch(`${BASE_URL}/api/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contributor: {
        dni: '99999999',
        full_name: 'Test Corrupto',
        phone: '297444444',
        email: 'corrupto@test.org',
        relation_to_city: 'Vecino actual',
        neighborhood_or_institution: 'Barrio Centro'
      },
      contribution: {
        title: 'Aporte con archivo corrupto',
        contribution_type: 'Fotografía',
        description: 'Intento de hackeo',
        related_place: 'Pico Truncado',
        authorization_level: 'A',
        credit_preference: 'Nombre completo'
      },
      consent: {
        owns_or_has_permission: true,
        accepts_cataloging: true
      },
      files: [{ upload_uuid: sessionDataCorrupt.uploadUuid }]
    })
  });

  console.log(`  -> Estado HTTP devuelto: ${contributeCorruptRes.status}`);
  const corruptContributeResult = await contributeCorruptRes.json();
  console.log(`  -> Respuesta JSON del Servidor:`, corruptContributeResult);

  // Verificar si la sesión pasó a quarantined
  const { data: quarantinedSession } = await adminSupabase
    .from('upload_sessions')
    .select('status')
    .eq('upload_uuid', sessionDataCorrupt.uploadUuid)
    .single();

  console.log(`  -> [VERIFICACIÓN] Estado final en BD de la sesión corrupta: ${quarantinedSession?.status} (Esperado: quarantined)`);
  if (quarantinedSession?.status === 'quarantined') {
    console.log('  -> [ÉXITO] El archivo fue exitosamente bloqueado y puesto en cuarentena.');
  } else {
    console.error('  -> [FALLO] El archivo no fue catalogado en cuarentena.');
    process.exit(1);
  }

  // PRUEBA 4: Rollback transaccional (RPC) ante campos inválidos
  console.log('\nPrueba 4: Verificando rollback atómico de la transacción RPC...');
  const rollbackContributeRes = await fetch(`${BASE_URL}/api/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contributor: {
        dni: '', // Campo DNI vacío para forzar error y rollback
        full_name: 'Vecino Fallido',
        phone: '297444444',
        email: 'fail@test.org',
        relation_to_city: 'Vecino actual',
        neighborhood_or_institution: 'Barrio Centro'
      },
      contribution: {
        title: 'Aporte Fallido Rollback',
        contribution_type: 'Fotografía',
        description: 'Debe hacer rollback de todo',
        related_place: 'Pico Truncado',
        authorization_level: 'A',
        credit_preference: 'Nombre completo'
      },
      consent: {
        owns_or_has_permission: true,
        accepts_cataloging: true
      },
      files: [{ upload_uuid: sessionData.uploadUuid }]
    })
  });

  console.log(`  -> Estado HTTP devuelto: ${rollbackContributeRes.status}`);
  const rollbackResult = await rollbackContributeRes.json();
  console.log(`  -> Respuesta JSON del Servidor:`, rollbackResult);

  // Verificar en la BD que NO se haya insertado el aportante "Vecino Fallido"
  const { data: failedContributor } = await adminSupabase
    .from('contributors')
    .select('*')
    .eq('full_name', 'Vecino Fallido');

  console.log(`  -> [VERIFICACIÓN] Contadores en BD para 'Vecino Fallido': ${failedContributor?.length || 0} (Esperado: 0)`);
  if (!failedContributor || failedContributor.length === 0) {
    console.log('  -> [ÉXITO] La transacción realizó rollback completo de manera segura.');
  } else {
    console.error('  -> [FALLO] Se encontró el registro en la BD, la transacción no hizo rollback.');
    process.exit(1);
  }

  // PRUEBA 5: Ejecución exitosa de la creación del aporte con transacción
  console.log('\nPrueba 5: Registrando aporte real de forma exitosa...');
  const successContributeRes = await fetch(`${BASE_URL}/api/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contributor: {
        dni: '22333444',
        full_name: 'Andrés Freile Piloto',
        phone: '297444444',
        email: 'andres@freile.org',
        relation_to_city: 'Vecino pionero',
        neighborhood_or_institution: 'Centro Chileno'
      },
      contribution: {
        title: 'Video Histórico de Pico Truncado',
        contribution_type: 'Video',
        description: 'Video original de radicación en la zona.',
        related_place: 'Pico Truncado',
        authorization_level: 'A',
        credit_preference: 'Nombre completo'
      },
      consent: {
        owns_or_has_permission: true,
        accepts_cataloging: true
      },
      files: [{ upload_uuid: sessionData.uploadUuid }]
    })
  });

  console.log(`  -> Estado HTTP devuelto: ${successContributeRes.status}`);
  const successResult = await successContributeRes.json();
  console.log(`  -> Respuesta JSON del Servidor:`, successResult);

  if (successContributeRes.ok && successResult.success) {
    console.log('  -> [ÉXITO] Aporte creado de forma atómica y archivos vinculados.');
  } else {
    console.error('  -> [FALLO] No se pudo crear el aporte exitoso.');
    process.exit(1);
  }

  // PRUEBA 6: Verificar RLS - Intentar subir directamente con cliente anónimo
  console.log('\nPrueba 6: Verificando políticas RLS de Supabase Storage...');
  try {
    const { data: uploadDirectData, error: uploadDirectError } = await clientSupabase.storage
      .from('historical-uploads')
      .upload('direct_anon_hack.png', Buffer.from('hacker'), {
        upsert: false
      });
    
    console.log(`  -> Error RLS devuelto: ${uploadDirectError?.message}`);
    if (uploadDirectError) {
      console.log('  -> [ÉXITO] RLS bloqueó la subida directa anónima sin firmar.');
    } else {
      console.error('  -> [FALLO] RLS permitió la subida directa anónima. ¡VULNERABILIDAD!');
      process.exit(1);
    }
  } catch (err: any) {
    console.log('  -> [ÉXITO] RLS bloqueó la subida directa con excepción:', err.message);
  }

  // PRUEBA 7: Validaciones de approximate_decade y Normalización en RPC
  console.log('\nPrueba 7: Verificando normalización de approximate_decade y restricciones en la RPC...');

  // Caso A: approximate_decade = '' -> debe guardar NULL
  console.log('  -> Caso A: approximate_decade = \'\'...');
  const resA = await adminSupabase.rpc('create_contribution_with_files', {
    p_contributor: { dni: '70000001', full_name: 'Test Década A', phone: '297444444', email: 'test@decade.org', relation_to_city: 'Vecino actual', neighborhood_or_institution: 'Centro' },
    p_contribution: { title: 'Aporte A', contribution_type: 'Fotografía', description: 'Desc', related_place: 'Pico', authorization_level: 'A', credit_preference: 'Nombre completo', approximate_decade: '' },
    p_consent: { owns_or_has_permission: true, accepts_cataloging: true },
    p_files: [],
    p_user_id: null
  });
  if (resA.error) {
    console.error('     [FALLO] Error en Caso A:', resA.error.message);
    process.exit(1);
  }
  const { data: contribA } = await adminSupabase.from('contributions').select('approximate_decade').eq('id', resA.data.contribution_id).single();
  console.log(`     Valor guardado: ${contribA?.approximate_decade === null ? 'NULL (Correcto)' : contribA?.approximate_decade}`);
  if (contribA?.approximate_decade !== null) {
    console.error('     [FALLO] No guardó NULL.');
    process.exit(1);
  }

  // Caso B: approximate_decade = '   ' -> debe guardar NULL
  console.log('  -> Caso B: approximate_decade = \'   \'...');
  const resB = await adminSupabase.rpc('create_contribution_with_files', {
    p_contributor: { dni: '70000002', full_name: 'Test Década B', phone: '297444444', email: 'test@decade.org', relation_to_city: 'Vecino actual', neighborhood_or_institution: 'Centro' },
    p_contribution: { title: 'Aporte B', contribution_type: 'Fotografía', description: 'Desc', related_place: 'Pico', authorization_level: 'A', credit_preference: 'Nombre completo', approximate_decade: '   ' },
    p_consent: { owns_or_has_permission: true, accepts_cataloging: true },
    p_files: [],
    p_user_id: null
  });
  if (resB.error) {
    console.error('     [FALLO] Error en Caso B:', resB.error.message);
    process.exit(1);
  }
  const { data: contribB } = await adminSupabase.from('contributions').select('approximate_decade').eq('id', resB.data.contribution_id).single();
  console.log(`     Valor guardado: ${contribB?.approximate_decade === null ? 'NULL (Correcto)' : contribB?.approximate_decade}`);
  if (contribB?.approximate_decade !== null) {
    console.error('     [FALLO] No guardó NULL.');
    process.exit(1);
  }

  // Caso C: approximate_decade = null -> debe guardar NULL
  console.log('  -> Caso C: approximate_decade = null...');
  const resC = await adminSupabase.rpc('create_contribution_with_files', {
    p_contributor: { dni: '70000003', full_name: 'Test Década C', phone: '297444444', email: 'test@decade.org', relation_to_city: 'Vecino actual', neighborhood_or_institution: 'Centro' },
    p_contribution: { title: 'Aporte C', contribution_type: 'Fotografía', description: 'Desc', related_place: 'Pico', authorization_level: 'A', credit_preference: 'Nombre completo', approximate_decade: null },
    p_consent: { owns_or_has_permission: true, accepts_cataloging: true },
    p_files: [],
    p_user_id: null
  });
  if (resC.error) {
    console.error('     [FALLO] Error en Caso C:', resC.error.message);
    process.exit(1);
  }
  const { data: contribC } = await adminSupabase.from('contributions').select('approximate_decade').eq('id', resC.data.contribution_id).single();
  console.log(`     Valor guardado: ${contribC?.approximate_decade === null ? 'NULL (Correcto)' : contribC?.approximate_decade}`);
  if (contribC?.approximate_decade !== null) {
    console.error('     [FALLO] No guardó NULL.');
    process.exit(1);
  }

  // Caso D: approximate_decade = '1960s' -> debe guardar '1960s'
  console.log('  -> Caso D: approximate_decade = \'1960s\'...');
  const resD = await adminSupabase.rpc('create_contribution_with_files', {
    p_contributor: { dni: '70000004', full_name: 'Test Década D', phone: '297444444', email: 'test@decade.org', relation_to_city: 'Vecino actual', neighborhood_or_institution: 'Centro' },
    p_contribution: { title: 'Aporte D', contribution_type: 'Fotografía', description: 'Desc', related_place: 'Pico', authorization_level: 'A', credit_preference: 'Nombre completo', approximate_decade: '1960s' },
    p_consent: { owns_or_has_permission: true, accepts_cataloging: true },
    p_files: [],
    p_user_id: null
  });
  if (resD.error) {
    console.error('     [FALLO] Error en Caso D:', resD.error.message);
    process.exit(1);
  }
  const { data: contribD } = await adminSupabase.from('contributions').select('approximate_decade').eq('id', resD.data.contribution_id).single();
  console.log(`     Valor guardado: '${contribD?.approximate_decade}' (Esperado: '1960s')`);
  if (contribD?.approximate_decade !== '1960s') {
    console.error('     [FALLO] No guardó \'1960s\'.');
    process.exit(1);
  }

  // Caso E: approximate_decade = '1965' -> debe fallar por CHECK
  console.log('  -> Caso E: approximate_decade = \'1965\' (Debe fallar)...');
  const resE = await adminSupabase.rpc('create_contribution_with_files', {
    p_contributor: { dni: '70000005', full_name: 'Test Década E', phone: '297444444', email: 'test@decade.org', relation_to_city: 'Vecino actual', neighborhood_or_institution: 'Centro' },
    p_contribution: { title: 'Aporte E', contribution_type: 'Fotografía', description: 'Desc', related_place: 'Pico', authorization_level: 'A', credit_preference: 'Nombre completo', approximate_decade: '1965' },
    p_consent: { owns_or_has_permission: true, accepts_cataloging: true },
    p_files: [],
    p_user_id: null
  });
  if (resE.error && resE.error.message.includes('contributions_approximate_decade_check')) {
    console.log('     [ÉXITO] Falló correctamente por restricción CHECK:', resE.error.message);
  } else {
    console.error('     [FALLO] El caso E no falló o arrojó otro error:', resE.error?.message || 'Ninguno');
    process.exit(1);
  }

  // Caso F: creación de aporte con audio y sin década -> debe completarse correctamente
  console.log('  -> Caso F: aporte tipo Audio sin década...');
  const resF = await adminSupabase.rpc('create_contribution_with_files', {
    p_contributor: { dni: '70000006', full_name: 'Test Aporte Audio', phone: '297444444', email: 'test@decade.org', relation_to_city: 'Vecino pionero', neighborhood_or_institution: 'Centro' },
    p_contribution: { title: 'Aporte Audio Test', contribution_type: 'Audio', description: 'Test de audio sin década', related_place: 'Pico', authorization_level: 'A', credit_preference: 'Nombre completo', approximate_decade: '' },
    p_consent: { owns_or_has_permission: true, accepts_cataloging: true },
    p_files: [],
    p_user_id: null
  });
  if (resF.error) {
    console.error('     [FALLO] Error en Caso F:', resF.error.message);
    process.exit(1);
  }
  console.log('     [ÉXITO] Aporte de audio sin década guardado correctamente.');

  // Limpiar registros de prueba generados
  await adminSupabase.from('contributors').delete().in('dni', ['70000001', '70000002', '70000003', '70000004', '70000006']);

  console.log('\n=== TODAS LAS PRUEBAS DE VINCULACIÓN PASARON CON ÉXITO ===');
}

main().catch(console.error);
