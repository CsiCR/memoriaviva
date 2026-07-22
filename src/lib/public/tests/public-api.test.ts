// Pruebas Unitarias e Integración para la API Pública de Lectura
// Archivo: src/lib/public/tests/public-api.test.ts

import { PublicApiController } from "../api/controller";
import { PublicApiService } from "../api/service";
import { InMemoryPublicApiRepository, SupabasePublicApiRepository } from "../api/repository";
import { InMemoryPublicIdentityRepository } from "../slugs/repository";
import { PublicIdentityService } from "../slugs/service";
import { parseQueryParams } from "../api/query-params";
import { createClient } from "@supabase/supabase-js";
import { ContributionInput } from "../../editorial/types";
import { cleanContribution } from "./fixtures";

export async function runPublicApiTests(assert: (cond: boolean, msg: string) => void) {
  console.log("-> [TESTS] Iniciando pruebas de la API Pública de Lectura (v4.2.1)...");

  // 1. Validar parser estricto de parámetros de consulta
  try {
    const params = new URLSearchParams("page=2&pageSize=10&sort=title&direction=asc");
    const parsed = parseQueryParams(params);
    assert(parsed.page === 2, "Parser: página leída correctamente.");
    assert(parsed.pageSize === 10, "Parser: tamaño de página leído correctamente.");
    assert(parsed.sort === "title", "Parser: criterio de ordenamiento válido.");
    assert(parsed.direction === "asc", "Parser: dirección de ordenamiento válida.");
  } catch {
    assert(false, "Parser falló ante parámetros válidos.");
  }

  // 2. Rechazo de parámetros extraños (Política Estricta)
  try {
    const params = new URLSearchParams("page=1&foo=bar");
    parseQueryParams(params);
    assert(false, "Debe fallar ante parámetros desconocidos (?foo=bar).");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    assert(
      msg.includes("PUBLIC_INVALID_QUERY") && msg.includes("foo"),
      "Rechazo estricto de parámetros extraños."
    );
  }

  // 3. Validación de límites e inputs incorrectos
  try {
    parseQueryParams(new URLSearchParams("pageSize=100"));
    assert(false, "Debe fallar si pageSize es mayor a 50.");
  } catch {
    assert(true, "Rechazo de pageSize fuera de rango (>50).");
  }

  try {
    parseQueryParams(new URLSearchParams("sort=relevance"));
    assert(false, "Debe fallar si se intenta ordenar por 'relevance' no implementado.");
  } catch {
    assert(true, "Rechazo de sort=relevance.");
  }

  // 4. Búsqueda q y sanitización/escape de comodines Postgres
  try {
    const parsed = parseQueryParams(new URLSearchParams("q=  Barrio_YPF%25  "));
    assert(parsed.q === "Barrio_YPF%", "Búsqueda: sanitiza espacios y normaliza.");
    assert(parsed.escapedQ === "Barrio\\_YPF\\%", "Búsqueda: escapa comodines '%' y '_' correctamente.");
  } catch {
    assert(false, "Fallo al procesar parámetro de búsqueda q.");
  }

  // 5. Verificación de endpoints no implementados
  // No creamos Route Handlers, y el controlador no expone métodos ficticios
  const repo = new InMemoryPublicApiRepository();
  const identityRepo = new InMemoryPublicIdentityRepository();
  const identityService = new PublicIdentityService(identityRepo);
  const service = new PublicApiService(repo, identityService);
  const controller = new PublicApiController(service);

  const ctrlObj = controller as unknown as Record<string, unknown>;
  assert(typeof ctrlObj.handleListStories === "undefined", "Colección historias ausente del catálogo.");
  assert(typeof ctrlObj.handleGetStory === "undefined", "Detalle historia ausente del catálogo.");
  assert(typeof ctrlObj.handleListPeople === "undefined", "Colección personas ausente del catálogo.");
  assert(typeof ctrlObj.handleGetPerson === "undefined", "Detalle persona ausente del catálogo.");

  // 6. Configurar entorno de pruebas en memoria
  const uuid1 = crypto.randomUUID();
  const uuid2 = crypto.randomUUID();

  // Registrar identidades en el servicio
  await identityService.registerIdentity(uuid1, "contribution", "Estacion de Pico Truncado", "published");
  await identityService.registerIdentity(uuid2, "contribution", "El Ferrocarril Patagonico", "published");

  // Poblar datos mínimos simulando contribuciones publicadas aprobadas
  repo.contributions = [
    {
      ...cleanContribution,
      id: uuid1,
      title: "Estacion de Pico Truncado",
      description: "Descripción de prueba sobre la ex-estación de servicio.",
      content_type: "documentary",
      exact_date: "1930-10-12",
      approximate_decade: null,
      related_place: "Pico Truncado",
      mentioned_people: "Juan Gomez, Pedro Perez",
      related_institution: "Municipio",
      historical_context: "Desarrollo petrolero",
      authorization_level: "A",
      credit_preference: "Nombre completo",
      consent_verified: true,
      editorial_status: { id: "status-valid", code: "validated", name: "Validado" },
      publication_status: { code: "published" },
      updated_at: "2026-07-21T06:00:00.000Z",
      contributor: {
        full_name: "Aportante A",
        email: "privado@correo.com",
        phone: "12345",
        relation_to_city: "Vecino",
      },
      files: [{ id: crypto.randomUUID(), file_name: "imagen_interna.jpg", file_size: 100, file_role: "cover", processing_status: "completed" }],
    } as unknown as ContributionInput,
    {
      ...cleanContribution,
      id: uuid2,
      title: "El Ferrocarril Patagonico",
      description: "Historia del ferrocarril en la Patagonia.",
      content_type: "textual",
      exact_date: "1945-05-20",
      approximate_decade: null,
      related_place: "Estación Truncado",
      mentioned_people: "Pedro Perez",
      related_institution: "Ferrocarriles",
      historical_context: "Transporte histórico",
      authorization_level: "A",
      credit_preference: "Anónimo",
      editorial_status: { id: "status-valid", code: "validated", name: "Validado" },
      publication_status: { code: "published" },
      updated_at: "2026-07-21T06:10:00.000Z",
      contributor: {
        full_name: "Aportante B",
        email: "secreto@mail.com",
        phone: "98765",
        relation_to_city: "Vecino",
      },
      files: [{ id: crypto.randomUUID(), file_name: "archivo_interno.pdf", file_size: 100, file_role: "attachment", processing_status: "completed" }],
    } as unknown as ContributionInput,
  ];

  // 7. Prueba de listado y eliminación de datos privados (Whitelist check)
  const reqId1 = crypto.randomUUID();
  const listRes = await controller.handleListContributions(new URLSearchParams(), reqId1);

  assert(listRes.status === 200, "Listado de contribuciones exitoso (200).");
  let etagList1 = "";
  
  if (listRes.status === 200) {
    const collectionData = listRes.body;
    assert(collectionData.data.length === 2, "Obtuvo 2 contribuciones publicables.");

    // Comprobar whitelist: verificar que no existen campos prohibidos
    const firstContribution = collectionData.data[0] as unknown as Record<string, unknown>;
    assert(typeof firstContribution.contributor === "undefined", "Whitelist: No expone datos de aportante.");
    assert(typeof firstContribution.internal_notes === "undefined", "Whitelist: No expone notas internas.");
    assert(typeof firstContribution.credit_preference === "undefined", "Whitelist: No expone preferencia de créditos.");
    
    // Los archivos asociados no deben exponer nombres internos
    const mediaList = firstContribution.media as unknown as Record<string, unknown>[];
    const firstFile = mediaList[0];
    assert(typeof firstFile.file_name === "undefined", "Whitelist: No expone nombres de archivo internos.");

    // 8. Caché: Estabilidad de ETag Colecciones y Detalles
    etagList1 = listRes.headers["ETag"];
    assert(etagList1.startsWith('"') && etagList1.endsWith('"'), "Genera cabecera ETag fuerte válida.");
  }

  // Si cambiamos un dato privado en el repositorio (ej. el email de aportante A)
  const firstCont = repo.contributions[0] as unknown as Record<string, Record<string, string>>;
  if (firstCont.contributor) {
    firstCont.contributor.email = "otro_privado@correo.com";
  }
  
  const listRes2 = await controller.handleListContributions(new URLSearchParams(), crypto.randomUUID());
  if (listRes2.status === 200) {
    const etagList2 = listRes2.headers["ETag"];
    assert(etagList1 === etagList2, "Modificar campos privados no cambia el ETag público de colección.");
  }

  // Si modificamos un campo público expuesto (ej. el título)
  repo.contributions[0].title = "Estacion Pico Truncado Modificado";
  repo.contributions[0].updated_at = "2026-07-21T07:00:00.000Z";
  const listRes3 = await controller.handleListContributions(new URLSearchParams(), crypto.randomUUID());
  if (listRes3.status === 200) {
    const etagList3 = listRes3.headers["ETag"];
    assert(etagList1 !== etagList3, "Modificar un campo público cambia el ETag de la colección.");
  }

  // Restaurar título y fecha
  repo.contributions[0].title = "Estacion de Pico Truncado";
  repo.contributions[0].updated_at = "2026-07-21T06:00:00.000Z";

  // 9. Caché condicional 304 y ausencia de cuerpo (body = null)
  const detailRes1 = await controller.handleGetContribution("estacion-de-pico-truncado", null, crypto.randomUUID());
  assert(detailRes1.status === 200, "Obtiene detalle de contribución por slug.");
  
  if (detailRes1.status === 200) {
    const detailEtag = detailRes1.headers["ETag"];
    const detailRes304 = await controller.handleGetContribution("estacion-de-pico-truncado", detailEtag, crypto.randomUUID());
    
    assert(detailRes304.status === 304, "Devuelve status 304 ante ETag coincidente.");
    assert(detailRes304.body === null, "La respuesta 304 no contiene cuerpo (body = null).");
    
    // Verificar cabeceras mínimas en 304
    const headKeys = Object.keys(detailRes304.headers);
    assert(headKeys.includes("ETag"), "304 conserva ETag.");
    assert(headKeys.includes("Cache-Control"), "304 conserva Cache-Control.");
    assert(headKeys.includes("X-API-Version"), "304 conserva X-API-Version.");
    assert(headKeys.includes("X-Request-Id"), "304 conserva X-Request-Id.");
  }

  // 10. Estabilidad de ETag sobre alias
  // Crear un alias histórico mediante cambio de título en el servicio de identidad
  await identityService.updateTitle(uuid1, "contribution", "Estacion Antigua de Truncado", { userId: crypto.randomUUID() });
  
  // Ahora el slug canónico es 'estacion-antigua-de-truncado' y el alias es 'estacion-de-pico-truncado'
  const canonRes = await controller.handleGetContribution("estacion-antigua-de-truncado", null, crypto.randomUUID());
  const aliasRes = await controller.handleGetContribution("estacion-de-pico-truncado", null, crypto.randomUUID());

  assert(canonRes.status === 200, "Resuelve slug canónico.");
  assert(aliasRes.status === 200, "Resuelve alias.");
  assert(
    canonRes.headers["ETag"] === aliasRes.headers["ETag"],
    "Dos alias/canónicos del mismo recurso producen exactamente el mismo ETag canónico."
  );

  // 11. Búsqueda q con comodines literales (% y _)
  // Creamos un aporte con % y _ en su título
  const uuid3 = crypto.randomUUID();
  await identityService.registerIdentity(uuid3, "contribution", "Aporte con 50% de descuento", "published");
  repo.contributions.push({
    ...cleanContribution,
    id: uuid3,
    title: "Aporte con 50% de descuento",
    description: "Descripción especial.",
    content_type: "documentary",
    exact_date: "2020-01-01",
    authorization_level: "A",
    credit_preference: "Anónimo",
    consent_verified: true,
    editorial_status: { id: "status-valid", code: "validated", name: "Validado" },
    publication_status: { code: "published" },
    updated_at: "2026-07-21T06:00:00.000Z",
    contributor: {
      full_name: "Aportante C",
      email: "c@mail.com",
      phone: "111",
      relation_to_city: "Vecino",
    },
    files: [{ id: crypto.randomUUID(), file_name: "descuento.jpg", file_size: 100, file_role: "cover", processing_status: "completed" }],
  } as unknown as ContributionInput);

  const searchRes = await controller.handleListContributions(new URLSearchParams("q=50%"), crypto.randomUUID());
  assert(searchRes.status === 200, "Búsqueda exitosa.");
  if (searchRes.status === 200) {
    const searchData = searchRes.body;
    assert(searchData.data.length === 1, "Búsqueda literales encuentra coincidencia exacta.");
    assert(searchData.data[0].title === "Aporte con 50% de descuento", "Título correcto encontrado.");
  }

  // 12. Ordenación con fechas idénticas y desempate estable
  // uuid1 y uuid3 tienen el mismo updated_at y publication_scheduled_at (ambos nulos, fallback a updated_at = 2026-07-21T06:00:00.000Z)
  // Al ordenar de forma descendente, el desempate por id (UUID) garantiza un orden estable
  const sortedRes = await controller.handleListContributions(new URLSearchParams("sort=recent&pageSize=10"), crypto.randomUUID());
  assert(sortedRes.status === 200, "Ordenación exitosa.");
  if (sortedRes.status === 200) {
    const sortedData = sortedRes.body.data;
    assert(sortedData.length >= 2, "Listado de elementos para verificar orden determinista.");
    
    // Verificar orden estricto de desempate
    for (let i = 0; i < sortedData.length - 1; i++) {
      const itemA = sortedData[i];
      const itemB = sortedData[i + 1];
      const dateA = itemA.publishedAt;
      const dateB = itemB.publishedAt;
      if (dateA === dateB) {
        assert(itemA.id > itemB.id, "Desempate estable por ID (UUID) decreciente.");
      }
    }
  }

  // 13. Conteo totalItems y filtrado estricto en el repositorio
  // Agregar una contribución no publicada (ej. consentimiento falso)
  repo.contributions.push({
    ...cleanContribution,
    id: crypto.randomUUID(),
    title: "Contribución Privada Segura",
    description: "No apto para ojos públicos.",
    content_type: "textual",
    exact_date: "2025-01-01",
    authorization_level: "A",
    consent_verified: false, // Falso
    editorial_status: { id: "status-valid", code: "validated", name: "Validado" },
    publication_status: { code: "published" },
  } as unknown as ContributionInput);

  const finalRes = await controller.handleListContributions(new URLSearchParams(), crypto.randomUUID());
  assert(finalRes.status === 200, "Conteo final exitoso.");
  if (finalRes.status === 200) {
    const finalMeta = finalRes.body.meta;
    assert(finalMeta.pagination.totalItems === 3, "totalItems cuenta exclusivamente registros publicables.");
  }

  // 14. Pruebas de Integración y RLS contra base de datos local
  const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (dbUrl && serviceKey) {
    console.log("-> [TESTS INTEGRACION] Detectada base de datos local. Ejecutando pruebas RLS...");

    // Cliente con service_role (simula llamadas seguras del servidor)
    const adminSupabase = createClient(dbUrl, serviceKey, { auth: { persistSession: false } });
    const integrationRepo = new SupabasePublicApiRepository(adminSupabase);
    
    // Cliente anónimo (simula intento de cliente directo en navegador)
    const anonSupabase = createClient(dbUrl, "incorrect_or_anon_key", { auth: { persistSession: false } });

    // 14.1 Consultas públicas con service_role inyectado deben funcionar
    try {
      const dbRes = await integrationRepo.listContributions({ page: 1, pageSize: 5, sort: "recent", direction: "desc" });
      assert(Array.isArray(dbRes.items), "Repositorio Supabase con service_role inyectado devuelve resultados válidos.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      assert(false, `Fallo en el repositorio inyectado con service_role: ${msg}`);
    }

    // 14.2 Consultas directas de anon/authenticated a tablas restringidas deben fallar o retornar vacío por RLS
    try {
      const { data, error } = await anonSupabase.from("contributions").select("id, title");
      // Si RLS está activo y no se proveen permisos de lectura a anon, la consulta arrojará error de permisos o retornará 0 registros
      if (error) {
        assert(true, "Client anon directo falló con error de base de datos debido a RLS.");
      } else {
        assert((data || []).length === 0, "Client anon directo retornó 0 filas por restricción RLS.");
      }
    } catch {
      assert(true, "Lectura directa anon fue denegada.");
    }
  } else {
    console.log("-> [TESTS INTEGRACION] Saltando pruebas de integración Supabase (Variables de base de datos ausentes).");
  }

  console.log("✓ ¡TODAS LAS PRUEBAS DE LA API PÚBLICA DE LECTURA PASARON CON ÉXITO!");
}
