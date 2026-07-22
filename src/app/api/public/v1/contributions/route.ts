// Handler de Ruta Next.js para Listado de Aportes Públicos
// Archivo: src/app/api/public/v1/contributions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createPublicApiController } from "@/lib/public/api/server";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const supabase = createAdminClient();
  const controller = createPublicApiController(supabase);

  const searchParams = request.nextUrl.searchParams;
  const result = await controller.handleListContributions(searchParams, requestId);

  return new NextResponse(result.body ? JSON.stringify(result.body) : null, {
    status: result.status,
    headers: result.headers,
  });
}
