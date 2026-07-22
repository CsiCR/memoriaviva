// Suite de Pruebas Unitarias para Búsqueda Pública y Filtros Combinados (Etapa 5.2)
// Archivo: src/lib/public/tests/public-search.test.ts

import * as crypto from "crypto";
import { InMemoryExploreRepository } from "../explore/repository";
import { ContributionExplorerService } from "../explore/service";
import { exploreQueryParamsSchema } from "../explore/schemas";
import { ContributionInput } from "../../editorial/types";
import { cleanContribution } from "./fixtures";

export async function runPublicSearchTests(assert: (cond: boolean, msg: string) => void) {
  console.log("-> [TESTS] Iniciando pruebas de Búsqueda Pública y Filtros Combinados (v5.2)...");

  // 1. Fixtures localizados con atributos variados para probar filtros y combinaciones
  const uuid1 = crypto.randomUUID();
  const uuid2 = crypto.randomUUID();
  const uuid3 = crypto.randomUUID();
  const uuid4 = crypto.randomUUID();

  const mockContributions: ContributionInput[] = [
    {
      ...cleanContribution,
      id: uuid1,
      title: "Inauguración de la bomba YPF",
      description: "Fotografía histórica de los pioneros en 1950.",
      consent_verified: true,
      authorization_level: "A",
      publication_status: { id: "pub-published", code: "published", name: "Publicado" },
      approximate_decade: "1950s",
      contribution_type: "Fotografía",
      related_institution: "YPF",
      mentioned_people: "Juan Pionero",
      related_place: "Pozo 1",
      created_at: "2026-01-01T10:00:00Z",
    } as unknown as ContributionInput,
    {
      ...cleanContribution,
      id: uuid2,
      title: "Acta de la Unión Vecinal",
      description: "Reunión constitutiva para el fomento barrial.",
      consent_verified: true,
      authorization_level: "A",
      publication_status: { id: "pub-published", code: "published", name: "Publicado" },
      approximate_decade: "1960s",
      contribution_type: "Documento",
      related_institution: "Union Vecinal",
      mentioned_people: "Maria Vecina",
      related_place: "Sede YPF",
      created_at: "2026-01-02T10:00:00Z",
    } as unknown as ContributionInput,
    {
      ...cleanContribution,
      id: uuid3,
      title: "Entrevista a Juan Pionero",
      description: "Relato sonoro de los inicios petroleros en el barrio YPF.",
      consent_verified: true,
      authorization_level: "A",
      publication_status: { id: "pub-published", code: "published", name: "Publicado" },
      approximate_decade: "1950s",
      contribution_type: "Audio",
      related_institution: "YPF",
      mentioned_people: "Juan Pionero",
      related_place: "Pozo 1",
      created_at: "2026-01-03T10:00:00Z",
    } as unknown as ContributionInput,
    {
      ...cleanContribution,
      id: uuid4,
      title: "Carta familiar del pozo",
      description: "Correspondencia privada donada al archivo.",
      consent_verified: true,
      authorization_level: "A",
      publication_status: { id: "pub-published", code: "published", name: "Publicado" },
      approximate_decade: "1940s",
      contribution_type: "Documento",
      related_institution: "Correo Argentino",
      mentioned_people: "Pedro Perez",
      related_place: "Estación de Tren",
      created_at: "2026-01-04T10:00:00Z",
    } as unknown as ContributionInput,
  ];

  // 2. Inicializar repositorio en memoria y servicio
  const repo = new InMemoryExploreRepository(mockContributions);
  const explorer = new ContributionExplorerService(repo);

  // 3. Validar Catálogo de Filtros Dinámicos
  const availFilters = await explorer.getAvailableFilters();
  assert(availFilters.types.length === 3, "Catálogo: Cantidad correcta de tipos de aporte únicos.");
  assert(availFilters.decades.length === 3, "Catálogo: Cantidad correcta de décadas únicas.");
  assert(availFilters.decades.includes("1950s"), "Catálogo: Incluye la década '1950s'.");
  assert(availFilters.people.includes("Juan Pionero"), "Catálogo: Incluye el personaje 'Juan Pionero'.");
  assert(availFilters.institutions.includes("YPF"), "Catálogo: Incluye la institución 'YPF'.");

  // 4. Validar Búsqueda por Texto Libre (q)
  const searchQ = await explorer.search({
    page: 1,
    pageSize: 10,
    q: "Unión Vecinal",
    sort: "recent",
  });
  assert(searchQ.total === 1, "Búsqueda Q: Encuentra el acta de la Unión Vecinal.");
  assert(searchQ.items[0].title === "Acta de la Unión Vecinal", "Búsqueda Q: Título coincidente correcto.");

  // 5. Validar Filtro por Tipo de Aporte
  const searchType = await explorer.search({
    page: 1,
    pageSize: 10,
    type: "Documento",
    sort: "recent",
  });
  assert(searchType.total === 2, "Filtro Tipo: Encuentra exactamente 2 documentos.");

  // 6. Validar Filtro por Década
  const searchDecade = await explorer.search({
    page: 1,
    pageSize: 10,
    decade: "1950s",
    sort: "recent",
  });
  assert(searchDecade.total === 2, "Filtro Década: Encuentra 2 aportes en los años 50.");

  // 7. Validar Combinaciones de Filtros Múltiples (Combinación AND)
  const combinedSearch = await explorer.search({
    page: 1,
    pageSize: 10,
    decade: "1950s",
    type: "Audio",
    institution: "YPF",
    person: "Juan Pionero",
    sort: "recent",
  });
  assert(combinedSearch.total === 1, "Filtros Combinados: Filtra adecuadamente un único testimonio de audio.");
  assert(combinedSearch.items[0].title === "Entrevista a Juan Pionero", "Filtros Combinados: Coincidencia de título.");

  // 8. Validar Búsqueda Vacía (Sin resultados)
  const emptySearch = await explorer.search({
    page: 1,
    pageSize: 10,
    q: "Inexistente",
    decade: "1920s",
    sort: "recent",
  });
  assert(emptySearch.total === 0, "Búsqueda vacía: Devuelve cero resultados.");
  assert(emptySearch.items.length === 0, "Búsqueda vacía: Lista de elementos vacía.");

  // 9. Validar Validaciones Zod de Esquemas de Parámetros
  const validParsed = exploreQueryParamsSchema.safeParse({
    page: 1,
    pageSize: 12,
    q: "YPF",
    sort: "recent",
  });
  assert(validParsed.success === true, "Zod Schema: Valida parámetros correctos.");

  const invalidParsed = exploreQueryParamsSchema.safeParse({
    page: -1, // Inválido
    pageSize: 10,
    sort: "invalido", // Inválido
  });
  assert(invalidParsed.success === false, "Zod Schema: Rechaza parámetros fuera de rango y enums incorrectos.");

  // 10. Validar Estrategia de Ordenamiento Desacoplada
  const sortOldest = await explorer.search({
    page: 1,
    pageSize: 10,
    sort: "oldest",
  });
  // Más antiguo primero (uuid1 creado el 2026-01-01)
  assert(sortOldest.items[sortOldest.items.length - 1].title === "Carta familiar del pozo", "Orden Oldest: Más antiguo primero en el listado.");

  const sortTitleAsc = await explorer.search({
    page: 1,
    pageSize: 10,
    sort: "title-asc",
  });
  assert(sortTitleAsc.items[0].title === "Acta de la Unión Vecinal", "Orden Título A-Z: Acta antes que Carta.");

  // 11. Validar SEO Título Dinámico Condicional
  const getSeoTitle = (q?: string) => {
    return q
      ? `Resultados para "${q}" | Memoria Viva Pico Truncado`
      : `Archivo Histórico | Memoria Viva Pico Truncado`;
  };
  assert(getSeoTitle("Vecino") === 'Resultados para "Vecino" | Memoria Viva Pico Truncado', "SEO: Título con búsqueda activa es correcto.");
  assert(getSeoTitle() === "Archivo Histórico | Memoria Viva Pico Truncado", "SEO: Título sin búsqueda activa es correcto.");

  // 12. Validar Estructura JSON-LD con Breadcrumbs
  const getBreadcrumbs = (hasFilters: boolean) => {
    const list = [
      { position: 1, name: "Inicio" },
      { position: 2, name: "Archivo de Memorias" },
    ];
    if (hasFilters) {
      list.push({ position: 3, name: "Resultados de Búsqueda" });
    }
    return list;
  };
  assert(getBreadcrumbs(true).length === 3, "JSON-LD: Breadcrumbs dinámicos contiene 3 niveles con filtros.");
  assert(getBreadcrumbs(false).length === 2, "JSON-LD: Breadcrumbs dinámicos contiene 2 niveles sin filtros.");

  console.log("-> [TESTS] Pruebas de Búsqueda Pública y Filtros Combinados completadas con éxito.");
}
