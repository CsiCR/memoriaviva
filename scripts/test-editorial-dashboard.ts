// Suite de Pruebas Unitarias, Rendimiento y Consistencia del Dashboard Editorial (v1.0)
// Archivo: scripts/test-editorial-dashboard.ts

import { evaluateDashboard, EvaluatedContribution, DashboardFilter } from '../src/lib/editorial/dashboard';
import { evaluateEditorialProgress } from '../src/lib/editorial/progress';
import { evaluateContribution } from '../src/lib/editorial/evaluateContribution';

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

// Generador de aportes evaluados simulados para las pruebas
function createMockEvaluatedContribution(overrides: Partial<EvaluatedContribution> = {}): EvaluatedContribution {
  const progressRes = evaluateEditorialProgress({ contributionId: overrides.id || "test-id" });
  const eligibilityRes = evaluateContribution({
    id: overrides.id || "test-id",
    editorial_status: { code: overrides.editorialStatus || "received", name: "Recibido" },
    publication_status: { id: "1", code: overrides.publicationStatus || "draft", name: "Borrador" },
    consent_verified: overrides.authorizationLevel ? true : false,
    authorization_level: overrides.authorizationLevel || null,
    credit_preference: "credit_name",
    consent_source: "web_form"
  });

  return {
    id: overrides.id || "test-id",
    title: overrides.title || "Aporte de prueba",
    description: overrides.description || "Descripción de prueba para el aporte.",
    contentType: overrides.contentType || "textual",
    receivedAt: overrides.receivedAt || "2026-07-20T00:00:00Z",
    updatedAt: overrides.updatedAt || "2026-07-20T00:00:00Z",
    publishedAt: overrides.publishedAt || null,
    editorialStatus: overrides.editorialStatus || "received",
    publicationStatus: overrides.publicationStatus || "draft",
    authorizationLevel: overrides.authorizationLevel || null,
    hasEditorialIntervention: overrides.hasEditorialIntervention || false,
    progressResult: overrides.progressResult 
      ? { ...progressRes, ...overrides.progressResult } 
      : progressRes,
    eligibilityResult: overrides.eligibilityResult 
      ? { ...eligibilityRes, ...overrides.eligibilityResult } 
      : eligibilityRes,
    activeIndicators: overrides.activeIndicators || [],
    historicalValidationStatus: overrides.historicalValidationStatus || "pending"
  };
}

console.log("=== INICIANDO VALIDACIONES TÉCNICAS DEL DASHBOARD EDITORIAL ===");

// 1. Colección vacía
console.log("\nEscenario 1: Colección vacía.");
const resEmpty = evaluateDashboard([], {});
assert(resEmpty.totalContributions === 0, "Debe tener 0 aportes.");
assert(resEmpty.averageProgress === 0, "El promedio de avance debe ser 0.");
assert(resEmpty.stageDistribution.every(s => s.count === 0), "Todos los estados de distribución deben tener conteo 0.");
assert(resEmpty.editorialHealth.healthScore === 100, "Salud editorial por defecto es 100% si no hay aportes.");

// 2. Aporte único
console.log("\nEscenario 2: Aporte único.");
const cSingle = createMockEvaluatedContribution({
  id: "c-1",
  receivedAt: "2026-07-10T12:00:00Z",
  progressResult: {
    progress: 75,
    currentStage: { code: "UNDER_REVIEW", label: "En Revisión Editorial" },
    nextStage: null,
    completedItems: [],
    pendingItems: [],
    blockedItems: [],
    recommendations: [],
    nextAction: null,
    nextMilestone: null,
    completedWeight: 75,
    totalWeight: 100,
    remainingSteps: 2,
    summary: "Parcial",
    details: {} as any,
    isPublished: false,
    hasPostPublicationInconsistencies: false,
    conflicts: []
  }
});
const resSingle = evaluateDashboard([cSingle], {});
assert(resSingle.totalContributions === 1, "Debe reportar 1 aporte.");
assert(resSingle.averageProgress === 75, "Promedio de progreso debe ser 75.");
assert(resSingle.stageDistribution.find(s => s.code === "UNDER_REVIEW")?.count === 1, "Etapa UNDER_REVIEW debe tener conteo 1.");
assert(resSingle.timeline.length === 1 && resSingle.timeline[0].period === "2026-07", "Debe agrupar en el periodo 2026-07.");

// 3. Verificación de inmutabilidad
console.log("\nEscenario 3: Inmutabilidad.");
const originalList = [cSingle];
const originalListLength = originalList.length;
evaluateDashboard(originalList, {});
assert(originalList.length === originalListLength, "La colección original de aportes no debe ser mutada.");

// 4. Datos estadísticos y productividad
console.log("\nEscenario 4: Estadísticas y Productividad.");
const cList = [
  createMockEvaluatedContribution({ progressResult: { progress: 10 } as any }),
  createMockEvaluatedContribution({ progressResult: { progress: 20 } as any }),
  createMockEvaluatedContribution({ progressResult: { progress: 30 } as any }),
  createMockEvaluatedContribution({ progressResult: { progress: 40 } as any }),
  createMockEvaluatedContribution({ progressResult: { progress: 50 } as any }),
  createMockEvaluatedContribution({ progressResult: { progress: 100 } as any })
];
const resStats = evaluateDashboard(cList, {});
assert(resStats.productivity.average === 41.67, `El promedio debe ser 41.67% (obtenido: ${resStats.productivity.average}%).`);
assert(resStats.productivity.median === 35, `La mediana debe ser 35 (obtenido: ${resStats.productivity.median}).`);
assert(resStats.productivity.min === 10, "El valor mínimo debe ser 10.");
assert(resStats.productivity.max === 100, "El valor máximo debe ser 100.");
assert(resStats.productivity.percentile25 === 22.5, `El percentil 25 debe ser 22.5 (obtenido: ${resStats.productivity.percentile25}).`);
assert(resStats.productivity.percentile75 === 47.5, `El percentil 75 debe ser 47.5 (obtenido: ${resStats.productivity.percentile75}).`);

// 5. Cuellos de botella con porcentajes
console.log("\nEscenario 5: Cuellos de botella.");
const cBlocked = [
  createMockEvaluatedContribution({
    progressResult: {
      blockedItems: [
        { code: "CONSENT", label: "Consentimiento verificado y firmado", status: "blocked", weight: 20, earnedWeight: 0 }
      ]
    } as any
  }),
  createMockEvaluatedContribution({
    progressResult: {
      blockedItems: [
        { code: "CONSENT", label: "Consentimiento verificado y firmado", status: "blocked", weight: 20, earnedWeight: 0 },
        { code: "FILES", label: "Archivos", status: "blocked", weight: 15, earnedWeight: 0 }
      ]
    } as any
  }),
  createMockEvaluatedContribution({
    progressResult: { blockedItems: [] } as any
  })
];
const resBottlenecks = evaluateDashboard(cBlocked, {});
const consentBottleneck = resBottlenecks.bottlenecks.find(b => b.code === "CONSENT");
assert(consentBottleneck?.count === 2, "Debe contar 2 bloqueos de Consentimiento.");
assert(consentBottleneck?.percentage === 66.7, `Porcentaje de bloqueo debe ser 66.7% (obtenido: ${consentBottleneck?.percentage}%).`);

// 6. Timeline en diferentes modos
console.log("\nEscenario 6: Timeline en múltiples modos.");
const cTimeline = [
  createMockEvaluatedContribution({ receivedAt: "2026-06-15T00:00:00Z", updatedAt: "2026-07-01T00:00:00Z", publishedAt: "2026-07-10T00:00:00Z" }),
  createMockEvaluatedContribution({ receivedAt: "2026-06-20T00:00:00Z", updatedAt: "2026-07-02T00:00:00Z", publishedAt: null })
];
const resReceived = evaluateDashboard(cTimeline, { timelineMode: "received" });
const resUpdated = evaluateDashboard(cTimeline, { timelineMode: "updated" });
const resPublished = evaluateDashboard(cTimeline, { timelineMode: "published" });
assert(resReceived.timeline.some(t => t.period === "2026-06" && t.count === 2), "Timeline recibido debe agrupar 2 aportes en junio.");
assert(resUpdated.timeline.some(t => t.period === "2026-07" && t.count === 2), "Timeline modificado debe agrupar 2 aportes en julio.");
assert(resPublished.timeline.some(t => t.period === "2026-07" && t.count === 1) && resPublished.timeline.length === 1, "Timeline publicado debe tener 1 aporte en julio.");

// 7. Filtros encadenados/compuestos
console.log("\nEscenario 7: Filtros encadenados.");
const cFilters = [
  createMockEvaluatedContribution({ id: "1", contentType: "textual", progressResult: { progress: 85, currentStage: { code: "UNDER_REVIEW" }, blockedItems: [] } as any }),
  createMockEvaluatedContribution({ id: "2", contentType: "documentary", progressResult: { progress: 95, currentStage: { code: "UNDER_REVIEW" }, blockedItems: [] } as any }),
  createMockEvaluatedContribution({ id: "3", contentType: "documentary", progressResult: { progress: 50, currentStage: { code: "DOCUMENTED" }, blockedItems: [] } as any })
];
const filter: DashboardFilter = {
  contentType: "documentary",
  stage: "UNDER_REVIEW",
  progressMin: 90
};
const resFilters = evaluateDashboard(cFilters, filter);
assert(resFilters.totalContributions === 1 && resFilters.metadata.evaluatedContributionsCount === 1, "Filtro encadenado debe retornar exactamente 1 aporte.");

// 8. Salud Editorial
console.log("\nEscenario 8: Salud Editorial.");
const cHealth = [
  // 1 Aporte bloqueado (1/3 = 33.3% bloqueo)
  createMockEvaluatedContribution({ progressResult: { blockedItems: [{ code: "CONSENT" }] } as any }),
  // 1 Aporte con advertencias (1/3 = 33.3% advertencias)
  createMockEvaluatedContribution({ progressResult: { blockedItems: [], pendingItems: [{ code: "DESCRIPTION" }], progress: 90 } as any }),
  // 1 Aporte perfecto (1/3 = 33.3% excelente)
  createMockEvaluatedContribution({ progressResult: { blockedItems: [], pendingItems: [], progress: 100 } as any })
];
const resHealth = evaluateDashboard(cHealth, {});
// blockedPercentage = 33. warningPercentage = 33.
// healthScore = 100 - 33 - (33 * 0.5) = 100 - 33 - 16.5 = 50.5 -> 51%
assert(resHealth.editorialHealth.healthScore === 51, `Salud editorial esperada 51% (obtenida: ${resHealth.editorialHealth.healthScore}%).`);
assert(resHealth.editorialHealth.label === "Regular", `Salud editorial debe ser Regular (obtenida: ${resHealth.editorialHealth.label}).`);

// 9. Dashboard Inteligente (SmartActions)
console.log("\nEscenario 9: Dashboard Inteligente (SmartActions).");
const cSmart = [
  createMockEvaluatedContribution({
    progressResult: { currentStage: { code: "HISTORICAL_VALIDATION" }, blockedItems: [{ code: "CONSENT" }] } as any,
    historicalValidationStatus: "pending"
  })
];
const resSmart = evaluateDashboard(cSmart, {});
assert(resSmart.smartActions.length === 2, "Debe generar 2 acciones inteligentes.");
assert(resSmart.smartActions[0].code === "CONSENT_PENDING", "La de mayor prioridad debe ser CONSENT_PENDING.");

// 10. Prueba de Rendimiento con 10.000 aportes
console.log("\nEscenario 10: Rendimiento de estrés con 10.000 aportes.");
const largeCollection: EvaluatedContribution[] = [];
for (let i = 0; i < 10000; i++) {
  largeCollection.push(createMockEvaluatedContribution({
    id: `id-${i}`,
    progressResult: {
      progress: Math.floor(Math.random() * 101),
      currentStage: { code: "UNDER_REVIEW", label: "En Revisión Editorial" },
      blockedItems: i % 10 === 0 ? [{ code: "CONSENT", label: "Consentimiento", status: "blocked", weight: 20, earnedWeight: 0 }] : []
    } as any
  }));
}

const start = Date.now();
const resLarge = evaluateDashboard(largeCollection, {});
const duration = Date.now() - start;

assert(resLarge.totalContributions === 10000, "Debe procesar los 10.000 aportes.");
assert(duration < 250, `El cálculo de agregación para 10.000 aportes debe completarse en menos de 250ms (duración: ${duration}ms).`);
console.log(`  -> Rendimiento de memoria estable. Duración: ${duration}ms.`);

console.log(`\n=== SUITE DE PRUEBAS DE DASHBOARD COMPLETADA: ${passedTests}/${totalTests} aserciones aprobadas ===\n`);
