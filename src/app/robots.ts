// Dynamic Robots Generation (robots.txt)
// Archivo: src/app/robots.ts

import { MetadataRoute } from 'next';
import { createAdminClient } from "@/utils/supabase/admin";
import { createSeoContainer } from "@/lib/public/seo/server";
import { buildRobotsDirectives } from "@/lib/public/seo/publishers/robots";
import { clientEnv } from "@/lib/config/env";

export default function robots(): MetadataRoute.Robots {
  try {
    const supabase = createAdminClient();
    const container = createSeoContainer(supabase);

    return buildRobotsDirectives(container.siteUrl) as MetadataRoute.Robots;
  } catch (error) {
    console.error("Error generating robots.txt:", error);
    if (clientEnv.NEXT_PUBLIC_APP_ENV === "staging") {
      return {
        rules: [
          {
            userAgent: "*",
            disallow: "/",
          },
        ],
      };
    }
    const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL || "https://memoriavivapicotruncado.org";
    return {
      rules: [
        {
          userAgent: "*",
          allow: "/",
          disallow: ["/admin", "/admin/", "/api/"],
        },
      ],
      sitemap: `${siteUrl}/sitemap.xml`,
    };
  }
}

