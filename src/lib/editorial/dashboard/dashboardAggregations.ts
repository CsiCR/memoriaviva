// Agregaciones y Distribuciones del Dashboard de Gestión Editorial
// Archivo: src/lib/editorial/dashboard/dashboardAggregations.ts

import { EvaluatedContribution } from './dashboardTypes';
import { STAGES } from '../progress/progressConstants';

export function calculateStageDistribution(contributions: EvaluatedContribution[]) {
  const total = contributions.length;
  const counts: Record<string, { label: string; count: number }> = {};
  
  // Inicializar todos los estados posibles
  Object.values(STAGES).forEach(s => {
    counts[s.code] = { label: s.label, count: 0 };
  });

  contributions.forEach(c => {
    const code = c.progressResult.currentStage.code;
    if (counts[code]) {
      counts[code].count++;
    } else {
      counts[code] = { label: c.progressResult.currentStage.label, count: 1 };
    }
  });

  return Object.entries(counts).map(([code, data]) => ({
    code,
    label: data.label,
    count: data.count,
    percentage: total > 0 ? Math.round((data.count / total) * 100) : 0
  }));
}

export function calculateBottlenecks(contributions: EvaluatedContribution[]) {
  const total = contributions.length;
  const counts: Record<string, { label: string; count: number }> = {};

  contributions.forEach(c => {
    (c.progressResult.blockedItems || []).forEach(item => {
      if (!counts[item.code]) {
        counts[item.code] = { label: item.label, count: 0 };
      }
      counts[item.code].count++;
    });
  });

  return Object.entries(counts)
    .map(([code, data]) => ({
      code,
      label: data.label,
      count: data.count,
      percentage: total > 0 ? Math.round((data.count / total) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.count - a.count);
}

export function calculateIndicatorDistribution(contributions: EvaluatedContribution[]) {
  const counts: Record<string, number> = {
    info: 0,
    warning: 0,
    blocking: 0,
    critical: 0
  };

  contributions.forEach(c => {
    (c.activeIndicators || []).forEach(ind => {
      const sev = ind.severity;
      if (counts[sev] !== undefined) {
        counts[sev]++;
      }
    });
  });

  return Object.entries(counts).map(([severity, count]) => ({
    severity: severity as "info" | "warning" | "blocking" | "critical",
    count
  }));
}

export function calculateRecommendations(contributions: EvaluatedContribution[]) {
  const counts: Record<string, { title: string; count: number }> = {};

  contributions.forEach(c => {
    (c.progressResult.recommendations || []).forEach(rec => {
      if (!counts[rec.code]) {
        counts[rec.code] = { title: rec.title, count: 0 };
      }
      counts[rec.code].count++;
    });
  });

  const allRecs = Object.entries(counts)
    .map(([code, data]) => ({
      code,
      title: data.title,
      count: data.count
    }))
    .sort((a, b) => b.count - a.count);

  return {
    topRecommendations: allRecs.slice(0, 5),
    allRecommendations: allRecs
  };
}
