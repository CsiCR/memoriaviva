# Walkthrough - BUG-001 Resolution

Documento de cierre oficial de la incidencia **BUG-001 (Error de Producción al Guardar un Aporte)**.

---

## Cambios Realizados

### Base de Datos
* **Migración Versionada:** Se creó y conservó como oficial el archivo de migración [`20260730180000_bug_001_concurrency_catalog_code.sql`](file:///c:/Users/pc/Documents/antigravity/memoriaviva/supabase/migrations/20260730180000_bug_001_concurrency_catalog_code.sql), el cual actualiza el trigger `generate_catalog_code()` para usar:
  1. `pg_advisory_xact_lock` con hash estable basado en la combinación de tipo y año para serializar inserciones concurrentes.
  2. `MAX() + 1` en lugar de `COUNT(*)` para evitar colisiones provocadas por la presencia de huecos en la secuencia de numeración.
  3. Mantenimiento del flujo de consentimientos para el tipo `signed_paper`.

### Código de la Aplicación
* **Corrección TypeScript:** Se corrigió un error de tipado implícito `any[]` en [`final-integrity-audit.ts`](file:///c:/Users/pc/Documents/antigravity/memoriaviva/scripts/final-integrity-audit.ts) (línea 112), garantizando compilación exitosa (`next build`).

---

## Verificación Final en Producción

La auditoría en caliente realizada tras el envío del aporte arrojó un éxito del 100%:

| Métrica / Registro | Detalle Registrado | Estado |
| :--- | :--- | :--- |
| **Aporte Registrado** | ID `aaf1a429-6676-4b25-bdcc-c16d04c1c30d` | ✓ Correcto |
| **Código Asignado** | `MV-FOT-2026-0006` (secuencia correcta consecutiva) | ✓ Correcto |
| **Estado Editorial** | `Recibido` | ✓ Correcto |
| **Sesiones Vinculadas**| 6 upload sessions con estado `linked` | ✓ Correcto |
| **Archivos Registrados**| 6 registros en `contribution_files` | ✓ Correcto |
| **Archivos en Storage**| Físicamente presentes en el bucket `historical-uploads` | ✓ Correcto |
| **Aportante** | `"Adrian Francisco montet"` creado correctamente | ✓ Correcto |
| **Cesión Legal** | Consentimiento Nivel A, Familia aportante registrado | ✓ Correcto |
| **Notificación** | Notificación administrativa `new_contribution` creada | ✓ Correcto |
| **Progresión Futura** | Confirmada secuencia en `MV-FOT-2026-0007` | ✓ Correcto |
| **Residuos y Huérfanos**| Cero registros huérfanos detectados | ✓ Correcto |

El workspace fue limpiado de todos los archivos y scripts temporales de diagnóstico.
La incidencia queda oficialmente **CERRADA** y **RESUELTA**.

---

# Walkthrough - INC-002 Resolution

Documento de cierre oficial de la incidencia **INC-002 (Retiro controlado de archivos cargados por error - Don Argel Manuel Santiago)**.

## Operaciones Ejecutadas (Orden Secuencial Seguro)

1. **Registro de Auditoría:** Se insertaron dos registros de auditoría en `public.audit_logs` con la acción `DELETE`, guardando el estado original de los archivos y registrando el motivo: `"Archivo retirado por carga accidental del aportante antes de publicación"`.
2. **Eliminación Física en Storage:** Se eliminaron los dos archivos de error del bucket `historical-uploads` en Supabase Storage:
   * `temporary/78d07cf6-44e2-4f66-91ab-d2067d981154/efdddb7e-1d73-4089-91c6-83faba3cbd19.jpg` (Foto 1 - Captura de formulario)
   * `temporary/a3a1f6c1-9b08-496d-9258-01566640c3c6/09970945-2781-4c3c-b50a-3ad08364f841.jpg` (Foto 3 - Folleto de Memoria Viva)
3. **Verificación de Remoción:** Se confirmó que las firmas URL de Storage devuelven un error HTTP 404 (objeto no accesible físicamente).
4. **Eliminación de Referencias de Base de Datos:** Se borraron permanentemente los dos registros asociados en `public.contribution_files`, dejando intactos los dos archivos reales.
5. **Conservación de Upload Sessions:** Tal como se acordó, no se alteró la tabla `upload_sessions` para preservar el registro técnico e histórico completo de las cargas realizadas.

---

## Verificación Final de la Contribución (Don Argel)

La auditoría posterior a la remoción confirma el éxito completo:

| Indicador | Detalle / Resultado | Estado |
| :--- | :--- | :--- |
| **Identificación Aporte** | ID `1057bba1-ab32-4567-a873-45212bc4f4fb` | ✓ Correcto |
| **Código Catalogador** | `MV-FOT-2026-0004` | ✓ Correcto |
| **Estado Editorial** | `En validación histórica` (sin modificar) | ✓ Correcto |
| **Cantidad Final de Archivos**| Exactamente **2** archivos vinculados | ✓ Correcto |
| **Archivos Conservados** | 1. Pareja ancianos (`c9454f77-...`) <br> 2. Carnet joven (`c35627c9-...`) | ✓ Correcto |
| **Integridad Física Storage** | Los 2 archivos reales se resuelven y están disponibles | ✓ Correcto |
| **Residuos y Huérfanos** | No existen registros huérfanos o desvinculados | ✓ Correcto |
| **Aporte Listo para Publicación**| Aporte saneado y apto para ser publicado | ✓ Correcto |

La incidencia queda oficialmente **CERRADA** y **RESUELTA**.

---

# Walkthrough - INC-003 Resolution

Documento de cierre oficial de la incidencia **INC-003 (Sincronización Segura de Identidades Públicas)**.

## Cambios Realizados

### Código del Servidor (Server Actions)
* **Autenticación Robusta:** En [`src/app/actions/contributions.ts`](file:///c:/Users/pc/Documents/antigravity/memoriaviva/src/app/actions/contributions.ts), reemplazamos `supabase.auth.getSession()` por `supabase.auth.getUser()`, evitando confiar en el estado local de cookies y realizando la validación del usuario directamente contra el servidor de autenticación de Supabase.
* **Cliente Administrativo Acotado:** Introdujimos el uso de `createAdminClient()` (cliente con la clave `service_role` servidor, capaz de omitir RLS) únicamente **después** de validar la sesión de usuario y confirmar en `profiles` que posee un rol autorizado (admin/editor/validator/interviewer). 
* **Defensa en Progreso:**
  - El cliente cookies del editor sigue utilizándose para las operaciones y validaciones del expediente editorial normal.
  - El cliente administrativo se restringe estrictamente a la inicialización de `SupabasePublicIdentityRepository` y sus consultas del portal público sobre las tablas `public_identities` y `public_slugs`.
* **Respuestas Estructuradas en Lugar de Excepciones:**
  - Si el usuario no está autenticado, retornamos `{ success: false, editorialSaved: false, errorCode: 'SESSION_EXPIRED', message: 'Tu sesión venció. Volvé a iniciar sesión.' }`.
  - Si el usuario no tiene rol editorial, retornamos `{ success: false, editorialSaved: false, errorCode: 'FORBIDDEN', message: 'No tenés permisos para realizar esta operación.' }`.
  - Si la sincronización de la identidad pública falla, capturamos el error en el try-catch de orquestación (incluyendo la compensación y la despublicación), registramos los detalles técnicos mediante `console.error` (evitando exponer datos internos a la interfaz) y retornamos `{ success: false, editorialSaved: true, publicationSucceeded: false, errorCode: 'PUBLIC_IDENTITY_SYNC_FAILED', message: 'Los cambios editoriales fueron guardados, pero no pudo completarse la sincronización con el portal público.' }`.

### Código del Cliente (Components)
* **Gestión de Errores Estructurados:** En [`src/components/ContributionEditForm.tsx`](file:///c:/Users/pc/Documents/antigravity/memoriaviva/src/components/ContributionEditForm.tsx), actualizamos el resolver de la promesa para manejar fallas estructuradas. Si `res.success` es `false`, comprobamos si se trata de un rechazo de publicación ordinario (`res.publicationRejected`). De lo contrario, renderizamos el mensaje genérico devuelto por la acción (`res.message`) en pantalla mediante `setError()`.

---

## Verificación Realizada

1. **Compilación de Producción (`next build`):** Ejecutado exitosamente bajo `.env.local` con un 100% de éxito, garantizando la consistencia de tipos.
2. **Suite de Workflow y Contratos (`test:workflow` y `test:public`):** Las suites de prueba completaron exitosamente todas sus validaciones (397 tests pasados con éxito).
3. **Validación de Seguridad del Admin Client:** Confirmamos que `createAdminClient` no es importado por componentes cliente y que `SUPABASE_SERVICE_ROLE_KEY` no utiliza prefijo `NEXT_PUBLIC_`, manteniéndose seguro en el servidor.
4. **Verificación de Inexistencia de Advertencia `getSession()`:** La compilación Next.js no arrojó advertencias sobre el uso inseguro de la sesión, ya que la Server Action ahora valida con `getUser()`.

---

# Walkthrough - INC-004 Resolution

Documento de cierre oficial de la incidencia **INC-004 (Visualización de Dimensiones Editoriales en el Portal Público)**.

## Operaciones Ejecutadas

1. **Corrección de Mapeadores en Repositorios Públicos:**
   - En [`src/lib/public/api/repository.ts`](file:///c:/Users/pc/Documents/antigravity/memoriaviva/src/lib/public/api/repository.ts), se actualizó la interfaz `DbContributionRow` para incluir los 7 campos de publicación e investigación editorial.
   - En el mismo archivo, se modificaron los métodos `listContributions` y `getContributionByIdentity` para copiar explícitamente estos 7 campos de la base de datos al objeto `ContributionInput` que se retorna.
   - En [`src/lib/public/explore/repository.ts`](file:///c:/Users/pc/Documents/antigravity/memoriaviva/src/lib/public/explore/repository.ts), se modificó el método `listContributions` para mapear los 7 campos desde `rowObj` (objeto crudo de Supabase) a `ContributionInput`.

2. **Centralización y Robustecimiento del Mapper Central:**
   - En [`src/lib/public/mappers/to-public-contribution.ts`](file:///c:/Users/pc/Documents/antigravity/memoriaviva/src/lib/public/mappers/to-public-contribution.ts), se implementó el helper `cleanString` para tratar como ausente (`undefined`) no solo valores `null` o `undefined` sino también cadenas vacías `""` o cadenas compuestas puramente de espacios en blanco (ej. `"   "`).
   - Se aplicó `cleanString` en la resolución de cascadas de títulos (`publication_title` -> `editorial_title` -> `title`), descripción (`publication_excerpt` -> `editorial_summary` -> `editorial_description` -> `description`), y contexto histórico (`editorial_context` -> `historical_context`), asegurando que cualquier espacio o cadena vacía rompa limpiamente la cadena de fallbacks hacia el siguiente nivel.

3. **Garantía de Whitelist y Privacidad:**
   - Se ratificó que ningún dato privado (como notas internas, incidencias, DNI, datos de contacto del aportante) se filtre en el DTO final `PublicContribution` devuelto al cliente. El filtrado de campos sensibles se mantiene 100% aislado.

4. **Incorporación de Pruebas Unitarias Específicas:**
   - Se añadieron tests exhaustivos en `src/lib/public/tests/public-contribution.test.ts` que validan de forma aislada:
     - Las cascadas de título y descripción con fallbacks ordenados.
     - La cascada de contexto histórico y de créditos.
     - El manejo correcto de `null`, `undefined`, cadenas vacías `""` y strings con solo espacios en blanco.
     - La exclusión de datos privados en el payload público final.
     - La simulación e integridad de los datos provistos en los flujos de Detalle (`PublicApiRepository`) y de Catálogo (`ExploreRepository`).

---

## Verificación Final Realizada

1. **Ejecución de Pruebas Unitarias (`npm run test:workflow` y `npm run test:public`):** Las suites corrieron con éxito, logrando pasar el 100% de los tests (483/483 tests pasados con éxito).
2. **Compilación de Next.js (`npm run build`):** El compilador de Turbopack completó la compilación de producción con éxito sin advertencias ni errores de tipado.
3. **Verificación de Rutas Públicas Reales:** Se re-confirmó que el segmento oficial del portal web para el detalle es `/contributions/[slug]` (y no `/aportes/...`), y para el catálogo es `/contributions`.

La incidencia queda oficialmente **CERRADA** e **IMPLEMENTADA** a nivel de código local, a la espera de autorización para su despliegue a producción.

