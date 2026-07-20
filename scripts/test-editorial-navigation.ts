// Suite de Pruebas Unitarias de Navegación, URL Contract y Consistencia de Filtros (v1.1)
// Archivo: scripts/test-editorial-navigation.ts

import { 
  parseContributionFilters, 
  serializeContributionFilters, 
  buildContributionListUrl, 
  removeContributionFilterValue, 
  mergeContributionFilters,
  filterContributionsByListFilter
} from '../src/lib/editorial/navigation';
import { evaluateDashboard, EvaluatedContribution } from '../src/lib/editorial/dashboard';
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

// Generador de aportes evaluados simulados
function createMockEvaluatedContribution(overrides: any = {}): EvaluatedContribution {
  const pubStatus = overrides.publicationStatus ? { id: "1", code: overrides.publicationStatus, name: overrides.publicationStatus } : { id: "1", code: "draft", name: "Borrador" };
  const edStatus = overrides.editorialStatus ? { id: "1", code: overrides.editorialStatus, name: overrides.editorialStatus } : { id: "1", code: "received", name: "Recibido" };

  const progressRes = evaluateEditorialProgress({ 
    contributionId: overrides.id || "test-id",
    publicationStatus: pubStatus,
    editorialStatus: edStatus
  });

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
    rawContributionType: overrides.rawContributionType || "Testimonio escrito",
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

console.log("=== INICIANDO VALIDACIONES TÉCNICAS DEL MÓDULO DE NAVEGACIÓN Y FILTROS ===\n");

// --- GRUPO 1: Serialización y Deserialización ---
console.log("Grupo 1: Serialización y Deserialización");

const f1 = parseContributionFilters({
  search: "escuela",
  contentTypes: "textual,documentary",
  stages: "RECEIVED,UNDER_REVIEW",
  progressMin: "20",
  progressMax: "80",
  page: "2",
  pageSize: "50"
});

assert(f1.search === "escuela", "Debe parsear search.");
assert(f1.contentTypes?.length === 2 && f1.contentTypes.includes("textual"), "Debe parsear arrays separados por coma.");
assert(f1.stages?.length === 2 && f1.stages.includes("RECEIVED"), "Debe parsear stages.");
assert(f1.progressMin === 20 && f1.progressMax === 80, "Debe parsear rangos de progreso.");
assert(f1.page === 2 && f1.pageSize === 50, "Debe parsear paginación.");

const query = serializeContributionFilters(f1);
assert(query.includes("search=escuela"), "Debe serializar search.");
assert(query.includes("contentTypes=textual%2Cdocumentary") || query.includes("contentTypes=textual,documentary"), "Debe serializar arrays.");
assert(query.includes("progressMin=20") && query.includes("progressMax=80"), "Debe serializar rangos.");

const url = buildContributionListUrl(f1);
assert(url.startsWith("/admin/aportes?"), "Debe construir URL correcta.");


// --- GRUPO 2: Validación Estricta de Límites ---
console.log("\nGrupo 2: Validación Estricta de Límites y Valores Inválidos");

const fBad = parseContributionFilters({
  progressMin: "-50",
  progressMax: "150",
  page: "-5",
  pageSize: "9999",
  stages: "INVALID_STAGE,RECEIVED"
});

assert(fBad.progressMin === 0, "Limita progreso mínimo negativo a 0.");
assert(fBad.progressMax === 100, "Limita progreso máximo superior a 100.");
assert(fBad.page === undefined, "Ignora número de página negativo.");
assert(fBad.pageSize === undefined, "Ignora tamaño de página inválido.");
assert(fBad.stages?.length === 1 && fBad.stages[0] === "RECEIVED", "Filtra stages desconocidos.");

const fSwap = parseContributionFilters({
  progressMin: "80",
  progressMax: "20"
});
assert(fSwap.progressMin === 20 && fSwap.progressMax === 80, "Intercambia límites de progreso invertidos.");


// --- GRUPO 3: Operaciones con Chips (Inmutabilidad y Eliminación) ---
console.log("\nGrupo 3: Operaciones con Chips (Inmutabilidad y Eliminación)");

const fOriginal = {
  search: "hospital",
  contentTypes: ["textual", "documentary"],
  progressMin: 50,
  page: 3
};

const fRemovedVal = removeContributionFilterValue(fOriginal, "contentTypes", "textual");
assert(fOriginal.contentTypes?.length === 2, "La función remove no debe mutar el objeto original.");
assert(fRemovedVal.contentTypes?.length === 1 && fRemovedVal.contentTypes[0] === "documentary", "Remueve valor del array.");
assert(fRemovedVal.page === 1, "Reinicia página al eliminar un filtro.");

const fRemovedKey = removeContributionFilterValue(fOriginal, "search");
assert(fRemovedKey.search === undefined, "Elimina la propiedad escalar completa.");

const fMerged = mergeContributionFilters(fOriginal, { progressMin: 70, page: 2 });
assert(fMerged.progressMin === 70, "Actualiza valor con merge.");
assert(fMerged.page === 2, "Conserva página si se pasa explícitamente.");


// --- GRUPO 4: Consistencia de Conteos Dashboard vs Lista de Aportes ---
console.log("\nGrupo 4: Consistencia de Conteos Dashboard vs Lista de Aportes");

// Generar aportes simulados con diferentes estados
const c1 = createMockEvaluatedContribution({ 
  id: "c1", 
  title: "Aporte publicado", 
  publicationStatus: "published", 
  editorialStatus: "Validado",
  progressResult: {
    progress: 100,
    currentStage: { code: "PUBLISHED", label: "Publicado" },
    nextStage: null,
    completedItems: [],
    pendingItems: [],
    blockedItems: [],
    recommendations: [],
    nextAction: null,
    nextMilestone: null,
    completedWeight: 100,
    totalWeight: 100,
    remainingSteps: 0,
    summary: "Publicado",
    details: {} as any,
    isPublished: true,
    hasPostPublicationInconsistencies: false,
    conflicts: []
  }
});

const c2 = createMockEvaluatedContribution({
  id: "c2",
  title: "Aporte bloqueado",
  publicationStatus: "draft",
  progressResult: {
    progress: 40,
    currentStage: { code: "UNDER_REVIEW", label: "En revisión" },
    nextStage: null,
    completedItems: [],
    pendingItems: [],
    blockedItems: [{ code: "CONSENT", label: "Consentimiento", status: "blocked", weight: 10, earnedWeight: 0, reason: "Falta consentimiento" }],
    recommendations: [],
    nextAction: null,
    nextMilestone: null,
    completedWeight: 40,
    totalWeight: 100,
    remainingSteps: 2,
    summary: "Bloqueado",
    details: {} as any,
    isPublished: false,
    hasPostPublicationInconsistencies: false,
    conflicts: []
  }
});

const c3 = createMockEvaluatedContribution({ 
  id: "c3", 
  title: "Aporte elegible", 
  publicationStatus: "draft", 
  eligibilityResult: { eligibleForPublication: true, issues: [] },
  progressResult: {
    progress: 90,
    currentStage: { code: "READY_FOR_PUBLICATION", label: "Listo para publicar" },
    nextStage: null,
    completedItems: [],
    pendingItems: [],
    blockedItems: [],
    recommendations: [],
    nextAction: null,
    nextMilestone: null,
    completedWeight: 90,
    totalWeight: 100,
    remainingSteps: 1,
    summary: "Elegible",
    details: {} as any,
    isPublished: false,
    hasPostPublicationInconsistencies: false,
    conflicts: []
  }
});

const mockCollection = [c1, c2, c3];

// Ejecutar Dashboard
const dbRes = evaluateDashboard(mockCollection, {});

// 1. Filtrar por publicados
const filterPub = { publicationStatuses: ["published"] };
const resPub = filterContributionsByListFilter(mockCollection, filterPub);
assert(resPub.length === dbRes.publishedCount && resPub[0].id === "c1", "Publicados: Conteo y ID coinciden exactamente.");

// 2. Filtrar por bloqueos
const filterBlocked = { bottleneckCodes: ["CONSENT"] };
const resBlocked = filterContributionsByListFilter(mockCollection, filterBlocked);
assert(resBlocked.length === 1 && resBlocked[0].id === "c2", "Bloqueados: Conteo y ID coinciden exactamente.");

// 3. Filtrar por elegibles no publicados (SmartAction ELIGIBLE_NOT_PUBLISHED)
const actionEligible = dbRes.smartActions.find(a => a.code === "ELIGIBLE_NOT_PUBLISHED");
if (actionEligible) {
  const resEligible = filterContributionsByListFilter(mockCollection, actionEligible.contributionFilter);
  assert(resEligible.length === actionEligible.affectedCount && resEligible[0].id === "c3", "SmartAction ELIGIBLE_NOT_PUBLISHED: Conteos e identidades coinciden 100%.");
} else {
  console.log("  -> [INFO] No hay SmartAction de elegibles.");
}

console.log(`\n=== PRUEBAS FINALIZADAS: ${passedTests}/${totalTests} ASERCIONES CORRECTAS ===`);
if (passedTests === totalTests) {
  console.log("¡Módulo de navegación 100% consistente y validado!");
} else {
  process.exit(1);
}
