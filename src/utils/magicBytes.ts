/**
 * Valida los magic bytes de un archivo en Supabase Storage leyendo únicamente los primeros 256 bytes.
 */
export async function validateStorageFileMagicBytes(
  supabaseUnused: any, // Mantener compatibilidad de firma
  storagePath: string,
  category: 'image' | 'document' | 'audio' | 'video'
): Promise<{ isValid: boolean; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return { isValid: false, error: 'Credenciales del servidor faltantes.' };
    }

    // Petición HTTP GET directa al endpoint autenticado con cabecera de Rango
    const url = `${supabaseUrl}/storage/v1/object/authenticated/historical-uploads/${storagePath}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Range': 'bytes=0-255'
      }
    });

    if (!response.ok) {
      console.error(`Error descargando rango de bytes para ${storagePath} (${response.status})`);
      return { isValid: false, error: 'No se pudo leer el encabezado del archivo para validar su integridad.' };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length < 4) {
      return { isValid: false, error: 'El archivo está dañado o vacío.' };
    }

    const hex = buffer.toString('hex').toUpperCase();

    switch (category) {
      case 'image':
        // JPEG: FF D8 FF
        if (hex.startsWith('FFD8FF')) return { isValid: true };
        // PNG: 89 50 4E 47
        if (hex.startsWith('89504E47')) return { isValid: true };
        // WEBP: RIFF...WEBP
        if (hex.startsWith('52494646') && buffer.toString('utf8', 8, 12) === 'WEBP') return { isValid: true };
        return { isValid: false, error: 'El archivo no corresponde a una imagen válida (debe ser JPG, PNG o WEBP).' };

      case 'document':
        // PDF: %PDF
        if (hex.startsWith('25504446')) return { isValid: true };
        // ZIP/DOCX: PK (50 4B 03 04)
        if (hex.startsWith('504B0304')) return { isValid: true };
        // Legacy DOC: D0 CF 11 E0
        if (hex.startsWith('D0CF11E0')) return { isValid: true };
        return { isValid: false, error: 'El archivo no corresponde a un documento válido (debe ser PDF o Word).' };

      case 'audio':
        // MP3: ID3 (49 44 33) o MPEG Frame Sync (FF FB / FF F3 / FF F2)
        if (hex.startsWith('494433') || hex.startsWith('FFF3') || hex.startsWith('FFFB') || hex.startsWith('FFF2')) return { isValid: true };
        // WAV: RIFF...WAVE
        if (hex.startsWith('52494646') && buffer.toString('utf8', 8, 12) === 'WAVE') return { isValid: true };
        // M4A / AAC: ftyp (ftypM4A, etc.) en offset 4
        if (buffer.toString('utf8', 4, 12).startsWith('ftyp')) return { isValid: true };
        return { isValid: false, error: 'El archivo no corresponde a un audio válido (debe ser MP3, WAV o M4A).' };

      case 'video':
        // MP4 / MOV: ftyp (ftypmp42, ftypqt, etc.) en offset 4
        if (buffer.toString('utf8', 4, 12).startsWith('ftyp')) return { isValid: true };
        return { isValid: false, error: 'El archivo no corresponde a un video válido (debe ser MP4 o MOV).' };

      default:
        return { isValid: false, error: 'Categoría de archivo no soportada.' };
    }
  } catch (err: any) {
    console.error('Error durante la validación de magic bytes:', err);
    return { isValid: false, error: err.message || 'Error al validar la integridad del archivo.' };
  }
}
