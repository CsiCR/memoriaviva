# Resolución HTTP de URLs Públicas (Etapa 4.2.2)

Este módulo implementa el sistema de resolución HTTP para las URLs públicas de aportes históricos de Pico Truncado, expuestas en la ruta canónica `/contributions/[slug]`.

## Arquitectura de Resolución Híbrida

Para maximizar el rendimiento y la consistencia en el motor de renderizado de Next.js, se emplea una arquitectura en dos capas:

1. **Proxy del Servidor (`src/proxy.ts`)**:
   - Corre en Node.js Runtime.
   - Analiza la solicitud HTTP entrante y realiza una validación preventiva de segmentos de ruta.
   - Consulta el estado de identidad en el servicio ligero.
   - Si el slug corresponde a un alias histórico o una fusión, devuelve de forma inmediata una redirección permanente **HTTP 301 Moved Permanently** con cabeceras de caché adecuadas (`Cache-Control: public, max-age=3600`) y de seguridad (`X-Content-Type-Options: nosniff`).
   - Si el slug es canónico, cede el control a la página sin intervenir.

2. **Renderizador de Página (`src/app/(public)/contributions/[slug]/page.tsx`)**:
   - Implementa generación estática regenerativa (ISR) mediante `export const revalidate = 300;`.
   - Utiliza la función memoizada `getPublicContributionPageData` (basada en React `cache()`) para compartir la llamada a la base de datos entre `generateMetadata()` y la función de renderizado del componente. Esto elimina la doble resolución y asegura consistencia total.
   - Genera metadatos dinámicos e inyecta la URL canónica absoluta (validada contra `PUBLIC_SITE_URL`).
   - Retorna la interfaz 404 nativa (`notFound()`) y metadatos `noindex, nofollow` si el recurso no es publicable o no cuenta con consentimiento verificado.

## Estructura de Archivos del Módulo

- `src/lib/public/url/types.ts`: Definición de firmas y contratos HTTP de la resolución.
- `src/lib/public/url/schemas.ts`: Esquemas estrictos de validación Zod (incluyendo origen limpio de `PUBLIC_SITE_URL`).
- `src/lib/public/url/errors.ts`: Excepciones controladas del cargador de URLs.
- `src/lib/public/url/canonical-url.ts`: Validación de origen en inicio y construcción de enlaces canónicos absolutos.
- `src/lib/public/url/identity-resolver.ts`: Lógica de resolución de aliases históricos y fusiones recursivas.
- `src/lib/public/url/page-service.ts`: Carga autoritativa final de aportes públicos y validación contra contratos estrictos.
- `src/lib/public/url/metadata.ts`: Conversor de datos a formato de metadatos SEO nativo de Next.js.
- `src/lib/public/url/server.ts`: Inyector de dependencias protegido por la directiva `"server-only";`.
- `src/proxy.ts`: Middleware del proxy de Next.js ejecutado en Node.js Runtime.

## Casos de Prueba Cubiertos
La suite de pruebas automatizadas en `src/lib/public/tests/public-url-resolution.test.ts` verifica los siguientes comportamientos:
1. Slugs canónicos devuelven HTTP 200 con estado "canonical" y datos correctos.
2. Slugs que son aliases históricos redirigen (301) a su canónico.
3. Fusiones redirigen (301) al canónico de destino final sin saltos intermedios.
4. Redirecciones multi-hop se resuelven en un solo paso directo.
5. Slugs no existentes, privados (borradores) o sin consentimiento verificado devuelven HTTP 404 (not_found).
6. Ciclos y bucles de fusión son prevenidos y lanzan conflicto HTTP 409 o detienen la ejecución.
7. Slugs inválidos estructuralmente (con traversal `..` o slash `/`) son rechazados con 404.
8. La ruta canonical es absoluta y utiliza exactamente `PUBLIC_SITE_URL` validado.
9. Los metadatos de aportes canónicos usan index/follow; los errores usan noindex/nofollow.
10. Se verifica la no-duplicidad de directorios físicos en la estructura del proyecto.
11. Se simula e instrumenta el comportamiento del matcher estático del Proxy.
