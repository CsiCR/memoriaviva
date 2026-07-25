// Test Suite para el Motor de Progreso Editorial (Editorial Workflow Engine)
// Archivo: scripts/test-editorial-workflow.ts

import { evaluateEditorialWorkflow } from '../src/lib/editorial/engine/evaluateWorkflow';
import { EditorialContribution, PublicationStatusOption } from '../src/lib/editorial/engine/workflowTypes';

// Estructura mínima de aporte base para tests
const baseContribution: EditorialContribution = {
  id: 'mv-test-uuid',
  title: 'Mi Aporte de Test',
  description: 'Descripción básica original del vecino.',
  contribution_type: 'Testimonio escrito',
  created_at: new Date('2026-07-01T12:00:00Z').toISOString(),
  updated_at: new Date('2026-07-25T15:00:00Z').toISOString(),
  consent_verified: true,
  consent_source: 'web_form',
  contributors: {
    id: 'contributor-uuid',
    full_name: 'Juan Aportante',
    dni: '12.345.678',
    phone: '+5492974000000',
    email: 'juan@test.com'
  }
};

let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ [FALLO] ${message}`);
    testsFailed++;
  } else {
    console.log(`  ✅ [PASÓ] ${message}`);
  }
}

console.log('=== INICIANDO PRUEBAS UNITARIAS DE WORKFLOW ENGINE ===\n');

// 1. Test: Descripción vacía
console.log('Prueba 1: Descripción vacía (Todos los campos vacíos)');
const contributionP1: EditorialContribution = {
  ...baseContribution,
  editorial_title: '',
  editorial_description: '',
  editorial_summary: '   ',
  editorial_context: undefined
};

const resultP1 = evaluateEditorialWorkflow(contributionP1);
const stageDescP1 = resultP1.stages.find(s => s.key === 'descripcion');

assert(stageDescP1 !== undefined, 'Existe la etapa descripción.');
assert(stageDescP1?.status === 'pending', 'El estado de la etapa descripción es "pending".');
assert(stageDescP1?.completionPercentage === 0, 'La completitud de descripción es 0%.');
assert(stageDescP1?.pendingTasks.length === 4, 'Tiene 4 tareas pendientes críticas/importantes.');
assert(stageDescP1?.targetFieldId === 'editorial-title', 'Apunta al primer campo incompleto: editorial-title.');

// 2. Test: Descripción parcial
console.log('\nPrueba 2: Descripción parcial (Solo título completo)');
const contributionP2: EditorialContribution = {
  ...baseContribution,
  editorial_title: 'Título Editorial Normalizado',
  editorial_description: '',
  editorial_summary: '',
  editorial_context: ''
};

const resultP2 = evaluateEditorialWorkflow(contributionP2);
const stageDescP2 = resultP2.stages.find(s => s.key === 'descripcion');

assert(stageDescP2?.status === 'in_progress', 'El estado de la etapa descripción es "in_progress".');
assert(stageDescP2?.completionPercentage === 25, 'La completitud de descripción es 25%.');
assert(stageDescP2?.pendingTasks.length === 3, 'Quedan 3 tareas pendientes.');
assert(stageDescP2?.targetFieldId === 'editorial-description', 'Apunta al siguiente campo incompleto: editorial-description.');

// 3. Test: Descripción completa
console.log('\nPrueba 3: Descripción completa (Todos los campos descriptivos completos)');
const contributionP3: EditorialContribution = {
  ...baseContribution,
  editorial_title: 'Título Editorial Normalizado',
  editorial_description: 'Descripción editorial normalizada del material aportado.',
  editorial_summary: 'Resumen corto del expediente.',
  editorial_context: 'Contextualización sociopolítica e histórica de Pico Truncado.'
};

const resultP3 = evaluateEditorialWorkflow(contributionP3);
const stageDescP3 = resultP3.stages.find(s => s.key === 'descripcion');

assert(stageDescP3?.status === 'completed', 'El estado de la etapa descripción es "completed".');
assert(stageDescP3?.completionPercentage === 100, 'La completitud de descripción es 100%.');
assert(stageDescP3?.pendingTasks.length === 0, 'No hay tareas pendientes en descripción.');
assert(stageDescP3?.targetFieldId === null, 'targetFieldId es null.');

// 4. Test: Publicación programada pendiente de fecha
console.log('\nPrueba 4: Publicación programada pendiente de fecha');
const pubOptScheduled: PublicationStatusOption = {
  id: 'opt-scheduled-uuid',
  code: 'scheduled',
  name: 'Programado'
};

const contributionP4: EditorialContribution = {
  ...baseContribution,
  publication_title: 'Título Público',
  publication_excerpt: 'Extracto Público',
  publication_level: 'A',
  publication_credits: 'Juan Aportante',
  publication_status_option_id: 'opt-scheduled-uuid',
  publication_scheduled_at: null // Fecha vacía
};

const resultP4 = evaluateEditorialWorkflow(contributionP4, pubOptScheduled);
const stagePubP4 = resultP4.stages.find(s => s.key === 'publicacion');

assert(stagePubP4?.status === 'in_progress', 'La etapa publicación es "in_progress".');
assert(resultP4.publicationEligibility === 'missingRequirements', 'La elegibilidad indica faltan requisitos.');
assert(
  !!stagePubP4?.pendingTasks.some(t => t.field === 'publication_scheduled_at'),
  'Se detecta la falta de fecha programada en los pendientes.'
);

// 5. Test: Validación histórica rechazada (Bloqueante)
console.log('\nPrueba 5: Validación histórica rechazada (Bloqueante)');
const contributionP5: EditorialContribution = {
  ...baseContribution,
  historical_validation_status: 'rejected'
};

const resultP5 = evaluateEditorialWorkflow(contributionP5);
const stageValP5 = resultP5.stages.find(s => s.key === 'validacion');

assert(stageValP5?.status === 'blocked', 'La etapa validación es "blocked".');
assert(resultP5.overallStatus === 'blocked', 'El estado general del workflow es "blocked".');
assert(resultP5.publicationEligibility === 'blocked', 'La elegibilidad para publicación es "blocked".');

console.log('\n======================================================');
if (testsFailed > 0) {
  console.error(`❌ ¡SE ENCONTRARON ${testsFailed} FALLOS EN LAS PRUEBAS UNITARIAS!`);
  process.exit(1);
} else {
  console.log('✅ ¡TODAS LAS PRUEBAS UNITARIAS PASARON EXITOSAMENTE!');
  process.exit(0);
}
