// Formateadores de Gráficos e Historiales del Dashboard de Gestión Editorial
// Archivo: src/lib/editorial/dashboard/dashboardCharts.ts

import { EvaluatedContribution } from './dashboardTypes';

export function calculateTimeline(
  contributions: EvaluatedContribution[],
  mode: "received" | "updated" | "published" = "received"
): Array<{ period: string; count: number }> {
  const counts: Record<string, number> = {};

  contributions.forEach(c => {
    let dateStr: string | null = null;
    if (mode === "published") {
      dateStr = c.publishedAt;
    } else if (mode === "updated") {
      dateStr = c.updatedAt;
    } else {
      dateStr = c.receivedAt;
    }

    if (!dateStr) return;

    // Formatear a mes (YYYY-MM)
    const period = dateStr.substring(0, 7); // Ejemplo: "2026-07"
    counts[period] = (counts[period] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([period, count]) => ({ period, count }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

export function calculateQualityDistribution(contributions: EvaluatedContribution[]) {
  const total = contributions.length;
  const ranges = {
    "0-20%": 0,
    "21-40%": 0,
    "41-60%": 0,
    "61-80%": 0,
    "81-99%": 0,
    "100%": 0
  };

  contributions.forEach(c => {
    const p = c.progressResult.progress;
    if (p === 100) {
      ranges["100%"]++;
    } else if (p >= 81) {
      ranges["81-99%"]++;
    } else if (p >= 61) {
      ranges["61-80%"]++;
    } else if (p >= 41) {
      ranges["41-60%"]++;
    } else if (p >= 21) {
      ranges["21-40%"]++;
    } else {
      ranges["0-20%"]++;
    }
  });

  return Object.entries(ranges).map(([range, count]) => ({
    range: range as "0-20%" | "21-40%" | "41-60%" | "61-80%" | "81-99%" | "100%",
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0
  }));
}
