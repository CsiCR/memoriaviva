// Handler de Ruta Next.js para Detalle de Aporte por Slug
// Archivo: src/app/api/public/v1/contributions/[slug]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createPublicApiController } from "@/lib/public/api/server";
import crypto from "crypto";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const requestId = crypto.randomUUID();
  const { slug } = await params;
  
  const supabase = createAdminClient();
  const controller = createPublicApiController(supabase);

  const ifNoneMatch = request.headers.get("if-none-match");
  const result = await controller.handleGetContribution(slug, ifNoneMatch, requestId);

  return new NextResponse(result.body ? JSON.stringify(result.body) : null, {
    status: result.status,
    headers: result.headers,
  });
}
