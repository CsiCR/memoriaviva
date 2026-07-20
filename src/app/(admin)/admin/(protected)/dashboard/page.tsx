/* eslint-disable @typescript-eslint/no-explicit-any */
// Página del Servidor para el Dashboard de Gestión Editorial
// Archivo: src/app/(admin)/admin/(protected)/dashboard/page.tsx

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import DashboardView from '@/components/DashboardView';
import { EvaluatedContribution } from '@/lib/editorial/dashboard/dashboardTypes';
import { mapContributionToProgressInput } from '@/lib/editorial/progress/mapContributionToProgressInput';
import { evaluateEditorialProgress } from '@/lib/editorial/progress/evaluateEditorialProgress';
import { evaluateContribution } from '@/lib/editorial/evaluateContribution';
import { mapStatusToCode, mapContributionTypeToContentType } from '@/lib/editorial/editorialConstants';

export const revalidate = 0; // Evitar cache para reportes en tiempo real

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Obtener la sesión del usuario administrador
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/admin/login');
  }

  // 2. Obtener el perfil para corroborar permisos
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!profile || !['admin', 'editor', 'validator'].includes(profile.role)) {
    redirect('/admin?error=unauthorized');
  }

  // 3. Consultar aportes, archivos, consentimientos e indicadores en Supabase
  const { data: contributions, error: contribError } = await supabase
    .from('contributions')
    .select(`
      *,
      contributors(*),
      contribution_editorial_indicators(
        *,
        opt: select_options(*)
      ),
      consent_records(*),
      contribution_files(*)
    `);

  if (contribError) {
    console.error("Error cargando aportes para dashboard:", contribError);
  }

  // 4. Consultar opciones de estado de publicación
  const { data: pubStatusOptions } = await supabase
    .from('select_options')
    .select('*')
    .eq('category', 'publication_status');

  // 5. Evaluar cada aporte una única vez por ciclo de agregación
  const evaluatedContributions: EvaluatedContribution[] = (contributions || []).map((c: any) => {
    const pubStatusOpt = pubStatusOptions?.find((opt: any) => opt.id === c.publication_status_option_id);
    
    // Extraer indicadores activos
    const activeIndicators = (c.contribution_editorial_indicators || [])
      .filter((ind: any) => ind.is_active)
      .map((ind: any) => ({
        indicator_option_id: ind.indicator_option_id,
        is_active: true,
        opt: ind.opt
      }));

    // Entrada del progreso
    const progressInput = mapContributionToProgressInput(c, pubStatusOpt, activeIndicators);

    // Entrada del motor editorial
    const mappedContentType = mapContributionTypeToContentType(c.contribution_type);
    const eligibilityInput = {
      id: c.id,
      title: c.title || null,
      description: c.description || null,
      internal_notes: c.internal_notes || null,
      content_type: mappedContentType,
      editorial_status: {
        id: null,
        code: mapStatusToCode(c.editorial_status),
        name: c.editorial_status
      },
      publication_status: {
        id: c.publication_status_option_id || null,
        code: pubStatusOpt?.code || null,
        name: pubStatusOpt?.name || null
      },
      publication_notes: c.publication_notes || null,
      publication_scheduled_at: c.publication_scheduled_at || null,
      consent_verified: !!c.consent_verified,
      authorization_level: c.authorization_level || null,
      credit_preference: c.credit_preference || null,
      consent_source: c.consent_source || null,
      files: (c.contribution_files || []).map((f: any) => ({
        id: f.id,
        file_name: f.file_name || '',
        file_size: f.file_size || 0,
        file_role: f.file_role || null,
        processing_status: f.processing_status || null
      })),
      consent_records: (c.consent_records || []).map((rec: any) => ({
        accepted_at: rec.accepted_at || null,
        authorization_level: rec.authorization_level || null
      })),
      active_indicators: (c.contribution_editorial_indicators || [])
        .filter((ind: any) => ind.is_active)
        .map((ind: any) => ({
          id: ind.opt?.id || '',
          category: ind.opt?.category || '',
          value: ind.opt?.value || '',
          name: ind.opt?.name || '',
          code: ind.opt?.code || null,
          metadata: ind.opt?.metadata || null
        }))
    };

    const eligibilityResult = evaluateContribution(eligibilityInput);
    const progressResult = evaluateEditorialProgress(progressInput);

    return {
      id: c.id,
      title: c.title || null,
      description: c.description || null,
      contentType: progressInput.contentType || null,
      receivedAt: c.created_at || null,
      updatedAt: c.updated_at || null,
      publishedAt: c.published_at || null,
      editorialStatus: c.editorial_status || null,
      publicationStatus: pubStatusOpt?.code || null,
      authorizationLevel: c.authorization_level || null,
      hasEditorialIntervention: progressInput.hasEditorialIntervention || false,
      progressResult,
      eligibilityResult,
      activeIndicators: (progressInput.indicators || []).map(ind => ({
        code: ind.code,
        severity: ind.severity || "info"
      })),
      historicalValidationStatus: progressInput.historicalValidation?.statusCode || "pending"
    };
  });

  return (
    <DashboardView evaluatedContributions={evaluatedContributions} />
  );
}
