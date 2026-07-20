// Definición de Tipos para Filtros de Navegación Editorial
// Archivo: src/lib/editorial/navigation/navigationTypes.ts

export interface ContributionListFilter {
  search?: string;
  dni?: string;
  contentTypes?: string[];
  authorizationLevels?: string[];
  editorialStatuses?: string[];
  publicationStatuses?: string[];
  eligibility?: "eligible" | "ineligible" | "review_required";
  stages?: string[];
  blockingCodes?: string[];
  bottleneckCodes?: string[];
  warningCodes?: string[];
  indicatorCodes?: string[];
  progressMin?: number;
  progressMax?: number;
  dateMode?: "received" | "updated" | "published";
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}
