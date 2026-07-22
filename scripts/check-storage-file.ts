// Script de diagnóstico para comprobar el acceso a los archivos en Storage
// Archivo: scripts/check-storage-file.ts

import { createAdminClient } from "../src/utils/supabase/admin";

async function main() {
  console.log("=== COMPROBANDO CONTENIDO DEL ARCHIVO EN STORAGE ===");
  const supabase = createAdminClient();

  const fileId = "4fe150de-5659-4da5-99ca-5dba507528e2";

  const { data: file } = await supabase
    .from("contribution_files")
    .select("*")
    .eq("id", fileId)
    .maybeSingle();

  if (!file) {
    console.error("❌ No se encontró el registro de archivo.");
    process.exit(1);
  }

  const bucketName = file.storage_bucket || "historical-uploads";
  const { data: blob, error } = await supabase.storage
    .from(bucketName)
    .download(file.file_path);

  if (error) {
    console.error("❌ Error al descargar:", error);
    process.exit(1);
  }

  const text = await blob.text();
  console.log("Contenido del archivo (como texto):", text);
}

main().catch((err) => {
  console.error("❌ Fallo en el script:", err);
  process.exit(1);
});
