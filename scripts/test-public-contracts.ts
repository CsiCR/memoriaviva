// Suite de Pruebas Unitarias para Contratos Públicos (v4.1.1)
// Archivo: scripts/test-public-contracts.ts

import { runCreditsTests } from "../src/lib/public/tests/public-credits.test";
import { runMediaTests } from "../src/lib/public/tests/public-media.test";
import { runContributionTests } from "../src/lib/public/tests/public-contribution.test";
import { runStoryTests } from "../src/lib/public/tests/public-story.test";
import { runSlugTests } from "../src/lib/public/tests/slugs.test";
import { runPublicApiTests } from "../src/lib/public/tests/public-api.test";
import { runPublicUrlResolutionTests } from "../src/lib/public/tests/public-url-resolution.test";
import { runPublicSeoTests } from "../src/lib/public/tests/public-seo.test";
import { runPublicHomeTests } from "../src/lib/public/tests/public-home.test";
import { runPublicSearchTests } from "../src/lib/public/tests/public-search.test";
import { runProductionReadinessTests } from "../src/lib/public/tests/production-readiness.test";

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  -> [ÉXITO] ${message}`);
  } else {
    console.error(`  -> [FALLO] ${message}`);
    process.exit(1);
  }
}

console.log("=== INICIANDO VALIDACIONES DE LA CAPA DE CONTRATOS PÚBLICOS ===");

async function runAllTests() {
  runCreditsTests(assert);
  console.log("\n----------------------------------------------------");
  
  runMediaTests(assert);
  console.log("\n----------------------------------------------------");
  
  runContributionTests(assert);
  console.log("\n----------------------------------------------------");
  
  runStoryTests(assert);
  console.log("\n----------------------------------------------------");

  await runSlugTests(assert);
  console.log("\n----------------------------------------------------");

  await runPublicApiTests(assert);
  console.log("\n----------------------------------------------------");

  await runPublicUrlResolutionTests(assert);
  console.log("\n----------------------------------------------------");

  await runPublicSeoTests(assert);
  console.log("\n----------------------------------------------------");

  await runPublicHomeTests(assert);
  console.log("\n----------------------------------------------------");

  await runPublicSearchTests(assert);
  console.log("\n----------------------------------------------------");

  await runProductionReadinessTests(assert);
  console.log("\n====================================================");
  console.log(`✓ ¡TODAS LAS PRUEBAS PÚBLICAS PASARON EXITOSAMENTE! (${passedTests}/${totalTests})`);
  console.log("====================================================");
}


runAllTests().catch((err: unknown) => {
  console.error("\n❌ Se produjo un error inesperado durante la ejecución de las pruebas:", err);
  process.exit(1);
});
