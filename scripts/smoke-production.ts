// Script de Smoke Tests para Staging y Producción
// Archivo: scripts/smoke-production.ts

import * as dotenv from "dotenv";
import * as path from "path";

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV || "development";

async function main() {
  console.log("=== INICIANDO PRUEBAS DE HUMO (SMOKE TESTS) ===");

  // Analizar argumentos de línea de comando
  const args = process.argv.slice(2);
  const hasConfirmArg = args.includes("--confirm");
  const isConfirmEnv = process.env.CONFIRM_PRODUCTION === "true";
  const confirm = hasConfirmArg || isConfirmEnv;

  // Determinar URL objetivo
  let targetUrl = DEFAULT_SITE_URL.replace(/\/$/, "");
  
  // Buscar si se pasó un URL explícito por argumento
  const urlArg = args.find(arg => arg.startsWith("http://") || arg.startsWith("https://"));
  if (urlArg) {
    targetUrl = urlArg.replace(/\/$/, "");
  }

  console.log(`- Entorno detectado: ${APP_ENV}`);
  console.log(`- URL Objetivo: ${targetUrl}`);

  const isProduction = APP_ENV === "production" || targetUrl.includes("memoriavivapicotruncado.org");

  // Gate de seguridad para producción
  if (isProduction && !confirm) {
    console.error("\n❌ [ERROR DE SEGURIDAD] Intentando correr smoke tests contra un entorno de PRODUCCIÓN sin confirmación.");
    console.error("Para proceder, ejecute con:");
    console.error("  npm run smoke:production");
    console.error("o añada el flag --confirm o la variable CONFIRM_PRODUCTION=true:\n");
    process.exit(1);
  }

  if (isProduction) {
    console.log("⚠️ [ATENCIÓN] Ejecutando smoke tests en PRODUCCIÓN (Confirmado).");
  }

  let failures = 0;

  async function testEndpoint(name: string, path: string, validator: (status: number, body: string) => { success: boolean; msg: string }) {
    const url = `${targetUrl}${path}`;
    console.log(`\n-> Verificando ${name} (${url})...`);
    try {
      const response = await fetch(url, { headers: { "User-Agent": "SmokeTestBot/1.0" } });
      const status = response.status;
      const body = await response.text();

      const result = validator(status, body);
      if (result.success) {
        console.log(`   [ÉXITO] ${result.msg}`);
      } else {
        console.error(`   [FALLO] ${result.msg}`);
        failures++;
      }
    } catch (error: any) {
      console.error(`   [FALLO] No se pudo conectar con el endpoint. Error: ${error.message}`);
      failures++;
    }
  }

  // 1. Verificar Home
  await testEndpoint("Página de Inicio (Home)", "/", (status, body) => {
    if (status !== 200) {
      return { success: false, msg: `Retornó código HTTP ${status} (Esperado 200)` };
    }
    const hasTitle = body.includes("Memoria Viva");
    if (!hasTitle) {
      return { success: false, msg: "El cuerpo de la Home no contiene el título del proyecto 'Memoria Viva'" };
    }
    return { success: true, msg: "Home responde con código 200 y contiene el título del proyecto." };
  });

  // 2. Verificar /contributions
  await testEndpoint("Listado de Aportes", "/contributions", (status, body) => {
    if (status !== 200) {
      return { success: false, msg: `Retornó código HTTP ${status} (Esperado 200)` };
    }
    const hasSearch = body.includes("buscar") || body.includes("input") || body.includes("type=\"text\"");
    if (!hasSearch) {
      return { success: false, msg: "El listado de aportes no contiene un cuadro de búsqueda o filtros." };
    }
    return { success: true, msg: "Listado de aportes responde con código 200 y expone el cuadro de búsqueda." };
  });

  // 3. Verificar /api/health
  await testEndpoint("Ruta de Salud", "/api/health", (status, body) => {
    if (status !== 200) {
      return { success: false, msg: `Retornó código HTTP ${status} (Esperado 200)` };
    }
    try {
      const data = JSON.parse(body);
      if (data.status !== "ok") {
        return { success: false, msg: `Status de salud reportado es degraded o inválido: ${data.status}` };
      }
      return { success: true, msg: `Health check exitoso. Environment: ${data.environment}, Version: ${data.version}` };
    } catch {
      return { success: false, msg: "La respuesta de la API no es un JSON válido." };
    }
  });

  // 4. Verificar robots.txt
  await testEndpoint("Robots Directives", "/robots.txt", (status, body) => {
    if (status !== 200) {
      return { success: false, msg: `Retornó código HTTP ${status} (Esperado 200)` };
    }
    const isStaging = APP_ENV === "staging" || targetUrl.includes("staging");
    if (isStaging) {
      const isDisallowed = body.includes("Disallow: /") && body.includes("User-agent: *");
      if (!isDisallowed) {
        return { success: false, msg: "En Staging, robots.txt debería bloquear toda indexación ('Disallow: /')" };
      }
      return { success: true, msg: "robots.txt bloquea la indexación correctamente en entorno Staging." };
    } else {
      const isAllowed = body.includes("Allow: /");
      if (!isAllowed) {
        return { success: false, msg: "En producción, robots.txt debería permitir indexación pública." };
      }
      return { success: true, msg: "robots.txt permite indexación pública en producción." };
    }
  });

  // 5. Verificar sitemap.xml
  await testEndpoint("Sitemap XML", "/sitemap.xml", (status, body) => {
    const isStaging = APP_ENV === "staging" || targetUrl.includes("staging");
    if (isStaging) {
      // Debería fallar (por nuestra validación) o retornar vacío/error 500 controlado
      if (status === 200 && body.includes("<urlset")) {
        return { success: false, msg: "En Staging, sitemap.xml no debería retornar un sitemap válido indexable." };
      }
      return { success: true, msg: `Sitemap no disponible en staging tal como se esperaba (Status: ${status}).` };
    } else {
      if (status !== 200) {
        return { success: false, msg: `Sitemap falló en producción con código HTTP ${status}` };
      }
      if (!body.includes("<urlset") || body.trim().length < 50) {
        return { success: false, msg: "Sitemap en producción está vacío o no contiene la cabecera XML correcta." };
      }
      return { success: true, msg: "Sitemap responde correctamente en producción con registros válidos." };
    }
  });

  // 6. Verificar feed.xml
  await testEndpoint("Feed RSS", "/feed.xml", (status, body) => {
    const isStaging = APP_ENV === "staging" || targetUrl.includes("staging");
    if (isStaging) {
      if (status === 200 && body.includes("<rss")) {
        return { success: false, msg: "En Staging, el feed RSS no debería servirse públicamente o estar indexado." };
      }
      return { success: true, msg: `Feed RSS bloqueado correctamente en Staging (Status: ${status}).` };
    } else {
      if (status !== 200) {
        return { success: false, msg: `Feed RSS falló en producción con código HTTP ${status}` };
      }
      if (!body.includes("<rss version=\"2.0\"")) {
        return { success: false, msg: "Feed RSS en producción no contiene la estructura XML de RSS 2.0." };
      }
      return { success: true, msg: "Feed RSS responde correctamente en producción." };
    }
  });

  console.log("\n================================================");
  if (failures === 0) {
    console.log("✓ ¡TODOS LOS SMOKE TESTS PASARON EXITOSAMENTE!");
    console.log("================================================");
    process.exit(0);
  } else {
    console.error(`❌ SE ENCONTRARON ${failures} FALLOS DURANTE LOS SMOKE TESTS.`);
    console.error("================================================");
    process.exit(1);
  }
}

main().catch(err => {
  console.error("❌ Error durante la ejecución de los smoke tests:", err);
  process.exit(1);
});
