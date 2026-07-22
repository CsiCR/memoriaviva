// Contratos Públicos — Tipos Multimedia
// Archivo: src/lib/public/types/media.ts

export interface PublicMediaInput {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_role?: string | null;
  processing_status?: string | null;
  is_original?: boolean;
}

export interface PublicMediaDerivative {
  type: string;
  publicUrl: string;
  width?: number | null;
  height?: number | null;
}

export interface PublicMedia {
  id: string;
  mediaType: "image" | "audio" | "video" | "document";
  publicUrl: string;
  thumbnailUrl: string | null;
  title: string | null;
  caption: string | null;
  altText: string | null;
  mimeType: string;
  role: "cover" | "gallery" | "attachment" | "audio" | "video";
  downloadSizeBytes: number | null;
  derivatives: PublicMediaDerivative[];
}
