// Pruebas Unitarias para Historias Públicas
// Archivo: src/lib/public/tests/public-story.test.ts

import { toPublicStory } from "../mappers/to-public-story";
import { PublicStoryInput } from "../types/story";
import { publicStorySchema } from "../validation/story.schema";
import { cleanContribution, contributionNoConsent } from "./fixtures";

export function runStoryTests(assert: (cond: boolean, msg: string) => void) {
  console.log("-> [TESTS] Iniciando pruebas de historias públicas...");

  const storyCredits = [
    { attributionType: "full_name" as const, displayName: "Edith Gómez" },
    { attributionType: "family" as const, displayName: "Familia Pérez" },
  ];

  const validStoryInput: PublicStoryInput = {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    slug: "tren-pico-truncado",
    title: "El Tren y la Identidad Truncadense",
    description: "Una recopilación del impacto del ferrocarril en los pioneros.",
    contributionInputs: [cleanContribution],
    credits: storyCredits,
  };

  // 1. Mapeo exitoso
  const mappedStory = toPublicStory(validStoryInput);
  assert(mappedStory.id === "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "ID de la historia conservado.");
  assert(mappedStory.slug === "tren-pico-truncado", "Slug mapeado.");
  assert(mappedStory.title === "El Tren y la Identidad Truncadense", "Título mapeado.");
  assert(mappedStory.contributions.length === 1, "Agrupa aportes.");
  
  const ref = mappedStory.contributions[0];
  assert(ref.id === cleanContribution.id, "ID del aporte de referencia correcto.");
  assert(ref.contributionType === "textual", "Tipo de aporte de referencia tipado estrictamente.");
  assert(ref.coverThumbnailUrl === "/api/public/media/55555555-5555-4555-8555-555555555555", "Deduce la miniatura de portada.");

  // 2. Multicréditos
  assert(mappedStory.credits.length === 2, "Permite múltiples créditos en la historia.");
  assert(mappedStory.credits[0].displayName === "Edith Gómez", "Primer crédito correcto.");
  assert(mappedStory.credits[1].displayName === "Familia Pérez", "Segundo crédito correcto.");

  // 3. Validación de Esquema Zod (Strict)
  const parsed = publicStorySchema.safeParse(mappedStory);
  assert(parsed.success === true, "PublicStory cumple el esquema estricto Zod.");

  // 4. Cascada de Seguridad: El mapper de historia debe fallar si algún aporte no es elegible
  const invalidStoryInput: PublicStoryInput = {
    ...validStoryInput,
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    contributionInputs: [cleanContribution, contributionNoConsent], // Uno de ellos es inválido
  };

  try {
    toPublicStory(invalidStoryInput);
    assert(false, "Debe fallar al mapear una historia con aportes no elegibles.");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    assert(msg.includes("criterios de exposición pública"), "Falla correctamente bloqueando la publicación insegura.");
  }

  // 5. Test de strictness en Zod
  const unsafeStory = {
    ...mappedStory,
    internal_notes: "Notas administrativas filtradas",
  };
  const parseUnsafe = publicStorySchema.safeParse(unsafeStory);
  assert(parseUnsafe.success === false, "Esquema estricto de historia pública rechaza campos adicionales.");
}
