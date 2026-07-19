import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  throw new Error("El script requiere SUPABASE_SERVICE_ROLE_KEY y no debe ejecutarse con claves anónimas.");
}

async function runBackfill() {
  const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  console.log('=== INICIANDO BACKFILL DE CONSISTENCIA DEL CONSENTIMIENTO ===');

  // 1. Obtener aportes
  const { data: contributions, error: contribError } = await supabase
    .from('contributions')
    .select('id, consent_verified');

  if (contribError || !contributions) {
    console.error('Error al obtener aportes:', contribError?.message);
    process.exit(1);
  }

  // 2. Obtener registros de consentimiento
  const { data: consentRecords, error: consentError } = await supabase
    .from('consent_records')
    .select('contribution_id, accepted_at, owns_or_has_permission, accepts_cataloging');

  if (consentError || !consentRecords) {
    console.error('Error al obtener registros de consentimiento:', consentError?.message);
    process.exit(1);
  }

  console.log(`Se encontraron ${contributions.length} aportes y ${consentRecords.length} registros de consentimiento.`);

  let falseToTrue = 0;
  let trueToFalse = 0;
  let unchanged = 0;
  const updates: Array<{ id: string; consent_verified: boolean }> = [];

  for (const contrib of contributions) {
    // Evaluar la condición canónica en JS
    const hasValidConsent = consentRecords.some(
      (rec) =>
        rec.contribution_id === contrib.id &&
        rec.accepted_at !== null &&
        rec.owns_or_has_permission === true &&
        rec.accepts_cataloging === true
    );

    const currentCached = contrib.consent_verified || false;

    if (currentCached === false && hasValidConsent === true) {
      falseToTrue++;
      updates.push({ id: contrib.id, consent_verified: true });
    } else if (currentCached === true && hasValidConsent === false) {
      trueToFalse++;
      updates.push({ id: contrib.id, consent_verified: false });
    } else {
      unchanged++;
    }
  }

  console.log('\n--- PLAN DE TRANSICIÓN ---');
  console.log(`De FALSE a TRUE:   ${falseToTrue}`);
  console.log(`De TRUE a FALSE:   ${trueToFalse}`);
  console.log(`Sin cambios:       ${unchanged}`);
  console.log(`Total a actualizar: ${updates.length}`);

  if (updates.length > 0) {
    console.log('\nAplicando actualizaciones en la base de datos...');
    let successCount = 0;
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('contributions')
        .update({ consent_verified: update.consent_verified })
        .eq('id', update.id);

      if (updateError) {
        console.error(`Error al actualizar aporte ${update.id}:`, updateError.message);
      } else {
        successCount++;
      }
    }
    console.log(`\n¡Sincronización completada! Se actualizaron con éxito ${successCount} de ${updates.length} registros divergentes.`);
  } else {
    console.log('\nNo se detectaron divergencias de consistencia. La caché está 100% al día.');
  }
}

runBackfill().catch(console.error);
