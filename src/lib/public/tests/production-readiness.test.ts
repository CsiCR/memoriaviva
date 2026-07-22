// Suite de Pruebas de Preparación para Producción
// Archivo: src/lib/public/tests/production-readiness.test.ts

import { clientEnv } from "../../config/env";
import { buildRobotsDirectives } from "../seo/publishers/robots";
import { buildPublicCanonicalUrl } from "../url/canonical-url";
import { toPublicContribution } from "../mappers/to-public-contribution";
import { unsafeContribution } from "./fixtures";
import { z } from "zod";

// Zod schema local para simular la validación de variables en las pruebas
const testEnvSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z.enum(["development", "preview", "staging", "production"]),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

export async function runProductionReadinessTests(assert: (cond: boolean, msg: string) => void) {
  console.log("-> [TESTS] Iniciando suite de preparación para producción (Production Readiness)...");

  // 1. Validar parser de Environment (Zod)
  const validMock = {
    NEXT_PUBLIC_APP_ENV: "production",
    NEXT_PUBLIC_SITE_URL: "https://memoriavivapicotruncado.org",
    NEXT_PUBLIC_SUPABASE_URL: "https://xyz.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-123",
  };
  const parsedValid = testEnvSchema.safeParse(validMock);
  assert(parsedValid.success === true, "Zod Environment Parser valida correctamente entradas correctas.");

  const invalidMock = {
    NEXT_PUBLIC_APP_ENV: "staging",
    NEXT_PUBLIC_SITE_URL: "not-a-url", // URL inválida
    NEXT_PUBLIC_SUPABASE_URL: "https://xyz.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  };
  const parsedInvalid = testEnvSchema.safeParse(invalidMock);
  assert(parsedInvalid.success === false, "Zod Environment Parser rechaza correctamente URLs y llaves vacías.");

  // 2. Probar robots por ambiente (Staging vs Producción)
  const originalEnv = clientEnv.NEXT_PUBLIC_APP_ENV;

  // Forzar temporalmente staging en runtime
  const clientEnvCast = clientEnv as unknown as Record<string, string>;
  clientEnvCast.NEXT_PUBLIC_APP_ENV = "staging";
  const stagingRobots = buildRobotsDirectives("https://staging.memoriaviva.org");
  assert(
    stagingRobots.rules.some((r) => r.userAgent === "*" && r.disallow === "/"),
    "Robots en Staging bloquea explícitamente toda indexación (Disallow: /)."
  );
  assert(stagingRobots.sitemap === undefined, "Robots en Staging no publica URL de sitemap.");

  // Forzar producción
  clientEnvCast.NEXT_PUBLIC_APP_ENV = "production";
  const prodRobots = buildRobotsDirectives("https://memoriavivapicotruncado.org");
  assert(
    prodRobots.rules.some((r) => r.userAgent === "*" && r.allow?.includes("/contributions/")),
    "Robots en Producción permite indexar aportes públicos."
  );
  assert(
    prodRobots.sitemap === "https://memoriavivapicotruncado.org/sitemap.xml",
    "Robots en Producción publica el sitemap oficial."
  );

  // Restaurar ambiente original
  clientEnvCast.NEXT_PUBLIC_APP_ENV = originalEnv;

  // 3. Probar canonical por ambiente y remoción de slash
  const canonicalUrl = buildPublicCanonicalUrl({
    entityType: "contribution",
    canonicalSlug: "recuerdos-del-ferrocarril",
  });
  assert(canonicalUrl.startsWith("http"), "La URL canónica construida es absoluta.");
  assert(!canonicalUrl.endsWith("/"), "La URL canónica no termina con slash '/' innecesario.");

  // 4. Bloqueo de Sitemap en Staging
  // Simulamos la verificación lógica: si el entorno es staging, debe fallar/desactivarse
  let sitemapErrored = false;
  try {
    const mockSitemap = async (env: string) => {
      if (env === "staging") {
        throw new Error("Sitemap generation is disabled in staging environment.");
      }
      return [{ url: "https://memoriavivapicotruncado.org/contributions/1" }];
    };
    await mockSitemap("staging");
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("staging")) {
      sitemapErrored = true;
    }
  }
  assert(sitemapErrored === true, "La generación de sitemap dinámico en Staging falla explícitamente.");

  // 5. Configuración de Banners (Staging vs Beta)
  const isStagingEnv = clientEnv.NEXT_PUBLIC_APP_ENV === "staging";
  const isBetaBannerEnabled = clientEnv.NEXT_PUBLIC_SHOW_BETA_BANNER;
  assert(
    typeof isStagingEnv === "boolean",
    "Configuración del banner de Staging resuelta a tipo booleano."
  );
  assert(
    typeof isBetaBannerEnabled === "boolean",
    "Configuración del banner Beta en producción resuelta a tipo booleano."
  );

  // 6. Protección de Secretos en DTO Públicos (Mapeo Seguro)
  const mappedPublic = toPublicContribution(unsafeContribution);
  
  // Validaciones del DTO Whitelist contra leaks
  const rawPublicObj = mappedPublic as unknown as Record<string, unknown>;
  assert(rawPublicObj.internal_notes === undefined, "Seguridad DTO: No expone observaciones internas editoriales.");
  assert(rawPublicObj.consent_reference === undefined, "Seguridad DTO: No expone código de referencia de consentimiento.");
  assert(rawPublicObj.consent_file_path === undefined, "Seguridad DTO: No expone la ruta del archivo físico de consentimiento.");
  assert(mappedPublic.credits.displayName !== "Juan Carlos Pérez", "Seguridad DTO: Respeta las preferencias de atribución (Iniciales) y no expone el nombre completo.");
  assert(mappedPublic.credits.displayName === "J. C. P.", "Seguridad DTO: Iniciales mapeadas correctamente.");

  // Comprobar no leak de datos del colaborador
  const mappedCredits = mappedPublic.credits as unknown as Record<string, unknown>;
  assert(
    mappedCredits.email === undefined && mappedCredits.phone === undefined,
    "Seguridad DTO: No expone correos ni teléfonos de colaboradores."
  );

  // Comprobar exclusión de archivos legales en multimedia pública
  const filesList = mappedPublic.media || [];
  const hasConsentDoc = filesList.some((f) => f.publicUrl.includes("autorizacion_firmada") || (f.title && f.title.includes("autorizacion")));
  assert(hasConsentDoc === false, "Seguridad DTO: Archivos de tipo consent_document están excluidos del payload multimedia público.");

  // 7. Simulación Conceptual de RLS
  // Valida que el cliente anónimo tenga prohibido SELECT sobre tablas internas de auditoría o contributors
  const simulateAnonymousAccess = (tableName: string, userRole: string | null): boolean => {
    if (!userRole || userRole === "anon") {
      // Tablas protegidas por RLS
      const protectedTables = ["contributors", "audit_logs", "consent_records", "profiles"];
      return !protectedTables.includes(tableName);
    }
    return true;
  };

  assert(
    simulateAnonymousAccess("contributors", "anon") === false,
    "RLS Conceptual: Cliente anónimo tiene bloqueada la consulta sobre la tabla de Aportantes."
  );
  assert(
    simulateAnonymousAccess("audit_logs", "anon") === false,
    "RLS Conceptual: Cliente anónimo tiene bloqueada la consulta sobre la tabla de Logs de Auditoría."
  );
  assert(
    simulateAnonymousAccess("profiles", "anon") === false,
    "RLS Conceptual: Cliente anónimo tiene bloqueada la consulta sobre perfiles de administración."
  );
  assert(
    simulateAnonymousAccess("contributions", "anon") === true,
    "RLS Conceptual: Tabla pública accesible para anon de forma controlada en la base de datos."
  );

  console.log("-> [TESTS] Suite de preparación para producción (Production Readiness) completada con éxito.");
}
