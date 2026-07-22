// Endpoint del Feed RSS (GET /feed.xml)
// Archivo: src/app/feed.xml/route.ts

import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createSeoContainer } from "@/lib/public/seo/server";
import { buildRssFeed } from "@/lib/public/seo/publishers/rss";
import { clientEnv } from "@/lib/config/env";

// Revalidación nativa de Next.js cada 5 minutos
export const revalidate = 300;

export async function GET() {
  if (clientEnv.NEXT_PUBLIC_APP_ENV === "staging") {
    return new NextResponse("RSS Feed is disabled in staging environment.", {
      status: 404,
      statusText: "Not Found",
    });
  }

  try {
    const supabase = createAdminClient();
    const container = createSeoContainer(supabase);

    const rssXml = await buildRssFeed(container.apiService, container.siteUrl, { limit: 50 });

    return new NextResponse(rssXml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error crítico generando Feed RSS:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

