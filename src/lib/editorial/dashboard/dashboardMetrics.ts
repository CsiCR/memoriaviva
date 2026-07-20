// Métricas Estadísticas del Dashboard de Gestión Editorial
// Archivo: src/lib/editorial/dashboard/dashboardMetrics.ts

import { EvaluatedContribution } from './dashboardTypes';

export function calculateAverageProgress(contributions: EvaluatedContribution[]): number {
  if (contributions.length === 0) return 0;
  const sum = contributions.reduce((acc, c) => acc + c.progressResult.progress, 0);
  return Math.round(sum / contributions.length);
}

export function calculateProductivityStats(contributions: EvaluatedContribution[]) {
  if (contributions.length === 0) {
    return {
      average: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      percentile25: 0,
      percentile75: 0
    };
  }

  const values = contributions.map(c => c.progressResult.progress).sort((a, b) => a - b);
  const count = values.length;
  const min = values[0];
  const max = values[count - 1];

  // Promedio
  const sum = values.reduce((acc, v) => acc + v, 0);
  const average = sum / count;

  // Mediana
  let median = 0;
  if (count % 2 === 0) {
    median = (values[count / 2 - 1] + values[count / 2]) / 2;
  } else {
    median = values[Math.floor(count / 2)];
  }

  // Desviación Estándar
  const squareDiffs = values.map(v => Math.pow(v - average, 2));
  const avgSquareDiff = squareDiffs.reduce((acc, v) => acc + v, 0) / count;
  const stdDev = Math.round(Math.sqrt(avgSquareDiff) * 100) / 100;

  // Percentiles (Interpolación lineal estándar)
  const getPercentile = (p: number) => {
    const idx = (count - 1) * p;
    const low = Math.floor(idx);
    const high = Math.ceil(idx);
    const weight = idx - low;
    return values[low] + weight * (values[high] - values[low]);
  };

  const percentile25 = Math.round(getPercentile(0.25) * 100) / 100;
  const percentile75 = Math.round(getPercentile(0.75) * 100) / 100;

  return {
    average: Math.round(average * 100) / 100,
    median: Math.round(median * 100) / 100,
    stdDev,
    min,
    max,
    percentile25,
    percentile75
  };
}
