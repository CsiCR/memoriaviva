# Capítulo 3: Arquitectura, Rutas Públicas y Contrato de Datos
**Portal Público — Memoria Viva Pico Truncado**

Este documento detalla la estructura propuesta para el Portal Público en Next.js, el contrato de datos exclusivo por lista blanca (`PublicContribution`) y las estrategias de caching e invalidación.

---

## 1. Estructura de Rutas Públicas (Next.js App Router)

Para integrar las vistas de consulta pública sin alterar las rutas administrativas actuales, se propone utilizar la siguiente estructura dentro de `src/app/(public)/`:

* **`src/app/(public)/archivo/page.tsx`**: 
  * *Función*: Catálogo general de testimonios. Permite búsqueda textual y filtros por tipo de material, década aproximada, barrios e instituciones relacionadas.
  * *Renderizado*: Server Component con regeneración estática incremental (ISR) o renderizado dinámico con filtros persistidos en la URL (`searchParams`).
* **`src/app/(public)/archivo/[slug]/page.tsx`**: 
  * *Función*: Ficha de detalle de un testimonio individual.
  * *Slugs vs UUIDs*: **Se propone `/archivo/[slug]` en lugar de `/archivo/[id]` (donde `[id]` es un UUID interno)**.
    * **SEO**: URL semántica amigable para motores de búsqueda (ej. `/archivo/lanzamiento-memoria-viva-barrio-ypf`).
    * **Privacidad**: Evita exponer y rastrear identificadores únicos (UUIDs) internos que apunten a relaciones administrativas en Supabase.
    * **Seguridad**: Dificulta el "enumeration attack" (barrido incremental de IDs) por parte de raspadores automatizados.

---

## 2. Contrato `PublicContribution` (Lista Blanca)

Para evitar la filtración accidental de metadatos o información confidencial (como DNI, teléfonos, correos o notas de validación internas), **nunca** se debe enviar el objeto de base de datos directamente al cliente. Se define una **Lista Blanca (Whitelist)** estricta:

```typescript
export interface PublicContribution {
  id: string;                        // ID público de referencia
  slug: string;                      // Identificador URL amigable (ej: "lanzamiento-memoria-viva-barrio-ypf")
  catalogCode: string;               // Código de catálogo (ej: "MV-FOT-2026-0002")
  title: string;                     // Título público
  contentType: "textual" | "documentary" | "audiovisual" | "mixed"; // Tipo de aporte normalizado
  description: string;               // Descripción resumida / reseña
  exactDate: string | null;          // Fecha precisa (solo expuesta si Nivel de Autorización es A)
  approximateDecade: string | null;  // Década aproximada (ej: "2020s")
  relatedPlace: string;              // Lugar geográfico o de memoria asociado
  mentionedPeople: string | null;    // Personas mencionadas (nombres públicos)
  relatedInstitution: string | null; // Institución vinculada
  historicalContext: string | null;  // Contexto histórico (solo expuesto si Nivel de Autorización es A)
  publishedAt: string;               // Fecha de publicación en portal
  contributorName: string;           // Nombre/Crédito calculado según la preferencia del aportante
  files: Array<{
    id: string;                      // ID único del archivo
    fileName: string;                // Nombre público
    fileType: string;                // Formato (imagen, audio, pdf, etc.)
    fileSize: number;                // Tamaño para descarga
    publicUrl: string;               // URL de visualización (derivado optimizado público)
  }>;
}
```

### Matriz de Exposición y Correspondencia de Campos

| Campo Administrativo (Base de Datos) | Condición de Publicación | Campo Público | Nivel Requerido | Procesamiento / Mapeo |
| :--- | :--- | :--- | :--- | :--- |
| `contributions.title` | `editorial_status` elegible & `published` | `title` | Público | Copia directa de string. |
| `contributions.description` | `editorial_status` elegible & `published` | `description` | Público | Copia directa de string. |
| `contributions.exact_date` | `authorization_level = 'A'` | `exactDate` | Nivel A | Si el nivel es distinto a `A`, se devuelve `null` para resguardar fechas exactas de vida íntima. |
| `contributions.historical_context` | `authorization_level = 'A'` | `historicalContext` | Nivel A | Si el nivel es distinto a `A`, se devuelve `null` para resguardar relatos extensos familiares. |
| `contributors.full_name` | `credit_preference` = "Nombre completo" | `contributorName` | Público | Copia directa del nombre completo del aportante. |
| `contributors.full_name` | `credit_preference` = "Iniciales" | `contributorName` | Público | Se procesa a iniciales (ej. "Adrián Francisco Montet" $\rightarrow$ `"A. F. M."`). |
| `contributors.full_name` & `relation_to_city` | `credit_preference` = "Familia aportante" | `contributorName` | Público | Se mapea a `"Familia [Barrio/Inst]"` (ej. `"Familia Unión Vecinal"`). |
| - | `credit_preference` = "Anónimo" | `contributorName` | Público | Hardcoded a `"Anónimo"`. |
| `contribution_files.file_path` | `editorial_status` elegible & `published` | `files.publicUrl` | Público | **Nunca exponer la ruta directa en storage**. Se debe devolver la URL pública del archivo derivado optimizado. |

---

## 3. Caching, Invalidadación y Takedown (Baja de Contenido)

Dado que las consultas públicas de consulta histórica son mayoritariamente estáticas, es crucial implementar un sistema de almacenamiento en caché para proteger el rendimiento del servidor y del backend de Supabase.

### 3.1 Estrategia de Caché
* Se propone el uso de **Next.js Incremental Static Regeneration (ISR)** en la ruta del catálogo `/archivo` y en los detalles del aporte `/archivo/[slug]`:
  ```typescript
  export const revalidate = 3600; // Recargar caché automáticamente cada 1 hora
  ```
* Las peticiones estáticas se servirán directamente de la caché perimetral (CDN), minimizando las lecturas a la base de datos de Supabase.

### 3.2 Estrategia de Takedown de Emergencia (Baja en < 1 Minuto)
En caso de que un aportante revoque su consentimiento o el equipo de validación detecte una inconsistencia grave post-publicación, el contenido **debe ser eliminado de la web inmediatamente**.

```
[Acción de Baja Administrativa] 
   └── Cambiar estado a "Retirado" o consentimiento a "false" en DB
   └── Invocar Server Action de Next.js
   ├── ejecutar revalidatePath("/archivo")
   └── ejecutar revalidatePath("/archivo/[slug]")
   └── La CDN purga las páginas en caché instantáneamente (< 5 segundos)
```

* **Implementación en Server Action**:
  Cuando se actualiza el estado del aporte en el panel administrativo, el endpoint del servidor debe ejecutar:
  ```typescript
  import { revalidatePath } from 'next/cache';
  
  // Después de actualizar la base de datos:
  revalidatePath('/archivo');
  revalidatePath(`/archivo/${slug}`);
  ```
  Esto purga la caché de Next.js de forma inmediata en caliente, garantizando que el próximo visitante reciba un código `404 Not Found` para ese slug.
