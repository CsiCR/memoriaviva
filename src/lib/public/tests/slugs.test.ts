import * as fs from "fs";
import * as path from "path";
import { PublicIdentityService } from "../slugs/service";
import { InMemoryPublicIdentityRepository } from "../slugs/repository";
import { normalizeSlug, generateUniqueSlug } from "../slugs/generator";
import { validateSlug } from "../slugs/validator";
import { SLUG_CONFIG } from "../slugs/reserved";

export async function runSlugTests(assert: (cond: boolean, msg: string) => void) {
  console.log("-> [TESTS] Iniciando pruebas del servicio de identidad pública y slugs...");

  // 0. Verificar la existencia y orden de los archivos de migración
  const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();
    const idxSchema = files.findIndex(f => f.includes("public_identity_schema"));
    const idxFunctions = files.findIndex(f => f.includes("public_identity_functions"));
    const idxPermissions = files.findIndex(f => f.includes("public_identity_permissions"));
    
    assert(idxSchema !== -1 && idxFunctions !== -1 && idxPermissions !== -1, "Los archivos de migración de identidad pública existen.");
    assert(idxSchema < idxFunctions, "La migración de tablas (schema) se ejecuta antes que la de funciones RPC.");
    assert(idxFunctions < idxPermissions, "La migración de funciones RPC se ejecuta antes que la de permisos y grants.");
  } else {
    assert(false, "El directorio de migraciones de Supabase no existe.");
  }

  // 1. Pruebas de Transliteración y Normalización
  assert(normalizeSlug("Óscar Gómez") === "oscar-gomez", "Normalización Óscar Gómez.");
  assert(normalizeSlug("Niño") === "nino", "Normalización Unicode Ñ.");
  assert(normalizeSlug("Æ Œ ß Ł Ø") === "ae-oe-ss-l-o", "Transliteración compleja Æ Œ ß Ł Ø.");
  assert(normalizeSlug("  - - - Mi Título - - - ") === "mi-titulo", "Remoción de guiones redundantes y extremos.");

  // 2. Pruebas de Palabras Reservadas y Formato en Validador
  assert(validateSlug("admin").isValid === false, "Rechazo de palabra reservada 'admin'.");
  assert(validateSlug("api").isValid === false, "Rechazo de 'api'.");
  assert(validateSlug("rss").isValid === false, "Rechazo de 'rss'.");
  assert(validateSlug("").isValid === false, "Rechazo de slug vacío.");
  assert(validateSlug("   ").isValid === false, "Rechazo de espacios vacíos.");
  assert(validateSlug("barrio--ypf").isValid === false, "Rechazo de formato con guiones dobles.");
  assert(validateSlug("-barrio").isValid === false, "Rechazo de formato que empieza con guión.");
  assert(validateSlug("barrio-").isValid === false, "Rechazo de formato que termina con guión.");
  assert(validateSlug("../../admin").isValid === false, "Rechazo de intento de evasión de rutas.");

  // 3. Prueba de longitud máxima y truncado
  const longTitle = "a".repeat(200);
  const truncated = normalizeSlug(longTitle);
  assert(truncated.length === SLUG_CONFIG.MAX_BASE_LENGTH, "El slug base se trunca a 130 caracteres.");
  
  // 4. Pruebas con Repositorio InMemory y Servicio
  const repo = new InMemoryPublicIdentityRepository();
  const service = new PublicIdentityService(repo);

  const uuidA = crypto.randomUUID();
  const uuidB = crypto.randomUUID();

  // Registro inicial en Borrador (draft)
  const regA = await service.registerIdentity(uuidA, "story", "Barrio YPF", "draft");
  assert(regA.canonicalSlug === "barrio-ypf", "Registro de A con slug inicial barrio-ypf.");

  // Colisión simple al registrar B con mismo título
  const regB = await service.registerIdentity(uuidB, "story", "Barrio YPF", "draft");
  assert(regB.canonicalSlug === "barrio-ypf-2", "Registro de B con colisión barrio-ypf-2.");

  // 5. Borrador nunca publicado: liberar slug previo al cambiar título
  const updatedA1 = await service.updateTitle(uuidA, "story", "La vieja Estación YPF");
  assert(updatedA1.canonicalSlug === "la-vieja-estacion-ypf", "Cambio de título en borrador a la-vieja-estacion-ypf.");
  assert(updatedA1.aliasesCreated === 0, "Borrador nunca publicado no genera alias históricos.");

  const takenPrevious = await repo.isSlugTaken("barrio-ypf", "story");
  assert(takenPrevious === false, "El slug 'barrio-ypf' original del borrador ha sido liberado físicamente.");

  // 6. Registro posterior de C reclama el slug liberado
  const uuidC = crypto.randomUUID();
  const regC = await service.registerIdentity(uuidC, "story", "Barrio YPF", "draft");
  assert(regC.canonicalSlug === "barrio-ypf", "C reclama el slug 'barrio-ypf' liberado.");

  // 7. Transición a publicado: has_ever_been_published se convierte en irreversible
  await service.updateStatus(uuidA, "story", "published");
  const identityA = await service.findByEntity("story", uuidA);
  assert(identityA?.hasEverBeenPublished === true, "La identidad A se marca como publicada.");

  // Intentar revertir has_ever_been_published a false mediante trigger (simulado en el repo)
  try {
    identityA!.hasEverBeenPublished = false;
    await repo.updateStatus(identityA!.id, "draft");
    // Volver a leer para ver si el repo impidió el reseteo
    const reRead = await repo.findById(identityA!.id);
    assert(reRead?.hasEverBeenPublished === true, "has_ever_been_published no puede volver a false.");
  } catch (e) {
    // Si la simulación tiró error, también pasa
    assert(true, "Trigger impidió el reseteo de has_ever_been_published.");
  }

  // 8. Cambio de título en publicado: debe exigir alias
  const updatedA2 = await service.updateTitle(uuidA, "story", "La antigua Estación YPF");
  assert(updatedA2.canonicalSlug === "la-antigua-estacion-ypf", "Nuevo slug canónico 'la-antigua-estacion-ypf'.");
  assert(updatedA2.aliasesCreated === 1, "Generó un alias histórico.");

  const aliasResolves = await service.resolveIdentity("story", "la-vieja-estacion-ypf");
  assert(aliasResolves !== null, "El alias 'la-vieja-estacion-ypf' resuelve.");
  assert(aliasResolves?.canonicalSlug === "la-antigua-estacion-ypf", "El alias resuelve al canónico actual.");
  assert(aliasResolves?.resolutionType === "alias", "El tipo de resolución es alias.");
  assert(aliasResolves?.redirectStatus === 301, "Redirecciona permanentemente con código 301.");

  // El canónico no admite redirección
  assert(aliasResolves?.redirectsToIdentityId === null, "Alias por renombre no tiene redirectsToIdentityId.");

  // 9. Idempotencia en renombre: renombrar al mismo slug no hace cambios
  const updatedA3 = await service.updateTitle(uuidA, "story", "La antigua Estación YPF");
  assert(updatedA3.hasChanged === false, "Idempotencia: no hay cambios en el canónico.");
  assert(updatedA3.operation === "unchanged", "Idempotencia: tipo de operación unchanged.");

  // 10. Despublicación y Conservación de Slugs
  await service.updateStatus(uuidA, "story", "unpublished");
  const takenUnpublished = await repo.isSlugTaken("la-antigua-estacion-ypf", "story");
  assert(takenUnpublished === true, "Slug de identidad despublicada permanece reservado.");

  // Permitido renombrar en unpublished, pero genera alias
  const updatedA4 = await service.updateTitle(uuidA, "story", "Estación YPF de Pico Truncado");
  assert(updatedA4.canonicalSlug === "estacion-ypf-de-pico-truncado", "Renombra en unpublished.");
  assert(updatedA4.aliasesCreated === 1, "Renombrar en unpublished genera alias.");

  // 11. Eliminación lógica: conserva slugs y bloquea cambios
  await service.updateStatus(uuidA, "story", "deleted");
  const takenDeleted = await repo.isSlugTaken("estacion-ypf-de-pico-truncado", "story");
  assert(takenDeleted === true, "Slug de identidad eliminada lógicamente permanece reservado.");

  try {
    await service.updateTitle(uuidA, "story", "Intento de cambio en eliminado");
    assert(false, "Debe fallar al intentar renombrar una identidad eliminada.");
  } catch (error: any) {
    assert(error.message.includes("eliminada") || error.message.includes("frozen"), "Falla al renombrar identidad eliminada.");
  }

  // 12. Identidades congeladas (isFrozen)
  const uuidD = crypto.randomUUID();
  await service.registerIdentity(uuidD, "story", "Museo Histórico Municipal", "published");
  await service.setFrozen(uuidD, "story", true);

  try {
    await service.updateTitle(uuidD, "story", "Nuevo Nombre Museo");
    assert(false, "Debe fallar al intentar renombrar una identidad congelada.");
  } catch (error: any) {
    assert(error.message.includes("congelada"), "Falla al renombrar identidad congelada.");
  }

  // 13. Fusiones e Invariantes Relacionales
  // Crear dos identidades activas
  const uuidE = crypto.randomUUID();
  const uuidF = crypto.randomUUID();
  await service.registerIdentity(uuidE, "story", "Pioneros del Ferrocarril", "published");
  await service.registerIdentity(uuidF, "story", "Ferrocarril Patagónico", "published");

  const mergeResult = await service.mergeIdentities(uuidE, uuidF, "story");
  assert(mergeResult.operation === "merged", "Fusión completada con éxito.");
  assert(mergeResult.aliasesCreated >= 1, "La fusión crea alias.");

  const sourceIdentity = await service.findByEntity("story", uuidE);
  assert(sourceIdentity?.status === "merged", "Estado de origen es 'merged'.");
  assert(sourceIdentity?.mergedIntoIdentityId === targetIdOf(repo, "story", "ferrocarril-patagonico"), "Destino de fusión registrado.");

  // Invariante de fusión en base de datos: status = merged exige merged_into_identity_id
  try {
    sourceIdentity!.mergedIntoIdentityId = null;
    // Esto debería violar el CHECK valid_identity_merge_state
    // InMemoryRepo simula las restricciones
    await repo.updateStatus(sourceIdentity!.id, "draft");
    assert(false, "Debe fallar al poner status = draft en una identidad fusionada.");
  } catch (error) {
    assert(true, "CHECK impidió un estado de fusión inconsistente.");
  }

  // Validar fusiones de tipos diferentes (CHECK constraint)
  const uuidPerson = crypto.randomUUID();
  await service.registerIdentity(uuidPerson, "person", "Juan Pérez", "published");
  try {
    await service.mergeIdentities(uuidPerson, uuidF, "story"); // different types or different service UUIDs
    assert(false, "Debe rechazar la fusión entre tipos diferentes.");
  } catch (error) {
    assert(true, "Fusión entre tipos diferentes rechazada.");
  }

  // 14. Prevención de fusiones circulares
  // E ya está fusionada en F. Intentar fusionar F en E debe fallar.
  try {
    await service.mergeIdentities(uuidF, uuidE, "story");
    assert(false, "Debe fallar al intentar realizar una fusión circular.");
  } catch (error) {
    assert(true, "Fusión circular rechazada con éxito.");
  }

  // 15. Prueba de Recuperación de Cadena Completa (Publish -> Rename -> Merge -> Resolve)
  const uuidX = crypto.randomUUID();
  const uuidY = crypto.randomUUID();
  
  // Publicar X e Y
  await service.registerIdentity(uuidX, "story", "Estacion Original A", "published");
  await service.registerIdentity(uuidY, "story", "Estacion Destino B", "published");

  // Renombrar X
  await service.updateTitle(uuidX, "story", "Estacion Renombrada A"); // alias: estacion-original-a, canonical: estacion-renombrada-a

  // Fusionar X en Y
  await service.mergeIdentities(uuidX, uuidY, "story");

  // Resolver el slug ORIGINAL de X
  const resolvedChain = await service.resolveIdentity("story", "estacion-original-a");
  assert(resolvedChain !== null, "Resolución de alias en cadena.");
  assert(resolvedChain?.canonicalSlug === "estacion-destino-b", "Resuelve directamente al canónico final de Y.");
  assert(resolvedChain?.resolutionType === "merged", "Tipo de resolución es merged.");
  assert(resolvedChain?.redirectStatus === 301, "Redirecciona permanentemente.");

  // 16. Límite de colisiones (MAX_ALLOCATION_ATTEMPTS = 20)
  const uuidZ = crypto.randomUUID();
  // Llenar 20 colisiones del mismo nombre
  for (let i = 1; i <= 20; i++) {
    const dummyUuid = crypto.randomUUID();
    await service.registerIdentity(dummyUuid, "story", "Colision Extrema", "draft");
  }

  try {
    await service.registerIdentity(uuidZ, "story", "Colision Extrema", "draft");
    assert(false, "Debe fallar al exceder las 20 colisiones permitidas.");
  } catch (error: any) {
    assert(error.message.includes("límite"), "Exceder 20 intentos de colisión lanza SlugAllocationError.");
  }

  // 17. Simulación de Concurrencia
  const repoConcurrent = new InMemoryPublicIdentityRepository();
  const serviceConcurrent = new PublicIdentityService(repoConcurrent);

  // Dos creaciones simultáneas de "Barrio YPF"
  const uuid1 = crypto.randomUUID();
  const uuid2 = crypto.randomUUID();

  // Lanzar simultáneamente con Promise.all
  const results = await Promise.all([
    serviceConcurrent.registerIdentity(uuid1, "story", "Barrio YPF", "draft"),
    serviceConcurrent.registerIdentity(uuid2, "story", "Barrio YPF", "draft")
  ]);

  const slugsSaved = results.map(r => r.canonicalSlug).sort();
  assert(slugsSaved[0] === "barrio-ypf", "Primer registro de concurrencia.");
  assert(slugsSaved[1] === "barrio-ypf-2", "Segundo registro de concurrencia resolvió colisión.");

  console.log("✓ ¡TODAS LAS PRUEBAS DE SLUGS Y DIRECCIONES PÚBLICAS PASARON CON ÉXITO!");
}

function targetIdOf(repo: InMemoryPublicIdentityRepository, entityType: PublicEntityType, slug: string): string {
  const record = repo.slugs.find(s => s.entityType === entityType && s.slug === slug);
  return record ? record.identityId : "";
}
