import { createClient } from './client';
import * as tus from 'tus-js-client';

export interface UploadOptions {
  fileRole?: 'original' | 'restored' | 'derivative' | 'legal_support';
  onProgress?: (progress: number) => void;
  onStateChange?: (state: 'pending' | 'uploading' | 'uploaded' | 'failed' | 'paused') => void;
  onSuccess?: (result: {
    uploadUuid: string;
    fileUuid: string;
    storagePath: string;
    fileRole: string;
    originalFilename: string;
    sizeBytes: number;
    mimeType: string;
  }) => void;
  onError?: (error: string) => void;
}

export interface UploadControl {
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  uploadUuid: string;
  storagePath: string;
}

/**
 * Realiza la carga de un archivo directamente a Supabase Storage de manera segura,
 * seleccionando el método oficial adecuado (estándar <= 6MB o TUS resumible > 6MB).
 */
export function uploadFileToStorage(
  file: File,
  options: UploadOptions = {}
): Promise<UploadControl> {
  const fileRole = options.fileRole || 'original';
  const onProgress = options.onProgress || (() => {});
  const onStateChange = options.onStateChange || (() => {});
  const onSuccess = options.onSuccess || (() => {});
  const onError = options.onError || (() => {});

  let tusUpload: tus.Upload | null = null;
  let uploadUuid = '';
  let fileUuid = '';
  let storagePath = '';
  let isCancelled = false;

  const control: UploadControl = {
    pause: () => {
      if (tusUpload) {
        tusUpload.abort();
        onStateChange('paused');
      }
    },
    resume: () => {
      if (tusUpload) {
        onStateChange('uploading');
        tusUpload.start();
      }
    },
    cancel: () => {
      isCancelled = true;
      if (tusUpload) {
        // Detiene la carga y remueve el fingerprint local para evitar reanudaciones accidentales
        tusUpload.abort(true);
      }
      onStateChange('failed');
      updateSessionStatus(uploadUuid, 'failed').catch(console.error);
      onError('Carga cancelada por el usuario.');
    },
    uploadUuid: '',
    storagePath: ''
  };

  const promise = (async () => {
    onStateChange('pending');

    // 1. Obtener Sesión de Carga del Servidor
    let sessionData;
    try {
      const initRes = await fetch('/api/upload-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          fileRole
        })
      });

      if (!initRes.ok) {
        // Manejar error 413 o errores de validación de forma robusta y en español
        let errorMsg = 'Error al iniciar la sesión de carga.';
        const contentType = initRes.headers.get('content-type') || '';
        
        if (initRes.status === 413) {
          errorMsg = 'El archivo supera el límite de tamaño permitido por el servidor.';
        } else if (contentType.includes('application/json')) {
          const resJson = await initRes.json();
          errorMsg = resJson.error || errorMsg;
        } else {
          const textErr = await initRes.text();
          errorMsg = textErr || errorMsg;
        }
        throw new Error(errorMsg);
      }

      sessionData = await initRes.json();
      uploadUuid = sessionData.uploadUuid;
      fileUuid = sessionData.fileUuid;
      storagePath = sessionData.storagePath;

      control.uploadUuid = uploadUuid;
      control.storagePath = storagePath;

      if (isCancelled) return;
    } catch (err: any) {
      console.error(err);
      onStateChange('failed');
      onError(err.message || 'Error de red al iniciar la sesión de carga.');
      return;
    }

    // 2. Ejecutar carga directa según tamaño
    const LIMIT_6MB = 6 * 1024 * 1024;
    
    // Actualizar estado de carga a 'uploading' en DB
    await updateSessionStatus(uploadUuid, 'uploading').catch(console.error);
    onStateChange('uploading');

    if (file.size <= LIMIT_6MB) {
      // --- CARGA ESTÁNDAR (<= 6 MB) ---
      try {
        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from('historical-uploads')
          .uploadToSignedUrl(storagePath, sessionData.token, file, {
            upsert: false
          });

        if (uploadError) {
          throw new Error(uploadError.message || 'Error en la subida estándar a Supabase Storage.');
        }

        if (isCancelled) return;

        // Carga completada exitosamente
        onProgress(100);
        await updateSessionStatus(uploadUuid, 'uploaded').catch(console.error);
        onStateChange('uploaded');
        onSuccess({
          uploadUuid,
          fileUuid,
          storagePath,
          fileRole: sessionData.fileRole,
          originalFilename: file.name,
          sizeBytes: file.size,
          mimeType: file.type || 'application/octet-stream'
        });

      } catch (err: any) {
        console.error(err);
        if (isCancelled) return;
        await updateSessionStatus(uploadUuid, 'failed').catch(console.error);
        onStateChange('failed');
        onError(err.message || 'Error durante la carga estándar.');
      }
    } else {
      // --- CARGA REANUDABLE TUS (> 6 MB) ---
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const projectId = supabaseUrl.replace('https://', '').split('.')[0];
        
        if (!projectId) {
          throw new Error('No se pudo identificar el Project ID de Supabase desde la URL pública.');
        }

        const endpoint = `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;

        tusUpload = new tus.Upload(file, {
          endpoint,
          chunkSize: LIMIT_6MB, // Exactamente 6 MB
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            'x-signature': sessionData.token
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true, // Borrar fingerprint local al terminar
          metadata: {
            bucketName: 'historical-uploads',
            objectName: storagePath,
            contentType: file.type || 'application/octet-stream'
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
            onProgress(percentage);
          },
          onSuccess: async () => {
            if (isCancelled) return;
            onProgress(100);
            await updateSessionStatus(uploadUuid, 'uploaded').catch(console.error);
            onStateChange('uploaded');
            onSuccess({
              uploadUuid,
              fileUuid,
              storagePath,
              fileRole: sessionData.fileRole,
              originalFilename: file.name,
              sizeBytes: file.size,
              mimeType: file.type || 'application/octet-stream'
            });
          },
          onError: async (err: any) => {
            console.error('Error de subida TUS:', err);
            if (isCancelled) return;
            // No cambiamos el estado global a failed de inmediato en caso de cortes temporales,
            // pero si la librería TUS reporta error definitivo, lo marcamos:
            await updateSessionStatus(uploadUuid, 'failed').catch(console.error);
            onStateChange('failed');
            onError(err.message || 'Error de conexión durante la carga TUS.');
          }
        });

        // Iniciar subida TUS
        tusUpload.start();

      } catch (err: any) {
        console.error(err);
        if (isCancelled) return;
        await updateSessionStatus(uploadUuid, 'failed').catch(console.error);
        onStateChange('failed');
        onError(err.message || 'Error al inicializar la carga TUS.');
      }
    }
  })();

  return Promise.resolve(control);
}

/**
 * Helper para actualizar el estado de la sesión de carga en la base de datos
 */
async function updateSessionStatus(uploadUuid: string, status: string, checksumSha256?: string) {
  try {
    const res = await fetch('/api/upload-session', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadUuid, status, checksumSha256 })
    });
    if (!res.ok) {
      console.warn(`No se pudo actualizar el estado de carga a ${status} para ${uploadUuid}`);
    }
  } catch (err) {
    console.error('Error de red al actualizar estado de sesión de carga:', err);
  }
}
