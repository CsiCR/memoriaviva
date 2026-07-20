// Orquestador del Dashboard de Gestión Editorial
// Archivo: src/lib/editorial/dashboard/evaluateDashboard.ts

import { EvaluatedContribution, DashboardFilter, DashboardResult, SmartAction } from './dashboardTypes';
import { filterContributions } from './dashboardFilters';
import { buildSmartActionFilter } from '../navigation/dashboardNavigation';
import { calculateProductivityStats } from './dashboardMetrics';
import { 
  calculateStageDistribution, 
  calculateBottlenecks, 
  calculateIndicatorDistribution, 
  calculateRecommendations 
} from './dashboardAggregations';
import { calculateTimeline, calculateQualityDistribution } from './dashboardCharts';
import { APP_VERSION, EDITORIAL_ENGINE_VERSION, EDITORIAL_PROGRESS_VERSION } from '../../../config/version';

function generateHash(dataStr: string): string {
  let hash = 0;
  for (let i = 0; i < dataStr.length; i++) {
    hash = (hash << 5) - hash + dataStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).toUpperCase();
}

export function evaluateDashboard(
  contributions: EvaluatedContribution[],
  filter: DashboardFilter
): DashboardResult {
  const generatedAt = new Date().toISOString();

  // 1. Filtrar las contribuciones
  const filtered = filterContributions(contributions, filter);
  const total = filtered.length;

  // 2. KPIs generales
  const averageProgress = total > 0 
    ? Math.round(filtered.reduce((acc, c) => acc + c.progressResult.progress, 0) / total) 
    : 0;

  const eligibleCount = filtered.filter(c => c.eligibilityResult.eligibleForPublication === true).length;
  const publishedCount = filtered.filter(c => c.progressResult.isPublished === true).length;
  const blockedCount = filtered.filter(c => c.progressResult.blockedItems.length > 0).length;
  const pendingReviewCount = filtered.filter(
    c => (c.editorialStatus || "").trim().toLowerCase() === "received"
  ).length;

  // 3. Distribuciones y Agrupaciones
  const stageDistribution = calculateStageDistribution(filtered);
  const bottlenecks = calculateBottlenecks(filtered);
  const indicatorDistribution = calculateIndicatorDistribution(filtered);
  const { topRecommendations, allRecommendations } = calculateRecommendations(filtered);
  const productivity = calculateProductivityStats(filtered);
  const qualityDistribution = calculateQualityDistribution(filtered);

  // 4. Métricas de Publicación
  const publicationMetrics = {
    publishableCount: filtered.filter(c => {
      const code = (c.publicationStatus || "").trim().toLowerCase();
      return code === "publishable" || code === "ready";
    }).length,
    scheduledCount: filtered.filter(c => (c.publicationStatus || "").trim().toLowerCase() === "scheduled").length,
    publishedCount,
    restrictedCount: filtered.filter(c => (c.publicationStatus || "").trim().toLowerCase() === "restricted").length
  };

  // 5. Timeline
  const timelineMode = filter.timelineMode || "received";
  const timeline = calculateTimeline(filtered, timelineMode);

  // 6. Riesgos Detallados
  const publishedWithWarnings = filtered.filter(c => 
    c.progressResult.isPublished === true && 
    (c.progressResult.progress < 100 || 
     c.progressResult.blockedItems.length > 0 ||
     (c.activeIndicators || []).some(ind => ind.severity === "warning" || ind.severity === "blocking" || ind.severity === "critical"))
  ).length;

  const publishedWithoutConsent = filtered.filter(c => 
    c.progressResult.isPublished === true && 
    c.progressResult.blockedItems.some(i => i.code === "CONSENT")
  ).length;

  const unknownValidations = filtered.filter(c => 
    c.historicalValidationStatus === "unknown" || !c.historicalValidationStatus
  ).length;

  const historicalConflicts = filtered.filter(c => 
    c.progressResult.conflicts.includes("CONFLICT_HISTORICAL_VALIDATION")
  ).length;

  const eligibleButNotPublished = filtered.filter(c => 
    c.eligibilityResult.eligibleForPublication === true && 
    c.progressResult.isPublished === false
  ).length;

  const blockedForConsent = filtered.filter(c => 
    c.progressResult.blockedItems.some(i => i.code === "CONSENT")
  ).length;

  const blockedHistoricalValidation = filtered.filter(c => 
    c.progressResult.blockedItems.some(i => i.code === "HISTORICAL_VAL")
  ).length;

  const criticalIndicators = filtered.filter(c => 
    c.progressResult.blockedItems.some(i => i.code === "INDICATORS")
  ).length;

  const risks = {
    publishedWithWarnings,
    publishedWithoutConsent,
    unknownValidations,
    historicalConflicts,
    eligibleButNotPublished,
    blockedForConsent,
    blockedHistoricalValidation,
    criticalIndicators
  };

  // 7. Tarjeta: Salud Editorial
  const blockedPercentage = total > 0 ? Math.round((blockedCount / total) * 100) : 0;
  // Aporte con advertencias: no bloqueado, pero incompleto (progreso < 100) o con indicadores de advertencia
  const warningCount = filtered.filter(c => 
    c.progressResult.blockedItems.length === 0 && 
    (c.progressResult.progress < 100 || (c.activeIndicators || []).some(ind => ind.severity === "warning"))
  ).length;
  const warningPercentage = total > 0 ? Math.round((warningCount / total) * 100) : 0;
  const publishablePercentage = total > 0 ? Math.round((eligibleButNotPublished / total) * 100) : 0;

  // Fórmula ponderada de salud: 100% ideal, restando la penalidad de bloqueos (1.0x) y advertencias (0.5x)
  let healthScore = Math.round(100 - blockedPercentage - (warningPercentage * 0.5));
  healthScore = Math.max(0, Math.min(100, healthScore));

  let healthLabel: "Excelente" | "Buena" | "Regular" | "Crítica" = "Crítica";
  if (healthScore >= 80) {
    healthLabel = "Excelente";
  } else if (healthScore >= 60) {
    healthLabel = "Buena";
  } else if (healthScore >= 40) {
    healthLabel = "Regular";
  }

  const editorialHealth = {
    healthScore,
    label: healthLabel,
    blockedPercentage,
    warningPercentage,
    averageProgress,
    publishablePercentage
  };

  // 8. Dashboard Inteligente (SmartActions estructuradas)
  const smartActions: SmartAction[] = [];

  // Acción A: Validaciones históricas
  const histPendingCount = filtered.filter(c => 
    c.progressResult.currentStage.code === "HISTORICAL_VALIDATION" || 
    c.historicalValidationStatus === "pending"
  ).length;
  if (histPendingCount > 0) {
    smartActions.push({
      code: "HISTORICAL_VALIDATION_PENDING",
      priority: 90,
      severity: "info",
      title: "Validaciones históricas pendientes",
      description: `Hay ${histPendingCount} aportes esperando validación histórica.`,
      affectedCount: histPendingCount,
      contributionFilter: buildSmartActionFilter("HISTORICAL_VALIDATION_PENDING")
    });
  }

  // Acción B: Consentimiento
  if (blockedForConsent > 0) {
    smartActions.push({
      code: "CONSENT_PENDING",
      priority: 95,
      severity: "critical",
      title: "Falta de consentimiento",
      description: `Existen ${blockedForConsent} aportes sin consentimiento verificado ni firmado.`,
      affectedCount: blockedForConsent,
      contributionFilter: buildSmartActionFilter("CONSENT_PENDING")
    });
  }

  // Acción C: Publicados con advertencias
  const totalInconsistentPubs = publishedWithWarnings + publishedWithoutConsent;
  if (totalInconsistentPubs > 0) {
    smartActions.push({
      code: "PUBLISHED_WITH_WARNINGS",
      priority: 85,
      severity: "warning",
      title: "Publicaciones con inconsistencias",
      description: `Hay ${totalInconsistentPubs} aportes publicados con advertencias o inconsistencias.`,
      affectedCount: totalInconsistentPubs,
      contributionFilter: buildSmartActionFilter("PUBLISHED_WITH_WARNINGS")
    });
  }

  // Acción D: Publicables listos
  if (eligibleButNotPublished > 0) {
    smartActions.push({
      code: "ELIGIBLE_NOT_PUBLISHED",
      priority: 80,
      severity: "info",
      title: "Aportes publicables listos",
      description: `Hay ${eligibleButNotPublished} publicables listos para ser publicados definitivamente.`,
      affectedCount: eligibleButNotPublished,
      contributionFilter: buildSmartActionFilter("ELIGIBLE_NOT_PUBLISHED")
    });
  }

  // Ordenar recomendaciones por prioridad descendente
  smartActions.sort((a, b) => b.priority - a.priority);

  // 9. Metadatos de exportación y auditoría
  const dashboardVersion = "1.0.0";
  const dataHashSource = `${total}-${averageProgress}-${eligibleCount}-${publishedCount}-${generatedAt}`;
  const dataHash = generateHash(dataHashSource);

  return {
    metadata: {
      generatedAt,
      filtersApplied: filter,
      evaluatedContributionsCount: total,
      platformVersion: APP_VERSION.version,
      editorialVersion: EDITORIAL_ENGINE_VERSION.version,
      progressVersion: EDITORIAL_PROGRESS_VERSION.version,
      dashboardVersion,
      exportMetadata: {
        hash: dataHash,
        schemaVersion: "1.0.0"
      }
    },
    totalContributions: total,
    averageProgress,
    eligibleCount,
    publishedCount,
    blockedCount,
    pendingReviewCount,
    stageDistribution,
    bottlenecks,
    indicatorDistribution,
    topRecommendations,
    allRecommendations,
    productivity,
    publicationMetrics,
    timeline,
    qualityDistribution,
    risks,
    editorialHealth,
    smartActions
  };
}
