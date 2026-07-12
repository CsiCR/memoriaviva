import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

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
  const operatorSupabase = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  console.log('Iniciando sesión como administrador para pruebas autorizadas...');
  const { data: signInData, error: signInError } = await operatorSupabase.auth.signInWithPassword({
    email: process.env.INITIAL_ADMIN_EMAIL || 'admin@memoriaviva.org',
    password: process.env.INITIAL_ADMIN_PASSWORD || 'CambiarEstaContrasena123!'
  });

  if (signInError || !signInData.session) {
    console.error('  -> ERROR al iniciar sesión de administrador:', signInError?.message);
    process.exit(1);
  }
  console.log('  -> [ÉXITO] Sesión de administrador iniciada.\n');

  console.log('=== INICIANDO PRUEBAS DE MEJORAS DEL PILOTO EDITORIAL ===\n');

  // Limpiar base de datos de pruebas previas
  console.log('Limpiando registros previos de prueba en la base de datos...');
  await adminSupabase.from('contributors').delete().ilike('full_name', '%test_pilot_%');
  console.log('  -> [ÉXITO] Base de datos limpia.\n');

  // ====================================================
  // PRUEBA 1: Aportante sin email (Carga Pública)
  // ====================================================
  console.log('Prueba 1: Enviando aporte público sin email (email vacío/nulo)...');
  
  const payload1 = {
    contributor: {
      dni: '99000111',
      full_name: 'test_pilot_Andres',
      phone: '2974000111',
      email: '  ', // Espacios en blanco para validar sanitización
      relation_to_city: 'Vecino actual',
      neighborhood_or_institution: 'Barrio Centro',
      comments: 'Comentario de prueba sin email',
      allow_contact: true
    },
    contribution: {
      title: 'Aporte de prueba sin email',
      contribution_type: 'Testimonio escrito',
      description: 'Testimonio escrito corto de prueba',
      exact_date: null,
      approximate_decade: '1980s',
      related_place: 'Plaza Principal',
      mentioned_people: null,
      related_institution: null,
      historical_context: 'Un relato sin correo electrónico.',
      authorization_level: 'C',
      credit_preference: 'Nombre completo'
    },
    consent: {
      owns_or_has_permission: true,
      accepts_cataloging: true
    },
    files: []
  };

  const res1 = await fetch(`${BASE_URL}/api/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload1)
  });

  if (!res1.ok) {
    console.error('  -> ERROR en Prueba 1:', await res1.text());
    process.exit(1);
  }

  const result1 = await res1.json();
  console.log('  -> [ÉXITO] Aporte guardado con éxito.');
  console.log(`  -> ID Contribución: ${result1.contributionId}`);

  // Verificar en base de datos que el email sea NULL
  const { data: dbContributor1, error: dbErr1 } = await adminSupabase
    .from('contributors')
    .select('id, email')
    .eq('dni', '99000111')
    .single();

  if (dbErr1 || !dbContributor1) {
    console.error('  -> ERROR al consultar aportante en base de datos:', dbErr1);
    process.exit(1);
  }

  if (dbContributor1.email !== null) {
    console.error(`  -> ERROR: El email no se guardó como NULL (valor guardado: "${dbContributor1.email}")`);
    process.exit(1);
  }
  console.log('  -> [VERIFICADO] El email se guardó correctamente como NULL en PostgreSQL.');

  // ====================================================
  // PRUEBA 2: Aporte con un archivo válido y otro excedido (> 50 MB)
  // ====================================================
  console.log('\nPrueba 2: Creando aporte mixto (1 archivo válido y 1 archivo de 65 MB)...');

  // A. Crear sesión de carga para el archivo válido
  const validFileName = 'valid_image_test.png';
  console.log(`  -> Creando sesión de carga para el archivo válido: ${validFileName}...`);
  const sessionRes = await fetch(`${BASE_URL}/api/upload-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: validFileName,
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
  const uploadUuid = sessionData.uploadUuid;
  const storagePath = sessionData.storagePath;

  // B. Subir el archivo de 1 KB con magic bytes PNG correctos
  console.log('  -> Subiendo datos simulados del archivo...');
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const dummyBody = Buffer.concat([pngHeader, Buffer.alloc(1016)]);

  const uploadRes = await fetch(sessionData.signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: dummyBody
  });

  if (!uploadRes.ok) {
    console.error('  -> ERROR al subir archivo:', await uploadRes.text());
    process.exit(1);
  }
  console.log('  -> [ÉXITO] Archivo subido a Supabase Storage.');

  // Confirmar estado 'uploaded' en la sesión de carga
  const confirmSessionRes = await fetch(`${BASE_URL}/api/upload-session`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploadUuid,
      status: 'uploaded'
    })
  });

  if (!confirmSessionRes.ok) {
    console.error('  -> ERROR al confirmar la sesión de carga:', await confirmSessionRes.text());
    process.exit(1);
  }
  console.log('  -> [ÉXITO] Estado de la sesión de carga confirmado como "uploaded".');

  // C. Enviar payload de contribución con 1 archivo válido y 1 archivo grande (65 MB = 68157440 bytes)
  const payload2 = {
    contributor: {
      dni: '99000222',
      full_name: 'test_pilot_Carlos',
      phone: '2974000222',
      email: 'carlos@test.com',
      relation_to_city: 'Vecino actual',
      neighborhood_or_institution: 'Barrio Parque',
      comments: 'Aporte mixto',
      allow_contact: true
    },
    contribution: {
      title: 'Aporte mixto válido y grande',
      contribution_type: 'Fotografía',
      description: 'Una foto histórica chica y un video muy pesado',
      exact_date: null,
      approximate_decade: '1970s',
      related_place: 'Estación de Tren',
      mentioned_people: null,
      related_institution: null,
      historical_context: 'Foto chica subida y video pesado pendiente.',
      authorization_level: 'A',
      credit_preference: 'Nombre completo'
    },
    consent: {
      owns_or_has_permission: true,
      accepts_cataloging: true
    },
    files: [
      { upload_uuid: uploadUuid }
    ],
    oversized_files: [
      {
        original_filename: 'video_historico_truncado.mp4',
        size_bytes: 68157440, // 65 MB
        mime_type: 'video/mp4'
      }
    ]
  };

  const res2 = await fetch(`${BASE_URL}/api/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload2)
  });

  if (!res2.ok) {
    console.error('  -> ERROR en Prueba 2:', await res2.text());
    process.exit(1);
  }

  const result2 = await res2.json();
  const contributionId2 = result2.contributionId;
  console.log('  -> [ÉXITO] Aporte mixto guardado.');
  console.log(`  -> ID Contribución: ${contributionId2}`);

  // Verificar en base de datos:
  // 1. Archivo físico válido debe estar vinculado (contribution_files)
  const { data: dbFiles2 } = await adminSupabase
    .from('contribution_files')
    .select('id, file_name, upload_status')
    .eq('contribution_id', contributionId2);

  if (!dbFiles2 || dbFiles2.length !== 1) {
    console.error(`  -> ERROR: Se esperada 1 archivo vinculado, se encontraron ${dbFiles2?.length || 0}`);
    process.exit(1);
  }
  console.log(`  -> [VERIFICADO] Archivo válido "${dbFiles2[0].file_name}" vinculado con estado "${dbFiles2[0].upload_status}".`);

  // 2. Archivo grande registrado en oversized_file_notices en estado 'pending'
  const { data: dbNotices2 } = await adminSupabase
    .from('oversized_file_notices')
    .select('id, original_filename, size_bytes, status')
    .eq('contribution_id', contributionId2);

  if (!dbNotices2 || dbNotices2.length !== 1) {
    console.error(`  -> ERROR: Se esperaba 1 aviso de archivo grande, se encontraron ${dbNotices2?.length || 0}`);
    process.exit(1);
  }
  
  const notice2 = dbNotices2[0];
  if (notice2.status !== 'pending' || notice2.original_filename !== 'video_historico_truncado.mp4') {
    console.error('  -> ERROR: Los datos del aviso no coinciden o no está pendiente:', notice2);
    process.exit(1);
  }
  console.log(`  -> [VERIFICADO] Aviso de archivo grande registrado: "${notice2.original_filename}" (${(notice2.size_bytes / 1024 / 1024).toFixed(2)} MB) en estado "${notice2.status}".`);

  // 3. Notificación administrativa creada en admin_notifications
  const { data: dbNotifs2 } = await adminSupabase
    .from('admin_notifications')
    .select('id, type, is_read, is_resolved')
    .eq('contribution_id', contributionId2);

  if (!dbNotifs2 || dbNotifs2.length !== 1) {
    console.error(`  -> ERROR: Se esperaba 1 notificación administrativa, se encontraron ${dbNotifs2?.length || 0}`);
    process.exit(1);
  }
  console.log(`  -> [VERIFICADO] Alerta administrativa creada en campanita (is_read: ${dbNotifs2[0].is_read}, is_resolved: ${dbNotifs2[0].is_resolved}).`);

  // ====================================================
  // PRUEBA 3: Aporte con todos los archivos excedidos (> 50 MB)
  // ====================================================
  console.log('\nPrueba 3: Creando aporte con todos los archivos excedidos (sin archivos válidos)...');

  const payload3 = {
    contributor: {
      dni: '99000332',
      full_name: 'test_pilot_Elena',
      phone: '2974000332',
      email: null,
      relation_to_city: 'Vecino actual',
      neighborhood_or_institution: 'Barrio Evita',
      comments: 'Aporte 100% pesado',
      allow_contact: true
    },
    contribution: {
      title: 'Aporte 100% pesado sin archivos subidos',
      contribution_type: 'Video',
      description: 'Una filmación de Super 8 digitalizada muy pesada',
      exact_date: null,
      approximate_decade: '1960s',
      related_place: 'Cine Local',
      mentioned_people: null,
      related_institution: null,
      historical_context: 'Filmación histórica de 100 MB.',
      authorization_level: 'A',
      credit_preference: 'Nombre completo'
    },
    consent: {
      owns_or_has_permission: true,
      accepts_cataloging: true
    },
    files: [], // Sin archivos válidos
    oversized_files: [
      {
        original_filename: 'filmacion_super8_truncado.mp4',
        size_bytes: 104857600, // 100 MB
        mime_type: 'video/mp4'
      }
    ]
  };

  const res3 = await fetch(`${BASE_URL}/api/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload3)
  });

  if (!res3.ok) {
    console.error('  -> ERROR en Prueba 3:', await res3.text());
    process.exit(1);
  }

  const result3 = await res3.json();
  const contributionId3 = result3.contributionId;
  console.log('  -> [ÉXITO] Aporte 100% pesado guardado.');
  console.log(`  -> ID Contribución: ${contributionId3}`);

  // Verificar en base de datos que no haya archivos vinculados en contribution_files
  const { data: dbFiles3 } = await adminSupabase
    .from('contribution_files')
    .select('id')
    .eq('contribution_id', contributionId3);

  if (dbFiles3 && dbFiles3.length > 0) {
    console.error('  -> ERROR: Se encontraron archivos vinculados para un aporte de solo excedidos');
    process.exit(1);
  }
  console.log('  -> [VERIFICADO] La contribución se creó sin filas en contribution_files.');

  // Verificar que tenga el aviso de oversized registrado
  const { data: dbNotices3 } = await adminSupabase
    .from('oversized_file_notices')
    .select('id, original_filename')
    .eq('contribution_id', contributionId3);

  if (!dbNotices3 || dbNotices3.length !== 1) {
    console.error('  -> ERROR: Falta el aviso de archivo grande pendiente para Prueba 3');
    process.exit(1);
  }
  console.log(`  -> [VERIFICADO] El aviso "${dbNotices3[0].original_filename}" quedó registrado.`);

  // ====================================================
  // PRUEBA 4: Carga posterior y resolución manual de avisos
  // ====================================================
  console.log('\nPrueba 4: Simulando carga posterior de archivo comprimido para resolver el aviso de Prueba 2...');

  // A. Crear sesión de carga para el archivo optimizado posterior
  const posteriorFileName = 'video_comprimido_resolucion.mp4';
  console.log(`  -> Creando sesión de carga para la versión comprimida posterior: ${posteriorFileName}...`);
  const sessionResPost = await fetch(`${BASE_URL}/api/upload-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: posteriorFileName,
      fileSize: 2048,
      mimeType: 'video/mp4',
      fileRole: 'derivative'
    })
  });

  if (!sessionResPost.ok) {
    console.error('  -> ERROR al crear sesión de carga posterior:', await sessionResPost.text());
    process.exit(1);
  }

  const sessionDataPost = await sessionResPost.json();
  const uploadUuidPost = sessionDataPost.uploadUuid;
  const storagePathPost = sessionDataPost.storagePath;

  // B. Subir el archivo de 2 KB con magic bytes MP4 correctos
  console.log('  -> Subiendo datos simulados del archivo posterior...');
  const mp4Header = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]);
  const dummyBodyPost = Buffer.concat([mp4Header, Buffer.alloc(2032)]);

  const uploadResPost = await fetch(sessionDataPost.signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4' },
    body: dummyBodyPost
  });

  if (!uploadResPost.ok) {
    console.error('  -> ERROR al subir archivo posterior:', await uploadResPost.text());
    process.exit(1);
  }
  console.log('  -> [ÉXITO] Archivo posterior subido a Supabase Storage.');

  // Confirmar estado 'uploaded' en la sesión de carga posterior
  const confirmSessionResPost = await fetch(`${BASE_URL}/api/upload-session`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploadUuid: uploadUuidPost,
      status: 'uploaded'
    })
  });

  if (!confirmSessionResPost.ok) {
    console.error('  -> ERROR al confirmar la sesión de carga posterior:', await confirmSessionResPost.text());
    process.exit(1);
  }
  console.log('  -> [ÉXITO] Estado de la sesión de carga posterior confirmado como "uploaded".');

  // C. Ejecutar la RPC link_files_to_contribution para vincularlo y resolver el aviso
  console.log(`  -> Vinculando el archivo posterior a la contribución ${contributionId2} y resolviendo aviso ${notice2.id}...`);
  
  // Para emular la sesión del operador en el test, usamos la RPC con el cliente de operador autenticado
  const { data: rpcLinkResult, error: rpcLinkErr } = await operatorSupabase.rpc(
    'link_files_to_contribution',
    {
      p_contribution_id: contributionId2,
      p_files: [
        {
          upload_uuid: uploadUuidPost,
          storage_path: storagePathPost,
          original_filename: posteriorFileName,
          file_role: 'derivative'
        }
      ],
      p_resolved_notice_ids: [notice2.id]
    }
  );

  if (rpcLinkErr) {
    console.error('  -> ERROR en link_files_to_contribution:', rpcLinkErr.message);
    process.exit(1);
  }

  console.log('  -> [RPC ÉXITO] link_files_to_contribution ejecutado correctamente:', rpcLinkResult);

  // D. Verificar que el aviso haya cambiado a status = 'resolved'
  const { data: dbNoticePostVerify } = await adminSupabase
    .from('oversized_file_notices')
    .select('status, resolved_at')
    .eq('id', notice2.id)
    .single();

  if (!dbNoticePostVerify || dbNoticePostVerify.status !== 'resolved') {
    console.error('  -> ERROR: El aviso no se actualizó a resolved:', dbNoticePostVerify);
    process.exit(1);
  }
  console.log(`  -> [VERIFICADO] Estado del aviso de archivo grande cambiado a "${dbNoticePostVerify.status}".`);

  // E. Verificar que la notificación de la campanita se haya resuelto automáticamente
  const { data: dbNotifVerify } = await adminSupabase
    .from('admin_notifications')
    .select('is_resolved, is_read')
    .eq('contribution_id', contributionId2)
    .single();

  if (!dbNotifVerify || !dbNotifVerify.is_resolved || !dbNotifVerify.is_read) {
    console.error('  -> ERROR: La notificación no se marcó como resuelta/leída automáticamente:', dbNotifVerify);
    process.exit(1);
  }
  console.log(`  -> [VERIFICADO] Notificación de campanita cerrada automáticamente (is_resolved: ${dbNotifVerify.is_resolved}, is_read: ${dbNotifVerify.is_read}).`);

  // ====================================================
  // PRUEBA 5: Intentar resolver aviso de otra contribución (Seguridad)
  // ====================================================
  console.log('\nPrueba 5: Validando seguridad. Intentando resolver aviso de Prueba 3 asociándolo a Prueba 2 (Debe Fallar)...');
  
  const { error: rpcLinkSecurityErr } = await operatorSupabase.rpc(
    'link_files_to_contribution',
    {
      p_contribution_id: contributionId2, // Contribución de Prueba 2
      p_files: [],
      p_resolved_notice_ids: [dbNotices3[0].id] // Aviso de Prueba 3
    }
  );

  if (rpcLinkSecurityErr) {
    console.log(`  -> [ÉXITO ESPERADO] La base de datos rechazó la operación: "${rpcLinkSecurityErr.message}"`);
  } else {
    console.error('  -> ERROR de seguridad: ¡Se permitió resolver un aviso de otra contribución!');
    process.exit(1);
  }

  // ====================================================
  // PRUEBA 6: RLS y Políticas de las nuevas tablas
  // ====================================================
  console.log('\nPrueba 6: Validando políticas RLS de lectura y escritura en oversized_file_notices y admin_notifications...');
  
  // Un usuario anónimo (público) intenta consultar las notificaciones o avisos
  const { data: anonNotices, error: anonNoticesErr } = await clientSupabase
    .from('oversized_file_notices')
    .select('*');

  if (anonNotices && anonNotices.length > 0) {
    console.error('  -> ERROR RLS: Usuario anónimo pudo leer oversized_file_notices.');
    process.exit(1);
  }
  console.log('  -> [VERIFICADO] RLS bloquea lectura anónima de avisos.');

  const { data: anonNotifs, error: anonNotifsErr } = await clientSupabase
    .from('admin_notifications')
    .select('*');

  if (anonNotifs && anonNotifs.length > 0) {
    console.error('  -> ERROR RLS: Usuario anónimo pudo leer admin_notifications.');
    process.exit(1);
  }
  console.log('  -> [VERIFICADO] RLS bloquea lectura anónima de notificaciones.');

  console.log('\n=== TODAS LAS PRUEBAS COMPLETADAS CON 100% DE ÉXITO ===\n');
}

main().catch((err) => {
  console.error('Fallo no controlado en la ejecución del script:', err);
  process.exit(1);
});
