// Script para reconstruir los slugs e identidades con el formato [título]-[código_catálogo_o_id]
// Archivo: scripts/rebuild-slugs.ts

import { createAdminClient } from "../src/utils/supabase/admin";
import { SupabasePublicIdentityRepository } from "../src/lib/public/slugs/repository";
import { PublicIdentityService } from "../src/lib/public/slugs/service";

async function main() {
  console.log("=== RECONSTRUYENDO SLUGS E IDENTIDADES EN LA BASE DE DATOS ===");
  const supabase = createAdminClient();

  // 1. Limpiar las tablas existentes para evitar conflictos de clave única
  console.log("Limpiando tablas public_slugs y public_identities...");
  const { error: delSlugsError } = await supabase.from("public_slugs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delSlugsError) {
    console.error("❌ Error al limpiar public_slugs:", delSlugsError);
    process.exit(1);
  }

  const { error: delIdentError } = await supabase.from("public_identities").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delIdentError) {
    console.error("❌ Error al limpiar public_identities:", delIdentError);
    process.exit(1);
  }

  console.log("✓ Tablas limpias con éxito.");

  // 2. Obtener todas las contribuciones
  const { data: contributions, error } = await supabase
    .from("contributions")
    .select("id, title, catalog_code, consent_verified, authorization_level, publication_status_option_id");

  if (error) {
    console.error("❌ Error al obtener las contribuciones:", error);
    process.exit(1);
  }

  console.log(`Leídas ${contributions.length} contribuciones de la base de datos.`);

  // 3. Obtener la ID del estado de publicación "published"
  const { data: opt } = await supabase
    .from("select_options")
    .select("id")
    .eq("category", "publication_status")
    .eq("code", "published")
    .maybeSingle();

  const publishedOptId = opt?.id;

  const repository = new SupabasePublicIdentityRepository(supabase);
  const service = new PublicIdentityService(repository);

  let createdCount = 0;

  for (const c of contributions) {
    const isPubliclyEligible = 
      c.consent_verified && 
      c.authorization_level === "A" && 
      (publishedOptId ? c.publication_status_option_id === publishedOptId : true);

    const initialStatus = isPubliclyEligible ? "published" : "draft";

    // Reconstruir el título candidato para que coincida exactamente con el mapper
    const identifier = c.catalog_code || c.id;
    const titleCandidate = `${c.title}-${identifier}`;

    try {
      console.log(`- Registrando slug para "${c.title}" (ID: ${c.id}) con estado: ${initialStatus}...`);
      const result = await service.registerIdentity(
        c.id,
        "contribution",
        titleCandidate,
        initialStatus,
        {
          source: "migration",
          note: "Rebuild slugs migration"
        }
      );

      console.log(`  ✓ Registrado slug: "${result.canonicalSlug}"`);
      createdCount++;
    } catch (err: any) {
      console.error(`  ❌ Error al procesar "${c.title}":`, err.message || err);
    }
  }

  console.log("\n================================================");
  console.log(`Reconstrucción de slugs finalizada con éxito:`);
  console.log(`- Creados: ${createdCount}`);
  console.log("================================================\n");
}

main().catch((err) => {
  console.error("❌ Fallo en el script:", err);
  process.exit(1);
});
