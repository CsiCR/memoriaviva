// Contratos Públicos — Historias Curadas y Referencias de Aportes
// Archivo: src/lib/public/types/story.ts

import { PublicCredits } from "./credits";
import { PublicMedia } from "./media";
import { ContributionInput } from "../../editorial/types";

export interface PublicContributionReference {
  id: string;
  slug: string;
  title: string;
  contributionType: "textual" | "documentary" | "audiovisual" | "mixed";
  coverThumbnailUrl: string | null;
}

export interface PublicStoryInput {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  coverMedia?: PublicMedia | null;
  contributionInputs: ContributionInput[];
  credits: PublicCredits[];
}

export interface PublicStory {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverMedia: PublicMedia | null;
  publishedAt: string; // ISO string
  contributions: PublicContributionReference[];
  credits: PublicCredits[];
}
