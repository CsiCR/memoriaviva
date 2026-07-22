// Pruebas Unitarias para Aportes Públicos
// Archivo: src/lib/public/tests/public-contribution.test.ts

import { toPublicContribution, toPublicHistoricalDate } from "../mappers/to-public-contribution";
import { publicContributionSchema } from "../validation/contribution.schema";
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
  const pubCont = toPublicContribution(cleanContribution);
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
    toPublicContribution(contributionNoConsent);
    assert(false, "Debe fallar si no hay consentimiento verificado.");
  } catch {
    assert(true, "Rechaza correctamente sin consentimiento verificado.");
  }

  try {
    toPublicContribution(contributionRestrictedAuth);
    assert(false, "Debe fallar si el nivel de autorización es restringido (D).");
  } catch {
    assert(true, "Rechaza correctamente autorización restringida.");
  }

  try {
    toPublicContribution(contributionReceivedState);
    assert(false, "Debe fallar si el estado editorial es Recibido.");
  } catch {
    assert(true, "Rechaza correctamente estado editorial no elegible.");
  }

  try {
    toPublicContribution(contributionNotPublishedState);
    assert(false, "Debe fallar si el estado de publicación no es published.");
  } catch {
    assert(true, "Rechaza correctamente estado de publicación distinto a publicado.");
  }

  // 5. Test de seguridad contra filtrado de datos (Fixture Peligroso)
  const pubUnsafe = toPublicContribution(unsafeContribution);
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
  const pubTextual = toPublicContribution(textualNoFiles);
  assert(pubTextual.media.length === 0, "No contiene medios.");
  assert(publicContributionSchema.safeParse(pubTextual).success === true, "Aporte sin archivos es publicable si es válido.");

  // 8. Aporte con todos sus medios revocados/fallidos no expone rutas ni objetos inseguros
  const pubRevokedMedia = toPublicContribution(contributionWithRevokedFiles);
  assert(pubRevokedMedia.media.length === 1, "Excluye el archivo fallido y el documento legal, conserva el válido.");
  assert(pubRevokedMedia.media[0].id === "77777777-7777-4777-8777-777777777777", "Conserva el archivo apto.");
}
