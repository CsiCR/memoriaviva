// Suite de Pruebas Unitarias para Home Pública y Exploración (Etapa 5.1)
// Archivo: src/lib/public/tests/public-home.test.ts

import * as crypto from "crypto";
import {
  InMemoryExploreRepository,
  InMemoryStatisticsRepository,
} from "../explore/repository";
import {
  StatisticsService,
  ContributionExplorerService,
  HomeService,
  mapToCardModel,
} from "../explore/service";
import {
  generateHomeMetadata,
  generateContributionsMetadata,
  buildHomeJsonLd,
  buildContributionsJsonLd,
} from "../explore/seo";
import { paginate } from "../explore/pagination";
import { ContributionInput } from "../../editorial/types";
import { cleanContribution } from "./fixtures";
import { PublicContribution } from "../types/contribution";

export async function runPublicHomeTests(assert: (cond: boolean, msg: string) => void) {
  console.log("-> [TESTS] Iniciando pruebas de la Home Pública y Listado (v5.1)...");

  const siteUrl = "https://memoriavivapicotruncado.org";

  // 1. Crear Fixtures localizados para validar las estadísticas
  const uuid1 = crypto.randomUUID();
  const uuid2 = crypto.randomUUID();
  const uuid3 = crypto.randomUUID();

  const mockContributions: ContributionInput[] = [
    {
      ...cleanContribution,
      id: uuid1,
      title: "Foto Antigua Barrio YPF",
      description: "Retrato en la vieja bomba de agua.",
      consent_verified: true,
      authorization_level: "A",
      publication_status: { id: "pub-published", code: "published", name: "Publicado" },
      contributor_id: "contributor-1",
      contributor: {
        full_name: "Vecino Juan",
      },
      mentioned_people: "Pedro Perez, Edith Gomez",
      related_institution: "YPF, Union Vecinal",
      // Campo raw que nuestro repositorio en memoria inspecciona
      contribution_type: "Fotografía",
      files: [
        {
          id: crypto.randomUUID(),
          file_name: "foto.jpg",
          file_size: 1024,
          file_role: "cover",
          processing_status: "completed",
        },
      ],
    } as unknown as ContributionInput,
    {
      ...cleanContribution,
      id: uuid2,
      title: "Documento de Fundacion",
      description: "Acta de reunion constitutiva de 1948.",
      consent_verified: true,
      authorization_level: "A",
      publication_status: { id: "pub-published", code: "published", name: "Publicado" },
      contributor_id: "contributor-2",
      contributor: {
        full_name: "Vecina Maria",
      },
      mentioned_people: "Edith Gomez, Jose Perez",
      related_institution: "Union Vecinal",
      contribution_type: "Documento",
      files: [
        {
          id: crypto.randomUUID(),
          file_name: "acta.pdf",
          file_size: 2048,
          file_role: "gallery",
          processing_status: "completed",
        },
      ],
    } as unknown as ContributionInput,
    {
      ...cleanContribution,
      id: uuid3,
      title: "Testimonio Oral de Edith",
      description: "Entrevista sobre los primeros pozos petroleros.",
      consent_verified: true,
      authorization_level: "A",
      publication_status: { id: "pub-published", code: "published", name: "Publicado" },
      contributor_id: "contributor-1", // Mismo colaborador que el primer aporte
      contributor: {
        full_name: "Vecino Juan",
      },
      mentioned_people: "Edith Gomez",
      related_institution: "YPF",
      contribution_type: "Testimonio escrito",
      files: [],
    } as unknown as ContributionInput,
  ];

  // Inyectar propiedad 'featured' simulando destacados de prueba para el repositorio en memoria
  (mockContributions[0] as unknown as Record<string, unknown>).featured = true;

  // 2. Probar Cálculo de Estadísticas (StatisticsService)
  const statsRepo = new InMemoryStatisticsRepository(mockContributions);
  const statsService = new StatisticsService(statsRepo);
  const stats = await statsService.getStats();

  assert(stats.totalContributions === 3, "Estadísticas: Cuenta total de aportes correcta (3).");
  assert(stats.totalPhotographs === 1, "Estadísticas: Cuenta de fotografías correcta (1).");
  assert(stats.totalDocuments === 1, "Estadísticas: Cuenta de documentos correcta (1).");
  assert(stats.totalContributors === 2, "Estadísticas: Cuenta de colaboradores únicos correcta (2).");
  // Personas únicas mencionadas: pedro perez, edith gomez, jose perez = 3
  assert(stats.totalInterviewees === 3, "Estadísticas: Cuenta de personas mencionadas/entrevistados correcta (3).");
  // Instituciones únicas mencionadas: ypf, union vecinal = 2
  assert(stats.totalInstitutions === 2, "Estadísticas: Cuenta de instituciones únicas correcta (2).");

  // 3. Probar Paginación SSR
  const mockArray = Array.from({ length: 25 }, (_, i) => i + 1);
  const page1 = paginate(mockArray, 1, 10);
  assert(page1.items.length === 10, "Paginador: Tamaño de página 1 correcto.");
  assert(page1.totalPages === 3, "Paginador: Total de páginas correcto (3).");
  assert(page1.hasNextPage === true, "Paginador: Tiene página siguiente.");
  assert(page1.hasPreviousPage === false, "Paginador: No tiene página anterior.");

  const page3 = paginate(mockArray, 3, 10);
  assert(page3.items.length === 5, "Paginador: Tamaño de página 3 correcto (residuo).");
  assert(page3.hasNextPage === false, "Paginador: No tiene página siguiente.");
  assert(page3.hasPreviousPage === true, "Paginador: Tiene página anterior.");

  // 4. Probar Mapeo Desacoplado de Tarjeta (ContributionCardModel)
  const explorerRepo = new InMemoryExploreRepository(mockContributions);
  const explorerService = new ContributionExplorerService(explorerRepo);
  const { items: publicItems } = await explorerService.listContributions({
    page: 1,
    pageSize: 10,
    sort: "recent",
    direction: "desc",
  });

  const cardModel1 = mapToCardModel(publicItems[0]); // Mapea "Testimonio Oral de Edith" o la más reciente
  assert(cardModel1.id !== undefined, "Card Model: ID presente.");
  assert(cardModel1.title !== "", "Card Model: Título presente.");
  assert(cardModel1.authorName !== "", "Card Model: Nombre de autor presente.");
  assert(cardModel1.historicalDateLabel !== null, "Card Model: Etiqueta de fecha presente.");
  assert(
    cardModel1.contributionTypeLabel === "Fotografía" ||
      cardModel1.contributionTypeLabel === "Documento" ||
      cardModel1.contributionTypeLabel === "Testimonio escrito",
    "Card Model: Etiqueta del tipo de aporte mapeada en español."
  );

  // Probar soporte de insignias (badge)
  const mockPubWithBadge = {
    ...publicItems[0],
    badge: { label: "Destacado", variant: "featured" },
  } as unknown as PublicContribution;
  const cardWithBadge = mapToCardModel(mockPubWithBadge);
  assert(cardWithBadge.badge?.label === "Destacado", "Card Model: Mapea la etiqueta de insignia.");
  assert(cardWithBadge.badge?.variant === "featured", "Card Model: Mapea la variante de insignia.");

  // 5. Probar HomeService Aggregator y Snapshots
  const homeService = new HomeService(explorerService, statsService);
  const homeData = await homeService.load();

  assert(homeData.hero.title === "Memoria Viva Pico Truncado", "Home Builder: Carga título correcto.");
  assert(homeData.stats.totalContributions === 3, "Home Builder: Carga estadísticas correctamente.");
  assert(homeData.featured.length === 1, "Home Builder: Carga aporte destacado simulado.");
  assert(homeData.recent.length === 3, "Home Builder: Carga los últimos 3 aportes.");
  assert(homeData.future !== undefined, "Home Builder: Mantiene el bloque de extensión futuro.");

  // 6. Probar Estados Vacíos
  const emptyExplorerRepo = new InMemoryExploreRepository([]);
  const emptyStatsRepo = new InMemoryStatisticsRepository([]);
  const emptyExplorer = new ContributionExplorerService(emptyExplorerRepo);
  const emptyStatsService = new StatisticsService(emptyStatsRepo);
  const emptyHomeService = new HomeService(emptyExplorer, emptyStatsService);

  const emptyHomeData = await emptyHomeService.load();
  assert(emptyHomeData.featured.length === 0, "Estados Vacíos: Destacados vacíos cuando no hay destacados.");
  assert(emptyHomeData.recent.length === 0, "Estados Vacíos: Recientes vacíos cuando no hay aportes.");
  assert(emptyHomeData.stats.totalContributions === 0, "Estados Vacíos: Estadísticas en cero cuando no hay aportes.");

  // 7. Probar SEO y JSON-LD de Home y Listado
  const homeMeta = generateHomeMetadata(siteUrl);
  assert(homeMeta.title?.toString().includes("Memoria Viva"), "SEO Home: Título correcto.");
  assert(homeMeta.alternates?.canonical === `${siteUrl}/`, "SEO Home: URL canónica correcta.");

  const contribMeta = generateContributionsMetadata(siteUrl);
  assert(contribMeta.title?.toString().includes("Archivo"), "SEO Listado: Título correcto.");
  assert(contribMeta.alternates?.canonical === `${siteUrl}/contributions`, "SEO Listado: URL canónica correcta.");

  // JSON-LD Home
  const homeJson = buildHomeJsonLd(siteUrl);
  assert(homeJson["@graph"].length === 2, "JSON-LD Home: Contiene 2 entidades.");
  assert(homeJson["@graph"][0]["@type"] === "Organization", "JSON-LD Home: Contiene la organización.");
  assert(homeJson["@graph"][1]["@type"] === "WebSite", "JSON-LD Home: Contiene el sitio web.");

  // JSON-LD Listado
  const contribJson = buildContributionsJsonLd(siteUrl);
  assert(contribJson["@graph"].length === 3, "JSON-LD Listado: Contiene 3 entidades.");
  assert(contribJson["@graph"][1]["@type"] === "BreadcrumbList", "JSON-LD Listado: Contiene lista de migas de pan.");
  const crumbs = (contribJson["@graph"][1] as Record<string, unknown>).itemListElement as unknown[];
  assert(crumbs.length === 2, "JSON-LD Listado: BreadcrumbList contiene 2 niveles.");
  assert(
    (crumbs[0] as Record<string, unknown>).name === "Inicio" && (crumbs[0] as Record<string, unknown>).item === siteUrl,
    "JSON-LD Listado: Primer nivel es Inicio."
  );
  assert(
    (crumbs[1] as Record<string, unknown>).name === "Archivo de Memorias" &&
      (crumbs[1] as Record<string, unknown>).item === `${siteUrl}/contributions`,
    "JSON-LD Listado: Segundo nivel es Listado."
  );

  console.log("-> [TESTS] Pruebas de la Home Pública y Listado completadas con éxito.");
}
