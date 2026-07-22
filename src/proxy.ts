// Proxy de Servidor (Next.js 16 Node.js Runtime)
// Archivo: src/proxy.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { SupabasePublicIdentityRepository } from "@/lib/public/slugs/repository";
import { PublicIdentityService } from "@/lib/public/slugs/service";
import { PublicUrlIdentityResolver } from "@/lib/public/url/identity-resolver";

/**
 * Intercepta las solicitudes HTTP en el proxy antes del renderizado de páginas.
 * Resuelve y redirige (301) de manera preventiva los aliases y fusiones.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Validación programática de la estructura de la ruta
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 2 || segments[0] !== "contributions") {
    return NextResponse.next();
  }

  const slug = segments[1];
  const startTime = Date.now();
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();

  try {
    const supabase = createAdminClient();
    const identityRepo = new SupabasePublicIdentityRepository(supabase);
    const identityService = new PublicIdentityService(identityRepo);
    const resolver = new PublicUrlIdentityResolver(identityService);

    // Resolución preventiva del slug
    const res = await resolver.resolve("contribution", slug);
    const identityResolutionDurationMs = Date.now() - startTime;

    // Registrar observabilidad de latencia
    console.log(`[OBSERVABILITY] requestId=${requestId} requestedSlug=${slug} kind=${res.kind} identityResolutionDurationMs=${identityResolutionDurationMs}ms`);

    // Interceptar redirecciones (aliases históricos y fusiones)
    if (res.kind === "redirect" && res.canonicalSlug) {
      const destinationUrl = new URL(`/contributions/${res.canonicalSlug}`, request.url);

      return NextResponse.redirect(destinationUrl, {
        status: 301,
        headers: {
          "Location": destinationUrl.pathname,
          "Cache-Control": "public, max-age=3600",
          "X-Content-Type-Options": "nosniff",
          "X-Request-Id": requestId,
        },
      });
    }
  } catch (error) {
    console.error("Error crítico en proxy.ts resolviendo identidad:", error);
    // Dejar continuar en caso de error de infraestructura para manejo en página
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/contributions/:slug"],
};
