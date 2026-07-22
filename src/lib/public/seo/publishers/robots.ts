// Publicador de Reglas de Indexación (robots.txt)
// Archivo: src/lib/public/seo/publishers/robots.ts

import { clientEnv } from "@/lib/config/env";

export interface RobotsDirectives {
  rules: {
    userAgent: string | string[];
    allow?: string | string[];
    disallow?: string | string[];
  }[];
  sitemap?: string;
}

/**
 * Genera la configuración de robots.txt para el enrutador de Next.js.
 * En staging desautoriza todo. En producción protege el panel interno y APIs.
 */
export function buildRobotsDirectives(siteUrl: string): RobotsDirectives {
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

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/proyecto", "/aportar", "/contributions/"],
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/_next/",
          "/static/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

