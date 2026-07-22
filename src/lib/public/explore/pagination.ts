// Helpers de Paginación SSR
// Archivo: src/lib/public/explore/pagination.ts

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginador genérico para arreglos en memoria.
 */
export function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResult<T> {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  
  // Normalizar límites de página
  const normalizedPage = Math.max(1, Math.min(page, totalPages));
  
  const startIndex = (normalizedPage - 1) * pageSize;
  const sliced = items.slice(startIndex, startIndex + pageSize);

  return {
    items: sliced,
    page: normalizedPage,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: normalizedPage < totalPages,
    hasPreviousPage: normalizedPage > 1,
  };
}
