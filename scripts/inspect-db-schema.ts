// Script para inspeccionar las columnas de la tabla contribution_files
// Archivo: scripts/inspect-db-schema.ts

import { createAdminClient } from "../src/utils/supabase/admin";

async function main() {
  console.log("=== INSPECCIONANDO COLUMNAS DE contribution_files ===");
  const supabase = createAdminClient();

  const { data: cols, error } = await supabase
    .from("contribution_files")
    .select("*")
    .limit(1);

  if (error) {
    console.error("❌ Error al consultar contribution_files:", error);
  } else {
    console.log("Columnas de contribution_files:", cols && cols.length > 0 ? Object.keys(cols[0]) : "Tabla vacía");
  }
}

main().catch((err) => {
  console.error("❌ Fallo en el script:", err);
  process.exit(1);
});
