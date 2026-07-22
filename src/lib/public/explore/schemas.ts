// Esquemas de Validación Zod para Exploración
// Archivo: src/lib/public/explore/schemas.ts

import { z } from "zod";

export const exploreStatsSchema = z
  .object({
    totalContributions: z.number().int().nonnegative(),
    totalPhotographs: z.number().int().nonnegative(),
    totalDocuments: z.number().int().nonnegative(),
    totalInterviewees: z.number().int().nonnegative(),
    totalInstitutions: z.number().int().nonnegative(),
    totalContributors: z.number().int().nonnegative(),
  })
  .strict();

export const contributionCardModelSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    imageUrl: z.string().nullable(),
    historicalDateLabel: z.string().nullable(),
    contributionTypeLabel: z.string(),
    authorName: z.string(),
    badge: z
      .object({
        label: z.string(),
        variant: z.enum(["new", "featured", "verified"]),
      })
      .strict()
      .optional(),
  })
  .strict();

export const homeDataSchema = z
  .object({
    hero: z
      .object({
        title: z.string(),
        subtitle: z.string(),
      })
      .strict(),
    stats: exploreStatsSchema,
    featured: z.array(contributionCardModelSchema),
    recent: z.array(contributionCardModelSchema),
    future: z
      .object({
        timeline: z.record(z.string(), z.unknown()).optional(),
        collections: z.record(z.string(), z.unknown()).optional(),
        institutions: z.record(z.string(), z.unknown()).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const appliedFiltersSchema = z
  .object({
    q: z.string().optional(),
    type: z.string().optional(),
    decade: z.string().optional(),
    institution: z.string().optional(),
    person: z.string().optional(),
    place: z.string().optional(),
  })
  .strict();

export const availableFiltersSchema = z
  .object({
    types: z.array(z.string()),
    decades: z.array(z.string()),
    institutions: z.array(z.string()),
    people: z.array(z.string()),
    places: z.array(z.string()),
  })
  .strict();

export const exploreQueryParamsSchema = z
  .object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    q: z.string().optional(),
    type: z.string().optional(),
    decade: z.string().optional(),
    institution: z.string().optional(),
    person: z.string().optional(),
    place: z.string().optional(),
    sort: z.enum(["recent", "oldest", "title-asc", "title-desc"]),
  })
  .strict();

export const searchResultSchema = z
  .object({
    version: z.literal(1),
    items: z.array(contributionCardModelSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    filters: appliedFiltersSchema,
    availableFilters: availableFiltersSchema,
  })
  .strict();
