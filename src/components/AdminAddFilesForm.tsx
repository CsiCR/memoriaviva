'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { uploadFileToStorage } from '@/utils/supabase/upload';
import { Upload, X, Check, Loader2, AlertCircle } from 'lucide-react';

interface Notice {
  id: string;
  original_filename: string;
  size_bytes: number;
  status: string;
}

interface AdminAddFilesFormProps {
  contributionId: string;
  pendingNotices: Notice[];
}

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'mp3', 'wav', 'm4a', 'mp4', 'mov'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function AdminAddFilesForm({ contributionId, pendingNotices }: AdminAddFilesFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [fileRoles, setFileRoles] = useState<string[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [uploadStates, setUploadStates] = useState<{
    id: string;
    fileName: string;
    progress: number;
    status: 'pending' | 'uploading' | 'uploaded' | 'failed' | 'paused';
    control?: any;
    uploadUuid?: string;
    storagePath?: string;
    fileRole: 'original' | 'restored' | 'derivative' | 'legal_support';
    error?: string;
  }[]>([]);

  // Avisos pendientes seleccionados para resolver
  const [resolvedNoticeIds, setResolvedNoticeIds] = useState<string[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    const newErrors: string[] = [];
    const validFiles: File[] = [];

    selectedFiles.forEach((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        newErrors.push(`El archivo "${file.name}" no está permitido.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        newErrors.push(`El archivo "${file.name}" supera el límite de 50 MB.`);
        return;
      }
      validFiles.push(file);
    });

    setFileErrors(newErrors);
    
    // Configurar estados iniciales
    const nextFiles = [...files, ...validFiles];
    setFiles(nextFiles);
    
    const nextRoles = [...fileRoles, ...validFiles.map(() => 'original')];
    setFileRoles(nextRoles);

    const initialUploadStates = validFiles.map((file, idx) => ({
      id: `${Date.now()}-${idx}-${Math.random()}`,
      fileName: file.name,
      progress: 0,
      status: 'pending' as const,
      fileRole: 'original' as const
    }));
    setUploadStates((prev) => [...prev, ...initialUploadStates]);
  };

  const removeFile = (idx: number) => {
    // Si se está subiendo, abortar
    const state = uploadStates[idx];
    if (state && state.control && typeof state.control.abort === 'function') {
      try {
        state.control.abort();
      } catch (err) {
        console.error('Error aborting upload:', err);
      }
    }

    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setFileRoles((prev) => prev.filter((_, i) => i !== idx));
    setUploadStates((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleNotice = (noticeId: string) => {
    setResolvedNoticeIds((prev) =>
      prev.includes(noticeId)
        ? prev.filter((id) => id !== noticeId)
        : [...prev, noticeId]
    );
  };

  const handleLinkAndSave = async () => {
    setGlobalError(null);
    setSaving(true);
    setSuccess(false);

    try {
      // 1. Validar que tengamos archivos seleccionados o avisos a resolver
      if (files.length === 0 && resolvedNoticeIds.length === 0) {
        throw new Error('Selecciona al menos un archivo para subir o marca un aviso de archivo grande para resolver.');
      }

      const activeStates = [...uploadStates];
      const filesToLink = [];

      // 2. Subir los archivos que aún no estén en estado 'uploaded'
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const state = activeStates[i];
        const selectedRole = fileRoles[i] || 'original';

        if (state && state.status === 'uploaded' && state.uploadUuid) {
          filesToLink.push({
            upload_uuid: state.uploadUuid,
            storage_path: state.storagePath,
            original_filename: file.name,
            file_role: selectedRole
          });
          continue;
        }

        setUploadStates((prev) => {
          const next = [...prev];
          next[i] = { ...next[i], status: 'uploading' };
          return next;
        });

        const uploadResult = await new Promise<{ uploadUuid: string; storagePath: string }>((resolve, reject) => {
          uploadFileToStorage(file, {
            fileRole: selectedRole as 'original' | 'restored' | 'derivative' | 'legal_support',
            onProgress: (progress) => {
              setUploadStates((prev) => {
                const next = [...prev];
                next[i] = { ...next[i], progress };
                return next;
              });
            },
            onStateChange: (statusState) => {
              setUploadStates((prev) => {
                const next = [...prev];
                next[i] = { ...next[i], status: statusState };
                return next;
              });
            },
            onSuccess: (res) => {
              setUploadStates((prev) => {
                const next = [...prev];
                next[i] = {
                  ...next[i],
                  status: 'uploaded',
                  uploadUuid: res.uploadUuid,
                  storagePath: res.storagePath
                };
                return next;
              });
              resolve({ uploadUuid: res.uploadUuid, storagePath: res.storagePath });
            },
            onError: (err) => {
              setUploadStates((prev) => {
                const next = [...prev];
                next[i] = { ...next[i], status: 'failed', error: err };
                return next;
              });
              reject(new Error(err));
            }
          }).then((ctrl) => {
            setUploadStates((prev) => {
              const next = [...prev];
              next[i] = { ...next[i], control: ctrl };
              return next;
            });
          }).catch((err) => {
            reject(err);
          });
        });

        filesToLink.push({
          upload_uuid: uploadResult.uploadUuid,
          storage_path: uploadResult.storagePath,
          original_filename: file.name,
          file_role: selectedRole
        });
      }

      // 3. Ejecutar la RPC link_files_to_contribution en base de datos
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'link_files_to_contribution',
        {
          p_contribution_id: contributionId,
          p_files: filesToLink,
          p_resolved_notice_ids: resolvedNoticeIds
        }
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      setSuccess(true);
      setFiles([]);
      setFileRoles([]);
      setUploadStates([]);
      setResolvedNoticeIds([]);
      
      // Refrescar los datos del Server Component
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setGlobalError(err.message || 'Ocurrió un error al vincular los archivos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ padding: '2rem', marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-warm)', paddingBottom: '0.5rem' }}>
        <Upload size={20} style={{ color: 'var(--primary-blue)' }} /> Agregar Archivos a este Aporte
      </h2>

      {globalError && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          padding: '1rem',
          borderRadius: '6px',
          fontSize: '0.85rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={16} />
          <span>{globalError}</span>
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
          padding: '1rem',
          borderRadius: '6px',
          fontSize: '0.85rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Check size={16} />
          <span>Archivos subidos y vinculados con éxito. Se actualizaron los avisos pendientes.</span>
        </div>
      )}

      {/* Selector de Archivos */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          multiple 
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-outline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', height: '40px' }}
          disabled={saving}
        >
          <Upload size={16} /> Seleccionar archivos locales
        </button>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.5rem' }}>
          Formatos permitidos: JPG, PNG, WEBP, PDF, DOC, DOCX, MP3, WAV, M4A, MP4, MOV. Límite: 50 MB por archivo.
        </span>
      </div>

      {fileErrors.length > 0 && (
        <div style={{ color: 'var(--danger-color)', fontSize: '0.8rem', marginBottom: '1rem' }}>
          {fileErrors.map((err, i) => <div key={i}>• {err}</div>)}
        </div>
      )}

      {/* Lista de archivos a subir */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Archivos a vincular ({files.length}):
          </span>
          {files.map((file, idx) => {
            const state = uploadStates[idx];
            const isUploading = state?.status === 'uploading';
            
            return (
              <div key={idx} style={{
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '0.75rem 1rem',
                backgroundColor: '#f8fafc',
                fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: 550, color: '#0f172a' }}>📄 {file.name}</span>{' '}
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <select
                      value={fileRoles[idx] || 'original'}
                      onChange={(e) => {
                        const nextRoles = [...fileRoles];
                        nextRoles[idx] = e.target.value;
                        setFileRoles(nextRoles);
                      }}
                      className="form-select"
                      style={{ height: '28px', padding: '0 0.4rem', fontSize: '0.75rem', margin: 0, width: '150px' }}
                      disabled={saving || isUploading}
                    >
                      <option value="original">Original</option>
                      <option value="restored">Versión restaurada</option>
                      <option value="derivative">Copia optimizada para acceso</option>
                      <option value="legal_support">Respaldo legal</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      style={{ background: 'none', border: 'none', color: 'var(--neutral-grey)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      disabled={saving}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Barra de progreso */}
                {state && (state.status === 'uploading' || state.progress > 0) && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                      <span>Subiendo...</span>
                      <span>{state.progress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${state.progress}%`, height: '100%', backgroundColor: 'var(--primary-blue)', transition: 'width 0.1s ease-out' }}></div>
                    </div>
                  </div>
                )}

                {state?.status === 'uploaded' && (
                  <div style={{ marginTop: '0.35rem', color: '#166534', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 550 }}>
                    <Check size={12} /> Archivo listo para vincular
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Selección de avisos pendientes a resolver */}
      {pendingNotices.length > 0 && (
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          padding: '1.25rem',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#b45309', display: 'block', marginBottom: '0.5rem' }}>
            Asociar carga con avisos pendientes (Opcional):
          </span>
          <p style={{ fontSize: '0.78rem', color: '#78350f', margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
            Selecciona qué avisos de archivos grandes se resolverán de forma efectiva al confirmar la subida de estos nuevos archivos.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {pendingNotices.map((notice) => (
              <label 
                key={notice.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  fontSize: '0.8rem', 
                  color: '#4b5563', 
                  cursor: 'pointer',
                  backgroundColor: '#ffffff',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <input
                  type="checkbox"
                  checked={resolvedNoticeIds.includes(notice.id)}
                  onChange={() => toggleNotice(notice.id)}
                  disabled={saving}
                />
                <span>
                  <strong>{notice.original_filename}</strong> ({(notice.size_bytes / 1024 / 1024).toFixed(2)} MB)
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleLinkAndSave}
        className="btn btn-primary"
        style={{ width: '100%', height: '42px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        disabled={saving || (files.length === 0 && resolvedNoticeIds.length === 0)}
      >
        {saving ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Procesando carga y guardando...
          </>
        ) : (
          'Confirmar Subida y Actualizar Avisos'
        )}
      </button>
    </div>
  );
}
