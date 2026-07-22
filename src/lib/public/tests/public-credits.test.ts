// Pruebas Unitarias para Créditos Públicos
// Archivo: src/lib/public/tests/public-credits.test.ts

import { toPublicCredits, getInitials, getFamilyName } from "../mappers/to-public-credits";
import { publicCreditsSchema } from "../validation/credits.schema";
import { cleanContribution, contributionNoConsent } from "./fixtures";

export function runCreditsTests(assert: (cond: boolean, msg: string) => void) {
  console.log("-> [TESTS] Iniciando pruebas de créditos públicos...");

  // 1. Iniciales con nombres compuestos y tildes
  assert(getInitials("Juan Carlos Pérez") === "J. C. P.", "Iniciales básicas corregidas.");
  assert(getInitials("Óscar Agustín Di Stéfano") === "Ó. A. D. S.", "Iniciales complejas con acento y partículas.");

  // 2. Nombres de familia
  assert(getFamilyName("Juan Pérez") === "Familia Pérez", "Nombre de familia básico.");
  assert(getFamilyName("Familia Pérez") === "Familia Pérez", "Nombre de familia redundante conservado.");

  // 3. Mapeo Nombre Completo
  const creditsFull = toPublicCredits(cleanContribution);
  assert(creditsFull.attributionType === "full_name", "Preferencia Nombre Completo mapped to full_name.");
  assert(creditsFull.displayName === "Edith Gómez", "Muestra nombre del aportante.");

  // 4. Mapeo Iniciales
  const contributionInitials = { ...cleanContribution, credit_preference: "Iniciales" };
  const creditsInitials = toPublicCredits(contributionInitials);
  assert(creditsInitials.attributionType === "initials", "Preferencia Iniciales mapped to initials.");
  assert(creditsInitials.displayName === "E. G.", "Mapeo de iniciales correcto.");

  // 5. Mapeo Familia
  const contributionFamily = { ...cleanContribution, credit_preference: "Familia aportante" };
  const creditsFamily = toPublicCredits(contributionFamily);
  assert(creditsFamily.attributionType === "family", "Preferencia Familia mapped to family.");
  assert(creditsFamily.displayName === "Familia Gómez", "Mapeo de familia correcto.");

  // 6. Mapeo Anónimo
  const contributionAnon = { ...cleanContribution, credit_preference: "Anónimo" };
  const creditsAnon = toPublicCredits(contributionAnon);
  assert(creditsAnon.attributionType === "anonymous", "Preferencia Anónimo mapped to anonymous.");
  assert(creditsAnon.displayName === "Aporte anónimo", "Anonimización correcta.");

  // 7. Sobreescritura manual (Custom)
  const creditsCustom = toPublicCredits(cleanContribution, "Vecinos Autoconvocados");
  assert(creditsCustom.attributionType === "custom", "Sobreescritura manual mapped to custom.");
  assert(creditsCustom.displayName === "Vecinos Autoconvocados", "Fuerza displayName manual.");

  // 8. Validación de Esquema Zod (Strict)
  const parsed = publicCreditsSchema.safeParse(creditsFull);
  assert(parsed.success === true, "Credits cumplen esquema de Zod.");

  // 9. Rechazo por falta de consentimiento
  try {
    toPublicCredits(contributionNoConsent);
    assert(false, "Debe fallar al mapear créditos sin consentimiento.");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    assert(msg.includes("consentimiento"), "Lanza error explicativo por consentimiento.");
  }

  // 10. Test de strictness en Zod
  const unsafeCredits = {
    attributionType: "anonymous" as const,
    displayName: "Aporte anónimo",
    email: "leak@example.com", // Campo no declarado
  };
  const parseUnsafe = publicCreditsSchema.safeParse(unsafeCredits);
  assert(parseUnsafe.success === false, "Esquema de créditos estricto rechaza campos adicionales.");
}
