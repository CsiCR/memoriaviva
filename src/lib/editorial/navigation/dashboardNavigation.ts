// Registro de Enlaces y Navegación del Dashboard Editorial
// Archivo: src/lib/editorial/navigation/dashboardNavigation.ts

import { ContributionListFilter } from './navigationTypes';

export function buildSmartActionFilter(actionCode: string): ContributionListFilter {
  switch (actionCode) {
    case "CONSENT_PENDING":
      return {
        publicationStatuses: ["unpublished"],
        blockingCodes: ["CONSENT"]
      };
    case "HISTORICAL_VALIDATION_PENDING":
      return {
        stages: ["HISTORICAL_VALIDATION"]
      };
    case "PUBLISHED_WITH_WARNINGS":
      return {
        publicationStatuses: ["published"],
        warningCodes: ["POST_PUBLICATION_INCONSISTENCY"]
      };
    case "ELIGIBLE_NOT_PUBLISHED":
      return {
        eligibility: "eligible",
        publicationStatuses: ["unpublished"]
      };
    default:
      return {};
  }
}

export function buildStageFilter(stageCode: string): ContributionListFilter {
  return {
    stages: [stageCode.toUpperCase()]
  };
}

export function buildBottleneckFilter(code: string): ContributionListFilter {
  return {
    bottleneckCodes: [code]
  };
}

export function buildRiskFilter(riskType: string): ContributionListFilter {
  switch (riskType) {
    case "publishedWithWarnings":
      return {
        publicationStatuses: ["published"],
        warningCodes: ["POST_PUBLICATION_INCONSISTENCY"]
      };
    case "publishedWithoutConsent":
      return {
        publicationStatuses: ["published"],
        blockingCodes: ["CONSENT"]
      };
    case "unknownValidations":
      return {
        warningCodes: ["UNKNOWN_VALIDATION"]
      };
    case "historicalConflicts":
      return {
        warningCodes: ["HISTORICAL_VALIDATION_CONFLICT"]
      };
    case "eligibleButNotPublished":
      return {
        eligibility: "eligible",
        publicationStatuses: ["unpublished"]
      };
    case "blockedForConsent":
      return {
        blockingCodes: ["CONSENT"]
      };
    case "blockedHistoricalValidation":
      return {
        blockingCodes: ["HISTORICAL_VAL"]
      };
    case "criticalIndicators":
      return {
        blockingCodes: ["INDICATORS"]
      };
    default:
      return {};
  }
}

export function buildQualityRangeFilter(min: number, max: number): ContributionListFilter {
  return {
    progressMin: min,
    progressMax: max
  };
}

export function buildPublicationStatusFilter(code: string): ContributionListFilter {
  return {
    publicationStatuses: [code]
  };
}

export function buildIndicatorSeverityFilter(severity: string): ContributionListFilter {
  return {
    indicatorCodes: [severity]
  };
}

export function buildRecommendationFilter(code: string): ContributionListFilter {
  switch (code) {
    case "ADD_CONSENT":
      return { blockingCodes: ["CONSENT"] };
    case "START_EDITORIAL_PROCESSING":
      return { stages: ["RECEIVED"] };
    case "ADD_FILES":
      return { blockingCodes: ["FILES"] };
    case "RESOLVE_CRITICAL_INDICATORS":
      return { blockingCodes: ["INDICATORS"] };
    case "START_HISTORICAL_VALIDATION":
    case "HISTORICAL_VALIDATION":
      return { stages: ["HISTORICAL_VALIDATION"] };
    case "PUBLISH_CONTRIBUTION":
      return { stages: ["READY_FOR_PUBLICATION"] };
    default:
      return {};
  }
}
