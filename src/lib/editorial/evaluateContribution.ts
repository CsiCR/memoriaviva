// Punto de Entrada del Motor Editorial
// Archivo: src/lib/editorial/evaluateContribution.ts

import { ContributionInput, EditorialEvaluation } from './types';
import { runEditorialRules } from './editorialRules';

/**
 * Evalúa las dimensiones de un aporte y genera un diagnóstico editorial y legal completo.
 * Lógica pura desacoplada, no interactúa directamente con la base de datos.
 * 
 * @param input Objeto consolidado del aporte con relaciones necesarias
 * @returns EditorialEvaluation con elegibilidad, puntaje, incidencias y recomendaciones
 */
export function evaluateContribution(input: ContributionInput): EditorialEvaluation {
  return runEditorialRules(input);
}

/**
 * Consulta la base de datos y evalúa las dimensiones de un aporte dado su ID.
 * Implementación pendiente para etapas posteriores (se incluye como firma/firma preparatoria).
 * 
 * @param id UUID de la contribución en base de datos
 */
export async function evaluateContributionById(id: string): Promise<EditorialEvaluation> {
  throw new Error(`evaluateContributionById(${id}) no está implementado en la etapa 3A (Motor de Elegibilidad pura).`);
}
