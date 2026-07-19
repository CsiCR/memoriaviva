import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("Error: La prueba requiere SUPABASE_SERVICE_ROLE_KEY y no debe ejecutarse con anon key.");
  process.exit(1);
}

const adminSupabase = createClient(supabaseUrl!, serviceRoleKey!, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runTests() {
  console.log('=== INICIANDO PRUEBAS UNITARIAS DE TRIGGERS Y CONSISTENCIA ===\n');

  // Arreglos para limpiar datos temporales al finalizar
  const tempContributorIds: string[] = [];
  const tempContributionIds: string[] = [];
  const tempConsentIds: string[] = [];

  const cleanup = async () => {
    console.log('\nLimpiando datos temporales de prueba...');
    
    // El orden de borrado respeta las claves foráneas
    if (tempConsentIds.length > 0) {
      await adminSupabase.from('consent_records').delete().in('id', tempConsentIds);
    }
    if (tempContributionIds.length > 0) {
      await adminSupabase.from('contributions').delete().in('id', tempContributionIds);
    }
    if (tempContributorIds.length > 0) {
      await adminSupabase.from('contributors').delete().in('id', tempContributorIds);
    }
    console.log('Limpieza completada.');
  };

  try {
    // Helper para crear un aportante de prueba temporal
    const createTempContributor = async (fullName: string) => {
      const { data, error } = await adminSupabase
        .from('contributors')
        .insert({
          dni: `test_${Math.floor(Math.random() * 10000000)}`,
          full_name: fullName,
          phone: '2974000000',
          email: 'test@memoriaviva.org',
          relation_to_city: 'Vecino actual',
          neighborhood_or_institution: 'Barrio YPF',
          allow_contact: false
        })
        .select()
        .single();
      
      if (error || !data) throw new Error(`Error al crear aportante de prueba: ${error?.message}`);
      tempContributorIds.push(data.id);
      return data;
    };

    // Helper para crear un aporte de prueba temporal
    const createTempContribution = async (contributorId: string, title: string) => {
      const { data, error } = await adminSupabase
        .from('contributions')
        .insert({
          contributor_id: contributorId,
          title: title,
          contribution_type: 'Testimonio escrito',
          description: 'Aporte de prueba temporal.',
          related_place: 'Centro',
          authorization_level: 'A',
          credit_preference: 'Anónimo',
          consent_source: 'web_form',
          consent_verified: false, // Inicia en FALSE
          editorial_status: 'Recibido'
        })
        .select()
        .single();

      if (error || !data) throw new Error(`Error al crear aporte de prueba: ${error?.message}`);
      tempContributionIds.push(data.id);
      return data;
    };

    // 1. Crear datos iniciales
    const contributor = await createTempContributor('Aportante Test Triggers');
    const contributionA = await createTempContribution(contributor.id, 'Aporte Test Sincronización A');

    // ====================================================
    // PRUEBA 1: Crear consentimiento válido -> caché pasa a TRUE
    // ====================================================
    console.log('Prueba 1: Creando consentimiento válido para Aporte A...');
    const { data: consent1, error: err1 } = await adminSupabase
      .from('consent_records')
      .insert({
        contributor_id: contributor.id,
        contribution_id: contributionA.id,
        authorization_level: 'A',
        credit_preference: 'Anónimo',
        owns_or_has_permission: true,
        accepts_cataloging: true,
        consent_text_version: 'Versión Test'
      })
      .select()
      .single();

    if (err1 || !consent1) throw new Error(`Error al insertar consentimiento: ${err1?.message}`);
    tempConsentIds.push(consent1.id);

    // Verificar si el aporte pasó a true
    const { data: check1 } = await adminSupabase
      .from('contributions')
      .select('consent_verified')
      .eq('id', contributionA.id)
      .single();

    if (check1?.consent_verified === true) {
      console.log('  -> [ÉXITO] consent_verified cambió a TRUE automáticamente.\n');
    } else {
      console.error('  -> [FALLO] consent_verified permanece en FALSE.');
      process.exit(1);
    }

    // ====================================================
    // PRUEBA 2: Fila con owns_or_has_permission = false -> caché permanece FALSE (o es bloqueado por constraint)
    // ====================================================
    console.log('Prueba 2: Intentando registrar consentimiento con owns_or_has_permission = false...');
    const contributionB = await createTempContribution(contributor.id, 'Aporte Test B');
    
    const { data: consent2, error: err2 } = await adminSupabase
      .from('consent_records')
      .insert({
        contributor_id: contributor.id,
        contribution_id: contributionB.id,
        authorization_level: 'A',
        credit_preference: 'Anónimo',
        owns_or_has_permission: false, // Inválido
        accepts_cataloging: true,
        consent_text_version: 'Versión Test'
      })
      .select()
      .single();

    if (err2) {
      console.log('  -> [ÉXITO] Base de datos rechazó la inserción mediante CHECK constraint.\n');
    } else if (consent2) {
      tempConsentIds.push(consent2.id);
      // Si la base de datos no lo rechazó por constraint, el trigger debe evaluar la condición canónica
      const { data: check2 } = await adminSupabase
        .from('contributions')
        .select('consent_verified')
        .eq('id', contributionB.id)
        .single();
      
      if (check2?.consent_verified === false) {
        console.log('  -> [ÉXITO] Registro insertado pero caché permaneció en FALSE.\n');
      } else {
        console.error('  -> [FALLO] consent_verified pasó a TRUE con consentimiento inválido.');
        process.exit(1);
      }
    }

    // ====================================================
    // PRUEBA 3: Fila con accepts_cataloging = false -> caché permanece FALSE
    // ====================================================
    console.log('Prueba 3: Intentando registrar consentimiento con accepts_cataloging = false...');
    const contributionC = await createTempContribution(contributor.id, 'Aporte Test C');
    
    const { data: consent3, error: err3 } = await adminSupabase
      .from('consent_records')
      .insert({
        contributor_id: contributor.id,
        contribution_id: contributionC.id,
        authorization_level: 'A',
        credit_preference: 'Anónimo',
        owns_or_has_permission: true,
        accepts_cataloging: false, // Inválido
        consent_text_version: 'Versión Test'
      })
      .select()
      .single();

    if (err3) {
      console.log('  -> [ÉXITO] Base de datos rechazó la inserción mediante CHECK constraint.\n');
    } else if (consent3) {
      tempConsentIds.push(consent3.id);
      const { data: check3 } = await adminSupabase
        .from('contributions')
        .select('consent_verified')
        .eq('id', contributionC.id)
        .single();
      
      if (check3?.consent_verified === false) {
        console.log('  -> [ÉXITO] Registro insertado pero caché permaneció en FALSE.\n');
      } else {
        console.error('  -> [FALLO] consent_verified pasó a TRUE con consentimiento inválido.');
        process.exit(1);
      }
    }

    // ====================================================
    // PRUEBA 4: Eliminar el consentimiento único -> caché pasa a FALSE
    // ====================================================
    console.log('Prueba 4: Eliminando el consentimiento del Aporte A...');
    const { error: errDel } = await adminSupabase
      .from('consent_records')
      .delete()
      .eq('id', consent1.id);

    if (errDel) throw new Error(`Error al eliminar consentimiento: ${errDel.message}`);
    
    const { data: check4 } = await adminSupabase
      .from('contributions')
      .select('consent_verified')
      .eq('id', contributionA.id)
      .single();

    if (check4?.consent_verified === false) {
      console.log('  -> [ÉXITO] Al eliminar el único registro de consentimiento, caché volvió a FALSE.\n');
    } else {
      console.error('  -> [FALLO] Al eliminar el consentimiento, la caché continuó en TRUE.');
      process.exit(1);
    }

    // ====================================================
    // PRUEBA 5: Múltiples consentimientos -> permanece TRUE al borrar uno
    // ====================================================
    console.log('Prueba 5: Insertando múltiples consentimientos válidos para Aporte A...');
    const { data: mConsent1 } = await adminSupabase
      .from('consent_records')
      .insert({
        contributor_id: contributor.id,
        contribution_id: contributionA.id,
        authorization_level: 'A',
        credit_preference: 'Anónimo',
        owns_or_has_permission: true,
        accepts_cataloging: true,
        consent_text_version: 'Primer Consentimiento'
      })
      .select()
      .single();
    
    const { data: mConsent2 } = await adminSupabase
      .from('consent_records')
      .insert({
        contributor_id: contributor.id,
        contribution_id: contributionA.id,
        authorization_level: 'A',
        credit_preference: 'Anónimo',
        owns_or_has_permission: true,
        accepts_cataloging: true,
        consent_text_version: 'Segundo Consentimiento'
      })
      .select()
      .single();

    tempConsentIds.push(mConsent1.id, mConsent2.id);

    // Borrar uno de los dos
    await adminSupabase.from('consent_records').delete().eq('id', mConsent1.id);

    const { data: check5 } = await adminSupabase
      .from('contributions')
      .select('consent_verified')
      .eq('id', contributionA.id)
      .single();

    if (check5?.consent_verified === true) {
      console.log('  -> [ÉXITO] Al borrar un consentimiento pero quedar otro válido, la caché permanece en TRUE.\n');
    } else {
      console.error('  -> [FALLO] La caché pasó a FALSE aunque aún queda un consentimiento válido.');
      process.exit(1);
    }

    // ====================================================
    // PRUEBA 6: Actualizar una declaración legal de true a false -> caché pasa a FALSE
    // ====================================================
    console.log('Prueba 6: Intentando actualizar declaración accepts_cataloging a false en el consentimiento restante...');
    const { error: errUpdate6 } = await adminSupabase
      .from('consent_records')
      .update({ accepts_cataloging: false })
      .eq('id', mConsent2.id);

    if (errUpdate6) {
      console.log('  -> [ÉXITO] Base de datos rechazó la modificación por CHECK constraint.\n');
    } else {
      const { data: check6 } = await adminSupabase
        .from('contributions')
        .select('consent_verified')
        .eq('id', contributionA.id)
        .single();

      if (check6?.consent_verified === false) {
        console.log('  -> [ÉXITO] Modificación exitosa y caché se actualizó a FALSE de manera coordinada.\n');
      } else {
        console.error('  -> [FALLO] La caché no pasó a FALSE tras invalidarse la declaración legal.');
        process.exit(1);
      }
    }

    // ====================================================
    // PRUEBA 7: Cambiar contribution_id en un registro -> actualiza ambos aportes
    // ====================================================
    console.log('Prueba 7: Cambiando contribution_id de una cesión activa entre aportes...');
    
    // Crear aporte destino
    const contributionDest = await createTempContribution(contributor.id, 'Aporte Destino Sinc');
    
    // Insertar consentimiento válido para Aporte B
    const { data: switchConsent } = await adminSupabase
      .from('consent_records')
      .insert({
        contributor_id: contributor.id,
        contribution_id: contributionB.id,
        authorization_level: 'A',
        credit_preference: 'Anónimo',
        owns_or_has_permission: true,
        accepts_cataloging: true,
        consent_text_version: 'Cesión Intercambiable'
      })
      .select()
      .single();

    tempConsentIds.push(switchConsent.id);

    // Verificar estado inicial: Aporte B es TRUE, Aporte Destino es FALSE
    const { data: checkB_init } = await adminSupabase.from('contributions').select('consent_verified').eq('id', contributionB.id).single();
    const { data: checkDest_init } = await adminSupabase.from('contributions').select('consent_verified').eq('id', contributionDest.id).single();

    if (checkB_init?.consent_verified !== true || checkDest_init?.consent_verified !== false) {
      throw new Error('Estado inicial incorrecto en la prueba de intercambio.');
    }

    // Actualizar el contribution_id a Aporte Destino
    const { error: errSwitch } = await adminSupabase
      .from('consent_records')
      .update({ contribution_id: contributionDest.id })
      .eq('id', switchConsent.id);

    if (errSwitch) throw new Error(`Error al cambiar aporte en consentimiento: ${errSwitch.message}`);

    // Verificar estado final: Aporte B es FALSE, Aporte Destino es TRUE
    const { data: checkB_final } = await adminSupabase.from('contributions').select('consent_verified').eq('id', contributionB.id).single();
    const { data: checkDest_final } = await adminSupabase.from('contributions').select('consent_verified').eq('id', contributionDest.id).single();

    if (checkB_final?.consent_verified === false && checkDest_final?.consent_verified === true) {
      console.log('  -> [ÉXITO] El cambio de aporte recalculó de forma atómica y exitosa ambas contribuciones.\n');
    } else {
      console.error('  -> [FALLO] Desincronización en el traspaso de id:', { B: checkB_final?.consent_verified, Dest: checkDest_final?.consent_verified });
      process.exit(1);
    }

    // ====================================================
    // PRUEBA 8: El trigger no altera updated_at
    // ====================================================
    console.log('Prueba 8: Verificando que la sincronización por trigger no altere updated_at...');
    const contributionD = await createTempContribution(contributor.id, 'Aporte Test D');
    
    // Esperar un instante para marcar diferencia en fechas
    await new Promise(r => setTimeout(r, 100));

    const { data: consentD } = await adminSupabase
      .from('consent_records')
      .insert({
        contributor_id: contributor.id,
        contribution_id: contributionD.id,
        authorization_level: 'A',
        credit_preference: 'Anónimo',
        owns_or_has_permission: true,
        accepts_cataloging: true,
        consent_text_version: 'Cesión D'
      })
      .select()
      .single();

    tempConsentIds.push(consentD.id);

    // Obtener fecha del aporte tras la inserción del consentimiento
    const { data: checkD } = await adminSupabase
      .from('contributions')
      .select('consent_verified, updated_at, created_at')
      .eq('id', contributionD.id)
      .single();

    if (checkD?.consent_verified === true && checkD?.updated_at === contributionD.updated_at) {
      console.log('  -> [ÉXITO] Caché sincronizada a TRUE sin alterar updated_at.\n');
    } else {
      console.error('  -> [FALLO] updated_at fue modificado:', { original: contributionD.updated_at, nuevo: checkD?.updated_at });
      process.exit(1);
    }
    // ====================================================
    // PRUEBA EXTRA: Las funciones auxiliares no son ejecutables por anon
    // ====================================================
    console.log('Prueba Extra: Verificando restricción de ejecución pública de funciones SQL...');
    const anonClient = createClient(supabaseUrl!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { error: anonErr1 } = await anonClient.rpc('has_valid_consent', {
      p_contribution_id: contributionA.id
    });
    
    const { error: anonErr2 } = await anonClient.rpc('refresh_contribution_consent_verified', {
      p_contribution_id: contributionA.id
    });

    const isBlocked1 = anonErr1 && (
      anonErr1.message.includes('permission denied') || 
      anonErr1.message.includes('Could not find the function') || 
      anonErr1.code === '42501'
    );
    const isBlocked2 = anonErr2 && (
      anonErr2.message.includes('permission denied') || 
      anonErr2.message.includes('Could not find the function') || 
      anonErr2.code === '42501'
    );

    if (isBlocked1 && isBlocked2) {
      console.log('  -> [ÉXITO] Las llamadas anónimas fueron correctamente denegadas por permisos de ejecución.\n');
    } else {
      console.warn('  -> [ALERTA/FALLO] Llamadas anónimas no fueron denegadas:', { err1: anonErr1?.message, err2: anonErr2?.message });
      process.exit(1);
    }
    console.log('====================================================');
    console.log('✓ ¡TODAS LAS PRUEBAS DE TRIGGERS PASARON CON ÉXITO!');
    console.log('====================================================');

  } finally {
    // Asegurar limpieza total en cualquier circunstancia
    await cleanup();
  }
}

runTests().catch(async (error) => {
  console.error('Prueba abortada por error fatal:', error.message);
  process.exit(1);
});
