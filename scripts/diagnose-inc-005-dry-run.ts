/**
 * Diagnóstico de Producción: INC-005 — Dry Run (Solo Lectura)
 * Archivo: scripts/diagnose-inc-005-dry-run.ts
 *
 * Consulta el estado actual de las identidades públicas y slugs de los aportes
 * afectados por INC-005, compara con la URL que el catálogo esperaría generar,
 * y reporta la operación prevista SIN modificar ningún dato.
 *
 * USO:
 *   npx tsx scripts/diagnose-inc-005-dry-run.ts
 *
 * REQUISITO: Variables de entorno en .env.local con SUPABASE_SERVICE_ROLE_KEY.
 */

import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { buildContributionCanonicalSlug } from "../src/lib/public/slugs/canonical-slug";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorios.");
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

interface DiagnosisCase {
  label: string;
  contributionId: string;
  expectedPublicTitle: string;
  expectedCatalogCode: string | null;
}

const CASES: DiagnosisCase[] = [
  {
    label: "MV-FOT-2026-0001 — Cuartel de Bomberos",
    contributionId: "0f39e9b5-ca51-4e1e-b28f-3d562946ff37",
    expectedPublicTitle: "Inauguración del Cuartel de Bomberos N° 29 en el sector del Barrio YPF - Pico Truncado",
    expectedCatalogCode: "MV-FOT-2026-0001",
  },
  {
    label: "MV-FOT-2026-0004 — Don Argel Manuel Santiago",
    contributionId: "1057bba1-ab32-4567-a873-45212bc4f4fb",
    expectedPublicTitle: "El pionero de la Avenida Rivadavia: el legado de esfuerzo y solidaridad de Don Argel",
    expectedCatalogCode: "MV-FOT-2026-0004",
  },
];

async function diagnoseCase(c: DiagnosisCase) {
  console.log(`\n${"═".repeat(72)}`);
  console.log(`  ${c.label}`);
  console.log(`${"═".repeat(72)}`);

  // 1. Aporte base
  const { data: contrib, error: cErr } = await adminClient
    .from("contributions")
    .select("id, title, publication_title, editorial_title, catalog_code, publication_status_option_id")
    .eq("id", c.contributionId)
    .maybeSingle();

  if (cErr || !contrib) {
    console.error(`  [ERROR] No se pudo obtener el aporte: ${cErr?.message || "no encontrado"}`);
    return;
  }

  console.log(`\n  Aporte:`);
  console.log(`    contribution_id    : ${contrib.id}`);
  console.log(`    title              : ${contrib.title}`);
  console.log(`    publication_title  : ${contrib.publication_title || "(null)"}`);
  console.log(`    editorial_title    : ${contrib.editorial_title || "(null)"}`);
  console.log(`    catalog_code       : ${contrib.catalog_code || "(null)"}`);

  // 2. Estado de publicación
  const { data: opt, error: optErr } = await adminClient
    .from("select_options")
    .select("code, name")
    .eq("id", contrib.publication_status_option_id)
    .maybeSingle();

  const pubStatus = opt?.code || "(no resuelto)";
  console.log(`    publication_status : ${pubStatus} (${opt?.name || "-"})`);

  // 3. Identidad pública
  const { data: identities, error: idErr } = await adminClient
    .from("public_identities")
    .select("id, status, has_ever_been_published, entity_uuid, created_at, updated_at")
    .eq("entity_type", "contribution")
    .eq("entity_uuid", c.contributionId);

  if (idErr) {
    console.error(`  [ERROR] Consulta de identidades: ${idErr.message}`);
    return;
  }

  console.log(`\n  Identidad pública:`);
  if (!identities || identities.length === 0) {
    console.log(`    [AUSENTE] No existe ninguna identidad pública registrada para este aporte.`);
    return;
  }
  if (identities.length > 1) {
    console.log(`    [PROBLEMA] Se encontraron ${identities.length} identidades — debería haber exactamente 1.`);
  }

  const identity = identities[0];
  console.log(`    identity_id             : ${identity.id}`);
  console.log(`    status                  : ${identity.status}`);
  console.log(`    has_ever_been_published : ${identity.has_ever_been_published}`);
  console.log(`    created_at              : ${identity.created_at}`);
  console.log(`    updated_at              : ${identity.updated_at}`);

  // 4. Slugs registrados
  const { data: slugs, error: sErr } = await adminClient
    .from("public_slugs")
    .select("id, slug, kind, reason, source, created_at")
    .eq("identity_id", identity.id)
    .order("created_at", { ascending: true });

  if (sErr) {
    console.error(`  [ERROR] Consulta de slugs: ${sErr.message}`);
    return;
  }

  const canonicalSlug = slugs?.find((s) => s.kind === "canonical");
  const aliasSlugs = slugs?.filter((s) => s.kind === "alias") || [];

  console.log(`\n  Slugs registrados (${slugs?.length || 0} total):`);
  console.log(`    Canónico actual : ${canonicalSlug?.slug || "[NINGUNO]"}`);
  if (aliasSlugs.length > 0) {
    console.log(`    Aliases (${aliasSlugs.length}):`);
    for (const a of aliasSlugs) {
      console.log(`      - ${a.slug}  [reason: ${a.reason}]`);
    }
  } else {
    console.log(`    Aliases : (ninguno)`);
  }

  // 5. Slug esperado según la función unificada
  const effectiveTitle =
    c.expectedPublicTitle ||
    contrib.publication_title ||
    contrib.editorial_title ||
    contrib.title ||
    "Aporte sin título";
  const effectiveCatalogCode = c.expectedCatalogCode || contrib.catalog_code || null;

  const expectedSlug = buildContributionCanonicalSlug({
    publicTitle: effectiveTitle,
    catalogCode: effectiveCatalogCode,
    contributionId: c.contributionId,
  });

  console.log(`\n  Comparación de slugs:`);
  console.log(`    Slug canónico actual   : ${canonicalSlug?.slug || "[NINGUNO]"}`);
  console.log(`    Slug esperado (INC-005): ${expectedSlug}`);
  console.log(`    Coinciden              : ${canonicalSlug?.slug === expectedSlug ? "✅ SÍ" : "❌ NO — requiere corrección"}`);

  // 6. Verificación de colisiones
  if (canonicalSlug?.slug !== expectedSlug) {
    const { data: collision, error: colErr } = await adminClient
      .from("public_slugs")
      .select("id, identity_id, kind")
      .eq("slug", expectedSlug)
      .neq("identity_id", identity.id)
      .maybeSingle();

    if (colErr) {
      console.log(`    Colisión (verificación): [ERROR] ${colErr.message}`);
    } else if (collision) {
      console.log(`    Colisión               : ⚠️  El slug esperado ya existe en otra identidad (${collision.identity_id})`);
    } else {
      console.log(`    Colisión               : ✅ Ninguna`);
    }
  }

  // 7. Operación prevista
  console.log(`\n  Operación prevista por la migración:`);

  if (canonicalSlug?.slug === expectedSlug) {
    console.log(`    → NINGUNA: el slug canónico ya es correcto. La migración es un no-op para este aporte.`);
  } else {
    console.log(`    → DEGRADAR slug actual a alias: "${canonicalSlug?.slug || "(ninguno)"}"`);
    console.log(`    → REGISTRAR nuevo canónico   : "${expectedSlug}"`);
  }

  if (identity.status !== pubStatus) {
    console.log(`    → SINCRONIZAR estado identidad: ${identity.status} → ${pubStatus}`);
  } else {
    console.log(`    → Estado de identidad ya sincronizado: ${identity.status} ✅`);
  }

  // 8. Registros recientes de auditoría (solo lectura)
  const { data: auditLogs, error: auditErr } = await adminClient
    .from("audit_logs")
    .select("id, action, old_value, new_value, created_at")
    .eq("record_id", identity.id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!auditErr && auditLogs && auditLogs.length > 0) {
    console.log(`\n  Últimos registros de auditoría:`);
    for (const log of auditLogs) {
      console.log(`    [${log.created_at}] ${log.action}`);
    }
  }
}

async function main() {
  console.log(`\nDRY RUN — INC-005 — Diagnóstico de Sincronización de Slugs`);
  console.log(`Proyecto: ${SUPABASE_URL}`);
  console.log(`Modo: Solo Lectura — No se modifica ningún dato.\n`);

  for (const c of CASES) {
    await diagnoseCase(c);
  }

  console.log(`\n${"═".repeat(72)}`);
  console.log(`  Dry run completado. Revisar los resultados antes de aplicar la migración.`);
  console.log(`${"═".repeat(72)}\n`);
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
