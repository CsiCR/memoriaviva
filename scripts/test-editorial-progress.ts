// Suite de Pruebas Unitarias del Motor de Progreso Editorial (v1.0)
// Archivo: scripts/test-editorial-progress.ts

import { evaluateEditorialProgress, EditorialProgressInput } from '../src/lib/editorial/progress';

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

console.log("=== INICIANDO VALIDACIONES TÉCNICAS DEL MOTOR DE PROGRESO EDITORIAL ===");

// 1. Aporte vacío / Datos nulos
console.log("\nEscenario 1: Aporte vacío.");
const res1 = evaluateEditorialProgress({ contributionId: "test-1" });
// Obtiene 0 puntos por indicadores ya que no ha sido evaluado
assert(res1.progress === 0, `Progreso debe ser 0% para aporte vacío (obtenido: ${res1.progress}%).`);
assert(res1.currentStage.code === "RECEIVED", "Etapa inicial debe ser RECEIVED.");

// 2. Solo datos básicos
console.log("\nEscenario 2: Solo datos básicos (Testimonio escrito).");
const res2 = evaluateEditorialProgress({
  contributionId: "test-2",
  title: "Aporte Test",
  contentType: "textual",
  contributor: { id: "cont-1", fullName: "Aportante Test" },
  dates: { receivedAt: "2026-07-20T00:00:00Z" }
});
// Identificación: title (3) + contributor (3) + contentType (2) + dates (2) = 10 pts
// Archivos: 15 pts (por ser textual)
// Indicadores: 0 pts (no evaluado)
// Total esperado = 25 pts
assert(res2.details.basicIdentificationScore === 10, "Puntaje de identificación básica debe ser 10.");
assert(res2.progress === 25, `El progreso debe reflejar 25 puntos (obtenido: ${res2.progress}%).`);

// 3. Descripción corta
console.log("\nEscenario 3: Descripción corta (< 40 caracteres).");
const res3 = evaluateEditorialProgress({
  contributionId: "test-3",
  description: "Corta"
});
// Descripción: 4 pts, Indicadores: 0 pts. Total = 4 pts.
assert(res3.details.editorialDescriptionScore === 4, "Puntaje de descripción corta debe ser 4.");
assert(res3.progress === 4, `El progreso debe ser 4% (obtenido: ${res3.progress}%).`);

// 4. Descripción completa
console.log("\nEscenario 4: Descripción completa (>= 40 caracteres).");
const res4 = evaluateEditorialProgress({
  contributionId: "test-4",
  description: "Esta descripción tiene más de cuarenta caracteres obligatorios."
});
// Descripción: 10 pts, Indicadores: 0 pts. Total = 10 pts.
assert(res4.details.editorialDescriptionScore === 10, "Puntaje de descripción completa debe ser 10.");
assert(res4.progress === 10, `El progreso debe ser 10% (obtenido: ${res4.progress}%).`);

// 5. Consentimiento ausente
console.log("\nEscenario 5: Consentimiento ausente.");
const res5 = evaluateEditorialProgress({
  contributionId: "test-5",
  consent: { verified: false }
});
assert(res5.details.consentScore === 0, "Puntaje de consentimiento ausente debe ser 0.");
assert(res5.recommendations.some(r => r.code === "ADD_CONSENT" && r.severity === "blocking"), "Debe tener recomendación bloqueante de consentimiento.");

// 6. Consentimiento válido
console.log("\nEscenario 6: Consentimiento verificado.");
const res6 = evaluateEditorialProgress({
  contributionId: "test-6",
  consent: { verified: true }
});
// Consentimiento: 20 pts, Indicadores: 0 pts. Total = 20 pts.
assert(res6.details.consentScore === 20, "Puntaje de consentimiento válido debe ser 20.");
assert(res6.progress === 20, `El progreso debe ser 20% (obtenido: ${res6.progress}%).`);

// 7. Testimonio textual sin archivo
console.log("\nEscenario 7: Testimonio textual sin archivo.");
const res7 = evaluateEditorialProgress({
  contributionId: "test-7",
  contentType: "textual"
});
// Identificación: contentType (2) + Archivos: 15 pts, Indicadores: 0 pts. Total = 17 pts.
assert(res7.details.filesScore === 15, "Testimonio textual sin archivo debe dar 15 puntos.");
assert(res7.completedItems.some(item => item.code === "FILES" && item.status === "not_required"), "Los archivos deben ser clasificados como 'not_required'.");
assert(res7.progress === 17, `El progreso debe ser 17% (obtenido: ${res7.progress}%).`);

// 8. Fotografía sin archivo
console.log("\nEscenario 8: Fotografía sin archivos.");
const res8 = evaluateEditorialProgress({
  contributionId: "test-8",
  contentType: "documentary",
  files: []
});
assert(res8.details.filesScore === 0, "Fotografía sin archivos debe dar 0 puntos.");
assert(res8.blockedItems.some(item => item.code === "FILES" && item.status === "blocked"), "Los archivos de fotografía ausentes deben estar bloqueados.");

// 9. Fotografía con archivo válido
console.log("\nEscenario 9: Fotografía con archivo válido.");
const res9 = evaluateEditorialProgress({
  contributionId: "test-9",
  contentType: "documentary",
  files: [{ id: "f-1", filePath: "path/to/img.png", statusCode: "ready" }]
});
assert(res9.details.filesScore === 15, "Fotografía con archivo válido debe dar 15 puntos.");

// 10. Archivo con ruta vacía
console.log("\nEscenario 10: Archivo con ruta vacía.");
const res10 = evaluateEditorialProgress({
  contributionId: "test-10",
  contentType: "documentary",
  files: [{ id: "f-1", filePath: "", statusCode: "ready" }]
});
assert(res10.details.filesScore === 0, "Archivo con ruta vacía debe dar 0 puntos.");

// 11. Archivo fallido
console.log("\nEscenario 11: Archivo con estado fallido.");
const res11 = evaluateEditorialProgress({
  contributionId: "test-11",
  contentType: "documentary",
  files: [{ id: "f-1", filePath: "path/to/img.png", statusCode: "failed" }]
});
assert(res11.details.filesScore === 0, "Archivo fallido debe dar 0 puntos.");

// 12. Sin clasificación
console.log("\nEscenario 12: Sin clasificación (estado recibido).");
const res12 = evaluateEditorialProgress({
  contributionId: "test-12",
  editorialStatus: { code: "received" }
});
assert(res12.details.editorialProcessingScore === 0, "Estado recibido debe dar 0 puntos en procesamiento.");

// 13. Clasificado
console.log("\nEscenario 13: Clasificado.");
const res13 = evaluateEditorialProgress({
  contributionId: "test-13",
  editorialStatus: { code: "in_review" }
});
assert(res13.details.editorialProcessingScore === 10, "Estado clasificado debe dar 10 puntos.");

// 14. Editor / Intervención asignada
console.log("\nEscenario 14: Intervención editorial activa.");
const res14 = evaluateEditorialProgress({
  contributionId: "test-14",
  hasEditorialIntervention: true,
  reviewNotes: "Revisado por editor."
});
assert(res14.details.editorialReviewScore === 7, "Intervención + notas debe dar 7 puntos de revisión.");

// 15. Validación histórica pendiente
console.log("\nEscenario 15: Validación histórica pendiente.");
const res15 = evaluateEditorialProgress({
  contributionId: "test-15",
  historicalValidation: { statusCode: "pending" }
});
assert(res15.details.historicalValidationScore === 5, "Validación pendiente debe dar 5 puntos.");

// 16. Validación histórica aprobada
console.log("\nEscenario 16: Validación histórica aprobada.");
const res16 = evaluateEditorialProgress({
  contributionId: "test-16",
  historicalValidation: { statusCode: "validated" }
});
assert(res16.details.historicalValidationScore === 15, "Validación aprobada debe dar 15 puntos.");

// 17. Validación histórica no requerida
console.log("\nEscenario 17: Validación histórica no requerida.");
const res17 = evaluateEditorialProgress({
  contributionId: "test-17",
  historicalValidation: { statusCode: "not_required" }
});
assert(res17.details.historicalValidationScore === 15, "Validación no requerida debe dar 15 puntos.");

// 18. Validación histórica rechazada
console.log("\nEscenario 18: Validación histórica rechazada.");
const res18 = evaluateEditorialProgress({
  contributionId: "test-18",
  historicalValidation: { statusCode: "rejected" }
});
assert(res18.details.historicalValidationScore === 0, "Validación rechazada debe dar 0 puntos.");
assert(res18.blockedItems.some(i => i.code === "HISTORICAL_VAL"), "La validación rechazada debe ser un ítem bloqueado.");

// 19. Indicador informativo
console.log("\nEscenario 19: Indicador informativo.");
const res19 = evaluateEditorialProgress({
  contributionId: "test-19",
  indicators: [{ code: "info-1", severity: "info", isActive: true }]
});
assert(res19.details.indicatorsScore === 5, "Indicadores informativos únicamente deben dar 5 puntos.");

// 20. Indicador warning
console.log("\nEscenario 20: Indicador warning.");
const res20 = evaluateEditorialProgress({
  contributionId: "test-20",
  indicators: [{ code: "warn-1", severity: "warning", isActive: true }]
});
assert(res20.details.indicatorsScore === 2, "Indicador warning debe dar 2 puntos parciales.");

// 21. Indicador blocking
console.log("\nEscenario 21: Indicador blocking.");
const res21 = evaluateEditorialProgress({
  contributionId: "test-21",
  indicators: [{ code: "block-1", severity: "blocking", isActive: true }]
});
assert(res21.details.indicatorsScore === 0, "Indicador bloqueante debe dar 0 puntos.");
assert(res21.blockedItems.some(i => i.code === "INDICATORS"), "Debe tener ítem de indicadores bloqueado.");

// 22. Estado publicable
console.log("\nEscenario 22: Estado de publicación listo.");
const res22 = evaluateEditorialProgress({
  contributionId: "test-22",
  publicationStatus: { code: "publishable" }
});
assert(res22.details.publicationScore === 4, "Estado listo debe dar 4 puntos.");

// 23. Estado publicado
console.log("\nEscenario 23: Estado publicado.");
const res23 = evaluateEditorialProgress({
  contributionId: "test-23",
  publicationStatus: { code: "published" }
});
assert(res23.details.publicationScore === 5, "Estado publicado debe dar 5 puntos.");
assert(res23.isPublished === true, "isPublished debe ser true.");
assert(res23.currentStage.code === "PUBLISHED", "Etapa debe ser forzada a PUBLISHED.");

// 24. Aporte completo
console.log("\nEscenario 24: Aporte completo.");
const res24 = evaluateEditorialProgress({
  contributionId: "test-24",
  title: "Aporte Completo",
  description: "Esta descripción cuenta con más de cuarenta caracteres obligatorios.",
  contentType: "textual",
  contributor: { id: "cont-1", fullName: "Aportante Completo" },
  consent: { verified: true },
  editorialStatus: { code: "validated" },
  hasEditorialIntervention: true,
  reviewNotes: "Revisado completamente.",
  historicalValidation: { statusCode: "validated" },
  indicators: [],
  publicationStatus: { code: "published" },
  dates: { receivedAt: "2026-07-20T00:00:00Z" }
});
assert(res24.progress === 100, `El progreso debe ser 100% (obtenido: ${res24.progress}%).`);

// 25. Aporte de 95% pero bloqueado (Verificación de no capado de porcentaje)
console.log("\nEscenario 25: Aporte con alto progreso pero sin consentimiento verificado.");
const res25 = evaluateEditorialProgress({
  contributionId: "test-25",
  title: "Aporte 95%",
  description: "Esta descripción cuenta con más de cuarenta caracteres obligatorios.",
  contentType: "textual",
  contributor: { id: "cont-1", fullName: "Aportante" },
  consent: { verified: false }, // Falta consentimiento (-20 pts del total de 100)
  editorialStatus: { code: "validated" }, // 10 pts
  hasEditorialIntervention: true, // 4 pts
  reviewNotes: "Revisado.", // 3 pts
  historicalValidation: { statusCode: "validated" }, // 15 pts
  indicators: [], // 5 pts
  publicationStatus: { code: "publishable" }, // 4 pts
  dates: { receivedAt: "2026-07-20T00:00:00Z" } // 2 pts (en identificación)
  // Identificación: title (3) + contributor (3) + contentType (2) + dates (2) = 10 pts
  // Descripción: 10 pts
  // Consentimiento: 0 pts (verified false)
  // Archivos: 15 pts (textual)
  // Procesamiento: 10 pts
  // Revisión: 10 pts (Intervención 4 + Notas 3 + Estado 3)
  // Validación histórica: 15 pts
  // Indicadores: 5 pts
  // Publicación: 4 pts
  // Total progreso esperado: 10 + 10 + 0 + 15 + 10 + 10 + 15 + 5 + 4 = 79%
});
// Verificamos que la etapa es capada a UNDER_REVIEW porque falta el consentimiento
assert(res25.currentStage.code === "UNDER_REVIEW", `La etapa debe ser capada a UNDER_REVIEW (obtenida: ${res25.currentStage.code}).`);
// Pero el porcentaje se mantiene intacto sin ser capado por la etapa
assert(res25.progress === 79, `El progreso no debe ser capado por la etapa. Debe ser 79% (obtenido: ${res25.progress}%).`);

// 26. Detección de conflictos en validación histórica
console.log("\nEscenario 26: Contradicción de validación histórica.");
const res26 = evaluateEditorialProgress({
  contributionId: "test-26",
  historicalValidation: { statusCode: "validated" },
  indicators: [{ code: "historical_validation_pending", severity: "blocking", isActive: true }]
});
assert(res26.conflicts.includes("CONFLICT_HISTORICAL_VALIDATION"), "Debe detectar conflicto de validación histórica.");

// 27. Inconsistencia post-publicación
console.log("\nEscenario 27: Inconsistencias post-publicación.");
const res27 = evaluateEditorialProgress({
  contributionId: "test-27",
  publicationStatus: { code: "published" },
  consent: { verified: false }
});
assert(res27.hasPostPublicationInconsistencies === true, "Debe reportar inconsistencias post-publicación si está publicado pero sin consentimiento.");

// 28. Comportamiento ordenado de recomendaciones y nextAction
console.log("\nEscenario 28: Recomendaciones ordenadas.");
const res28 = evaluateEditorialProgress({
  contributionId: "test-28",
  consent: { verified: false }, // Prioridad 100
  description: "" // Prioridad 80
});
assert(res28.recommendations.length >= 2, "Debe tener al menos 2 recomendaciones.");
assert(res28.recommendations[0].code === "ADD_CONSENT", "La primera recomendación debe ser ADD_CONSENT por prioridad.");
assert(res28.nextAction?.code === "ADD_CONSENT", "nextAction debe ser la recomendación de mayor prioridad.");

console.log(`\n=== SUITE DE PRUEBAS COMPLETADA: ${passedTests}/${totalTests} aserciones aprobadas ===\n`);
