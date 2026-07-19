// Mensajes del Motor Editorial
// Archivo: src/lib/editorial/editorialMessages.ts

export const editorialMessages = {
  // Consentimiento
  consent_pending: "Debe completarse el consentimiento.",
  consent_verified: "Consentimiento verificado y documentado.",
  
  // Autorización
  auth_not_public: "El nivel de autorización no permite publicación pública.",
  auth_compatible: "Nivel de autorización compatible con divulgación pública.",

  // Archivos
  files_missing_textual: "Sin archivos digitales asociados (Aporte textual).",
  files_missing_media: "Faltan los archivos digitales obligatorios para este tipo de aporte.",
  files_failed: "Uno o más archivos adjuntos tienen fallos en el procesamiento técnico.",
  content_type_missing: "Debe definirse el tipo de aporte para determinar si requiere archivos.",

  // Validación histórica
  historical_validation_pending: "Debe completarse la validación histórica del testimonio.",
  historical_validation_success: "Validación histórica completada con evidencia positiva.",

  // Publicación
  published_with_active_blocks: "El aporte está publicado, pero presenta condiciones que actualmente bloquean su publicación.",

  // Recomendaciones y Resúmenes
  summary_eligible: "El aporte cumple con todos los requisitos editoriales y legales para ser publicado.",
  summary_blocked: "El aporte requiere atención y correcciones antes de ser elegible para publicación.",
  summary_received: "Aporte en estado inicial de recepción. Pendiente de evaluación editorial y firma.",
  
  // Próximas acciones recomendadas
  action_review_critical: "Revisar urgentemente la publicación crítica (aporte publicado con bloqueos activos).",
  action_complete_consent: "Solicitar y cargar el formulario de consentimiento firmado.",
  action_resolve_authorization: "Rectificar el nivel de autorización legal para permitir la difusión pública.",
  action_retrieve_material: "Solicitar y cargar los archivos originales del aporte.",
  action_advance_editorial: "Avanzar en el procesamiento y validación histórica del testimonio.",
  action_resolve_indicators: "Resolver y desmarcar los indicadores críticos activos.",
  action_evaluate_publication: "Evaluar y establecer la programación de la fecha de publicación.",
  action_none: "Ninguna acción pendiente requerida. El aporte está listo."
};
