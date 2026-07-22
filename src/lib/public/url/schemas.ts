// Esquemas Zod para la Capa de URL Pública
// Archivo: src/lib/public/url/schemas.ts

import { z } from "zod";

export const publicSiteUrlSchema = z
  .string()
  .url()
  .transform((val) => new URL(val))
  .refine(
    (url) =>
      url.protocol === "https:" ||
      (process.env.NODE_ENV !== "production" && url.protocol === "http:") ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1",
    { message: "PUBLIC_SITE_URL must use HTTPS in production." }
  )
  .refine(
    (url) => !url.username && !url.password && !url.search && !url.hash,
    { message: "PUBLIC_SITE_URL must be a clean origin." }
  )
  .transform((url) => url.origin);

