// Esquema de Validación Zod para Créditos Públicos
// Archivo: src/lib/public/validation/credits.schema.ts

import { z } from "zod";

export const publicCreditsSchema = z
  .object({
    attributionType: z.enum([
      "full_name",
      "initials",
      "family",
      "institution",
      "anonymous",
      "custom",
    ]),
    displayName: z.string().nullable(),
  })
  .strict();
