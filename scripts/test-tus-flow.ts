import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as tus from 'tus-js-client';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = 'http://localhost:3000';

async function main() {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error('Faltan credenciales.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('=== INICIANDO PRUEBA REAL DE FLUJO TUS (VIDEO 12 MB) ===\n');

  // 1. Crear directorio scratch si no existe y generar video de 12 MB con magic bytes válidos
  const scratchDir = path.resolve(process.cwd(), 'scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir);
  }

  const mockVideoPath = path.join(scratchDir, 'mock_video.mp4');
  const mockSize = 12 * 1024 * 1024; // 12 MB
  const buffer = Buffer.alloc(mockSize);
  buffer.write('ftypmp42', 4); // Signature de video MP4
  fs.writeFileSync(mockVideoPath, buffer);

  console.log(`[Éxito] Generado archivo de video simulado en: ${mockVideoPath} (${mockSize} bytes).`);

  // 2. Crear sesión de carga en la base de datos
  console.log('\nPaso 1: Creando sesión de carga en el servidor para TUS...');
  const sessionRes = await fetch(`${BASE_URL}/api/upload-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: 'mock_video.mp4',
      fileSize: mockSize,
      mimeType: 'video/mp4',
      fileRole: 'original'
    })
  });

  if (!sessionRes.ok) {
    console.error('  -> ERROR al crear sesión de carga:', await sessionRes.text());
    cleanupFile(mockVideoPath);
    process.exit(1);
  }

  const sessionData = await sessionRes.json();
  const uploadUuid = sessionData.uploadUuid;
  console.log(`  -> [ÉXITO] Sesión creada con UUID: ${uploadUuid}`);

  // Verificar estado inicial en Base de Datos
  let { data: initialSession } = await supabase
    .from('upload_sessions')
    .select('*')
    .eq('upload_uuid', uploadUuid)
    .single();

  console.log(`  -> Estado inicial en BD: ${initialSession?.status} (Esperado: pending)`);
  if (initialSession?.status !== 'pending') {
    console.error('  -> ERROR: Estado inicial incorrecto.');
    cleanupFile(mockVideoPath);
    process.exit(1);
  }

  // 3. Iniciar Carga TUS con pausa y reanudación
  console.log('\nPaso 2: Iniciando carga TUS...');
  const projectId = supabaseUrl.replace('https://', '').split('.')[0];
  const endpoint = `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;

  // Actualizar estado a 'uploading'
  await fetch(`${BASE_URL}/api/upload-session`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadUuid, status: 'uploading' })
  });

  const fileStream = fs.createReadStream(mockVideoPath);
  let upload: tus.Upload;
  let hasPaused = false;
  let uploadOffset = 0;

  const uploadPromise = new Promise<void>((resolve, reject) => {
    upload = new tus.Upload(fileStream, {
      endpoint,
      uploadSize: mockSize,
      chunkSize: 6 * 1024 * 1024, // 6 MB chunks
      headers: {
        'apikey': anonKey,
        'x-signature': sessionData.token
      },
      metadata: {
        bucketName: 'historical-uploads',
        objectName: sessionData.storagePath,
        contentType: 'video/mp4'
      },
      onProgress: async (bytesUploaded, bytesTotal) => {
        const pct = Math.round((bytesUploaded / bytesTotal) * 100);
        console.log(`  -> Progreso: ${pct}% (${bytesUploaded} bytes subidos)`);

        // Simular Pausa al subir el primer bloque (6 MB = 50%)
        if (pct >= 50 && !hasPaused) {
          hasPaused = true;
          console.log('\n=== PAUSANDO CARGA TUS MANUALMENTE ===');
          upload.abort();
          
          // Actualizar estado a 'paused'
          await fetch(`${BASE_URL}/api/upload-session`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uploadUuid, status: 'paused' })
          });

          // Verificar estado en BD y last_activity_at
          const { data: pausedSession } = await supabase
            .from('upload_sessions')
            .select('*')
            .eq('upload_uuid', uploadUuid)
            .single();
          console.log(`  -> Estado en BD: ${pausedSession?.status} (Esperado: paused)`);
          console.log(`  -> Última actividad: ${pausedSession?.last_activity_at}`);

          // Esperar 3 segundos y reanudar
          console.log('Esperando 3 segundos para reanudar...');
          setTimeout(async () => {
            console.log('\n=== REANUDANDO CARGA TUS ===');
            await fetch(`${BASE_URL}/api/upload-session`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uploadUuid, status: 'uploading' })
            });

            // Volver a instanciar o continuar la carga
            upload.start();
          }, 3000);
        }
      },
      onSuccess: async () => {
        console.log('  -> [ÉXITO] Carga TUS física finalizada.');
        
        // Actualizar estado a 'uploaded'
        await fetch(`${BASE_URL}/api/upload-session`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadUuid, status: 'uploaded' })
        });
        resolve();
      },
      onError: (err) => {
        if (hasPaused && err.message.includes('abort')) {
          // Ignorar error de abort esperado
          return;
        }
        reject(err);
      }
    });

    upload.start();
  });

  await uploadPromise;

  // 4. Verificar estado 'uploaded' en BD
  console.log('\nPaso 3: Verificando estado en BD tras finalizar carga...');
  const { data: uploadedSession } = await supabase
    .from('upload_sessions')
    .select('*')
    .eq('upload_uuid', uploadUuid)
    .single();

  console.log(`  -> Estado en BD: ${uploadedSession?.status} (Esperado: uploaded)`);
  if (uploadedSession?.status !== 'uploaded') {
    console.error('  -> ERROR: La sesión de carga no figura como uploaded.');
    cleanupFile(mockVideoPath);
    process.exit(1);
  }

  // 5. Vincular transaccionalmente al Aporte
  console.log('\nPaso 4: Vinculando archivo de video al aporte mediante RPC...');
  const contributeRes = await fetch(`${BASE_URL}/api/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contributor: {
        dni: '12345678',
        full_name: 'Andres Freile Piloto TUS',
        phone: '297444444',
        email: 'freile_tus@piloto.org',
        relation_to_city: 'Vecino Pionero',
        neighborhood_or_institution: 'Centro'
      },
      contribution: {
        title: 'Video Andrés Freile Piloto Real TUS',
        contribution_type: 'Video',
        description: 'Prueba de carga de video grande TUS.',
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

  if (!contributeRes.ok) {
    console.error('  -> ERROR al registrar el aporte:', await contributeRes.text());
    cleanupFile(mockVideoPath);
    process.exit(1);
  }

  const contributeResult = await contributeRes.json();
  console.log('  -> [ÉXITO] Aporte registrado:', contributeResult);

  // 6. Verificar estados finales de vinculación en base de datos
  console.log('\nPaso 5: Verificando estados de vinculación final en base de datos...');
  
  // A. Estado de la sesión de carga
  const { data: finalSession } = await supabase
    .from('upload_sessions')
    .select('*')
    .eq('upload_uuid', uploadUuid)
    .single();
  console.log(`  -> Estado final de sesión en BD: ${finalSession?.status} (Esperado: linked)`);

  // B. Estado del archivo en contribution_files
  const { data: fileRecord } = await supabase
    .from('contribution_files')
    .select('*')
    .eq('upload_id', finalSession?.id)
    .single();
  
  console.log(`  -> Relación vinculada: ${fileRecord ? 'SÍ' : 'NO'}`);
  console.log(`  -> processing_status en BD: ${fileRecord?.processing_status} (Esperado: pending)`);

  if (finalSession?.status === 'linked' && fileRecord?.processing_status === 'pending') {
    console.log('\n=== PRUEBA DE FLUJO TUS PASADA CON ÉXITO 100% ===');
  } else {
    console.error('\n  -> ERROR en los estados de vinculación finales.');
    cleanupFile(mockVideoPath);
    process.exit(1);
  }

  cleanupFile(mockVideoPath);
}

function cleanupFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Limpieza] Eliminado archivo local temporal: ${filePath}`);
    }
  } catch (err) {
    console.error('Error al limpiar archivo local:', err);
  }
}

main().catch(console.error);
