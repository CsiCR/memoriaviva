// Script para eliminar de forma segura el archivo placeholder de base de datos y storage
// Archivo: scripts/delete-placeholder-file.ts

import { createAdminClient } from "../src/utils/supabase/admin";

async function main() {
  console.log("=== ELIMINANDO ARCHIVO PLACEHOLDER ===");
  const supabase = createAdminClient();

  const fileId = "4fe150de-5659-4da5-99ca-5dba507528e2";
  const filePath = "temporary/89442942-5a12-4ebb-b41c-056c828fbd42/3bc0afc4-2f56-4b64-a266-f8c52f6bd2a8.png";
  const bucketName = "historical-uploads";

  // 1. Eliminar del Storage de Supabase
  console.log(`Eliminando archivo físico de storage: "${filePath}" en "${bucketName}"...`);
  const { data: storageData, error: storageError } = await supabase.storage
    .from(bucketName)
    .remove([filePath]);

  if (storageError) {
    console.error("⚠️ Error de Storage al intentar eliminar:", storageError);
  } else {
    console.log("✓ Archivo físico removido del Storage:", storageData);
  }

  // 2. Eliminar de la base de datos
  console.log(`Eliminando registro de la tabla contribution_files con ID: "${fileId}"...`);
  const { data: dbData, error: dbError } = await supabase
    .from("contribution_files")
    .delete()
    .eq("id", fileId)
    .select();

  if (dbError) {
    console.error("❌ Error en base de datos al eliminar el registro:", dbError);
    process.exit(1);
  } else {
    console.log("✓ Registro eliminado de la base de datos con éxito:", dbData);
  }

  console.log("\n================================================");
  console.log("Eliminación completada con éxito.");
  console.log("================================================\n");
}

main().catch((err) => {
  console.error("❌ Fallo en el script:", err);
  process.exit(1);
});
