export const APP_MIME_LIMITS = {
  image: {
    maxSize: 20 * 1024 * 1024, // 20 MB
    extensions: ['jpg', 'jpeg', 'png', 'webp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  document: {
    maxSize: 50 * 1024 * 1024, // 50 MB
    extensions: ['pdf', 'doc', 'docx'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  },
  audio: {
    maxSize: 250 * 1024 * 1024, // 250 MB (Capped by bucket limit to 50 MB)
    extensions: ['mp3', 'wav', 'm4a'],
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/m4a', 'audio/mp4', 'audio/aac']
  },
  video: {
    maxSize: 1024 * 1024 * 1024, // 1 GB (Capped by bucket limit to 50 MB)
    extensions: ['mp4', 'mov'],
    mimeTypes: ['video/mp4', 'video/quicktime', 'video/mov']
  }
};

// Límite efectivo del bucket en Supabase
export const BUCKET_FILE_SIZE_LIMIT = 50 * 1024 * 1024; // 50 MB

// Cantidad máxima de archivos por aporte
export const MAX_FILES_PER_CONTRIBUTION = 10;

/**
 * Mapea una extensión o tipo MIME a su respectiva categoría de archivo
 */
export function getCategoryFromMimeOrExtension(mimeType: string, fileName: string): 'image' | 'document' | 'audio' | 'video' | null {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  // Buscar por tipo MIME
  if (mimeType) {
    for (const [category, config] of Object.entries(APP_MIME_LIMITS)) {
      if (config.mimeTypes.includes(mimeType)) {
        return category as 'image' | 'document' | 'audio' | 'video';
      }
    }
  }

  // Fallback por extensión si el MIME es genérico o no está definido
  if (extension) {
    for (const [category, config] of Object.entries(APP_MIME_LIMITS)) {
      if (config.extensions.includes(extension)) {
        return category as 'image' | 'document' | 'audio' | 'video';
      }
    }
  }

  return null;
}

/**
 * Obtiene el límite máximo de tamaño para una categoría respetando el límite efectivo de 50 MB del bucket
 */
export function getMaxSizeForCategory(category: 'image' | 'document' | 'audio' | 'video'): number {
  const config = APP_MIME_LIMITS[category];
  if (!config) return BUCKET_FILE_SIZE_LIMIT;
  
  // Usar el menor de los límites (límite de la categoría vs límite del bucket de 50 MB)
  return Math.min(config.maxSize, BUCKET_FILE_SIZE_LIMIT);
}
