import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = 'http://localhost:3000';

async function main() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Faltan credenciales.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('=== INICIANDO PRUEBA DE CANCELACIÓN Y CONTROL DE INCIDENCIAS ===\n');

  // 1. Crear sesión de carga
  console.log('Paso 1: Creando sesión de carga...');
  const sessionRes = await fetch(`${BASE_URL}/api/upload-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: 'cancel_test.mp4',
      fileSize: 50 * 1024 * 1024,
      mimeType: 'video/mp4',
      fileRole: 'original'
    })
  });

  const sessionData = await sessionRes.json();
  const uploadUuid = sessionData.uploadUuid;
  console.log(`  -> Sesión creada con UUID: ${uploadUuid}`);

  // 2. Simular cancelación del lado del cliente
  console.log('\nPaso 2: Simulando cancelación de carga...');
  const cancelRes = await fetch(`${BASE_URL}/api/upload-session`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploadUuid,
      status: 'failed'
    })
  });

  if (!cancelRes.ok) {
    console.error('  -> ERROR al cancelar la sesión:', await cancelRes.text());
    process.exit(1);
  }
  console.log('  -> Estado de sesión actualizado a "failed" (Simulando cancelación).');

  // 3. Verificar estado de la sesión en BD
  const { data: sessionInDb } = await supabase
    .from('upload_sessions')
    .select('*')
    .eq('upload_uuid', uploadUuid)
    .single();

  console.log(`  -> Estado de la sesión en la base de datos: ${sessionInDb?.status} (Esperado: failed)`);
  if (sessionInDb?.status !== 'failed') {
    console.error('  -> ERROR: El estado final en BD no es failed.');
    process.exit(1);
  }

  // 4. Intentar vincular esta carga fallida a un aporte (Debe fallar)
  console.log('\nPaso 3: Intentando vincular la carga cancelada a una contribución...');
  const linkRes = await fetch(`${BASE_URL}/api/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contributor: {
        dni: '44444555',
        full_name: 'Aportante Cancelación',
        phone: '297444444',
        email: 'cancel@piloto.org',
        relation_to_city: 'Vecino Pionero',
        neighborhood_or_institution: 'Centro'
      },
      contribution: {
        title: 'Intento de Aporte con Carga Cancelada',
        contribution_type: 'Video',
        description: 'Este aporte no debe crearse.',
        related_place: 'Pico Truncado',
        authorization_level: 'A',
        credit_preference: 'Nombre completo'
      },
      consent: {
        owns_or_has_permission: true,
        accepts_cataloging: true
      },
      files: [{ upload_uuid: uploadUuid }]
    })
  });

  console.log(`  -> Código de respuesta HTTP: ${linkRes.status} (Esperado: 400)`);
  const linkResult = await linkRes.json();
  console.log(`  -> Cuerpo de la respuesta:`, linkResult);

  if (linkRes.status === 400 && linkResult.error && (linkResult.error.includes('no tiene un estado válido') || linkResult.error.includes('no ha finalizado su carga'))) {
    console.log('  -> [ÉXITO] El servidor rechazó correctamente la vinculación de un archivo cancelado/incompleto.');
  } else {
    console.error('  -> [FALLO] El servidor aceptó o manejó incorrectamente la vinculación.');
    process.exit(1);
  }

  // 5. Verificar que el aporte y el archivo de contribución NO existan en BD (Garantizar consistencia)
  const { data: contributorRecords } = await supabase
    .from('contributors')
    .select('*')
    .eq('full_name', 'Aportante Cancelación');

  console.log(`  -> Registros de aportante insertados: ${contributorRecords?.length || 0} (Esperado: 0)`);

  const { data: fileRecords } = await supabase
    .from('contribution_files')
    .select('*')
    .eq('upload_id', sessionInDb?.id);

  console.log(`  -> Registros de archivo vinculados en BD: ${fileRecords?.length || 0} (Esperado: 0)`);

  if ((contributorRecords?.length || 0) === 0 && (fileRecords?.length || 0) === 0) {
    console.log('\n=== PRUEBA DE CANCELACIÓN Y CONTROL PASADA CON ÉXITO ===');
  } else {
    console.error('\n  -> ERROR: Se encontraron registros remanentes en base de datos.');
    process.exit(1);
  }
}

main().catch(console.error);
