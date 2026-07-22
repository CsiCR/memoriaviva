// Esquemas de Validación Zod para Multimedia Pública
// Archivo: src/lib/public/validation/media.schema.ts

import { z } from "zod";

export const publicMediaDerivativeSchema = z
  .object({
    type: z.string(),
    publicUrl: z.string().url(),
    width: z.number().nullable().optional(),
    height: z.number().nullable().optional(),
  })
  .strict();

export const publicMediaSchema = z
  .object({
    id: z.string().uuid(),
    mediaType: z.enum(["image", "audio", "video", "document"]),
    publicUrl: z.string(), // Could be dynamic/relative path or URL, so we accept general string
    thumbnailUrl: z.string().nullable(),
    title: z.string().nullable(),
    caption: z.string().nullable(),
    altText: z.string().nullable(),
    mimeType: z.string(),
    role: z.enum(["cover", "gallery", "attachment", "audio", "video"]),
    downloadSizeBytes: z.number().nullable(),
    derivatives: z.array(publicMediaDerivativeSchema),
  })
  .strict();
