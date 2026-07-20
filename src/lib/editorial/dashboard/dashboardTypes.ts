// Definición de Tipos del Dashboard de Gestión Editorial
// Archivo: src/lib/editorial/dashboard/dashboardTypes.ts

import { EditorialProgressResult } from '../progress/progressTypes';
import { EditorialEvaluation } from '../types';

export interface DashboardFilter {
  dateStart?: string | null;
  dateEnd?: string | null;
  timelineMode?: "received" | "updated" | "published" | null;
  contentType?: string | null;
  editorialStatus?: string | null;
  publicationStatus?: string | null;
  authorizationLevel?: string | null;
  progressMin?: number | null;
  progressMax?: number | null;
  stage?: string | null;
  hasEditorialIntervention?: boolean | null;
  indicatorCode?: string | null;
  bottleneckCode?: string | null;
}

export interface EvaluatedContribution {
  id: string;
  title: string | null;
  description: string | null;
  contentType: string | null;
  receivedAt: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
  editorialStatus: string | null;
  publicationStatus: string | null;
  authorizationLevel: string | null;
  hasEditorialIntervention: boolean;
  progressResult: EditorialProgressResult;
  eligibilityResult: EditorialEvaluation;
  activeIndicators: Array<{
    code: string;
    severity: "info" | "warning" | "blocking" | "critical";
  }>;
  historicalValidationStatus?: string | null;
}

export interface SmartAction {
  code: string;
  priority: number;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  affectedCount: number;
}

export interface DashboardResult {
  metadata: {
    generatedAt: string;
    filtersApplied: DashboardFilter;
    evaluatedContributionsCount: number;
    platformVersion: string;
    editorialVersion: string;
    progressVersion: string;
    dashboardVersion: string;
    exportMetadata: {
      hash: string;
      schemaVersion: string;
    };
  };

  // Tarjeta 1: Estado General
  totalContributions: number;
  averageProgress: number;
  eligibleCount: number;
  publishedCount: number;
  blockedCount: number;
  pendingReviewCount: number;

  // Tarjeta 2: Progreso por Etapa
  stageDistribution: Array<{
    code: string;
    label: string;
    count: number;
    percentage: number;
  }>;

  // Tarjeta 3: Cuellos de botella
  bottlenecks: Array<{
    code: string;
    label: string;
    count: number;
    percentage: number;
  }>;

  // Tarjeta 4: Indicadores por severidad
  indicatorDistribution: Array<{
    severity: "info" | "warning" | "blocking" | "critical";
    count: number;
  }>;

  // Tarjeta 5: Recomendaciones del Sistema
  topRecommendations: Array<{
    code: string;
    title: string;
    count: number;
  }>;
  allRecommendations: Array<{
    code: string;
    title: string;
    count: number;
  }>;

  // Tarjeta 6: Productividad Editorial
  productivity: {
    average: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
    percentile25: number;
    percentile75: number;
  };

  // Tarjeta 7: Publicación
  publicationMetrics: {
    publishableCount: number;
    scheduledCount: number;
    publishedCount: number;
    restrictedCount: number;
  };

  // Tarjeta 8: Timeline
  timeline: Array<{
    period: string; // "YYYY-MM" o "YYYY-Www"
    count: number;
  }>;

  // Tarjeta 9: Calidad Editorial
  qualityDistribution: Array<{
    range: "0-20%" | "21-40%" | "41-60%" | "61-80%" | "81-99%" | "100%";
    count: number;
    percentage: number;
  }>;

  // Tarjeta 10: Riesgos
  risks: {
    publishedWithWarnings: number;
    publishedWithoutConsent: number;
    unknownValidations: number;
    historicalConflicts: number;
    eligibleButNotPublished: number;
    blockedForConsent: number;
    blockedHistoricalValidation: number;
    criticalIndicators: number;
  };

  // Tarjeta 11: Salud Editorial
  editorialHealth: {
    healthScore: number;
    label: "Excelente" | "Buena" | "Regular" | "Crítica";
    blockedPercentage: number;
    warningPercentage: number;
    averageProgress: number;
    publishablePercentage: number;
  };

  // Dashboard Inteligente
  smartActions: SmartAction[];
}
