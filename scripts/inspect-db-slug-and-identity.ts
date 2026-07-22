// Script para inspeccionar el slug público y las identidades en la base de datos
// Archivo: scripts/inspect-db-slug-and-identity.ts

import { createAdminClient } from "../src/utils/supabase/admin";

async function main() {
  console.log("=== INSPECCIONANDO TABLA DE SLUGS E IDENTIDADES ===");
  const supabase = createAdminClient();

  const slugToTest = "iniciativa-archivo-historico-digital-mv-fot-2026-0002";

  // Query a public_slugs
  const { data: publicSlugs, error: slugError } = await supabase
    .from("public_slugs")
    .select("*")
    .eq("slug", slugToTest);

  if (slugError) {
    console.error("❌ Error al consultar la tabla public_slugs:", slugError);
  } else {
    console.log("public_slugs:", publicSlugs);
  }

  // Query a todas las identidades que correspondan al tipo de entidad
  const { data: identities, error: identError } = await supabase
    .from("public_slugs")
    .select("*")
    .ilike("slug", "%iniciativa%");

  if (identError) {
    console.error("❌ Error al listar public_slugs parecidos:", identError);
  } else {
    console.log("Lista de public_slugs parecidos:", identities);
  }
}

main().catch((err) => {
  console.error("❌ Fallo en el script:", err);
  process.exit(1);
});
