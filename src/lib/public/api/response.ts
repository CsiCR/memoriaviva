// Utilidades de Respuesta y Cabeceras Estándar de la API
// Archivo: src/lib/public/api/response.ts

export function buildResponseHeaders(
  requestId: string,
  options: {
    cacheType: "collection" | "detail" | "error";
    etag?: string;
  }
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "X-API-Version": "v1",
    "X-Request-Id": requestId,
    "X-Content-Type-Options": "nosniff",
  };

  if (options.cacheType === "error") {
    headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate";
    return headers;
  }

  headers["Vary"] = "If-None-Match";

  if (options.cacheType === "collection") {
    headers["Cache-Control"] = "public, s-maxage=60, stale-while-revalidate=300";
  } else if (options.cacheType === "detail") {
    headers["Cache-Control"] = "public, s-maxage=300, stale-while-revalidate=3600";
  }

  if (options.etag) {
    headers["ETag"] = options.etag;
  }

  return headers;
}
