// Script de backfill para poblar la tabla public_slugs e identidades para contribuciones existentes
// Archivo: scripts/backfill-slugs.ts

import { createAdminClient } from "../src/utils/supabase/admin";
import { SupabasePublicIdentityRepository } from "../src/lib/public/slugs/repository";
import { PublicIdentityService } from "../src/lib/public/slugs/service";

async function main() {
  console.log("=== INICIANDO BACKFILL DE SLUGS E IDENTIDADES ===");
  const supabase = createAdminClient();
  const repository = new SupabasePublicIdentityRepository(supabase);
  const service = new PublicIdentityService(repository);

  // 1. Obtener todas las contribuciones de la base de datos
  const { data: contributions, error } = await supabase
    .from("contributions")
    .select("id, title, consent_verified, authorization_level, publication_status_option_id");

  if (error) {
    console.error("❌ Error al obtener las contribuciones de la base de datos:", error);
    process.exit(1);
  }

  console.log(`Leídas ${contributions.length} contribuciones de la base de datos.`);

  // 2. Obtener la ID del estado de publicación "published"
  const { data: opt } = await supabase
    .from("select_options")
    .select("id")
    .eq("category", "publication_status")
    .eq("code", "published")
    .maybeSingle();

  const publishedOptId = opt?.id;
  console.log(`ID del estado 'published': ${publishedOptId}`);

  let createdCount = 0;
  let skippedCount = 0;

  for (const c of contributions) {
    const isPubliclyEligible = 
      c.consent_verified && 
      c.authorization_level === "A" && 
      (publishedOptId ? c.publication_status_option_id === publishedOptId : true);

    const initialStatus = isPubliclyEligible ? "published" : "draft";

    // Verificar si ya existe una identidad para esta contribución
    try {
      const existing = await service.findByEntity("contribution", c.id);
      if (existing) {
        console.log(`- Contribución "${c.title}" (ID: ${c.id}) ya tiene identidad registrada. Saltando.`);
        skippedCount++;
        continue;
      }

      // Registrar identidad
      console.log(`- Registrando identidad para "${c.title}" (ID: ${c.id}) con estado: ${initialStatus}...`);
      const result = await service.registerIdentity(
        c.id,
        "contribution",
        c.title,
        initialStatus,
        {
          source: "migration",
          note: "Backfill script migration"
        }
      );

      console.log(`  ✓ Registrado slug canónico: "${result.canonicalSlug}"`);
      createdCount++;
    } catch (err: any) {
      console.error(`  ❌ Error al procesar "${c.title}":`, err.message || err);
    }
  }

  console.log("\n================================================");
  console.log(`Backfill finalizado con éxito:`);
  console.log(`- Creados: ${createdCount}`);
  console.log(`- Saltados: ${skippedCount}`);
  console.log("================================================\n");
}

main().catch((err) => {
  console.error("❌ Fallo en el script de backfill:", err);
  process.exit(1);
});
