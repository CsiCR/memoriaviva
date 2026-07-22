// Esquemas de Validación Zod para Historias Públicas
// Archivo: src/lib/public/validation/story.schema.ts

import { z } from "zod";
import { publicCreditsSchema } from "./credits.schema";
import { publicMediaSchema } from "./media.schema";

export const publicContributionReferenceSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string(),
    title: z.string(),
    contributionType: z.enum(["textual", "documentary", "audiovisual", "mixed"]),
    coverThumbnailUrl: z.string().nullable(),
  })
  .strict();

export const publicStorySchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    coverMedia: publicMediaSchema.nullable(),
    publishedAt: z.string().datetime(), // ISO string
    contributions: z.array(publicContributionReferenceSchema),
    credits: z.array(publicCreditsSchema),
  })
  .strict();
