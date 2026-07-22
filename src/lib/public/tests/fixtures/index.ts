// Fixtures de Prueba para Contratos Públicos
// Archivo: src/lib/public/tests/fixtures/index.ts

import { ContributionInput } from "../../../editorial/types";

/**
 * Aporte limpio y perfectamente elegible para publicación.
 */
export const cleanContribution = {
  id: "44444444-4444-4444-8444-444444444444",
  title: "Recuerdos del Ferrocarril Patagónico",
  description: "Relato detallado sobre el funcionamiento del tren en Pico Truncado durante la década de 1950.",
  content_type: "textual",
  editorial_status: { id: "status-valid", code: "validated", name: "Validado" },
  publication_status: { id: "pub-published", code: "published", name: "Publicado" },
  consent_verified: true,
  authorization_level: "A",
  credit_preference: "Nombre completo",
  consent_source: "web_form",
  catalog_code: "MV-TXT-2026-0044",
  contributor: {
    full_name: "Edith Gómez",
    email: "edith@example.com",
    phone: "+542971234567",
    relation_to_city: "Vecino pionero",
  },
  files: [
    {
      id: "55555555-5555-4555-8555-555555555555",
      file_name: "locomotora.jpg",
      file_size: 1024 * 1024 * 2, // 2MB
      file_role: "gallery",
      processing_status: "completed",
    },
  ],
  active_indicators: [],
  historical_validation_status: "validated",
} as unknown as ContributionInput;

/**
 * Aporte con datos deliberadamente peligrosos y sensibles.
 * Si estos datos se filtran, la prueba de seguridad fallará.
 */
export const unsafeContribution = {
  id: "99999999-9999-4999-8999-999999999999",
  title: "Material Confidencial de YPF",
  description: "Descripción de prueba sobre la ex-estación de servicio.",
  internal_notes: "ESTE APORTE TIENE OBSERVACIONES EDITORIALES PRIVADAS.",
  content_type: "documentary",
  editorial_status: { id: "status-valid", code: "validated", name: "Validado" },
  publication_status: { id: "pub-published", code: "published", name: "Publicado" },
  consent_verified: true,
  authorization_level: "public_with_credit",
  credit_preference: "Iniciales",
  consent_source: "signed_paper",
  consent_reference: "MV-DOC-2026-9999",
  consent_file_path: "historical-uploads/contributions/999/consentimiento.pdf", // Ruta privada
  catalog_code: "MV-DOC-2026-9999",
  contributor: {
    full_name: "Juan Carlos Pérez",
    email: "juan.carlos.perez.privado@gmail.com", // Email privado
    phone: "+54-297-555-1234",                     // Teléfono privado
    relation_to_city: "Ex trabajador YPF",
    neighborhood_or_institution: "Archivo YPF Truncado",
  },
  files: [
    {
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      file_name: "plano_estacion_dni_copia.pdf", // Nombre sensible
      file_size: 1024 * 1024 * 5,
      file_role: "attachment",
      processing_status: "completed",
    },
    {
      id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
      file_name: "autorizacion_firmada.pdf",
      file_size: 1024 * 512,
      file_role: "consent_document", // Documento legal (debe excluirse de media)
      processing_status: "completed",
    },
  ],
  active_indicators: [],
} as unknown as ContributionInput;

/**
 * Aporte no elegible por falta de consentimiento verificado.
 */
export const contributionNoConsent = {
  ...cleanContribution,
  id: "11111111-1111-4111-8111-111111111111",
  consent_verified: false,
} as unknown as ContributionInput;

/**
 * Aporte no elegible por nivel de autorización restringido (nivel D).
 */
export const contributionRestrictedAuth = {
  ...cleanContribution,
  id: "22222222-2222-4222-8222-222222222222",
  authorization_level: "D",
} as unknown as ContributionInput;

/**
 * Aporte no elegible por estado editorial inicial "Recibido".
 */
export const contributionReceivedState = {
  ...cleanContribution,
  id: "33333333-3333-4333-8333-333333333333",
  editorial_status: { id: "received", code: "received", name: "Recibido" },
} as unknown as ContributionInput;

/**
 * Aporte no elegible porque su estado de publicación no es visible ("not_evaluated" o similar).
 */
export const contributionNotPublishedState = {
  ...cleanContribution,
  id: "55555555-5555-4555-8555-555555555556",
  publication_status: { id: "not-evaluated", code: "not_evaluated", name: "No evaluado" },
} as unknown as ContributionInput;

/**
 * Aporte con archivos pero uno de ellos falló o fue eliminado, y otro fue revocado (tiene rol de consentimiento).
 */
export const contributionWithRevokedFiles = {
  ...cleanContribution,
  id: "66666666-6666-4666-8666-666666666666",
  files: [
    {
      id: "77777777-7777-4777-8777-777777777777",
      file_name: "foto_valida.jpg",
      file_size: 1024 * 1024,
      file_role: "gallery",
      processing_status: "completed",
    },
    {
      id: "88888888-8888-4888-8888-888888888888",
      file_name: "foto_corrupta.png",
      file_size: 100,
      file_role: "gallery",
      processing_status: "failed", // Fallido (revocado/inseguro)
    },
    {
      id: "12345678-1234-4321-8321-123456789012",
      file_name: "formulario_consentimiento.pdf",
      file_size: 1024 * 200,
      file_role: "consent_document", // Legal (excluido)
      processing_status: "completed",
    },
  ],
} as unknown as ContributionInput;
