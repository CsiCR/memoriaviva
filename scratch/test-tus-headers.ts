import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as tus from 'tus-js-client';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testTusHeaders() {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error('Faltan credenciales.');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const projectId = supabaseUrl.replace('https://', '').split('.')[0];
  const endpoint = `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;

  // 1. Crear archivo de 1 MB
  const scratchDir = path.resolve(process.cwd(), 'scratch');
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir);
  const testFilePath = path.join(scratchDir, 'test_tus_head.png');
  const buffer = Buffer.alloc(1 * 1024 * 1024);
  buffer.write('ftypmp42', 4); // Usar firma válida
  fs.writeFileSync(testFilePath, buffer);

  // 2. Crear signed upload URL
  const storagePath = `temporary/test-tus-head-${Date.now()}.mp4`;
  const { data: signData, error: signError } = await supabase.storage
    .from('historical-uploads')
    .createSignedUploadUrl(storagePath);

  if (signError) {
    console.error('Error al crear URL firmada:', signError);
    return;
  }

  const token = signData.token;
  console.log('Token de firma creado.');

  // 3. Probar TUS con apikey header
  console.log('Iniciando subida TUS con x-signature y apikey...');
  const fileStream = fs.createReadStream(testFilePath);

  const upload = new tus.Upload(fileStream, {
    endpoint,
    uploadSize: buffer.length,
    chunkSize: 6 * 1024 * 1024,
    headers: {
      'apikey': serviceRoleKey,
      'x-signature': token
    },
    metadata: {
      bucketName: 'historical-uploads',
      objectName: storagePath,
      contentType: 'video/mp4'
    },
    onProgress: (bytesUploaded, bytesTotal) => {
      console.log(`Progreso: ${Math.round((bytesUploaded / bytesTotal) * 100)}%`);
    },
    onSuccess: () => {
      console.log('¡Éxito total en subida TUS!');
      cleanup();
    },
    onError: (err) => {
      console.error('Error en subida TUS:', err.message);
      cleanup();
    }
  });

  upload.start();

  function cleanup() {
    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    supabase.storage.from('historical-uploads').remove([storagePath]).then(() => {
      console.log('Limpiado archivo temporal de Storage.');
    });
  }
}

testTusHeaders().catch(console.error);
