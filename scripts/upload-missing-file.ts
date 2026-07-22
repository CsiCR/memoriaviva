// Script para subir un archivo placeholder y resolver errores del auditor pre-lanzamiento en local
// Archivo: scripts/upload-missing-file.ts

import { createAdminClient } from "../src/utils/supabase/admin";

async function main() {
  console.log("=== SUBIENDO PLACEHOLDER PARA RESOLVER ERROR DE AUDITORÍA ===");
  const supabase = createAdminClient();

  const BUCKET_NAME = "historical-uploads";
  const targetPath = "temporary/89442942-5a12-4ebb-b41c-056c828fbd42/3bc0afc4-2f56-4b64-a266-f8c52f6bd2a8.png";

  // PNG transparente de 1x1 píxel en Base64
  const placeholderPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64"
  );

  console.log(`Subiendo placeholder al bucket '${BUCKET_NAME}' en el path '${targetPath}'...`);

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(targetPath, placeholderPng, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) {
    console.error("❌ Error subiendo el archivo:", error);
    process.exit(1);
  }

  console.log("✓ Archivo placeholder subido con éxito:", data);
}

main().catch((err) => {
  console.error("❌ Fallo en el script:", err);
  process.exit(1);
});
