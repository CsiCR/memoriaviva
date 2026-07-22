// Script para inspeccionar una contribución específica y diagnosticar errores 404
// Archivo: scripts/inspect-db-contribution.ts

import { createAdminClient } from "../src/utils/supabase/admin";

async function main() {
  console.log("=== INSPECCIONANDO CONTRIBUCIÓN EN LA BASE DE DATOS ===");
  const supabase = createAdminClient();

  const titleQuery = "Iniciativa archivo histórico digital";
  
  const { data: contributions, error } = await supabase
    .from("contributions")
    .select(`
      id,
      title,
      description,
      consent_verified,
      authorization_level,
      publication_status_option_id
    `)
    .ilike("title", `%${titleQuery}%`);

  if (error) {
    console.error("❌ Error al consultar la base de datos:", error);
    process.exit(1);
  }

  if (!contributions || contributions.length === 0) {
    console.log("❌ No se encontró ninguna contribución con ese título.");
    process.exit(0);
  }

  // Obtener los nombres de las opciones para mayor claridad
  const { data: options } = await supabase
    .from("select_options")
    .select("id, code, name");

  const optionMap = new Map();
  if (options) {
    for (const opt of options) {
      optionMap.set(opt.id, opt);
    }
  }

  for (const c of contributions) {
    const { data: files } = await supabase
      .from("contribution_files")
      .select("id, file_name, file_path, file_role, processing_status")
      .eq("contribution_id", c.id);

    console.log("\n------------------------------------------------");
    console.log(`ID: ${c.id}`);
    console.log(`Título: "${c.title}"`);
    console.log(`Descripción: "${c.description}"`);
    console.log(`Consentimiento verificado: ${c.consent_verified}`);
    console.log(`Nivel de Autorización: ${c.authorization_level}`);
    console.log(`Estado de Publicación:`, optionMap.get(c.publication_status_option_id) || c.publication_status_option_id);
    console.log(`Archivos (${files?.length || 0}):`, files);
    console.log("------------------------------------------------\n");
  }
}

main().catch((err) => {
  console.error("❌ Fallo en el script:", err);
  process.exit(1);
});
