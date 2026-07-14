import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Faltan credenciales en .env.local');
    process.exit(1);
  }

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
  const clientSupabase = createClient(supabaseUrl, anonKey);
  const staffSupabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  console.log('=== INICIANDO SESIÓN DE PRUEBA (STAFF) ===');
  const { data: signInData, error: signInError } = await staffSupabase.auth.signInWithPassword({
    email: process.env.INITIAL_ADMIN_EMAIL || 'admin@memoriaviva.org',
    password: process.env.INITIAL_ADMIN_PASSWORD || 'CambiarEstaContrasena123!'
  });

  if (signInError || !signInData.session) {
    console.error('  -> ERROR al iniciar sesión de staff para pruebas:', signInError?.message);
    process.exit(1);
  }
  console.log('  -> Sesión de staff iniciada con éxito.\n');

  console.log('=== INICIANDO PRUEBAS DE DIMENSIONES EDITORIALES Y DE PUBLICACIÓN ===\n');

  // 1. Limpiar cualquier registro previo de pruebas
  console.log('Limpiando registros de prueba previos...');
  await adminSupabase.from('contributors').delete().ilike('full_name', '%test_dimensions_%');
  console.log('  -> Base de datos limpia.\n');

  // 2. Crear Aportante y Aporte de Prueba
  console.log('Creando aportante y aporte de prueba...');
  const { data: contributor, error: cErr } = await adminSupabase
    .from('contributors')
    .insert({
      dni: '99888777',
      full_name: 'test_dimensions_Aportante',
      phone: '2974000123',
      email: 'dimensions@test.com',
      relation_to_city: 'Vecino actual',
      neighborhood_or_institution: 'Barrio Centro',
      allow_contact: true
    })
    .select()
    .single();

  if (cErr || !contributor) {
    console.error('Error al crear aportante:', cErr?.message);
    process.exit(1);
  }

  const { data: contribution, error: contribErr } = await adminSupabase
    .from('contributions')
    .insert({
      contributor_id: contributor.id,
      title: 'test_dimensions_Aporte',
      contribution_type: 'Testimonio escrito',
      description: 'Descripción de prueba para dimensiones editoriales.',
      approximate_decade: '1980s',
      related_place: 'Plaza Principal',
      authorization_level: 'A',
      credit_preference: 'Nombre completo',
      editorial_status: 'Recibido',
      consent_verified: true
    })
    .select()
    .single();

  if (contribErr || !contribution) {
    console.error('Error al crear aporte:', contribErr?.message);
    process.exit(1);
  }
  console.log(`  -> Aporte de prueba creado con ID: ${contribution.id}\n`);

  // Obtener opciones de semilla
  const { data: indOpts } = await adminSupabase.from('select_options').select('*').eq('category', 'editorial_indicator');
  const { data: pubOpts } = await adminSupabase.from('select_options').select('*').eq('category', 'publication_status');

  const missingFilesOpt = indOpts?.find(o => o.code === 'missing_files');
  const missingInfoOpt = indOpts?.find(o => o.code === 'missing_information');
  const consentPendingOpt = indOpts?.find(o => o.code === 'consent_pending');

  const notEvaluatedOpt = pubOpts?.find(o => o.code === 'not_evaluated');
  const scheduledOpt = pubOpts?.find(o => o.code === 'scheduled');
  const publishedOpt = pubOpts?.find(o => o.code === 'published');
  const withdrawnOpt = pubOpts?.find(o => o.code === 'withdrawn');

  if (!missingFilesOpt || !missingInfoOpt || !notEvaluatedOpt || !scheduledOpt || !publishedOpt || !withdrawnOpt) {
    console.error('Faltan opciones de semilla en la base de datos. Ejecutaste la migración?');
    process.exit(1);
  }

  // ====================================================
  // VALIDACIÓN 1: Inicialización con not_evaluated
  // ====================================================
  console.log('Validación 1: Verificando que el aporte se inicializó con el estado de publicación default...');
  const { data: dbContrib1 } = await adminSupabase
    .from('contributions')
    .select('publication_status_option_id')
    .eq('id', contribution.id)
    .single();
  
  if (dbContrib1?.publication_status_option_id === notEvaluatedOpt.id) {
    console.log('  -> [ÉXITO] Inicialización correcta en "No evaluado".\n');
  } else {
    console.error('  -> [FALLO] Estado de publicación incorrecto:', dbContrib1?.publication_status_option_id);
    process.exit(1);
  }

  // ====================================================
  // VALIDACIÓN 2: Un aporte mantiene un único estado editorial y de publicación
  // ====================================================
  console.log('Validación 2: Actualizando dimensiones editoriales mediante la RPC...');
  const { data: rpcRes1, error: rpcErr1 } = await staffSupabase.rpc('update_editorial_dimensions', {
    p_contribution_id: contribution.id,
    p_editorial_status: 'En revisión',
    p_publication_status_option_id: scheduledOpt.id,
    p_publication_notes: 'Notas de pub',
    p_publication_scheduled_at: new Date(Date.now() + 86400000).toISOString(), // mañana
    p_internal_notes: 'Notas de prueba',
    p_active_indicator_option_ids: [missingFilesOpt.id, missingInfoOpt.id]
  });

  if (rpcErr1) {
    console.error('  -> [FALLO] Error al invocar RPC:', rpcErr1.message);
    process.exit(1);
  }
  console.log('  -> [ÉXITO] RPC ejecutada.');

  // Verificar en base de datos
  const { data: dbContrib2 } = await adminSupabase
    .from('contributions')
    .select('editorial_status, publication_status_option_id, publication_scheduled_at')
    .eq('id', contribution.id)
    .single();

  if (dbContrib2?.editorial_status === 'En revisión' && dbContrib2?.publication_status_option_id === scheduledOpt.id) {
    console.log('  -> [ÉXITO] El aporte conserva exactamente un estado editorial y de publicación.\n');
  } else {
    console.error('  -> [FALLO] Valores incorrectos en base de datos:', dbContrib2);
    process.exit(1);
  }

  // ====================================================
  // VALIDACIÓN 3: Múltiples indicadores activos y sin duplicados activos
  // ====================================================
  console.log('Validación 3: Verificando indicadores activos...');
  const { data: activeInds } = await adminSupabase
    .from('contribution_editorial_indicators')
    .select('*')
    .eq('contribution_id', contribution.id)
    .eq('is_active', true);

  if (activeInds && activeInds.length === 2) {
    console.log('  -> [ÉXITO] Múltiples indicadores activos registrados (se encontraron 2).');
  } else {
    console.error('  -> [FALLO] Cantidad incorrecta de indicadores activos:', activeInds?.length);
    process.exit(1);
  }

  // Intentar crear un indicador duplicado activo para el mismo aporte
  console.log('Intentando insertar un duplicado de indicador activo directamente...');
  const { error: dupErr } = await adminSupabase
    .from('contribution_editorial_indicators')
    .insert({
      contribution_id: contribution.id,
      indicator_option_id: missingFilesOpt.id,
      is_active: true
    });

  if (dupErr && dupErr.code === '23505') { // unique violation code
    console.log('  -> [ÉXITO] Bloqueado por índice único (duplicado activo impedido correctamente).\n');
  } else {
    console.error('  -> [FALLO] Se permitió insertar un duplicado activo o falló con otro error:', dupErr?.message);
    process.exit(1);
  }

  // ====================================================
  // VALIDACIÓN 4: Resolver un indicador conserva historial (Baja lógica)
  // ====================================================
  console.log('Validación 4: Resolviendo un indicador (desmarcando missing_information)...');
  // Llamamos a la RPC enviando solo missingFilesOpt en el arreglo
  const { error: rpcErr2 } = await staffSupabase.rpc('update_editorial_dimensions', {
    p_contribution_id: contribution.id,
    p_editorial_status: 'En revisión',
    p_publication_status_option_id: scheduledOpt.id,
    p_publication_notes: 'Notas de pub',
    p_publication_scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    p_internal_notes: 'Notas de prueba',
    p_active_indicator_option_ids: [missingFilesOpt.id]
  });

  if (rpcErr2) {
    console.error('  -> [FALLO] Error al invocar RPC para resolver:', rpcErr2.message);
    process.exit(1);
  }

  // Verificar que el indicador desmarcado esté inactivo pero conserve historial
  const { data: allInds } = await adminSupabase
    .from('contribution_editorial_indicators')
    .select('*')
    .eq('contribution_id', contribution.id)
    .order('created_at', { ascending: true });

  const filesInd = allInds?.find(i => i.indicator_option_id === missingFilesOpt.id);
  const infoInd = allInds?.find(i => i.indicator_option_id === missingInfoOpt.id);

  if (filesInd?.is_active === true && infoInd?.is_active === false && infoInd?.resolved_at !== null) {
    console.log('  -> [ÉXITO] Indicador resuelto lógicamente. Se conserva la fila histórica en BD.\n');
  } else {
    console.error('  -> [FALLO] Conservación de historial incorrecta:', allInds);
    process.exit(1);
  }

  // ====================================================
  // VALIDACIÓN 5: Reactivar un indicador crea un nuevo ciclo histórico
  // ====================================================
  console.log('Validación 5: Reactivando el indicador resuelto (marcando missing_information nuevamente)...');
  const { error: rpcErr3 } = await staffSupabase.rpc('update_editorial_dimensions', {
    p_contribution_id: contribution.id,
    p_editorial_status: 'En revisión',
    p_publication_status_option_id: scheduledOpt.id,
    p_publication_notes: 'Notas de pub',
    p_publication_scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    p_internal_notes: 'Notas de prueba',
    p_active_indicator_option_ids: [missingFilesOpt.id, missingInfoOpt.id]
  });

  if (rpcErr3) {
    console.error('  -> [FALLO] Error al reactivar:', rpcErr3.message);
    process.exit(1);
  }

  // Verificar la tabla
  const { data: allIndsAfterReact } = await adminSupabase
    .from('contribution_editorial_indicators')
    .select('*')
    .eq('contribution_id', contribution.id)
    .eq('indicator_option_id', missingInfoOpt.id)
    .order('created_at', { ascending: true });

  if (allIndsAfterReact && allIndsAfterReact.length === 2) {
    const firstCycle = allIndsAfterReact[0];
    const secondCycle = allIndsAfterReact[1];
    
    if (firstCycle.is_active === false && secondCycle.is_active === true) {
      console.log('  -> [ÉXITO] Reactivación generó una nueva fila. Historial de ciclos conservado intacto.\n');
    } else {
      console.error('  -> [FALLO] Estados incorrectos de ciclos de reactivación:', allIndsAfterReact);
      process.exit(1);
    }
  } else {
    console.error('  -> [FALLO] Debería haber 2 filas para el indicador reactivado, encontradas:', allIndsAfterReact?.length);
    process.exit(1);
  }

  // ====================================================
  // VALIDACIÓN 6: Cambiar publicación no afecta estado editorial, ni indicadores afectan consentimiento
  // ====================================================
  console.log('Validación 6: Cambiando estado de publicación a "No publicable" y desmarcando indicadores...');
  const { error: rpcErr4 } = await staffSupabase.rpc('update_editorial_dimensions', {
    p_contribution_id: contribution.id,
    p_editorial_status: 'En revisión', // se mantiene
    p_publication_status_option_id: withdrawnOpt.id,
    p_publication_notes: 'Notas de pub',
    p_publication_scheduled_at: null,
    p_internal_notes: 'Modificación de prueba',
    p_active_indicator_option_ids: [] // sin indicadores
  });

  if (rpcErr4) {
    console.error('  -> [FALLO] Error en RPC:', rpcErr4.message);
    process.exit(1);
  }

  // Verificar que el estado editorial y el consentimiento sigan intactos
  const { data: dbContrib3 } = await adminSupabase
    .from('contributions')
    .select('editorial_status, authorization_level, credit_preference, consent_verified')
    .eq('id', contribution.id)
    .single();

  if (
    dbContrib3?.editorial_status === 'En revisión' && 
    dbContrib3?.authorization_level === 'A' && 
    dbContrib3?.credit_preference === 'Nombre completo' &&
    dbContrib3?.consent_verified === true
  ) {
    console.log('  -> [ÉXITO] Cambiar publicación y desmarcar indicadores no modificó el consentimiento ni el estado editorial.\n');
  } else {
    console.error('  -> [FALLO] Side-effects detectados en consentimiento o estado editorial:', dbContrib3);
    process.exit(1);
  }

  // ====================================================
  // VALIDACIÓN 7: Reglas de validación de fechas (Scheduled exige fecha)
  // ====================================================
  console.log('Validación 7: Validando que "scheduled" lance error si no se especifica fecha programada...');
  const { error: dateErr } = await staffSupabase.rpc('update_editorial_dimensions', {
    p_contribution_id: contribution.id,
    p_editorial_status: 'En revisión',
    p_publication_status_option_id: scheduledOpt.id,
    p_publication_notes: 'Notas de pub',
    p_publication_scheduled_at: null, // error requerido!
    p_internal_notes: 'Fallo de prueba',
    p_active_indicator_option_ids: []
  });

  if (dateErr) {
    console.log('  -> [ÉXITO] Bloqueado correctamente con error:', dateErr.message);
  } else {
    console.error('  -> [FALLO] Se permitió programar una fecha nula sin lanzar error.');
    process.exit(1);
  }

  // Validar auto-completado de fechas para published y withdrawn sin pisar historial
  console.log('Verificando auto-completado de fecha en estado "withdrawn" (Retirado)...');
  const { data: dbContribDates } = await adminSupabase
    .from('contributions')
    .select('withdrawn_at')
    .eq('id', contribution.id)
    .single();

  if (dbContribDates?.withdrawn_at) {
    console.log('  -> [ÉXITO] withdrawn_at completado automáticamente al pasar a Retirado.\n');
  } else {
    console.error('  -> [FALLO] withdrawn_at está vacío.');
    process.exit(1);
  }

  // ====================================================
  // VALIDACIÓN 8: Row Level Security (RLS) en select_options
  // ====================================================
  console.log('Validación 8: Probando RLS en select_options para cliente anónimo...');
  
  // Cliente anónimo lee opciones
  const { data: anonOptions, error: anonErr } = await clientSupabase
    .from('select_options')
    .select('category, name');

  if (anonErr) {
    console.error('  -> [FALLO] Error en lectura anónima:', anonErr.message);
    process.exit(1);
  }

  // Contar cuántos son internos
  const internalAnonRead = anonOptions?.filter(o => 
    o.category === 'editorial_indicator' || o.category === 'publication_status'
  );

  if (internalAnonRead && internalAnonRead.length === 0) {
    console.log('  -> [ÉXITO] Anónimo no puede leer categorías internas (editorial_indicator, publication_status).');
  } else {
    console.error('  -> [FALLO] Fuga de seguridad: Anónimo leyó opciones internas:', internalAnonRead);
    process.exit(1);
  }

  const publicAnonRead = anonOptions?.filter(o => 
    o.category === 'relation_to_city' || o.category === 'contribution_type'
  );

  if (publicAnonRead && publicAnonRead.length > 0) {
    console.log('  -> [ÉXITO] Anónimo pudo leer las categorías públicas correctamente.');
  } else {
    console.error('  -> [FALLO] Anónimo no pudo leer categorías públicas.');
    process.exit(1);
  }

  // Intento de inserción anónima
  const { error: anonWriteErr } = await clientSupabase
    .from('select_options')
    .insert({
      category: 'relation_to_city',
      value: 'Pirata',
      name: 'Pirata informático'
    });

  if (anonWriteErr) {
    console.log('  -> [ÉXITO] Inserción anónima bloqueada por RLS (Error:', anonWriteErr.message, ').\n');
  } else {
    console.error('  -> [FALLO] Fuga de seguridad: Cliente anónimo pudo insertar una opción en select_options.');
    process.exit(1);
  }

  // ====================================================
  // LIMPIEZA FINAL
  // ====================================================
  console.log('Limpiando registros de prueba...');
  await adminSupabase.from('contributors').delete().eq('id', contributor.id);
  console.log('  -> Limpieza finalizada con éxito.\n');

  console.log('====================================================');
  console.log('✓ ¡TODAS LAS VALIDACIONES PASARON EXITOSAMENTE! (100%)');
  console.log('====================================================');
}

main().catch(console.error);
