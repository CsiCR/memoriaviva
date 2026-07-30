import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  console.log('=== SCRIPT DE AUDITORÍA DE INTEGRIDAD FINAL (FASE 4) ===\n');
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  let failures = 0;

  // 1. Verificar Aportes
  const { data: contributions, error: ce } = await supabase.from('contributions').select('id, title, catalog_code');
  if (ce) {
    console.error('❌ Error al consultar contributions:', ce.message);
    failures++;
  } else {
    console.log(`- Aportes reales restantes: ${contributions.length} (Esperado: 10)`);
    if (contributions.length !== 10) {
      console.error('  ❌ Error: La cantidad de aportes es incorrecta.');
      failures++;
    } else {
      console.log('  ✓ Cantidad de aportes correcta.');
    }
  }

  // 2. Verificar Aportantes
  const { data: contributors, error: cte } = await supabase.from('contributors').select('id, full_name');
  if (cte) {
    console.error('❌ Error al consultar contributors:', cte.message);
    failures++;
  } else {
    console.log(`- Aportantes reales restantes: ${contributors.length} (Esperado: 10)`);
    if (contributors.length !== 10) {
      console.error('  ❌ Error: La cantidad de aportantes es incorrecta.');
      failures++;
    } else {
      console.log('  ✓ Cantidad de aportantes correcta.');
    }
  }

  // 3. Verificar Identidades Públicas
  const { data: identities, error: pie } = await supabase.from('public_identities').select('id, entity_type, entity_uuid');
  if (pie) {
    console.error('❌ Error al consultar public_identities:', pie.message);
    failures++;
  } else {
    console.log(`- Identidades públicas restantes: ${identities.length} (Esperado: 7)`);
    if (identities.length !== 7) {
      console.error('  ❌ Error: La cantidad de identidades públicas es incorrecta.');
      failures++;
    } else {
      console.log('  ✓ Cantidad de identidades públicas correcta.');
    }
  }

  // 4. Verificar Slugs Canónicos
  const { data: slugs, error: pse } = await supabase.from('public_slugs').select('id, slug, kind');
  if (pse) {
    console.error('❌ Error al consultar public_slugs:', pse.message);
    failures++;
  } else {
    const canonicals = slugs.filter((s: any) => s.kind === 'canonical');
    const aliases = slugs.filter((s: any) => s.kind === 'alias');
    console.log(`- Slugs canónicos restantes: ${canonicals.length} (Esperado: 7)`);
    console.log(`- Slugs de tipo alias restantes: ${aliases.length} (Esperado: 0)`);
    
    if (canonicals.length !== 7 || aliases.length !== 0) {
      console.error('  ❌ Error: Los slugs restantes no coinciden con lo esperado.');
      failures++;
    } else {
      console.log('  ✓ Slugs verificados correctamente.');
    }
  }

  // 5. Verificar Relaciones Huérfanas
  console.log('\n- Comprobando ausencia de registros huérfanos en BD...');
  const orphanIds = [];
  if (identities) {
    for (const ident of identities) {
      if (ident.entity_type === 'contribution') {
        const exists = contributions?.some(c => c.id === ident.entity_uuid);
        if (!exists) orphanIds.push(ident.id);
      } else if (ident.entity_type === 'author') {
        const exists = contributors?.some(co => co.id === ident.entity_uuid);
        if (!exists) orphanIds.push(ident.id);
      }
    }
  }

  if (orphanIds.length > 0) {
    console.error(`  ❌ Se encontraron ${orphanIds.length} identidades públicas huérfanas.`);
    failures++;
  } else {
    console.log('  ✓ No hay identidades públicas huérfanas.');
  }

  // 6. Verificar Archivos en Storage
  console.log('\n- Comprobando archivos en Supabase Storage...');
  const { data: subfolders, error: listError } = await supabase.storage
    .from('historical-uploads')
    .list('temporary', { limit: 200 });

  if (listError) {
    console.error('  ❌ Error al listar Storage:', listError.message);
    failures++;
  } else {
    let fileCount = 0;
    const remainingFiles: string[] = [];
    if (subfolders) {
      for (const folder of subfolders) {
        if (folder.id === null) {
          const { data: files } = await supabase.storage
            .from('historical-uploads')
            .list(`temporary/${folder.name}`, { limit: 100 });
          if (files) {
            fileCount += files.length;
            files.forEach(f => remainingFiles.push(`temporary/${folder.name}/${f.name}`));
          }
        }
      }
    }
    console.log(`  - Archivos físicos restantes en Storage: ${fileCount} (Esperado: 13)`);
    if (fileCount !== 13) {
      console.error('  ❌ Error: La cantidad de archivos físicos en Storage no es 13.');
      failures++;
    } else {
      console.log('  ✓ Cantidad de archivos físicos en Storage correcta.');
      console.log('  - Listado de archivos remanentes en Storage:');
      remainingFiles.forEach(f => console.log(`    * ${f}`));
    }
  }

  // 7. Resumen de auditoría
  console.log('\n================================================');
  if (failures === 0) {
    console.log('✓ ¡AUDITORÍA FINAL DE INTEGRIDAD EXITOSA! EL SISTEMA ESTÁ SANO.');
    process.exit(0);
  } else {
    console.error(`❌ SE DETECTARON ${failures} ERRORES DE INTEGRIDAD.`);
    process.exit(1);
  }
}

main().catch(console.error);
