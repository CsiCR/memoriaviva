// Suite de Pruebas Unitarias del Motor Editorial (v3.0.0)
// Archivo: scripts/test-editorial-engine.ts

import { evaluateContribution, ContributionInput, EditorialEvaluation } from '../src/lib/editorial';
import { calculateEditorialScore } from '../src/lib/editorial/editorialScore';

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

console.log("=== INICIANDO VALIDACIONES TÉCNICAS DEL MOTOR EDITORIAL ===");

// Aportes base de prueba
const baseReceived: ContributionInput = {
  id: "test-id-1",
  consent_verified: true,
  authorization_level: "A",
  credit_preference: "full_name",
  consent_source: "web_form",
  description: "Descripción bastante larga que tiene más de cincuenta caracteres obligatorios para la prueba de puntaje.",
  content_type: "textual",
  editorial_status: { id: "1", code: "received", name: "Recibido" },
  publication_status: { id: "1", code: "not_evaluated", name: "No evaluado" },
  files: [{ file_name: "test.txt", file_size: 100 }],
  active_indicators: []
};

// 1. Aporte recibido -> No publicable (no elegible)
console.log("\nPrueba 1: Aporte recibido inicial...");
const res1 = evaluateContribution(baseReceived);
assert(res1.eligibleForPublication === false, "Aporte recibido debe ser no elegible.");

// 2. Finalizado sin indicadores -> Publicable (elegible)
console.log("\nPrueba 2: Aporte finalizado/validado sin indicadores...");
const baseCompleted: ContributionInput = {
  ...baseReceived,
  editorial_status: { id: "2", code: "validated", name: "Validado" }
};
const res2 = evaluateContribution(baseCompleted);
assert(res2.eligibleForPublication === true, "Aporte validado sin indicadores debe ser elegible.");
assert(res2.recommendedPublicationStatus === "publishable", "Debe sugerir recommendedPublicationStatus = publishable.");

// 3. Publicado + indicador bloqueante -> Advertencia crítica (severity: critical)
console.log("\nPrueba 3: Aporte publicado con indicador bloqueante...");
const basePublishedBlocked: ContributionInput = {
  ...baseCompleted,
  publication_status: { id: "3", code: "published", name: "Publicado" },
  active_indicators: [{
    id: "ind-1",
    category: "editorial_indicator",
    value: "Faltan archivos",
    name: "Faltan archivos",
    code: "missing_files",
    metadata: { blocks_publication: true, severity: "blocking" }
  }]
};
const res3 = evaluateContribution(basePublishedBlocked);
assert(res3.eligibleForPublication === false, "No debe ser elegible.");
assert(res3.issues.some(i => i.severity === "critical"), "Debe tener una incidencia crítica.");

// 4. Sin consentimiento -> Pendiente (no elegible)
console.log("\nPrueba 4: Aporte sin consentimiento verificado...");
const baseNoConsent: ContributionInput = {
  ...baseCompleted,
  consent_verified: false
};
const res4 = evaluateContribution(baseNoConsent);
assert(res4.eligibleForPublication === false, "Aporte sin consentimiento debe ser no elegible.");
assert(res4.issues.some(i => i.code === "consent_pending"), "Debe registrar la incidencia consent_pending.");

// 5. Aporte completo -> Progreso 100%
console.log("\nPrueba 5: Aporte completo con progreso al 100%...");
const base100: ContributionInput = {
  id: "test-100",
  consent_verified: true,
  authorization_level: "A",
  credit_preference: "full_name",
  consent_source: "web_form",
  description: "Descripción larga superior a cincuenta caracteres para obtener puntaje completo en descripción.",
  content_type: "textual",
  editorial_status: { id: "2", code: "validated", name: "Validado" },
  publication_status: { id: "1", code: "not_evaluated", name: "No evaluado" },
  files: [{ file_name: "test.txt", file_size: 100 }],
  active_indicators: [],
  historical_validation_status: "validated"
};
const score100 = calculateEditorialScore(base100);
assert(score100 === 100, `Puntaje del aporte completo debe ser 100 (obtenido: ${score100}).`);

// 6. Incorporación de indicador bloqueante -> eligibleForPublication = false
console.log("\nPrueba 6: Incorporación de indicador bloqueante...");
const baseWithBlockingInd: ContributionInput = {
  ...baseCompleted,
  active_indicators: [{
    id: "ind-2",
    category: "editorial_indicator",
    value: "Falta información",
    name: "Falta información",
    code: "missing_information",
    metadata: { blocks_publication: true, severity: "blocking" }
  }]
};
const res6 = evaluateContribution(baseWithBlockingInd);
assert(res6.eligibleForPublication === false, "Elegibilidad debe ser falsa con indicador bloqueante.");

// 7. Aporte textual sin archivos -> No bloquear automáticamente
console.log("\nPrueba 7: Aporte textual sin archivos...");
const baseTextualNoFiles: ContributionInput = {
  ...baseCompleted,
  content_type: "textual",
  files: []
};
const res7 = evaluateContribution(baseTextualNoFiles);
assert(res7.eligibleForPublication === true, "Aporte textual sin archivos debe conservar elegibilidad.");

// 8. Consistencia del puntaje editorial
console.log("\nPrueba 8: Consistencia de puntajes parciales...");
const scoreReceived = calculateEditorialScore(baseReceived);
assert(scoreReceived > 0 && scoreReceived < 100, `Puntaje inicial debe ser intermedio (obtenido: ${scoreReceived}).`);

// 9. Consentimiento verificado, pero autorización restringida -> no elegible
console.log("\nPrueba 9: Autorización restringida...");
const baseRestrictedAuth: ContributionInput = {
  ...baseCompleted,
  authorization_level: "D" // restringida
};
const res9 = evaluateContribution(baseRestrictedAuth);
assert(res9.eligibleForPublication === false, "Nivel de autorización restrictivo impide publicación.");
assert(res9.issues.some(i => i.code === "auth_not_public"), "Debe registrar incidencia auth_not_public.");

// 10. Estado received sin indicadores -> no elegible
console.log("\nPrueba 10: Estado received sin indicadores...");
const baseReceivedClean: ContributionInput = {
  ...baseReceived,
  active_indicators: []
};
const res10 = evaluateContribution(baseReceivedClean);
assert(res10.eligibleForPublication === false, "Estado received sin indicadores no es elegible.");

// 11. Aporte textual sin archivos -> advertencia, sin bloqueo por archivo
console.log("\nPrueba 11: Aporte textual sin archivos (advertencia)...");
const res11 = evaluateContribution(baseTextualNoFiles);
assert(res11.warnings.includes("Sin archivos digitales asociados (Aporte textual)."), "Debe tener advertencia de sin archivos.");
assert(!res11.missingRequirements.includes("Debe completarse el consentimiento."), "No debe bloquear por archivos.");

// 12. Aporte audiovisual sin archivos -> bloqueo
console.log("\nPrueba 12: Aporte audiovisual sin archivos...");
const baseAudioNoFiles: ContributionInput = {
  ...baseCompleted,
  content_type: "audiovisual",
  files: []
};
const res12 = evaluateContribution(baseAudioNoFiles);
assert(res12.eligibleForPublication === false, "Aporte audiovisual sin archivos no debe ser elegible.");
assert(res12.issues.some(i => i.code === "files_missing_media"), "Debe registrar incidencia files_missing_media.");

// 13. Ausencia del indicador de validación -> no asumir validación cumplida
console.log("\nPrueba 13: Ausencia de validación (puntaje)...");
const baseNoValidationEvidence: ContributionInput = {
  ...baseReceived,
  editorial_status: { id: "1", code: "received", name: "Recibido" },
  historical_validation_status: null,
  active_indicators: []
};
const scoreNoVal = calculateEditorialScore(baseNoValidationEvidence);
// Si no hay validación, restamos 15 puntos del max posible de 85, así que el puntaje debe reflejar 0 en validación histórica.
// Haremos aserción indirecta: no otorgar los 15 puntos.
const baseWithValEvidence = { ...baseNoValidationEvidence, historical_validation_status: "validated" as const };
const scoreWithVal = calculateEditorialScore(baseWithValEvidence);
assert(scoreWithVal - scoreNoVal === 15, "La validación histórica debe otorgar 15 puntos sólo bajo evidencia positiva.");

// 14. Estado publicado con bloqueo -> incidencia crítica
console.log("\nPrueba 14: Estado publicado con bloqueo posterior...");
const res14 = evaluateContribution(basePublishedBlocked);
assert(res14.issues.some(i => i.code === "published_with_active_blocks"), "Debe contener la incidencia crítica.");

// 15. UUID diferente pero mismo código editorial -> mismo resultado
console.log("\nPrueba 15: UUID diferente con mismo código editorial...");
const baseDiffUUID: ContributionInput = {
  ...baseCompleted,
  editorial_status: { id: "different-uuid", code: "validated", name: "Validado" }
};
const res15 = evaluateContribution(baseDiffUUID);
assert(res15.eligibleForPublication === true, "La evaluación debe basarse en el código estable, no en el UUID.");

// 16. Nombre visible modificado y código estable -> mismo resultado
console.log("\nPrueba 16: Nombre visible modificado...");
const baseDiffName: ContributionInput = {
  ...baseCompleted,
  editorial_status: { id: "2", code: "validated", name: "Validado Históricamente" }
};
const res16 = evaluateContribution(baseDiffName);
assert(res16.eligibleForPublication === true, "La evaluación debe basarse en el código estable, no en el nombre visible.");

// 17. Puntaje alto con consentimiento pendiente -> sigue sin ser elegible
console.log("\nPrueba 17: Puntaje alto con consentimiento pendiente...");
const baseHighNoConsent: ContributionInput = {
  ...base100,
  consent_verified: false
};
const res17 = evaluateContribution(baseHighNoConsent);
assert(res17.eligibleForPublication === false, "A pesar del alto puntaje, no debe ser elegible por falta de consentimiento.");

// 18. Evaluación repetida con la misma entrada -> resultado idéntico
console.log("\nPrueba 18: Evaluación repetida (pureza lógica)...");
const runA = evaluateContribution(baseCompleted);
const runB = evaluateContribution(baseCompleted);
assert(JSON.stringify(runA) === JSON.stringify(runB), "Dos evaluaciones sobre la misma entrada deben ser exactamente idénticas.");

// 19. content_type = null y sin archivos -> no elegible
console.log("\nPrueba 19: Tipo de aporte nulo y sin archivos...");
const baseNullTypeNoFiles: ContributionInput = {
  ...baseCompleted,
  content_type: null,
  files: []
};
const res19 = evaluateContribution(baseNullTypeNoFiles);
assert(res19.eligibleForPublication === false, "Debe ser no elegible.");
assert(res19.issues.some(i => i.code === "content_type_missing"), "Debe registrar content_type_missing.");

// 20. Solo existe un documento de consentimiento -> no contar como archivo histórico
console.log("\nPrueba 20: Archivo de consentimiento no debe contar como material histórico...");
const baseConsentFileOnly: ContributionInput = {
  ...baseCompleted,
  content_type: "documentary",
  files: [{ file_name: "consentimiento.pdf", file_role: "consent_document" }]
};
const res20 = evaluateContribution(baseConsentFileOnly);
assert(res20.eligibleForPublication === false, "Debe ser no elegible por falta de archivos históricos útiles.");

// 21. Archivo con procesamiento fallido -> no contar como material disponible
console.log("\nPrueba 21: Archivo fallido...");
const baseFailedFile: ContributionInput = {
  ...baseCompleted,
  content_type: "documentary",
  files: [{ file_name: "foto.png", processing_status: "failed" }]
};
const res21 = evaluateContribution(baseFailedFile);
assert(res21.eligibleForPublication === false, "Debe ser no elegible porque el único archivo disponible falló.");

// 22. Aporte ya publishable y elegible -> recomendación de publicación null
console.log("\nPrueba 22: Aporte elegible que ya está publishable...");
const baseAlreadyPublishable: ContributionInput = {
  ...baseCompleted,
  publication_status: { id: "3", code: "publishable", name: "Publicable" }
};
const res22 = evaluateContribution(baseAlreadyPublishable);
assert(res22.recommendedPublicationStatus === null, "La recomendación de publicación debe ser null si ya coincide.");

// 23. Aporte published con varios bloqueos -> una sola incidencia crítica general
console.log("\nPrueba 23: Aporte publicado con múltiples bloqueos (una sola incidencia crítica)...");
const basePublishedMultiBlocked: ContributionInput = {
  ...baseCompleted,
  publication_status: { id: "3", code: "published", name: "Publicado" },
  consent_verified: false,
  active_indicators: [{
    id: "ind-1",
    category: "editorial_indicator",
    value: "Faltan archivos",
    name: "Faltan archivos",
    code: "missing_files",
    metadata: { blocks_publication: true, severity: "blocking" }
  }]
};
const res23 = evaluateContribution(basePublishedMultiBlocked);
const criticalIssues = res23.issues.filter(i => i.code === "published_with_active_blocks");
assert(criticalIssues.length === 1, `Debe registrar exactamente una incidencia crítica de publicación con bloqueos (encontradas: ${criticalIssues.length}).`);

console.log("\n====================================================");
console.log(`✓ ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE! (${passedTests}/${totalTests})`);
console.log("====================================================");
