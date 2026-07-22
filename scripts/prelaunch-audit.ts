// Auditoría Pre-Lanzamiento de Datos y Assets
// Archivo: scripts/prelaunch-audit.ts

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remover tildes
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

async function runAudit() {
  console.log("=== INICIANDO AUDITORÍA PRE-LANZAMIENTO ===");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ Variables de entorno faltantes en .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 1. Obtener estado "published"
  const { data: opt, error: optErr } = await supabase
    .from("select_options")
    .select("id")
    .eq("category", "publication_status")
    .eq("code", "published")
    .maybeSingle();

  if (optErr) {
    console.error("❌ Error al obtener opción de estado publicado:", optErr);
    process.exit(1);
  }

  const publishedOptId = opt?.id;
  if (!publishedOptId) {
    console.warn("⚠️ No se encontró la opción de estado 'published'. Se auditarán todas las contribuciones.");
  }

  // 2. Traer aportes y archivos
  const { data: contributions, error: contrErr } = await supabase
    .from("contributions")
    .select(`
      id,
      title,
      description,
      exact_date,
      approximate_decade,
      related_place,
      mentioned_people,
      related_institution,
      catalog_code,
      consent_verified,
      authorization_level,
      publication_status_option_id,
      contribution_files (
        id,
        file_name,
        file_path,
        file_size,
        file_role,
        storage_bucket
      )
    `);

  if (contrErr || !contributions) {
    console.error("❌ Error al obtener contribuciones:", contrErr);
    process.exit(1);
  }

  console.log(`✓ Se leyeron ${contributions.length} contribuciones en total.`);

  // Filtrar las que se consideran públicas/activas
  const activeContributions = contributions.filter((c: any) => {
    // Si no tenemos la ID de publicado, auditamos todas
    const isPublished = publishedOptId ? c.publication_status_option_id === publishedOptId : true;
    return c.consent_verified && c.authorization_level === "A" && isPublished;
  });

  console.log(`✓ Se identificaron ${activeContributions.length} contribuciones activas de cara al público.`);

  // Función para listar archivos recursivamente en Supabase Storage
  async function listAllFilesRecursively(client: any, bucket: string, folder: string = ""): Promise<any[]> {
    const { data, error } = await client.storage.from(bucket).list(folder, { limit: 200 });
    if (error) throw error;
    
    let files: any[] = [];
    for (const item of data || []) {
      const itemPath = folder ? `${folder}/${item.name}` : item.name;
      if (!item.id) {
        // Es un directorio, buscar recursivamente
        try {
          const subFiles = await listAllFilesRecursively(client, bucket, itemPath);
          files = files.concat(subFiles);
        } catch (e) {
          // Ignorar errores de subcarpetas vacías o inaccesibles
        }
      } else {
        // Es un archivo, agregar con su path relativo completo
        files.push({ ...item, name: itemPath });
      }
    }
    return files;
  }

  // 3. Listar archivos del storage de manera recursiva
  let storageFilesList: any[] = [];
  try {
    storageFilesList = await listAllFilesRecursively(supabase, "historical-uploads");
  } catch (storageErr: any) {
    console.error("⚠️ No se pudo conectar con el storage o listar archivos recursivamente:", storageErr.message || storageErr);
  }


  // CONTROLES
  let totalErrors = 0;
  let totalWarnings = 0;

  const duplicatedSlugs: Record<string, string[]> = {};
  const invalidDates: string[] = [];
  const missingCovers: string[] = [];
  const missingDescription: string[] = [];
  const missingTitle: string[] = [];
  const brokenInternalLinks: string[] = [];
  const orphanedStorageFiles: string[] = [];
  const missingStorageFiles: string[] = [];

  const decadesSet = new Set<string>();
  const typesSet = new Set<string>();
  const placesSet = new Set<string>();
  const institutionsSet = new Set<string>();
  const peopleSet = new Set<string>();

  // Analizar aportes activos
  for (const c of activeContributions) {
    const files = (c.contribution_files as any[]) || [];
    
    // Insignias y datos
    if (c.approximate_decade) decadesSet.add(c.approximate_decade);
    if (c.related_place) placesSet.add(c.related_place);
    if (c.related_institution) institutionsSet.add(c.related_institution);
    
    if (c.mentioned_people) {
      c.mentioned_people.split(",").forEach((p: string) => {
        const clean = p.trim();
        if (clean) peopleSet.add(clean);
      });
    }

    // Slug duplos
    const slug = `${slugify(c.title || "")}-${slugify(c.catalog_code || c.id)}`;
    if (!duplicatedSlugs[slug]) {
      duplicatedSlugs[slug] = [];
    }
    duplicatedSlugs[slug].push(c.id);

    // Fechas inválidas
    if (c.exact_date) {
      const dateVal = Date.parse(c.exact_date);
      if (isNaN(dateVal)) {
        invalidDates.push(`Aporte ID ${c.id}: fecha exacta inválida '${c.exact_date}'`);
        totalErrors++;
      }
    }

    // Datos Faltantes
    if (!c.title || c.title.trim() === "") {
      missingTitle.push(c.id);
      totalErrors++;
    }
    if (!c.description || c.description.trim() === "") {
      missingDescription.push(c.id);
      totalWarnings++;
    }

    // Cover missing check
    const hasCover = files.some(f => f.file_role === "cover");
    if (!hasCover) {
      missingCovers.push(`Aporte '${c.title}' (ID: ${c.id}) no tiene portada`);
      totalWarnings++;
    }

    // Check files existence in storage
    for (const f of files) {
      typesSet.add(f.file_type || "desconocido");
      // El nombre en el storage corresponde al file_path
      const foundInStorage = storageFilesList.some(sf => sf.name === f.file_path);
      if (!foundInStorage && storageFilesList.length > 0) {
        missingStorageFiles.push(`Aporte '${c.title}': Archivo '${f.file_name}' (Path: ${f.file_path}) falta en Storage.`);
        totalErrors++;
      }
    }

    // Enlaces rotos internos (simulación en texto)
    if (c.description) {
      // Buscar patrones de links a contribuciones
      const linkRegex = /\/contributions\/([a-zA-Z0-9\-_]+)/g;
      let match;
      while ((match = linkRegex.exec(c.description)) !== null) {
        const referencedSlug = match[1];
        // Comprobar si existe alguna contribución activa con ese slug
        const exists = activeContributions.some(ac => {
          const acSlug = `${slugify(ac.title || "")}-${slugify(ac.catalog_code || ac.id)}`;
          return acSlug === referencedSlug;
        });
        if (!exists) {
          brokenInternalLinks.push(`Aporte '${c.title}' referencia slug inexistente: '${referencedSlug}'`);
          totalWarnings++;
        }
      }
    }
  }

  // Cruzar Storage -> DB para buscar archivos huérfanos
  const dbFilePaths = new Set(
    contributions.flatMap((c: any) => (c.contribution_files || []).map((f: any) => f.file_path))
  );

  for (const sf of storageFilesList) {
    if (!dbFilePaths.has(sf.name)) {
      orphanedStorageFiles.push(sf.name);
      totalWarnings++;
    }
  }

  // Contar slugs duplicados reales
  const actualDuplicatedSlugs = Object.entries(duplicatedSlugs).filter(([_, ids]) => ids.length > 1);
  totalErrors += actualDuplicatedSlugs.length;

  // Imprimir en consola
  console.log("\n================ RESULTADOS DE LA AUDITORÍA ================");
  console.log(`- Errores críticos encontrados: ${totalErrors}`);
  console.log(`- Advertencias encontradas: ${totalWarnings}`);
  console.log(`- Décadas representadas: ${decadesSet.size} (${Array.from(decadesSet).join(", ")})`);
  console.log(`- Lugares asociados: ${placesSet.size}`);
  console.log(`- Instituciones asociadas: ${institutionsSet.size}`);
  console.log(`- Personas mencionadas: ${peopleSet.size}`);
  console.log(`- Archivos huérfanos en Storage: ${orphanedStorageFiles.length}`);
  console.log(`- Archivos faltantes en Storage: ${missingStorageFiles.length}`);
  console.log("============================================================\n");

  // Escribir reporte markdown
  const reportsDir = path.resolve(process.cwd(), "docs", "release");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportPath = path.join(reportsDir, "prelaunch-audit-report.md");
  let md = `# Reporte de Auditoría Pre-Lanzamiento\n`;
  md += `Generado el: ${new Date().toISOString()}\n\n`;
  md += `## Resumen Ejecutivo\n`;
  md += `* **Estado General**: ${totalErrors > 0 ? "❌ NO APTO (Errores críticos encontrados)" : "⚠️ APTO CON ADVERTENCIAS"}\n`;
  md += `* **Aportes Públicos Activos**: ${activeContributions.length}\n`;
  md += `* **Errores Críticos**: ${totalErrors}\n`;
  md += `* **Advertencias**: ${totalWarnings}\n\n`;

  md += `## Cobertura de Catálogo\n`;
  md += `* **Décadas**: ${decadesSet.size} (${Array.from(decadesSet).join(", ") || "Ninguna"})\n`;
  md += `* **Tipos de Archivos**: ${typesSet.size} (${Array.from(typesSet).join(", ") || "Ninguno"})\n`;
  md += `* **Lugares representados**: ${placesSet.size}\n`;
  md += `* **Instituciones**: ${institutionsSet.size}\n`;
  md += `* **Personas registradas**: ${peopleSet.size}\n\n`;

  md += `## Detalles de la Inspección\n`;

  if (totalErrors > 0) {
    md += `### ❌ Errores Críticos (${totalErrors})\n`;
    if (actualDuplicatedSlugs.length > 0) {
      md += `#### Slugs Duplicados:\n`;
      actualDuplicatedSlugs.forEach(([slug, ids]) => {
        md += `- Slug \`${slug}\` es compartido por las IDs: ${ids.join(", ")}\n`;
      });
    }
    if (invalidDates.length > 0) {
      md += `#### Fechas Inválidas:\n`;
      invalidDates.forEach(d => md += `- ${d}\n`);
    }
    if (missingTitle.length > 0) {
      md += `#### Aportes sin Título:\n`;
      missingTitle.forEach(id => md += `- Aporte ID \`${id}\` no tiene título.\n`);
    }
    if (missingStorageFiles.length > 0) {
      md += `#### Archivos Faltantes en Storage:\n`;
      missingStorageFiles.forEach(f => md += `- ${f}\n`);
    }
    md += `\n`;
  }

  if (totalWarnings > 0) {
    md += `### ⚠️ Advertencias (${totalWarnings})\n`;
    if (missingCovers.length > 0) {
      md += `#### Aportes sin Portada:\n`;
      missingCovers.forEach(c => md += `- ${c}\n`);
    }
    if (missingDescription.length > 0) {
      md += `#### Aportes sin Descripción/Resumen:\n`;
      missingDescription.forEach(id => md += `- Aporte ID \`${id}\` está en blanco.\n`);
    }
    if (brokenInternalLinks.length > 0) {
      md += `#### Enlaces Internos Rotos:\n`;
      brokenInternalLinks.forEach(l => md += `- ${l}\n`);
    }
    if (orphanedStorageFiles.length > 0) {
      md += `#### Archivos Huérfanos en Storage:\n`;
      orphanedStorageFiles.forEach(file => md += `- Archivo \`${file}\` en storage no está asociado a ningún aporte en la DB.\n`);
    }
    md += `\n`;
  }

  if (totalErrors === 0 && totalWarnings === 0) {
    md += `### ✓ ¡Todo limpio!\nNo se encontraron errores ni advertencias.\n`;
  }

  fs.writeFileSync(reportPath, md, "utf8");
  console.log(`✓ Reporte escrito con éxito en: ${reportPath}`);

  // No bloquear el build salvo en errores críticos
  if (totalErrors > 0) {
    console.error("❌ La auditoría reportó errores críticos. Revisar docs/release/prelaunch-audit-report.md");
    process.exit(1);
  } else {
    console.log("✓ Auditoría completada con éxito.");
  }
}

runAudit().catch(err => {
  console.error("❌ Error inesperado durante la ejecución de la auditoría:", err);
  process.exit(1);
});
