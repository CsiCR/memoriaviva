import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testDownload() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Faltan credenciales.');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  // 1. Subir un archivo de prueba pequeño
  const testPath = `temporary/test-range-check.png`;
  const fileContent = Buffer.from('hola mundo este es un archivo de prueba para descargar');

  console.log('Subiendo archivo de prueba...');
  const { data, error } = await supabase.storage
    .from('historical-uploads')
    .upload(testPath, fileContent, { upsert: true, contentType: 'image/png' });

  if (error) {
    console.error('Error al subir:', error);
    return;
  }
  console.log('Archivo subido con éxito:', data);

  // 2. Probar GET sin cabecera de rango
  console.log('\n2. Petición GET sin cabecera Range...');
  const url = `${supabaseUrl}/storage/v1/object/authenticated/historical-uploads/${testPath}`;
  
  let res = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  });

  console.log(`GET sin Range: status = ${res.status}`);
  if (!res.ok) {
    console.log('Body:', await res.text());
  } else {
    const text = await res.text();
    console.log(`Éxito, tamaño = ${text.length} bytes, contenido = ${text}`);
  }

  // 3. Probar GET con cabecera de rango
  console.log('\n3. Petición GET con cabecera Range: bytes=0-10...');
  res = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Range': 'bytes=0-10'
    }
  });

  console.log(`GET con Range: status = ${res.status}`);
  const responseText = await res.text();
  console.log('Body:', responseText);

  // Limpiar archivo
  await supabase.storage.from('historical-uploads').remove([testPath]);
}

testDownload().catch(console.error);
