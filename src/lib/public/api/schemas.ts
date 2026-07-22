// Esquemas de Validación Zod para la API Pública
// Archivo: src/lib/public/api/schemas.ts

import { z } from "zod";
import { publicContributionSchema } from "../validation/contribution.schema";
import { publicStorySchema } from "../validation/story.schema";

export { publicContributionSchema, publicStorySchema };

export const publicPersonSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string(),
    displayName: z.string(),
    birthYear: z.number().nullable(),
    arrivalYear: z.number().nullable(),
    occupation: z.string().nullable(),
    place: z.string().nullable(),
    description: z.string().nullable(),
  })
  .strict();

export const publicPlaceSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string(),
    name: z.string(),
    placeType: z.string().nullable(),
    neighborhood: z.string().nullable(),
    description: z.string().nullable(),
  })
  .strict();

export const publicInstitutionSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string(),
    name: z.string(),
    institutionType: z.string().nullable(),
    foundationYear: z.number().nullable(),
    description: z.string().nullable(),
  })
  .strict();

export const publicCollectionSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string(),
    name: z.string(),
    collectionType: z.string().nullable(),
    featured: z.boolean(),
    description: z.string().nullable(),
  })
  .strict();

export const publicApiMetaSchema = z
  .object({
    schemaVersion: z.literal(1),
    apiVersion: z.literal("v1"),
    requestId: z.string().uuid(),
    generatedAt: z.string().datetime(),
  })
  .strict();

export const publicPaginationMetaSchema = z
  .object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(50),
    totalItems: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  })
  .strict();

export const publicCollectionResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z
    .object({
      data: z.array(dataSchema),
      meta: publicApiMetaSchema.and(
        z.object({
          pagination: publicPaginationMetaSchema,
        })
      ),
    })
    .strict();

export const publicDetailResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z
    .object({
      data: dataSchema,
      meta: publicApiMetaSchema,
    })
    .strict();

export const publicApiErrorResponseSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.string(), z.unknown()).optional(),
    }),
    meta: publicApiMetaSchema,
  })
  .strict();
