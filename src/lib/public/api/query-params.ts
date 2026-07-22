// Validador y Parser Estricto de Parámetros de Búsqueda
// Archivo: src/lib/public/api/query-params.ts

import { PublicSortDirection } from "./types";

export interface ParsedQueryParams {
  page: number;
  pageSize: number;
  sort: "recent" | "oldest" | "title";
  direction: PublicSortDirection;
  q?: string;
  escapedQ?: string;
  from?: string;
  to?: string;
  contributionType?: "textual" | "documentary" | "audiovisual" | "mixed";
  year?: number;
  collection?: string;
}

const ALLOWED_PARAMS = new Set([
  "page",
  "pageSize",
  "sort",
  "direction",
  "q",
  "from",
  "to",
  "contributionType",
  "year",
  "collection",
]);

export function parseQueryParams(searchParams: URLSearchParams): ParsedQueryParams {
  // 1. Validar política estricta de parámetros desconocidos
  for (const key of Array.from(searchParams.keys())) {
    if (!ALLOWED_PARAMS.has(key)) {
      throw new Error(`PUBLIC_INVALID_QUERY: Parámetro de consulta desconocido: ${key}`);
    }
  }

  // 2. Parsear page
  let page = 1;
  const pageStr = searchParams.get("page");
  if (pageStr !== null) {
    const parsedPage = parseInt(pageStr, 10);
    if (isNaN(parsedPage) || parsedPage < 1 || String(parsedPage) !== pageStr) {
      throw new Error("PUBLIC_INVALID_QUERY: El parámetro 'page' debe ser un número entero >= 1");
    }
    page = parsedPage;
  }

  // 3. Parsear pageSize
  let pageSize = 12;
  const pageSizeStr = searchParams.get("pageSize");
  if (pageSizeStr !== null) {
    const parsedPageSize = parseInt(pageSizeStr, 10);
    if (isNaN(parsedPageSize) || parsedPageSize < 1 || parsedPageSize > 50 || String(parsedPageSize) !== pageSizeStr) {
      throw new Error("PUBLIC_INVALID_QUERY: El parámetro 'pageSize' debe ser un número entero entre 1 y 50");
    }
    pageSize = parsedPageSize;
  }

  // 4. Parsear direction
  let direction: PublicSortDirection = "desc";
  const directionStr = searchParams.get("direction");
  if (directionStr !== null) {
    if (directionStr !== "asc" && directionStr !== "desc") {
      throw new Error("PUBLIC_INVALID_QUERY: El parámetro 'direction' debe ser 'asc' o 'desc'");
    }
    direction = directionStr;
  }

  // 5. Parsear sort
  let sort: "recent" | "oldest" | "title" = "recent";
  const sortStr = searchParams.get("sort");
  if (sortStr !== null) {
    if (sortStr === "relevance") {
      throw new Error("PUBLIC_INVALID_QUERY: El orden 'relevance' no está soportado en esta versión de la API");
    }
    if (sortStr !== "recent" && sortStr !== "oldest" && sortStr !== "title") {
      throw new Error("PUBLIC_INVALID_QUERY: El parámetro 'sort' debe ser 'recent', 'oldest' o 'title'");
    }
    sort = sortStr;
  }

  const result: ParsedQueryParams = { page, pageSize, sort, direction };

  // 6. Parsear q (Búsqueda)
  const qStr = searchParams.get("q");
  if (qStr !== null) {
    const normalized = qStr.trim().normalize("NFC").replace(/\s+/g, " ");
    if (normalized.length < 2 || normalized.length > 100) {
      throw new Error("PUBLIC_INVALID_QUERY: El parámetro de búsqueda 'q' debe tener entre 2 y 100 caracteres");
    }
    result.q = normalized;
    // Escapar comodines de Postgres para ILIKE literal
    result.escapedQ = normalized.replace(/[%_]/g, "\\$&");
  }

  // 7. Parsear fechas from y to
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");

  if (fromStr !== null) {
    const fromTime = Date.parse(fromStr);
    if (isNaN(fromTime)) {
      throw new Error("PUBLIC_INVALID_QUERY: El parámetro 'from' debe ser una fecha ISO válida");
    }
    result.from = fromStr;
  }

  if (toStr !== null) {
    const toTime = Date.parse(toStr);
    if (isNaN(toTime)) {
      throw new Error("PUBLIC_INVALID_QUERY: El parámetro 'to' debe ser una fecha ISO válida");
    }
    result.to = toStr;
  }

  if (result.from && result.to) {
    if (Date.parse(result.from) > Date.parse(result.to)) {
      throw new Error("PUBLIC_INVALID_QUERY: El parámetro 'from' no puede ser posterior a 'to'");
    }
  }

  // 8. Filtro contributionType
  const typeStr = searchParams.get("contributionType");
  if (typeStr !== null) {
    if (
      typeStr !== "textual" &&
      typeStr !== "documentary" &&
      typeStr !== "audiovisual" &&
      typeStr !== "mixed"
    ) {
      throw new Error(
        "PUBLIC_INVALID_QUERY: El parámetro 'contributionType' debe ser 'textual', 'documentary', 'audiovisual' o 'mixed'"
      );
    }
    result.contributionType = typeStr;
  }

  // 9. Filtro year
  const yearStr = searchParams.get("year");
  if (yearStr !== null) {
    const parsedYear = parseInt(yearStr, 10);
    if (isNaN(parsedYear) || String(parsedYear) !== yearStr) {
      throw new Error("PUBLIC_INVALID_QUERY: El parámetro 'year' debe ser un número entero válido");
    }
    result.year = parsedYear;
  }

  // 10. Filtro collection
  const collectionStr = searchParams.get("collection");
  if (collectionStr !== null) {
    if (collectionStr.trim().length === 0) {
      throw new Error("PUBLIC_INVALID_QUERY: El parámetro 'collection' no puede estar vacío");
    }
    result.collection = collectionStr.trim();
  }

  return result;
}
