// Pruebas Unitarias para Aportes Públicos
// Archivo: src/lib/public/tests/public-contribution.test.ts

import { toPublicContribution, toPublicHistoricalDate } from "../mappers/to-public-contribution";
import { publicContributionSchema } from "../validation/contribution.schema";
import { buildContributionCanonicalSlug, buildContributionSlugSource } from "../slugs/canonical-slug";
import {
  cleanContribution,
  unsafeContribution,
  contributionNoConsent,
  contributionRestrictedAuth,
  contributionReceivedState,
  contributionNotPublishedState,
  contributionWithRevokedFiles,
} from "./fixtures";

/**
 * Valida recursivamente que un objeto no contenga claves prohibidas en ningún nivel.
 */
function checkForbiddenKeysRecursive(
  obj: unknown,
  forbiddenKeys: string[],
  assert: (cond: boolean, msg: string) => void
) {
  if (!obj || typeof obj !== "object") return;
  const record = obj as Record<string, unknown>;

  for (const key of Object.keys(record)) {
    const isForbidden = forbiddenKeys.includes(key.toLowerCase());
    assert(!isForbidden, `Seguridad Whitelist: La clave prohibida '${key}' no debe existir.`);
    
    // Inspección de valores sensibles
    const val = record[key];
    if (typeof val === "string") {
      const containsEmail = val.includes("@") && val.includes(".");
      const containsPrivatePath = val.includes("historical-uploads") || val.includes("file_path");
      assert(!containsEmail, `Seguridad Whitelist: No debe filtrarse correos en los valores de texto (${val}).`);
      assert(!containsPrivatePath, `Seguridad Whitelist: No debe filtrarse rutas de almacenamiento privado (${val}).`);
    }

    checkForbiddenKeysRecursive(record[key], forbiddenKeys, assert);
  }
}

export function runContributionTests(assert: (cond: boolean, msg: string) => void) {
  console.log("-> [TESTS] Iniciando pruebas de aportes públicos...");

  // 1. Fechas históricas coherentes
  const hdExact = toPublicHistoricalDate("1974-10-25", "1980s");
  assert(hdExact.precision === "exact", "Precisión exacta detectada.");
  assert(hdExact.year === 1974, "Año derivado de fecha exacta.");
  assert(hdExact.decade === 1970, "Década recalculada de forma coherente para evitar incoherencias.");

  const hdDecadeOnly = toPublicHistoricalDate(null, "1980s");
  assert(hdDecadeOnly.precision === "decade", "Precisión de década detectada.");
  assert(hdDecadeOnly.decade === 1980, "Década parseada correctamente.");

  // 2. Mapeo limpio de aporte elegible
  const cleanSlug = buildContributionCanonicalSlug({ publicTitle: "Recuerdos del Ferrocarril Patagónico", catalogCode: null, contributionId: cleanContribution.id || "" });
  const pubCont = toPublicContribution(cleanContribution, cleanSlug);
  assert(pubCont.title === "Recuerdos del Ferrocarril Patagónico", "Título mapeado.");
  assert(pubCont.contentType === "textual", "Tipo mapeado.");
  assert(pubCont.relatedPlace?.name === "Vecino pionero" || pubCont.relatedPlace === null, "Lugar mapeado o null.");
  assert(pubCont.media.length === 1, "Incluye medios válidos.");
  assert(pubCont.media[0].publicUrl === "/api/public/media/55555555-5555-4555-8555-555555555555", "Oculta rutas de almacenamiento.");
  assert(pubCont.credits.displayName === "Edith Gómez", "Inicializa créditos del aportante.");

  // 3. Validación Zod (Strict)
  const parsed = publicContributionSchema.safeParse(pubCont);
  assert(parsed.success === true, "Aporte público cumple con el validador Zod.");

  // 4. Rechazo estricto de aportes no elegibles
  try {
    toPublicContribution(contributionNoConsent, "");
    assert(false, "Debe fallar si no hay consentimiento verificado.");
  } catch {
    assert(true, "Rechaza correctamente sin consentimiento verificado.");
  }

  try {
    toPublicContribution(contributionRestrictedAuth, "");
    assert(false, "Debe fallar si el nivel de autorización es restringido (D).");
  } catch {
    assert(true, "Rechaza correctamente autorización restringida.");
  }

  try {
    toPublicContribution(contributionReceivedState, "");
    assert(false, "Debe fallar si el estado editorial es Recibido.");
  } catch {
    assert(true, "Rechaza correctamente estado editorial no elegible.");
  }

  try {
    toPublicContribution(contributionNotPublishedState, "");
    assert(false, "Debe fallar si el estado de publicación no es published.");
  } catch {
    assert(true, "Rechaza correctamente estado de publicación distinto a publicado.");
  }

  // 5. Test de seguridad contra filtrado de datos (Fixture Peligroso)
  const pubUnsafe = toPublicContribution(unsafeContribution, "fixture-slug-inseguro");
  assert(pubUnsafe.credits.displayName === "J. C. P.", "Aplica iniciales y oculta nombre completo.");
  assert(pubUnsafe.media.length === 1, "Filtra documento legal de consentimiento, exponiendo solo plano.");
  assert(pubUnsafe.media[0].publicUrl === "/api/public/media/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", "Oculta el archivo de consentimiento y ruta física.");

  // Búsqueda recursiva de claves prohibidas
  const forbiddenKeys = [
    "email",
    "phone",
    "dni",
    "file_path",
    "bucket",
    "internal_notes",
    "service_role",
    "contributor_id",
  ];
  checkForbiddenKeysRecursive(pubUnsafe, forbiddenKeys, assert);

  // 6. Test de strictness en Zod
  const unsafeExtended = {
    ...pubCont,
    extra_field_infiltrated: "infiltrated",
  };
  const parseUnsafe = publicContributionSchema.safeParse(unsafeExtended);
  assert(parseUnsafe.success === false, "Esquema estricto de aporte público rechaza propiedades adicionales.");

  // 7. Aporte sin medios sigue siendo publicable
  const textualNoFiles = { ...cleanContribution, files: [] };
  const pubTextual = toPublicContribution(textualNoFiles, "slug-sin-medios");
  assert(pubTextual.media.length === 0, "No contiene medios.");
  assert(publicContributionSchema.safeParse(pubTextual).success === true, "Aporte sin archivos es publicable si es válido.");

  // 8. Aporte con todos sus medios revocados/fallidos no expone rutas ni objetos inseguros
  const pubRevokedMedia = toPublicContribution(contributionWithRevokedFiles, "slug-revocados");
  assert(pubRevokedMedia.media.length === 1, "Excluye el archivo fallido y el documento legal, conserva el válido.");
  assert(pubRevokedMedia.media[0].id === "77777777-7777-4777-8777-777777777777", "Conserva el archivo apto.");

  // =========================================================================
  // PRUEBAS DE INC-004: CASCADAS DE PUBLICACIÓN, SANITIZACIÓN Y PRIVACIDAD
  // =========================================================================
  
  // A. Prueba de Cascadas de Título
  // A.1: publication_title -> editorial_title -> title
  const cTitleCascade1 = {
    ...cleanContribution,
    title: "Título Original",
    editorial_title: "Título Editorial",
    publication_title: "Título de Publicación",
  };
  const pubTitle1 = toPublicContribution(cTitleCascade1, "slug-cascade-1");
  assert(pubTitle1.title === "Título de Publicación", "Cascada Título: Se prefiere publication_title.");

  // A.2: editorial_title -> title
  const cTitleCascade2 = {
    ...cleanContribution,
    title: "Título Original",
    editorial_title: "Título Editorial",
    publication_title: null,
  };
  const pubTitle2 = toPublicContribution(cTitleCascade2, "slug-cascade-2");
  assert(pubTitle2.title === "Título Editorial", "Cascada Título: Se prefiere editorial_title si publication_title es null o vacío.");

  // A.3: fallback to title
  const cTitleCascade3 = {
    ...cleanContribution,
    title: "Título Original",
    editorial_title: null,
    publication_title: null,
  };
  const pubTitle3 = toPublicContribution(cTitleCascade3, "slug-cascade-3");
  assert(pubTitle3.title === "Título Original", "Cascada Título: Cae a title si los editoriales son null o vacíos.");

  // B. Prueba de Cascadas de Descripción
  // B.1: publication_excerpt -> editorial_summary -> editorial_description -> description
  const cDescCascade1 = {
    ...cleanContribution,
    description: "Original Desc",
    editorial_description: "Editorial Desc",
    editorial_summary: "Editorial Summary",
    publication_excerpt: "Publication Excerpt",
  };
  const pubDesc1 = toPublicContribution(cDescCascade1, "slug-desc-1");
  assert(pubDesc1.description === "Publication Excerpt", "Cascada Descripción: Se prefiere publication_excerpt.");

  // B.2: editorial_summary -> editorial_description -> description
  const cDescCascade2 = {
    ...cleanContribution,
    description: "Original Desc",
    editorial_description: "Editorial Desc",
    editorial_summary: "Editorial Summary",
    publication_excerpt: null,
  };
  const pubDesc2 = toPublicContribution(cDescCascade2, "slug-desc-2");
  assert(pubDesc2.description === "Editorial Summary", "Cascada Descripción: Se prefiere editorial_summary si excerpt es null o vacío.");

  // B.3: editorial_description -> description
  const cDescCascade3 = {
    ...cleanContribution,
    description: "Original Desc",
    editorial_description: "Editorial Desc",
    editorial_summary: null,
    publication_excerpt: null,
  };
  const pubDesc3 = toPublicContribution(cDescCascade3, "slug-desc-3");
  assert(pubDesc3.description === "Editorial Desc", "Cascada Descripción: Se prefiere editorial_description.");

  // B.4: fallback to description
  const cDescCascade4 = {
    ...cleanContribution,
    description: "Original Desc",
    editorial_description: null,
    editorial_summary: null,
    publication_excerpt: null,
  };
  const pubDesc4 = toPublicContribution(cDescCascade4, "slug-desc-4");
  assert(pubDesc4.description === "Original Desc", "Cascada Descripción: Cae a description.");

  // C. Prueba de Cascadas de Contexto Histórico
  // C.1: editorial_context -> historical_context
  const cCtxCascade1 = {
    ...cleanContribution,
    historical_context: "Original Context",
    editorial_context: "Editorial Context",
  };
  const pubCtx1 = toPublicContribution(cCtxCascade1, "slug-ctx-1");
  assert(pubCtx1.historicalContext === "Editorial Context", "Cascada Contexto: Se prefiere editorial_context.");

  // C.2: fallback to historical_context
  const cCtxCascade2 = {
    ...cleanContribution,
    historical_context: "Original Context",
    editorial_context: null,
  };
  const pubCtx2 = toPublicContribution(cCtxCascade2, "slug-ctx-2");
  assert(pubCtx2.historicalContext === "Original Context", "Cascada Contexto: Cae a historical_context.");

  // D. Prueba de Créditos
  const cCredits = {
    ...cleanContribution,
    publication_credits: "Créditos Editoriales Especiales",
  };
  const pubCredits = toPublicContribution(cCredits, "slug-creditos");
  assert(pubCredits.credits.displayName === "Créditos Editoriales Especiales", "Créditos: Se prefiere publication_credits.");

  // E. Normalización de null, undefined, cadena vacía y espacios en blanco
  const cNormalizations = {
    ...cleanContribution,
    title: "Título Válido",
    publication_title: "   ", // Espacios en blanco
    editorial_title: "", // Cadena vacía
    description: "Descripción Válida",
    publication_excerpt: "   ",
    editorial_summary: "",
    editorial_description: null, // Null
  };
  const pubNorm = toPublicContribution(cNormalizations, "slug-normalizations");
  assert(pubNorm.title === "Título Válido", "Normalización: espacios en blanco y vacíos en títulos resuelven a fallbacks.");
  assert(pubNorm.description === "Descripción Válida", "Normalización: espacios en blanco, vacíos y nulls en descripción resuelven a fallbacks.");

  // F. Ausencia de datos privados
  const privateFields = [
    "internal_notes",
    "publication_notes",
    "historical_validation_notes",
    "historical_validation_status",
    "editorial_classification",
    "publication_level",
    "contributor_id",
  ];
  checkForbiddenKeysRecursive(pubTitle1, privateFields, assert);

  // G. Simulación e integridad de los flujos de Detalle (API Public) y Catálogo (Explore)
  // Verificar que la estructura de ContributionInput que producen los repositorios sea completamente apta
  // y resuelva a un DTO público válido y saneado en ambas vías de datos.
  const mockRepoItem: any = {
    id: "a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1",
    title: "Original",
    description: "Original Desc",
    content_type: "textual",
    exact_date: "1980-01-01",
    approximate_decade: "1980s",
    related_place: "Lugar",
    mentioned_people: "Persona",
    related_institution: "Institución",
    historical_context: "Original Ctx",
    authorization_level: "A",
    credit_preference: "Nombre completo",
    consent_verified: true,
    consent_source: "web_form",
    catalog_code: "MV-FOT-2026-0004",
    publication_scheduled_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contributor: { id: "c1", full_name: "Aportante" },
    files: [],
    editorial_title: "Ed Title",
    editorial_description: "Ed Desc",
    editorial_summary: "Ed Sum",
    editorial_context: "Ed Ctx",
    publication_title: "Pub Title",
    publication_excerpt: "Pub Excerpt",
    publication_credits: "Pub Credits",
    publication_status: { id: "p1", code: "published", name: "Publicado" },
    editorial_status: { id: "e1", code: "approved_archive", name: "Aprobado para archivo" },
  };

  const canonicalSlugForMock = buildContributionCanonicalSlug({ publicTitle: "Pub Title", catalogCode: "MV-FOT-2026-0004", contributionId: mockRepoItem.id });
  const pubDetail = toPublicContribution(mockRepoItem, canonicalSlugForMock);
  assert(pubDetail.title === "Pub Title", "Detalle Público/Catálogo: Posee y usa título editorial de publicación.");
  assert(pubDetail.description === "Pub Excerpt", "Detalle Público/Catálogo: Posee y usa extracto de publicación.");
  assert(pubDetail.historicalContext === "Ed Ctx", "Detalle Público/Catálogo: Posee y usa contexto editorial.");
  assert(pubDetail.credits.displayName === "Pub Credits", "Detalle Público/Catálogo: Posee y usa créditos de publicación.");
  assert(pubDetail.slug === canonicalSlugForMock, "INC-005: El slug del DTO proviene del parámetro canónico, no se recalcula en memoria.");

  const parseDetail = publicContributionSchema.safeParse(pubDetail);
  assert(parseDetail.success === true, "Detalle Público/Catálogo: Mapea a un DTO público Zod válido.");

  // =========================================================================
  // PRUEBAS DE INC-005: FUENTE CANÓNICA DE SLUGS
  // =========================================================================

  // H. buildContributionSlugSource: fuente canónica de generación
  const source1 = buildContributionSlugSource("Don Argel Manuel Santiago", "MV-FOT-2026-0004", "unused-id");
  assert(source1 === "Don Argel Manuel Santiago-MV-FOT-2026-0004", "INC-005 SlugSource: construye cadena título-código correctamente.");

  const source2 = buildContributionSlugSource("Don Argel Manuel Santiago", null, "1057bba1-ab32-4567-a873-45212bc4f4fb");
  assert(source2 === "Don Argel Manuel Santiago-1057bba1-ab32-4567-a873-45212bc4f4fb", "INC-005 SlugSource: usa contributionId cuando catalogCode es null.");

  // Con espacios en blanco iniciales/finales en el título
  const source3 = buildContributionSlugSource("  Título con espacios  ", "MV-FOT-2026-0001", "unused");
  assert(source3 === "Título con espacios-MV-FOT-2026-0001", "INC-005 SlugSource: elimina espacios extremos del título.");

  // I. buildContributionCanonicalSlug: normalización completa
  const slug1 = buildContributionCanonicalSlug({ publicTitle: "Don Argel Manuel Santiago", catalogCode: "MV-FOT-2026-0004", contributionId: "unused" });
  assert(slug1 === "don-argel-manuel-santiago-mv-fot-2026-0004", "INC-005 CanonicalSlug: normaliza título y código a slug limpio.");

  const slugAccents = buildContributionCanonicalSlug({ publicTitle: "Inauguración del Cuartel de Bomberos Nº 29", catalogCode: "MV-FOT-2026-0001", contributionId: "unused" });
  assert(!slugAccents.includes("ã") && !slugAccents.includes("Ã") && !slugAccents.includes("º"), "INC-005 CanonicalSlug: elimina tildes y caracteres especiales.");
  assert(slugAccents.startsWith("inauguracion-del-cuartel"), "INC-005 CanonicalSlug: normaliza título con acentos correctamente.");

  // J. Slug vacío como señal de anomalía (sin bloqueo de aporte)
  const pubWithEmptySlug = toPublicContribution({ ...cleanContribution }, "");
  assert(pubWithEmptySlug.slug === "", "INC-005: Slug vacío se preserva como señal de anomalía (no se recalcula en memoria).");
}
