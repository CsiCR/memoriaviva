// Esquemas de Validación Zod para Referencias
// Archivo: src/lib/public/validation/references.schema.ts

import { z } from "zod";

export const publicReferenceSchema = z
  .object({
    type: z.enum([
      "institutional_archive",
      "family_archive",
      "bibliographic",
      "newspaper",
      "oral_testimony",
      "public_record",
      "external_source",
      "institutional_agreement",
      "other",
    ]),
    title: z.string(),
    sourceName: z.string().nullable(),
    dateLabel: z.string().nullable(),
    externalUrl: z.string().nullable(),
  })
  .strict();

export const publicPersonReferenceSchema = z
  .object({
    id: z.string().uuid().nullable(),
    slug: z.string().nullable(),
    displayName: z.string(),
  })
  .strict();

export const publicPlaceReferenceSchema = z
  .object({
    id: z.string().uuid().nullable(),
    slug: z.string().nullable(),
    name: z.string(),
  })
  .strict();

export const publicInstitutionReferenceSchema = z
  .object({
    id: z.string().uuid().nullable(),
    slug: z.string().nullable(),
    name: z.string(),
  })
  .strict();
