// Contratos Públicos — Tipo de Aporte Público
// Archivo: src/lib/public/types/contribution.ts

import { PublicCredits } from "./credits";
import { PublicMedia } from "./media";
import {
  PublicReference,
  PublicPersonReference,
  PublicPlaceReference,
  PublicInstitutionReference,
} from "./references";

export interface PublicHistoricalDate {
  precision: "exact" | "year" | "decade" | "approximate" | "unknown";
  isoDate: string | null;
  year: number | null;
  decade: number | null;
  displayLabel: string | null;
}

export interface PublicContribution {
  id: string;
  slug: string;
  title: string;
  contentType: "textual" | "documentary" | "audiovisual" | "mixed";
  description: string | null;
  historicalDate: PublicHistoricalDate;
  relatedPlace: PublicPlaceReference | null;
  mentionedPeople: PublicPersonReference[];
  mentionedInstitutions: PublicInstitutionReference[];
  historicalContext: string | null;
  catalogCode: string | null;
  publishedAt: string; // ISO String
  updatedAt: string;   // ISO String
  credits: PublicCredits;
  media: PublicMedia[];
  references: PublicReference[];
}
