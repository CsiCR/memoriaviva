// Dynamic Sitemap Generation (sitemap.xml)
// Archivo: src/app/sitemap.ts

import { MetadataRoute } from 'next';
import { createAdminClient } from "@/utils/supabase/admin";
import { createSeoContainer } from "@/lib/public/seo/server";
import { buildDynamicSitemap } from "@/lib/public/seo/publishers/sitemap";
import { clientEnv } from "@/lib/config/env";

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (clientEnv.NEXT_PUBLIC_APP_ENV === "staging") {
    throw new Error("Sitemap generation is disabled in staging environment.");
  }

  try {
    const supabase = createAdminClient();
    const container = createSeoContainer(supabase);

    const entries = await buildDynamicSitemap(container.apiService, container.siteUrl);

    return entries.map((entry) => ({
      url: entry.url,
      lastModified: entry.lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    }));
  } catch (error) {
    console.error("Error generating dynamic sitemap:", error);
    if (error instanceof Error && error.message.includes("staging")) {
      throw error;
    }
    // Fallback básico en caso de error de infraestructura
    const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL || "https://memoriavivapicotruncado.org";

    return [
      {
        url: siteUrl,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 1.0,
      },
    ];
  }
}

