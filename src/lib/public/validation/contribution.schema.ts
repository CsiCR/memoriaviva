// Esquemas de Validación Zod para Aportes Públicos
// Archivo: src/lib/public/validation/contribution.schema.ts

import { z } from "zod";
import { publicCreditsSchema } from "./credits.schema";
import { publicMediaSchema } from "./media.schema";
import {
  publicReferenceSchema,
  publicPersonReferenceSchema,
  publicPlaceReferenceSchema,
  publicInstitutionReferenceSchema,
} from "./references.schema";

export const publicHistoricalDateSchema = z
  .object({
    precision: z.enum(["exact", "year", "decade", "approximate", "unknown"]),
    isoDate: z.string().nullable(), // ISO Date format z.string().date() or similar, we use general string since it might be nullable
    year: z.number().nullable(),
    decade: z.number().nullable(),
    displayLabel: z.string().nullable(),
  })
  .strict();

export const publicContributionSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string(),
    title: z.string(),
    contentType: z.enum(["textual", "documentary", "audiovisual", "mixed"]),
    description: z.string().nullable(),
    historicalDate: publicHistoricalDateSchema,
    relatedPlace: publicPlaceReferenceSchema.nullable(),
    mentionedPeople: z.array(publicPersonReferenceSchema),
    mentionedInstitutions: z.array(publicInstitutionReferenceSchema),
    historicalContext: z.string().nullable(),
    catalogCode: z.string().nullable(),
    publishedAt: z.string().datetime({ offset: true }), // ISO string con offset
    updatedAt: z.string().datetime({ offset: true }),   // ISO string con offset
    credits: publicCreditsSchema,
    media: z.array(publicMediaSchema),
    references: z.array(publicReferenceSchema),
  })
  .strict();
