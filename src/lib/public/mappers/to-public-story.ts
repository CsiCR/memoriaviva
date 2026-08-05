// Mapper de Historias Públicas
// Archivo: src/lib/public/mappers/to-public-story.ts

import { PublicStoryInput, PublicStory, PublicContributionReference } from "../types/story";
import { toPublicContribution } from "./to-public-contribution";
import { buildContributionCanonicalSlug } from "../slugs/canonical-slug";
import { publicStorySchema } from "../validation/story.schema";

/**
 * Transforma una entrada de historia curada a un contrato PublicStory Whitelist.
 * 
 * Este mapper garantiza de forma absoluta que todas las contribuciones asociadas
 * a la historia pasen de manera obligatoria por la validación de elegibilidad pública.
 * Si alguna contribución no es elegible, el mapper arrojará un error bloqueante.
 */
export function toPublicStory(input: PublicStoryInput): PublicStory {
  const contributions: PublicContributionReference[] = input.contributionInputs.map((c) => {
    // Validar y mapear aporte completo primero para asegurar elegibilidad
    const cRaw = c as unknown as Record<string, unknown>;
    const slug = buildContributionCanonicalSlug({
      publicTitle: (c.publication_title || c.editorial_title || c.title || "Aporte sin título") as string,
      catalogCode: (cRaw.catalog_code as string | null) || null,
      contributionId: c.id || "",
    });
    const pubC = toPublicContribution(c, slug);

    // Obtener imagen de portada o miniatura disponible
    const coverMedia = pubC.media.find((m) => m.role === "cover") || 
                        pubC.media.find((m) => m.mediaType === "image");

    return {
      id: pubC.id,
      slug: pubC.slug,
      title: pubC.title,
      contributionType: pubC.contentType,
      coverThumbnailUrl: coverMedia ? (coverMedia.thumbnailUrl || coverMedia.publicUrl) : null,
    };
  });

  const publicPayload: PublicStory = {
    id: input.id,
    slug: input.slug,
    title: input.title,
    description: input.description || null,
    coverMedia: input.coverMedia || null,
    publishedAt: new Date().toISOString(),
    contributions: contributions,
    credits: input.credits,
  };

  // Validación estricta por Zod
  return publicStorySchema.parse(publicPayload);
}
