'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, X, Shield, FileText, User, Printer, ArrowLeft, AlertCircle, Check, ChevronRight, ChevronLeft, Play, Pause, RotateCcw } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { getBuenosAiresYear, createBuenosAiresDate } from '@/utils/date';
import { uploadFileToStorage } from '@/utils/supabase/upload';

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'mp3', 'wav', 'm4a', 'mp4', 'mov'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function AdminAportesNuevo() {
  const router = useRouter();
  
  // Referencias para file inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const consentInputRef = useRef<HTMLInputElement>(null);
  const newAgreementFileRef = useRef<HTMLInputElement>(null);

  // Referencias para Auto-Focus del primer elemento del paso
  const step1FirstInputRef = useRef<HTMLSelectElement>(null);
  const step2FirstInputRef = useRef<HTMLInputElement>(null);
  const step3FirstInputRef = useRef<HTMLSelectElement>(null);

  // Control del Wizard
  const [currentStep, setCurrentStep] = useState(1);

  // Estados del Formulario
  const [formData, setFormData] = useState({
    // Consentimiento Administrativo
    consent_source: 'signed_paper', // signed_paper | institutional_agreement | web_form
    consent_reference: '',
    institutional_agreement_id: '', // UUID or 'new'
    new_agreement_name: '',
    new_agreement_institution: '',

    // Aportante
    dni: '',
    full_name: '',
    phone: '',
    email: '',
    relation_to_city: 'Vecino actual',
    neighborhood_or_institution: '',
    comments: '',
    allow_contact: true,

    // Aporte
    title: '',
    contribution_type: '',
    description: '',
    knows_exact_date: false,
    exact_date: '',
    approximate_decade: '',
    related_place: '',
    mentioned_people: '',
    related_institution: '',
    historical_context: '',

    // Consentimiento
    authorization_level: 'A',
    credit_preference: 'Nombre completo',
  });

  const [files, setFiles] = useState<File[]>([]);
  const [fileRoles, setFileRoles] = useState<string[]>([]);
  const [uploadStates, setUploadStates] = useState<{
    id: string;
    fileName: string;
    progress: number;
    status: 'pending' | 'uploading' | 'uploaded' | 'failed' | 'paused';
    control?: any;
    uploadUuid?: string;
    fileUuid?: string;
    storagePath?: string;
    error?: string;
    fileRole: 'original' | 'restored' | 'derivative' | 'legal_support';
  }[]>([]);
  const [consentFile, setConsentFile] = useState<File | null>(null);
  const [newAgreementFile, setNewAgreementFile] = useState<File | null>(null);
  const [agreements, setAgreements] = useState<any[]>([]);

  // Signatura calculada de forma dinámica en cliente
  const [suggestedCatalogCode, setSuggestedCatalogCode] = useState('');

  // Texto editable sugerido de convenio para Caso 3 (Nuevo)
  const [agreementText, setAgreementText] = useState('');

  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [newAgreementFileError, setNewAgreementFileError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Opciones dinámicas de la base de datos
  const [dbOptions, setDbOptions] = useState<Record<string, { value: string; label: string; code?: string }[]>>({
    contribution_type: [],
    relation_to_city: [],
    authorization_level: [],
    credit_preference: []
  });

  // Cargar opciones dinámicas al montar
  useEffect(() => {
    const loadDbOptions = async () => {
      try {
        const res = await fetch('/api/select-options');
        if (res.ok) {
          const data = await res.json();
          setDbOptions({
            contribution_type: data.contribution_type || [],
            relation_to_city: data.relation_to_city || [],
            authorization_level: data.authorization_level || [],
            credit_preference: data.credit_preference || []
          });
        }
      } catch (err) {
        console.error('Error al cargar opciones dinámicas:', err);
      }
    };
    loadDbOptions();
  }, []);
  
  // Estado para advertir si el código de formulario de papel está duplicado (ej. por fotocopia)
  const [duplicateRefWarning, setDuplicateRefWarning] = useState<string | null>(null);

  // Efecto con Debounce para verificar códigos de formulario duplicados
  useEffect(() => {
    if (!formData.consent_reference || formData.consent_reference.trim() === '') {
      setDuplicateRefWarning(null);
      return;
    }

    const checkDuplicateReference = async () => {
      try {
        const supabase = createClient();
        const { count, error } = await supabase
          .from('contributions')
          .select('*', { count: 'exact', head: true })
          .eq('consent_reference', formData.consent_reference.trim());

        if (!error && count && count > 0) {
          setDuplicateRefWarning(
            `⚠️ Este código de formulario ya está registrado en ${count} aporte${count > 1 ? 's' : ''}. Si fotocopiaste la planilla, ten en cuenta que se compartirá el identificador físico.`
          );
        } else {
          setDuplicateRefWarning(null);
        }
      } catch (err) {
        console.error(err);
      }
    };

    const timer = setTimeout(() => {
      checkDuplicateReference();
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.consent_reference]);

  // Cargar convenios al montar
  useEffect(() => {
    const fetchAgreements = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('institutional_agreements')
          .select('id, name, institution')
          .order('name');
        
        if (!error && data) {
          setAgreements(data);
        }
      } catch (err) {
        console.error('Error al cargar convenios:', err);
      }
    };
    fetchAgreements();
  }, []);

  // Calcular la signatura/código de catálogo sugerido dinámicamente cuando cambia el tipo
  useEffect(() => {
    if (!formData.contribution_type) {
      setSuggestedCatalogCode('');
      return;
    }

    const fetchNextCode = async () => {
      try {
        const supabase = createClient();
        const yearVal = getBuenosAiresYear();
        const startOfYear = createBuenosAiresDate(yearVal, 0, 1, 0, 0, 0, 0);
        const endOfYear = createBuenosAiresDate(yearVal + 1, 0, 1, 0, 0, 0, 0);
        const { count } = await supabase
          .from('contributions')
          .select('*', { count: 'exact', head: true })
          .eq('contribution_type', formData.contribution_type)
          .gte('created_at', startOfYear.toISOString())
          .lt('created_at', endOfYear.toISOString());

        const selectedTypeOpt = dbOptions.contribution_type.find(o => o.value === formData.contribution_type);
        const typeCode = selectedTypeOpt?.code || 'GEN';
        const nextNum = (count || 0) + 1;
        const code = `MV-${typeCode}-${yearVal}-${String(nextNum).padStart(4, '0')}`;
        setSuggestedCatalogCode(code);
      } catch (err) {
        console.error('Error al calcular signatura temporal:', err);
      }
    };

    fetchNextCode();
  }, [formData.contribution_type]);

  // Sincronizar convenio sugerido cuando cambian los datos
  useEffect(() => {
    if (formData.new_agreement_name && formData.new_agreement_institution) {
      setAgreementText(`CONVENIO DE CESIÓN Y COLABORACIÓN PATRIMONIAL

Por la presente, entre el ARCHIVO HISTÓRICO COMUNITARIO "MEMORIA VIVA PICO TRUNCADO" de la ciudad de Pico Truncado, y por la otra parte la institución cooperadora "${formData.new_agreement_institution}", acuerdan formalizar el convenio de resguardo y acceso documental bajo la denominación "${formData.new_agreement_name}":

PRIMERA: La institución cede copias digitalizadas de sus fondos documentales y piezas de valor patrimonial histórico local para su catalogación, indexación y preservación a largo plazo en la plataforma "Memoria Viva Pico Truncado".

SEGUNDA: Las partes acuerdan que el acceso a estos materiales estará regido por la autorización de uso establecida en sus fichas (Nivel A: Público General, Nivel B: Fines Pedagógicos/Escolares, Nivel C: Consulta Interna en Archivo). El archivo se compromete a atribuir los créditos de origen de forma destacada.

TERCERA: La institución declara tener la titularidad o autorización de las piezas cedidas, eximiendo a "Memoria Viva Pico Truncado" de cualquier reclamo por propiedad intelectual de terceros.

En prueba de conformidad, se firman dos ejemplares del mismo tenor en la ciudad de Pico Truncado, a los ___ días de ___________ de 202___.


_______________________________               _______________________________
   Por la Institución Firmante                   Por el Archivo Memoria Viva Pico Truncado
Nombre/Cargo:                                 Firma/Aclaración
DNI/Representación:
`);
    }
  }, [formData.new_agreement_name, formData.new_agreement_institution]);

  // Auto-llenar la institución en Paso 3 a partir de los datos ingresados en Paso 1
  useEffect(() => {
    if (formData.consent_source === 'institutional_agreement' && formData.full_name) {
      setFormData(prev => ({
        ...prev,
        new_agreement_institution: prev.full_name
      }));
    }
  }, [formData.full_name, formData.consent_source]);

  // Efecto para enfocar el primer elemento del paso actual
  useEffect(() => {
    if (currentStep === 1) {
      step1FirstInputRef.current?.focus();
    } else if (currentStep === 2) {
      step2FirstInputRef.current?.focus();
    } else if (currentStep === 3) {
      step3FirstInputRef.current?.focus();
    }
  }, [currentStep]);

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    const newErrors: string[] = [];
    const validFiles: File[] = [];

    selectedFiles.forEach((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        newErrors.push(`El archivo "${file.name}" no está permitido. Formatos válidos: ${ALLOWED_EXTENSIONS.join(', ')}.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        newErrors.push(`El archivo "${file.name}" supera el límite de 50 MB.`);
        return;
      }
      validFiles.push(file);
    });

    setFileErrors(newErrors);
    setFiles((prev) => [...prev, ...validFiles]);
    setFileRoles((prev) => [...prev, ...validFiles.map(() => 'original')]);
  };

  const handleConsentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    if (!['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(extension)) {
      setConsentError('Formato inválido (solo imágenes JPG, PNG, WEBP o documentos PDF).');
      setConsentFile(null);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setConsentError('El archivo supera los 50 MB.');
      setConsentFile(null);
      return;
    }

    setConsentError(null);
    setConsentFile(file);
  };

  const handleNewAgreementFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    if (extension !== 'pdf') {
      setNewAgreementFileError('El archivo del convenio institucional debe ser obligatoriamente un PDF.');
      setNewAgreementFile(null);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setNewAgreementFileError('El archivo supera los 50 MB.');
      setNewAgreementFile(null);
      return;
    }

    setNewAgreementFileError(null);
    setNewAgreementFile(file);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileRoles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeConsentFile = () => {
    setConsentFile(null);
    if (consentInputRef.current) consentInputRef.current.value = '';
  };

  const removeNewAgreementFile = () => {
    setNewAgreementFile(null);
    if (newAgreementFileRef.current) newAgreementFileRef.current.value = '';
  };

  const printConsentForm = () => {
    if (!formData.full_name || !formData.dni) {
      alert('Por favor, ingresa el Nombre y el DNI del aportante en el Paso 1 para poder pre-rellenar la planilla.');
      return;
    }
    const url = `/admin/print?name=${encodeURIComponent(formData.full_name)}&dni=${encodeURIComponent(formData.dni)}&title=${encodeURIComponent(formData.title || '')}&code=${encodeURIComponent(suggestedCatalogCode)}`;
    window.open(url, '_blank');
  };

  const printAgreementTemplate = (text: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${suggestedCatalogCode || 'MV-PENDIENTE'} - Convenio de Cesión - Memoria Viva Pico Truncado</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              padding: 2.5rem;
              line-height: 1.6;
              color: #000;
              font-size: 11pt;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #000000;
              padding-bottom: 0.75rem;
              margin-bottom: 1.5rem;
            }
            .header-left {
              display: flex;
              align-items: center;
              gap: 0.75rem;
            }
            .header-title {
              font-size: 14pt;
              margin: 0;
              font-weight: bold;
              font-family: sans-serif;
            }
            .header-subtitle {
              font-size: 8.5pt;
              color: #555555;
              font-family: sans-serif;
            }
            .header-right {
              text-align: right;
              font-size: 8.5pt;
              color: #555555;
              font-family: sans-serif;
            }
            .content {
              white-space: pre-wrap;
              text-align: justify;
              margin-top: 1.5rem;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <img src="/icon-192.png" alt="Logo" style="height: 50px; width: auto;" />
              <div>
                <h1 class="header-title">Memoria Viva Pico Truncado</h1>
                <span class="header-subtitle">Archivo Histórico Comunitario de Pico Truncado</span>
              </div>
            </div>
            <div class="header-right">
              <div>Convenio de Cesión y Colaboración</div>
              <strong style="font-size: 10pt; color: #000; font-family: monospace;">${suggestedCatalogCode || 'MV-PENDIENTE'}</strong>
            </div>
          </div>
          <div class="content">${text.replace(/\n/g, '<br>')}</div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Validaciones del Wizard
  const validateStep1 = () => {
    if (formData.consent_source !== 'institutional_agreement') {
      return !!(formData.dni && formData.full_name && formData.relation_to_city && formData.neighborhood_or_institution);
    }
    // En caso 3, requerimos el nombre de la institución como identificador de aportante
    return !!(formData.full_name); 
  };

  const validateStep2 = () => {
    const basicValid = !!(formData.title && formData.contribution_type && formData.description && formData.related_place);
    if (!basicValid) return false;

    // Si no es Testimonio escrito, requiere al menos un archivo histórico
    if (formData.contribution_type !== 'Testimonio escrito' && files.length === 0) {
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    setErrorMsg(null);
    if (currentStep === 1) {
      if (!validateStep1()) {
        setErrorMsg('Faltan completar campos obligatorios (*) en la identificación del aportante.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateStep2()) {
        setErrorMsg(
          formData.contribution_type !== 'Testimonio escrito' && files.length === 0
            ? 'Debes adjuntar al menos un archivo histórico (*) para guardar esta contribución.'
            : 'Faltan completar campos obligatorios (*) en el detalle del material.'
        );
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Si no está en el paso final, no procesar el submit real, sino avanzar de paso
    if (currentStep < 3) {
      handleNextStep();
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    setUploadProgress('Guardando todo en el sistema...');

    if (formData.consent_source === 'signed_paper' && !consentFile) {
      setErrorMsg('Debes subir el archivo firmado de la planilla de consentimiento.');
      setLoading(false);
      return;
    }

    if (formData.consent_source === 'institutional_agreement') {
      if (!formData.institutional_agreement_id) {
        setErrorMsg('Debes vincular o registrar un convenio colectivo de respaldo.');
        setLoading(false);
        return;
      }
      if (formData.institutional_agreement_id === 'new') {
        if (!formData.new_agreement_name || !formData.new_agreement_institution) {
          setErrorMsg('Faltan completar los datos del nuevo convenio (Nombre e Institución).');
          setLoading(false);
          return;
        }
      }
    }

    try {
      const activeStates: any[] = [];

      // 1. Preparar lista de archivos a cargar
      const filesToUpload: { id: string; file: File; fileRole: string }[] = [];
      
      files.forEach((file, i) => {
        filesToUpload.push({
          id: `historical_file_${i}`,
          file,
          fileRole: fileRoles[i] || 'original'
        });
      });

      if (formData.consent_source === 'signed_paper' && consentFile) {
        filesToUpload.push({
          id: 'consent_file',
          file: consentFile,
          fileRole: 'legal_support'
        });
      }

      if (formData.consent_source === 'institutional_agreement' && formData.institutional_agreement_id === 'new' && newAgreementFile) {
        filesToUpload.push({
          id: 'agreement_file',
          file: newAgreementFile,
          fileRole: 'legal_support'
        });
      }

      // Inicializar estado de carga en el frontend
      const initialStates = filesToUpload.map((item) => {
        const existing = uploadStates.find((s) => s.id === item.id);
        if (existing && existing.status === 'uploaded') {
          return existing;
        }
        return {
          id: item.id,
          fileName: item.file.name,
          progress: 0,
          status: 'pending' as const,
          fileRole: item.fileRole as any
        };
      });

      setUploadStates(initialStates);

      // 2. Realizar las subidas secuencialmente
      const uploadedMetas: Record<string, { uploadUuid: string; storagePath: string }> = {};

      for (let i = 0; i < filesToUpload.length; i++) {
        const item = filesToUpload[i];
        const existingState = initialStates[i];

        if (existingState && existingState.status === 'uploaded' && existingState.uploadUuid) {
          uploadedMetas[item.id] = {
            uploadUuid: existingState.uploadUuid,
            storagePath: existingState.storagePath || ''
          };
          continue;
        }

        setUploadProgress(`Subiendo archivo ${i + 1} de ${filesToUpload.length}: ${item.file.name}...`);

        const uploadResult = await new Promise<{ uploadUuid: string; storagePath: string }>((resolve, reject) => {
          uploadFileToStorage(item.file, {
            fileRole: item.fileRole as any,
            onProgress: (progress) => {
              setUploadStates((prev) => {
                const next = [...prev];
                const idx = next.findIndex((s) => s.id === item.id);
                if (idx !== -1) next[idx] = { ...next[idx], progress };
                return next;
              });
            },
            onStateChange: (statusState) => {
              setUploadStates((prev) => {
                const next = [...prev];
                const idx = next.findIndex((s) => s.id === item.id);
                if (idx !== -1) next[idx] = { ...next[idx], status: statusState };
                return next;
              });
            },
            onSuccess: (res) => {
              setUploadStates((prev) => {
                const next = [...prev];
                const idx = next.findIndex((s) => s.id === item.id);
                if (idx !== -1) {
                  next[idx] = {
                    ...next[idx],
                    status: 'uploaded',
                    uploadUuid: res.uploadUuid,
                    fileUuid: res.fileUuid,
                    storagePath: res.storagePath
                  };
                }
                return next;
              });
              resolve({ uploadUuid: res.uploadUuid, storagePath: res.storagePath });
            },
            onError: (err) => {
              setUploadStates((prev) => {
                const next = [...prev];
                const idx = next.findIndex((s) => s.id === item.id);
                if (idx !== -1) next[idx] = { ...next[idx], status: 'failed', error: err };
                return next;
              });
              reject(new Error(err));
            }
          }).then((ctrl) => {
            setUploadStates((prev) => {
              const next = [...prev];
              const idx = next.findIndex((s) => s.id === item.id);
              if (idx !== -1) next[idx] = { ...next[idx], control: ctrl };
              return next;
            });
          }).catch((err) => {
            reject(err);
          });
        });

        uploadedMetas[item.id] = uploadResult;
      }

      // 3. Registrar el aporte final con metadatos JSON
      setUploadProgress('Guardando registro del aporte administrativo...');

      // Compilar lista de archivos históricos cargados
      const historicalFilesPayload = files.map((_, i) => {
        const meta = uploadedMetas[`historical_file_${i}`];
        return {
          upload_uuid: meta?.uploadUuid,
          file_role: fileRoles[i] || 'original'
        };
      });

      const payload = {
        contributor: {
          dni: formData.dni,
          full_name: formData.full_name,
          phone: formData.phone,
          email: formData.email,
          relation_to_city: formData.relation_to_city,
          neighborhood_or_institution: formData.neighborhood_or_institution,
          comments: formData.comments,
          allow_contact: formData.allow_contact
        },
        contribution: {
          title: formData.title,
          contribution_type: formData.contribution_type,
          description: formData.description,
          exact_date: formData.exact_date,
          approximate_decade: formData.approximate_decade,
          related_place: formData.related_place,
          mentioned_people: formData.mentioned_people,
          related_institution: formData.related_institution,
          historical_context: formData.historical_context,
          authorization_level: formData.authorization_level,
          credit_preference: formData.credit_preference,
          consent_source: formData.consent_source,
          consent_reference: formData.consent_reference
        },
        consent: {
          owns_or_has_permission: true,
          accepts_cataloging: true,
          consent_text_version: `Carga Administrativa - Caso: ${formData.consent_source}`
        },
        files: historicalFilesPayload,
        consent_upload_uuid: uploadedMetas['consent_file']?.uploadUuid || null,
        agreement_upload_uuid: uploadedMetas['agreement_file']?.uploadUuid || null,
        institutional_agreement_id: formData.institutional_agreement_id,
        new_agreement_name: formData.new_agreement_name,
        new_agreement_institution: formData.new_agreement_institution
      };

      const response = await fetch('/api/admin/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let errorMessage = 'Ocurrió un error al procesar la carga administrativa.';
      const contentType = response.headers.get('content-type') || '';

      if (response.ok) {
        router.push('/admin/aportes');
        router.refresh();
      } else {
        if (contentType.includes('application/json')) {
          const rJson = await response.json();
          errorMessage = rJson.error || errorMessage;
        } else {
          const textError = await response.text();
          errorMessage = textError || `Error del servidor (código ${response.status})`;
        }
        throw new Error(errorMessage);
      }

      router.push('/admin/aportes');
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* Botón Volver */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/admin/aportes" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', height: '36px', padding: '0 0.75rem' }}>
          <ArrowLeft size={16} /> Volver a Aportes
        </Link>
      </div>

      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem', color: '#0f172a' }}>Cargar Aporte Administrativo</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
          Ingresar material histórico digitalizado directamente al catálogo del archivo. Los campos marcados con asterisco (<strong>*</strong>) son obligatorios.
        </p>
      </div>

      {/* Stepper del Wizard */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem', position: 'relative', padding: '0 1rem' }}>
        <div style={{ position: 'absolute', top: '16px', left: '2rem', right: '2rem', height: '3px', backgroundColor: '#e2e8f0', zIndex: 0 }}></div>
        <div style={{ position: 'absolute', top: '16px', left: '2rem', width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%', height: '3px', backgroundColor: 'var(--primary-blue)', transition: 'width 0.3s ease', zIndex: 0 }}></div>

        {/* Paso 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, cursor: 'pointer' }} onClick={() => currentStep > 1 && handlePrevStep()}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: currentStep >= 1 ? 'var(--primary-blue)' : '#ffffff', color: currentStep >= 1 ? '#ffffff' : '#64748b', border: currentStep >= 1 ? '2px solid var(--primary-blue)' : '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', transition: 'all 0.3s ease' }}>
            {currentStep > 1 ? '✓' : '1'}
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: currentStep === 1 ? 600 : 500, color: currentStep === 1 ? 'var(--primary-blue)' : '#64748b', marginTop: '0.5rem' }}>Aportante y Origen</span>
        </div>

        {/* Paso 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, cursor: 'pointer' }} onClick={() => currentStep > 2 && setCurrentStep(2)}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: currentStep >= 2 ? 'var(--primary-blue)' : '#ffffff', color: currentStep >= 2 ? '#ffffff' : '#64748b', border: currentStep >= 2 ? '2px solid var(--primary-blue)' : '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', transition: 'all 0.3s ease' }}>
            {currentStep > 2 ? '✓' : '2'}
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: currentStep === 2 ? 600 : 500, color: currentStep === 2 ? 'var(--primary-blue)' : '#64748b', marginTop: '0.5rem' }}>Detalle del Material</span>
        </div>

        {/* Paso 3 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: currentStep === 3 ? 'var(--primary-blue)' : '#ffffff', color: currentStep === 3 ? '#ffffff' : '#64748b', border: currentStep === 3 ? '2px solid var(--primary-blue)' : '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', transition: 'all 0.3s ease' }}>
            3
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: currentStep === 3 ? 600 : 500, color: currentStep === 3 ? 'var(--primary-blue)' : '#64748b', marginTop: '0.5rem' }}>Firmas y Consentimiento</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* ========================================================================= */}
        {/* WIZARD STEP 1: DATOS DEL APORTANTE / ORIGEN */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-warm)', paddingBottom: '0.5rem' }}>
              <User size={20} style={{ color: 'var(--primary-blue)' }} /> Paso 1: Identificación de Ingesta y Caso Legal
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              💡 Nota: Selecciona el origen del material. Los aportes colectivos de instituciones no requieren filiaciones personales en este paso.
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label form-label-required">Origen y Respaldo Legal (Caso)*</label>
              <select
                name="consent_source"
                ref={step1FirstInputRef}
                required
                className="form-select"
                value={formData.consent_source}
                onChange={(e) => {
                  handleInputChange(e);
                  setErrorMsg(null);
                }}
                disabled={loading}
                style={{ height: '42px' }}
              >
                <option value="signed_paper">Caso 2: Planilla Firmada en Papel (Impresa y Digitalizada)</option>
                <option value="institutional_agreement">Caso 3: Convenio de Respaldo Institucional (Bibliotecas/Organismos)</option>
                <option value="web_form">Caso 1: Formulario Web (Carga digital retroactiva)</option>
              </select>
            </div>

            {/* CASO 1 Y 2: DATOS DEL APORTANTE (VECINO) */}
            {formData.consent_source !== 'institutional_agreement' ? (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', color: '#0f172a', fontWeight: 600 }}>Filiación del Aportante</h3>
                
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label form-label-required">DNI (Documento Nacional de Identidad)*</label>
                    <input
                      type="text"
                      name="dni"
                      required
                      className="form-input"
                      placeholder="Ej. 12345678"
                      value={formData.dni}
                      onChange={handleInputChange}
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label form-label-required">Nombre y Apellido del Aportante*</label>
                    <input
                      type="text"
                      name="full_name"
                      required
                      className="form-input"
                      placeholder="Ej. Juan Pérez"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input
                      type="text"
                      name="phone"
                      className="form-input"
                      placeholder="Ej. 2974123456"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Correo Electrónico</label>
                    <input
                      type="email"
                      name="email"
                      className="form-input"
                      placeholder="Ej. vecino@correo.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label form-label-required">Relación con Pico Truncado*</label>
                    <select
                      name="relation_to_city"
                      required
                      className="form-select"
                      value={formData.relation_to_city}
                      onChange={handleInputChange}
                      disabled={loading}
                      style={{ height: '40px' }}
                    >
                      <option value="">Seleccione una opción...</option>
                      {dbOptions.relation_to_city.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label form-label-required">Barrio / Institución*</label>
                    <input
                      type="text"
                      name="neighborhood_or_institution"
                      required
                      className="form-input"
                      placeholder="Ej. Barrio Centro / Club Social"
                      value={formData.neighborhood_or_institution}
                      onChange={handleInputChange}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Observaciones Biográficas del Aportante</label>
                  <textarea
                    name="comments"
                    className="form-textarea"
                    placeholder="Detalles sobre la familia del aportante, año de llegada a la localidad o anécdotas personales de vida..."
                    value={formData.comments}
                    onChange={handleInputChange}
                    disabled={loading}
                    style={{ minHeight: '80px' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="allow_contact"
                      checked={formData.allow_contact}
                      onChange={handleInputChange}
                      disabled={loading}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span>Permitir contacto del equipo editorial para futuras entrevistas</span>
                  </label>
                </div>
              </div>
            ) : (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', color: '#0f172a', fontWeight: 600 }}>Datos de la Institución Colaboradora</h3>
                
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label form-label-required">Nombre de la Institución / Entidad Aportante*</label>
                  <input
                    type="text"
                    name="full_name"
                    required
                    className="form-input"
                    placeholder="Ej. Biblioteca Municipal Pico Truncado"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-2" style={{ marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Teléfono de Contacto</label>
                    <input
                      type="text"
                      name="phone"
                      className="form-input"
                      placeholder="Ej. 2974123456"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Correo Electrónico de Contacto</label>
                    <input
                      type="email"
                      name="email"
                      className="form-input"
                      placeholder="Ej. contacto@biblioteca.gob.ar"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Observaciones o Notas de Coordinación (Opcional)</label>
                  <textarea
                    name="comments"
                    className="form-textarea"
                    placeholder="Ej. Convenio gestionado con la directora Ana Gómez. Pendiente de ratificación de firmas por mesa de entrada..."
                    value={formData.comments}
                    onChange={handleInputChange}
                    disabled={loading}
                    style={{ minHeight: '80px' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* WIZARD STEP 2: DETALLES DEL MATERIAL */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-warm)', paddingBottom: '0.5rem' }}>
              <FileText size={20} style={{ color: 'var(--primary-blue)' }} /> Paso 2: Detalles del Material Histórico
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              💡 Nota: Todos los campos marcados con asterisco (<strong>*</strong>) son requeridos. El Código de Catálogo temporal asignado es: <strong style={{ color: 'var(--primary-blue)', fontFamily: 'monospace' }}>{suggestedCatalogCode || '(Seleccione un tipo)'}</strong>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label form-label-required">Título / Identificación del Recuerdo*</label>
                <input
                  type="text"
                  name="title"
                  ref={step2FirstInputRef}
                  required
                  className="form-input"
                  placeholder="Ej. Escuela Primaria Nº 14 - Grupo escolar de alumnos"
                  value={formData.title}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">Tipo de Material*</label>
                <select
                  name="contribution_type"
                  required
                  className="form-select"
                  value={formData.contribution_type}
                  onChange={(e) => {
                    handleInputChange(e);
                    setErrorMsg(null);
                  }}
                  disabled={loading}
                  style={{ height: '40px' }}
                >
                  <option value="">-- Seleccione un tipo --</option>
                  {dbOptions.contribution_type.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label form-label-required">Descripción del Material (Catalogación básica)*</label>
              <textarea
                name="description"
                required
                className="form-textarea"
                placeholder="Describe quiénes aparecen, de qué trata el material, el contexto, etc. Ayuda al equipo de catalogación."
                value={formData.description}
                onChange={handleInputChange}
                disabled={loading}
                style={{ minHeight: '90px' }}
              />
            </div>

            <div className="grid grid-2">
              {/* Opción de Fecha Exacta o Década */}
              <div className="form-group">
                <label className="form-label">¿Conoce la fecha exacta?</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', height: '40px', alignItems: 'center' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={formData.knows_exact_date}
                      onChange={() => setFormData(prev => ({ ...prev, knows_exact_date: true, approximate_decade: '' }))}
                      disabled={loading}
                    /> Sí (Fecha exacta)
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={!formData.knows_exact_date}
                      onChange={() => setFormData(prev => ({ ...prev, knows_exact_date: false, exact_date: '' }))}
                      disabled={loading}
                    /> No (Década aproximada)
                  </label>
                </div>
              </div>

              {formData.knows_exact_date ? (
                <div className="form-group">
                  <label className="form-label">Fecha del Material</label>
                  <input
                    type="date"
                    name="exact_date"
                    className="form-input"
                    value={formData.exact_date}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Década aproximada</label>
                  <select
                    name="approximate_decade"
                    className="form-select"
                    value={formData.approximate_decade}
                    onChange={handleInputChange}
                    disabled={loading}
                    style={{ height: '40px' }}
                  >
                    <option value="">-- Selecciona década --</option>
                    <option value="1920s">Década de 1920</option>
                    <option value="1930s">Década de 1930</option>
                    <option value="1940s">Década de 1940</option>
                    <option value="1950s">Década de 1950</option>
                    <option value="1960s">Década de 1960</option>
                    <option value="1970s">Década de 1970</option>
                    <option value="1980s">Década de 1980</option>
                    <option value="1990s">Década de 1990</option>
                    <option value="2000s">Década de 2000</option>
                    <option value="2010s">Década de 2010</option>
                    <option value="2020s">Década de 2020</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label form-label-required">Lugar del recuerdo / Relación geográfica*</label>
                <input
                  type="text"
                  name="related_place"
                  required
                  className="form-input"
                  placeholder="Ej. Estación de trenes / Plaza San Martín"
                  value={formData.related_place}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Personas mencionadas o retratadas</label>
                <input
                  type="text"
                  name="mentioned_people"
                  className="form-input"
                  placeholder="Ej. Vecinos de la familia Gómez, pioneros..."
                  value={formData.mentioned_people}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Relato, Testimonio de vida o Contexto histórico</label>
              <textarea
                name="historical_context"
                className="form-textarea"
                placeholder="Escribe aquí relatos de vida, transcripciones de entrevistas o anécdotas completas que acompañen a este aporte..."
                value={formData.historical_context}
                onChange={handleInputChange}
                disabled={loading}
                style={{ minHeight: '120px' }}
              />
            </div>

            {/* SECCIÓN DE SUBIDA DE ARCHIVOS (Solo obligatoria si NO es Testimonio Escrito) */}
            {formData.contribution_type !== 'Testimonio escrito' && (
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <label className="form-label form-label-required" style={{ fontWeight: 600, display: 'block', marginBottom: '0.75rem' }}>
                  Archivos del Material Histórico Digitalizado*
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', height: '42px', justifyContent: 'center', width: 'fit-content' }}
                    disabled={loading}
                  >
                    <Upload size={18} /> Seleccionar archivos digitales (Fotos, PDF, Audio, Video)
                  </button>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Tipos permitidos: JPG, PNG, WEBP, PDF, DOC, DOCX, MP3, WAV, M4A, MP4, MOV. Límite: 50 MB por archivo.
                  </span>
                </div>

                {fileErrors.length > 0 && (
                  <div style={{ color: 'var(--danger-color)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    {fileErrors.map((e, idx) => <div key={idx}>• {e}</div>)}
                  </div>
                )}

                {/* Lista de Archivos Seleccionados */}
                {files.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginTop: '1rem' }}>
                    {files.map((file, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '0.5rem 1rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                            📄 {file.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                          </span>
                          <select
                            value={fileRoles[idx] || 'original'}
                            onChange={(e) => {
                              const newRoles = [...fileRoles];
                              newRoles[idx] = e.target.value;
                              setFileRoles(newRoles);
                            }}
                            className="form-select"
                            style={{ height: '30px', padding: '0 0.5rem', fontSize: '0.75rem', width: '160px', margin: 0 }}
                            disabled={loading}
                          >
                            <option value="original">Original</option>
                            <option value="restored">Versión restaurada</option>
                            <option value="derivative">Derivado</option>
                            <option value="legal_support">Respaldo legal</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          style={{ background: 'none', border: 'none', color: 'var(--neutral-grey)', cursor: 'pointer' }}
                          disabled={loading}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* WIZARD STEP 3: CONSENTIMIENTO Y ARCHIVOS LEGALES */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-warm)', paddingBottom: '0.5rem' }}>
              <Shield size={20} style={{ color: 'var(--primary-blue)' }} /> Paso 3: Condiciones Legales y Respaldos Firmados
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              💡 Nota: Completa los parámetros de cesión y vincula el soporte legal firmado correspondiente.
            </div>

            {/* Impresión de Planilla A4 (Solo Caso 2) */}
            {formData.consent_source === 'signed_paper' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', backgroundColor: 'var(--primary-blue-light)', padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--primary-blue-light)' }}>
                <div style={{ flexGrow: 1 }}>
                  <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Planilla de Consentimiento Pre-rellenada</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Genera el documento A4 oficial con la signatura <strong style={{ fontFamily: 'monospace' }}>{suggestedCatalogCode}</strong> pre-rellenada.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={printConsentForm}
                  className="btn btn-outline"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', height: '40px', padding: '0 1rem' }}
                  disabled={loading}
                >
                  <Printer size={16} /> Imprimir Planilla A4
                </button>
              </div>
            )}

            {/* Selección y Registro del Convenio (Caso 3) (Movido a Paso 3 para contar con la signatura resuelta) */}
            {formData.consent_source === 'institutional_agreement' && (
              <div style={{ marginBottom: '1.5rem', padding: '1.5rem', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={18} style={{ color: 'var(--primary-blue)' }} /> Vincular o Generar Convenio Colectivo
                </h3>
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label form-label-required">Convenio Colectivo / Institucional*</label>
                  <select
                    name="institutional_agreement_id"
                    ref={step3FirstInputRef}
                    required
                    className="form-select"
                    value={formData.institutional_agreement_id}
                    onChange={(e) => {
                      handleInputChange(e);
                      setErrorMsg(null);
                    }}
                    disabled={loading}
                    style={{ height: '40px' }}
                  >
                    <option value="">-- Seleccione un convenio --</option>
                    {agreements.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.institution})</option>
                    ))}
                    <option value="new">+ Registrar un nuevo convenio de respaldo...</option>
                  </select>
                </div>

                {/* Sub-panel para Registrar un Nuevo Convenio */}
                {formData.institutional_agreement_id === 'new' && (
                  <div style={{ padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-blue)' }}>Registrar Nuevo Convenio Institucional</h4>
                    
                    <div className="grid grid-2">
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label form-label-required">Nombre del Convenio*</label>
                        <input
                          type="text"
                          name="new_agreement_name"
                          required
                          className="form-input"
                          placeholder="Ej. Convenio Marco Biblioteca Municipal - Res 123/26"
                          value={formData.new_agreement_name}
                          onChange={handleInputChange}
                          disabled={loading}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label form-label-required">Institución Firmante*</label>
                        <input
                          type="text"
                          name="new_agreement_institution"
                          required
                          className="form-input"
                          placeholder="Ej. Biblioteca Municipal"
                          value={formData.new_agreement_institution}
                          onChange={handleInputChange}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    {/* Convenio sugerido pre-cargado y editable */}
                    {formData.new_agreement_name && formData.new_agreement_institution && (
                      <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '1rem', marginTop: '0.5rem' }}>
                        <label className="form-label" style={{ fontWeight: 600 }}>📝 Borrador del Convenio Sugerido (Editable con la Institución):</label>
                        <textarea
                          value={agreementText}
                          onChange={(e) => setAgreementText(e.target.value)}
                          className="form-textarea"
                          style={{ minHeight: '220px', fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 1.4, backgroundColor: '#f8fafc' }}
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => printAgreementTemplate(agreementText)}
                          className="btn btn-outline"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', height: '36px', marginTop: '0.75rem' }}
                          disabled={loading}
                        >
                          <Printer size={15} /> Imprimir Convenio para Firmar
                        </button>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', marginBottom: 0 }}>
                          💡 Genera el contrato formal con la signatura sugerida <strong style={{ fontFamily: 'monospace' }}>{suggestedCatalogCode}</strong> pre-rellenada.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-2" style={{ marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label form-label-required">Nivel de autorización acordado*</label>
                <select
                  name="authorization_level"
                  required
                  className="form-select"
                  value={formData.authorization_level}
                  onChange={handleInputChange}
                  disabled={loading}
                  style={{ height: '40px' }}
                >
                  <option value="">Seleccione un nivel...</option>
                  {dbOptions.authorization_level.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label form-label-required">Preferencia de créditos acordada*</label>
                <select
                  name="credit_preference"
                  required
                  className="form-select"
                  value={formData.credit_preference}
                  onChange={handleInputChange}
                  disabled={loading}
                  style={{ height: '40px' }}
                >
                  <option value="">Seleccione una preferencia...</option>
                  {dbOptions.credit_preference.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* SECCIÓN UNIFICADA DE ARCHIVO FIRMADO JUNTADO AL COMBO (Fila 2) */}
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              
              {/* Caso 2: Planilla Firmada */}
              {formData.consent_source === 'signed_paper' && (
                <div className="grid grid-2" style={{ gap: '1.5rem', alignItems: 'center' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label form-label-required" style={{ fontWeight: 600 }}>
                      Subir Foto/PDF de Planilla Firmada*
                    </label>
                    {!consentFile ? (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <input
                          type="file"
                          ref={consentInputRef}
                          onChange={handleConsentFileChange}
                          accept="image/*,application/pdf"
                          style={{ display: 'none' }}
                        />
                        <button
                          type="button"
                          onClick={() => consentInputRef.current?.click()}
                          className="btn btn-outline"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', height: '40px', justifyContent: 'center' }}
                          disabled={loading}
                        >
                          <Upload size={16} /> Seleccionar Planilla Firmada
                        </button>
                        {consentError && <div style={{ color: 'var(--danger-color)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{consentError}</div>}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', height: '40px' }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                          📄 {consentFile.name}
                        </span>
                        <button
                          type="button"
                          onClick={removeConsentFile}
                          style={{ background: 'none', border: 'none', color: 'var(--neutral-grey)', cursor: 'pointer' }}
                          disabled={loading}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Código de Referencia / Formulario Físico (Opcional)
                    </label>
                    <input
                      type="text"
                      name="consent_reference"
                      className="form-input"
                      placeholder="Ej. MV-FORM-00045"
                      value={formData.consent_reference}
                      onChange={handleInputChange}
                      disabled={loading}
                      style={{ height: '40px', borderColor: duplicateRefWarning ? '#b45309' : 'var(--border-color)' }}
                    />
                    {duplicateRefWarning && (
                      <div style={{ color: '#b45309', fontSize: '0.75rem', marginTop: '0.35rem', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '0.4rem 0.6rem', borderRadius: '4px', lineHeight: 1.3 }}>
                        {duplicateRefWarning}
                      </div>
                    )}
                    <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                      💡 Si utilizaste una planilla impresa con QR, ingresa el código aquí. Si la dejas en blanco, se usará la signatura sugerida <strong>{suggestedCatalogCode}</strong>.
                    </span>
                  </div>
                </div>
              )}

              {/* Caso 3: Convenio Nuevo - Subida obligatoria de convenio PDF firmado */}
              {formData.consent_source === 'institutional_agreement' && formData.institutional_agreement_id === 'new' && (
                <div className="grid grid-2" style={{ gap: '1.5rem', alignItems: 'center' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Subir PDF de Convenio Firmado (Opcional)
                    </label>
                    {!newAgreementFile ? (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <input
                          type="file"
                          ref={newAgreementFileRef}
                          onChange={handleNewAgreementFileChange}
                          accept="application/pdf"
                          style={{ display: 'none' }}
                        />
                        <button
                          type="button"
                          onClick={() => newAgreementFileRef.current?.click()}
                          className="btn btn-outline"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', height: '40px', justifyContent: 'center' }}
                          disabled={loading}
                        >
                          <Upload size={16} /> Seleccionar PDF Firmado
                        </button>
                        {newAgreementFileError && <div style={{ color: 'var(--danger-color)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{newAgreementFileError}</div>}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', height: '40px' }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                          📄 {newAgreementFile.name}
                        </span>
                        <button
                          type="button"
                          onClick={removeNewAgreementFile}
                          style={{ background: 'none', border: 'none', color: 'var(--neutral-grey)', cursor: 'pointer' }}
                          disabled={loading}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#64748b', padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Shield size={18} style={{ color: 'var(--primary-blue)', flexShrink: 0 }} />
                    <span>Opcional. Sube el PDF firmado. Si está en revisión por la institución, puedes guardarlo en blanco y subirlo luego en la ficha del aporte.</span>
                  </div>
                </div>
              )}

              {/* Caso 3: Convenio Existente - Explicar vinculación sin requerir archivo */}
              {formData.consent_source === 'institutional_agreement' && formData.institutional_agreement_id && formData.institutional_agreement_id !== 'new' && (
                <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ color: '#15803d', fontWeight: 'bold', fontSize: '1.25rem' }}>✓</div>
                  <div>
                    <strong style={{ color: '#166534', display: 'block', fontSize: '0.9rem' }}>Convenio Institucional Vinculado</strong>
                    <span style={{ fontSize: '0.8rem', color: '#14532d' }}>
                      Este material hereda automáticamente el respaldo legal del convenio existente. No es necesario subir un nuevo documento físico.
                    </span>
                  </div>
                </div>
              )}

              {/* Caso 1: Web Form */}
              {formData.consent_source === 'web_form' && (
                <div style={{ padding: '1rem 1.5rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Shield size={20} style={{ color: 'var(--primary-blue)' }} />
                  <div>
                    <strong style={{ color: '#1e40af', display: 'block', fontSize: '0.9rem' }}>Autorización Web</strong>
                    <span style={{ fontSize: '0.8rem', color: '#1e3a8a' }}>
                      El consentimiento fue otorgado de forma electrónica mediante los términos y condiciones de la plataforma en línea. No requiere carga de respaldo físico.
                    </span>
                  </div>
                </div>
              )}

            </div>

            {/* Visualizador de Carga de Archivos (Paso 3) */}
            {uploadStates.length > 0 && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.75rem' }}>
                  Progreso de Carga de Archivos en Sistema:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {uploadStates.map((state, idx) => {
                    let fileObj: File | null = null;
                    if (state.id.startsWith('historical_file_')) {
                      const fileIdx = parseInt(state.id.replace('historical_file_', ''), 10);
                      fileObj = files[fileIdx];
                    } else if (state.id === 'consent_file') {
                      fileObj = consentFile;
                    } else if (state.id === 'agreement_file') {
                      fileObj = newAgreementFile;
                    }
                    
                    const isTus = fileObj && fileObj.size > 6 * 1024 * 1024;
                    const roleLabels: Record<string, string> = {
                      original: 'Original',
                      restored: 'Versión restaurada',
                      derivative: 'Derivado',
                      legal_support: 'Respaldo legal'
                    };

                    return (
                      <div 
                        key={state.id} 
                        style={{
                          padding: '0.75rem',
                          backgroundColor: '#f8fafc',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                            📄 {state.fileName} <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.72rem' }}>({roleLabels[state.fileRole] || 'Original'})</span>
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: state.status === 'uploaded' ? 'var(--success-color)' : state.status === 'failed' ? 'var(--danger-color)' : 'var(--text-secondary)' }}>
                            {state.status === 'pending' && 'Pendiente'}
                            {state.status === 'uploading' && `Cargando... ${state.progress}%`}
                            {state.status === 'paused' && `Pausado... ${state.progress}%`}
                            {state.status === 'uploaded' && 'Completado ✓'}
                            {state.status === 'failed' && 'Error ✗'}
                          </span>
                        </div>

                        {/* Barra de progreso */}
                        <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${state.progress}%`, 
                              height: '100%', 
                              backgroundColor: state.status === 'uploaded' ? 'var(--success-color)' : state.status === 'failed' ? 'var(--danger-color)' : 'var(--primary-blue)', 
                              transition: 'width 0.3s ease' 
                            }}
                          ></div>
                        </div>

                        {/* Botones de control para TUS / Errores */}
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {isTus && state.status === 'uploading' && (
                            <button
                              type="button"
                              onClick={() => state.control?.pause()}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.7rem', backgroundColor: '#ffffff', cursor: 'pointer' }}
                            >
                              <Pause size={12} /> Pausar
                            </button>
                          )}
                          {isTus && state.status === 'paused' && (
                            <button
                              type="button"
                              onClick={() => state.control?.resume()}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.7rem', backgroundColor: '#ffffff', cursor: 'pointer' }}
                            >
                              <Play size={12} /> Reanudar
                            </button>
                          )}
                          {(state.status === 'uploading' || state.status === 'paused') && (
                            <button
                              type="button"
                              onClick={() => state.control?.cancel()}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', border: '1px solid #fecaca', borderRadius: '4px', fontSize: '0.7rem', backgroundColor: '#fef2f2', color: 'var(--danger-color)', cursor: 'pointer' }}
                            >
                              <X size={12} /> Cancelar
                            </button>
                          )}
                          {state.status === 'failed' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--danger-color)', wordBreak: 'break-all' }}>
                                {state.error || 'Error de carga.'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadStates((prev) => {
                                    const next = [...prev];
                                    const idx = next.findIndex((s) => s.id === state.id);
                                    if (idx !== -1) {
                                      next[idx] = { ...next[idx], status: 'pending', progress: 0, error: undefined };
                                    }
                                    return next;
                                  });
                                  const mockEvent = { preventDefault: () => {} } as any;
                                  handleSubmit(mockEvent);
                                }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.7rem', backgroundColor: '#ffffff', cursor: 'pointer' }}
                              >
                                <RotateCcw size={12} /> Reintentar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* BOTONES DE CONTROL DE PASOS */}
        {/* ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          
          {/* Mensaje de Error (Movido aquí, más cerca del botón de acción) */}
          {errorMsg && (
            <div className="alert alert-danger" style={{ margin: 0, padding: '0.75rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="btn btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', height: '40px', padding: '0 1rem' }}
                disabled={loading}
              >
                <ChevronLeft size={16} /> Atrás
              </button>
            )}
            
            {currentStep === 1 && (
              <Link href="/admin/aportes" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', height: '40px', padding: '0 1.25rem' }}>
                Cancelar
              </Link>
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', height: '40px', padding: '0 1.25rem' }}
                disabled={loading}
              >
                Siguiente <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', height: '40px', padding: '0 1.5rem' }}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', marginRight: '0.25rem' }}></span>
                    {uploadProgress}
                  </>
                ) : (
                  <>
                    <Check size={18} /> Guardar Aporte en Sistema
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </form>
    </div>
  );
}
