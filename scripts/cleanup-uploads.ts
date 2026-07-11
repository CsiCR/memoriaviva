import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Faltan credenciales de Supabase en el entorno.');
    process.exit(1);
  }

  const execute = process.argv.includes('--execute');
  console.log(`=== SCRIPT DE LIMPIEZA DE ARCHIVOS HUÉRFANOS ===`);
  console.log(`Modo: ${execute ? 'EJECUCIÓN REAL (Baja física y lógica)' : 'DRY-RUN (Simulación)'}`);
  console.log(`-----------------------------------------------`);

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 1. Obtener candidatos de upload_sessions
  // Límite de antigüedad: 48 horas
  const thresholdDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  console.log(`Buscando sesiones inactivas o expiradas creadas antes de: ${thresholdDate}`);

  // Traer todas las sesiones excepto las 'linked', 'deleted' o 'quarantined'
  const { data: sessions, error } = await supabase
    .from('upload_sessions')
    .select('*')
    .not('status', 'in', '("linked","deleted","quarantined")');

  if (error) {
    console.error('Error al consultar upload_sessions:', error);
    process.exit(1);
  }

  if (!sessions || sessions.length === 0) {
    console.log('No se encontraron sesiones candidatas a limpieza.');
    return;
  }

  console.log(`Se encontraron ${sessions.length} sesiones activas. Aplicando filtros de antigüedad y estado...`);

  let countCandidates = 0;
  let countCleaned = 0;

  for (const session of sessions) {
    const expiresAt = new Date(session.expires_at);
    const lastActivity = new Date(session.last_activity_at);
    const now = new Date();

    let shouldClean = false;
    let reason = '';

    // Filtros de limpieza por estado (Requisito 3 - Políticas de limpieza)
    if (['pending', 'uploaded', 'failed', 'expired'].includes(session.status)) {
      if (lastActivity < new Date(Date.now() - 48 * 60 * 60 * 1000) || expiresAt < now) {
        shouldClean = true;
        reason = `Estado '${session.status}' inactivo por más de 48 horas o expirado.`;
      }
    } else if (session.status === 'uploading') {
      if (lastActivity < new Date(Date.now() - 48 * 60 * 60 * 1000)) {
        shouldClean = true;
        reason = `Estado 'uploading' sin actividad en las últimas 48 horas.`;
      }
    }

    if (!shouldClean) continue;

    countCandidates++;
    console.log(`[Candidato] UUID: ${session.upload_uuid} | Archivo: ${session.storage_path.split('/').pop()} | Estado: ${session.status} | Motivo: ${reason}`);

    if (execute) {
      try {
        // A. Eliminar archivo físico en Supabase Storage
        const { data: fileExists } = await supabase.storage
          .from('historical-uploads')
          .list(path.dirname(session.storage_path), {
            search: path.basename(session.storage_path)
          });

        if (fileExists && fileExists.length > 0) {
          console.log(`  -> Eliminando archivo físico: ${session.storage_path}`);
          const { error: deleteStorageError } = await supabase.storage
            .from('historical-uploads')
            .remove([session.storage_path]);

          if (deleteStorageError) {
            console.warn(`  -> Error al eliminar de Storage: ${deleteStorageError.message}`);
          }
        }

        // B. Baja lógica en la base de datos (upload_sessions)
        const { error: dbUpdateError } = await supabase
          .from('upload_sessions')
          .update({
            status: 'deleted',
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id);

        if (dbUpdateError) {
          throw dbUpdateError;
        }

        // C. Registrar en la bitácora de auditoría
        const { error: auditError } = await supabase
          .from('audit_logs')
          .insert({
            table_name: 'upload_sessions',
            record_id: session.id,
            action: 'CLEANUP',
            old_value: session,
            new_value: { status: 'deleted', deleted_at: new Date().toISOString() },
            actor_user_id: null // Ejecutado por el sistema/cron
          });

        if (auditError) {
          console.warn(`  -> Error al guardar bitácora de auditoría: ${auditError.message}`);
        }

        console.log(`  -> [ÉXITO] Limpiado correctamente.`);
        countCleaned++;
      } catch (err: any) {
        console.error(`  -> [ERROR] Falló la limpieza para sesión ${session.upload_uuid}:`, err.message || err);
      }
    }
  }

  console.log(`-----------------------------------------------`);
  console.log(`Resumen de la simulación/ejecución:`);
  console.log(`Total de sesiones inspeccionadas: ${sessions.length}`);
  console.log(`Total de candidatos detectados: ${countCandidates}`);
  if (execute) {
    console.log(`Total de sesiones limpiadas físicamente: ${countCleaned}`);
  } else {
    console.log(`Para ejecutar la limpieza física y lógica real, ejecute: npx tsx scripts/cleanup-uploads.ts --execute`);
  }
}

main().catch(console.error);
