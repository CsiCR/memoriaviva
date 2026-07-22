// Pruebas Unitarias para Medios Públicos
// Archivo: src/lib/public/tests/public-media.test.ts

import { toPublicMedia, getMediaType, getMediaRole } from "../mappers/to-public-media";
import { PublicMediaInput } from "../types/media";
import { publicMediaSchema } from "../validation/media.schema";

export function runMediaTests(assert: (cond: boolean, msg: string) => void) {
  console.log("-> [TESTS] Iniciando pruebas de medios públicos...");

  const validImgFile: PublicMediaInput = {
    id: "44444444-4444-4444-8444-444444444444",
    file_name: "foto_original_sensible_dni.jpg",
    file_type: "image/jpeg",
    file_size: 1024 * 1024 * 3,
    file_role: "gallery",
    processing_status: "completed",
    is_original: true,
  };

  // 1. Tipo y rol correcto
  assert(getMediaType("image/png") === "image", "Detecta tipo de imagen.");
  assert(getMediaType("audio/wav") === "audio", "Detecta tipo de audio.");
  assert(getMediaRole("cover", "image") === "cover", "Rol de portada.");
  assert(getMediaRole(null, "audio") === "audio", "Rol de audio automático.");

  // 2. Mapeo seguro a PublicMedia
  const mappedMedia = toPublicMedia(validImgFile, {
    title: "Una tarde de invierno",
    altText: "Locomotora antigua en Pico Truncado",
  });

  assert(mappedMedia.id === "44444444-4444-4444-8444-444444444444", "Mantiene ID del archivo.");
  assert(mappedMedia.mediaType === "image", "Mapea mediaType correctamente.");
  assert(mappedMedia.publicUrl === "/api/public/media/44444444-4444-4444-8444-444444444444", "Genera url segura sin rutas de bucket.");
  assert(mappedMedia.title === "Una tarde de invierno", "Agrega título.");
  assert(mappedMedia.altText === "Locomotora antigua en Pico Truncado", "Agrega texto alternativo.");
  assert(mappedMedia.mimeType === "image/jpeg", "Conserva el mimeType.");
  assert(mappedMedia.role === "gallery", "Conserva el rol.");
  assert(mappedMedia.downloadSizeBytes === null, "El tamaño de descarga es null por defecto para galerías.");

  // 3. Ofuscación estricta de nombres y tamaño
  const mappedKeys = Object.keys(mappedMedia);
  assert(!mappedKeys.includes("file_name"), "La clave original 'file_name' no se expone.");
  assert(!mappedKeys.includes("fileName"), "La clave Whitelist 'fileName' no existe en el contrato.");
  assert(!mappedKeys.includes("file_size"), "La clave original 'file_size' no se expone.");
  assert(!mappedKeys.includes("fileSize"), "La clave Whitelist 'fileSize' no existe en el contrato.");

  // 4. Descarga habilitada para archivos adjuntos
  const docFile: PublicMediaInput = {
    ...validImgFile,
    file_type: "application/pdf",
    file_role: "attachment",
  };
  const mappedDoc = toPublicMedia(docFile);
  assert(mappedDoc.downloadSizeBytes === 1024 * 1024 * 3, "El tamaño de descarga está disponible para adjuntos.");

  // 5. Validación de Esquema Zod (Strict)
  const parsed = publicMediaSchema.safeParse(mappedMedia);
  if (!parsed.success) {
    console.error("Zod Validation Errors for mappedMedia:", JSON.stringify(parsed.error.format(), null, 2));
  }
  assert(parsed.success === true, "PublicMedia cumple el esquema Zod.");

  // 6. Rechazo de archivos no procesados o fallidos
  const failedFile: PublicMediaInput = {
    ...validImgFile,
    processing_status: "failed",
  };
  try {
    toPublicMedia(failedFile);
    assert(false, "Debe rechazar archivos en estado fallido.");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    assert(msg.includes("no está autorizado"), "Mensaje de error correcto al rechazar fallido.");
  }

  // 7. Rechazo de documentos de consentimiento
  const consentFile: PublicMediaInput = {
    ...validImgFile,
    file_role: "consent_document",
  };
  try {
    toPublicMedia(consentFile);
    assert(false, "Debe rechazar documentos legales/de consentimiento.");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    assert(msg.includes("no está autorizado"), "Mensaje de error correcto al rechazar consentimiento.");
  }

  // 8. Test de strictness en Zod
  const unsafeMedia = {
    ...mappedMedia,
    file_path: "historical-uploads/private/foto.jpg", // Campo no autorizado
  };
  const parseUnsafe = publicMediaSchema.safeParse(unsafeMedia);
  assert(parseUnsafe.success === false, "Esquema de medios estricto rechaza campos adicionales como file_path.");
}
