// Script para comprobar existencia de public_identities
// Archivo: scripts/list-db-tables.ts

import { createAdminClient } from "../src/utils/supabase/admin";

async function main() {
  console.log("=== COMPROBANDO TABLA public_identities ===");
  const supabase = createAdminClient();

  const { error } = await supabase.from("public_identities").select("id").limit(1);
  if (error) {
    console.error("❌ Error al consultar public_identities:", error);
  } else {
    console.log("✓ La tabla public_identities existe y es accesible.");
  }
}

main().catch((err) => {
  console.error("❌ Fallo en el script:", err);
  process.exit(1);
});
