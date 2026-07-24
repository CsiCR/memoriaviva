# Arquitectura de Contratos Públicos — Portal Público

Este documento describe la arquitectura, flujos de datos, ejemplos de uso y restricciones de la capa de contratos públicos implementada para **Memoria Viva Pico Truncado**.

---

## 1. Visión y Desacoplamiento

La filosofía del **Portal Público** es actuar como una experiencia pública cuidadosamente controlada (un archivo histórico digital comunitario) en lugar de una visualización cruda de la base de datos editorial.

Para cumplir con esto, la arquitectura implementa un **desacoplamiento absoluto** entre:
- **Modelo Editorial (Internal/Write)**: Gestionado administrativamente, con datos personales, notas internas, auditorías y almacenamiento privado.
- **Modelo Público (External/Read)**: Estrictamente tipado bajo una política de lista blanca (Whitelist) y validado en tiempo de ejecución.

El Portal Público **nunca** consumirá directamente entidades editoriales ni interactuará libremente con la base de datos o el almacenamiento privado de Supabase. Todo acceso pasará por esta capa intermedia.

```
+--------------------------+
|  Base de Datos Editorial |
+--------------------------+
             |
             v  (ContributionInput)
+--------------------------+
|   Políticas de Exposición|  <-- Valida consentimiento, elegibilidad y publicado
+--------------------------+
             |
             v  (toPublicContribution)
+--------------------------+
|     Mapper Whitelist     |  <-- Elimina IDs internos, teléfonos, correos y nombres técnicos
+--------------------------+
             |
             v  (publicContributionSchema.parse)
+--------------------------+
|   Esquema Estricto Zod   |  <-- Garantiza la salida en tiempo de ejecución (.strict())
+--------------------------+
             |
             v  (PublicContribution)
+--------------------------+
|      Portal Público      |  <-- Consume únicamente contratos limpios y seguros
+--------------------------+
```

---

## 2. Flujo de Transformación de Datos

El mapeo de un aporte sigue tres fases secuenciales:

1. **Aserción de Políticas**:
   - `assertContributionCanBePublished(contribution)`: Se conecta con el motor editorial existente. Valida que el consentimiento esté firmado y verificado (`consent_verified === true`), que el nivel de autorización sea público (consumiendo `PUBLIC_AUTHORIZATION_CODES`), que el estado de publicación sea exactamente `"published"` y que el aporte sea elegible. Si alguna regla falla, detiene el flujo inmediatamente lanzando un error.
2. **Filtrado y Transformación (Mapper)**:
   - Se crea una instancia limpia mapeando explícitamente cada campo (sin operadores spread `...` que puedan arrastrar propiedades imprevistas).
   - Los archivos multimedia originales se ocultan. Se eliminan los nombres técnicos de los archivos (ej. `copia_dni_vecino.jpg`) para evitar filtración de metadatos sensibles.
   - Las fechas se unifican bajo `PublicHistoricalDate` para mantener consistencia en la precisión.
   - La atribución se autoriza de manera independiente del contenido, transformando nombres a iniciales, familias o manteniendo el anonimato.
3. **Validación Zod Estricta**:
   - El payload resultante se somete a `publicContributionSchema.parse()`. Al estar configurado con `.strict()`, cualquier campo adicional no declarado de forma explícita provocará un error de validación, garantizando que nunca se exponga información sensible residual.

---

## 3. Especificaciones del Contrato

### 3.1 Créditos Públicos (`PublicCredits`)
Aísla la identidad real del aportante.
```typescript
export interface PublicCredits {
  attributionType: "full_name" | "initials" | "family" | "institution" | "anonymous" | "custom";
  displayName: string | null;
}
```

### 3.2 Multimedia Pública (`PublicMedia`)
Evita la filtración de las rutas físicas de Supabase Storage. `publicUrl` apunta a un resolutor público controlado.
```typescript
export interface PublicMedia {
  id: string;
  mediaType: "image" | "audio" | "video" | "document";
  publicUrl: string;
  thumbnailUrl: string | null;
  title: string | null;
  caption: string | null;
  altText: string | null;
  mimeType: string;
  role: "cover" | "gallery" | "attachment" | "audio" | "video";
  downloadSizeBytes: number | null;
  derivatives: PublicMediaDerivative[];
}
```

### 3.3 Fecha Histórica (`PublicHistoricalDate`)
Consolida la temporalidad del aporte garantizando coherencia lógica entre fechas exactas e intervalos estimados.
```typescript
export interface PublicHistoricalDate {
  precision: "exact" | "year" | "decade" | "approximate" | "unknown";
  isoDate: string | null;
  year: number | null;
  decade: number | null;
  displayLabel: string | null;
}
```

---

## 4. Ejemplos de Payloads (Transformación de un Aporte)

### Entrada Editorial (Insegura para el público)
```json
{
  "id": "99999999-9999-4999-8999-999999999999",
  "title": "Plano de la vieja Estación YPF",
  "description": "Plano donado por la familia.",
  "internal_notes": "Revisar veracidad histórica con Adrián.",
  "content_type": "documentary",
  "editorial_status": { "code": "validated", "name": "Validado" },
  "publication_status": { "code": "published", "name": "Publicado" },
  "consent_verified": true,
  "authorization_level": "A",
  "credit_preference": "Iniciales",
  "contributor": {
    "full_name": "Juan Carlos Pérez",
    "email": "juan.perez.privado@gmail.com",
    "phone": "+542971234567"
  },
  "files": [
    {
      "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "file_name": "plano_estacion_dni_copia.pdf",
      "file_size": 1048576,
      "file_role": "attachment",
      "processing_status": "completed"
    },
    {
      "id": "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
      "file_name": "autorizacion_firmada.pdf",
      "file_size": 524288,
      "file_role": "consent_document",
      "processing_status": "completed"
    }
  ]
}
```

### Salida Pública (Contrato Whitelist de PublicContribution)
```json
{
  "id": "99999999-9999-4999-8999-999999999999",
  "slug": "plano-de-la-vieja-estacion-ypf-mv-doc-2026-9999",
  "title": "Plano de la vieja Estación YPF",
  "contentType": "documentary",
  "description": "Plano donado por la familia.",
  "historicalDate": {
    "precision": "unknown",
    "isoDate": null,
    "year": null,
    "decade": null,
    "displayLabel": "Fecha desconocida"
  },
  "relatedPlace": null,
  "mentionedPeople": [],
  "mentionedInstitutions": [],
  "historicalContext": null,
  "catalogCode": null,
  "publishedAt": "2026-07-21T01:40:00.000Z",
  "updatedAt": "2026-07-21T01:40:00.000Z",
  "credits": {
    "attributionType": "initials",
    "displayName": "J. C. P."
  },
  "media": [
    {
      "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "mediaType": "document",
      "publicUrl": "/api/public/media/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "thumbnailUrl": null,
      "title": null,
      "caption": null,
      "altText": null,
      "mimeType": "application/pdf",
      "role": "attachment",
      "downloadSizeBytes": 1048576,
      "derivatives": []
    }
  ],
  "references": []
}
```

---

## 5. Buenas Prácticas y Mantenimiento de la Lista Blanca

1. **Nunca utilizar spread operators (`...`)**: Al mapear entidades de entrada a salida, escriba siempre de forma explícita la correspondencia de propiedades para evitar que columnas nuevas de la base de datos se infiltren en el payload público.
2. **Esquemas estrictos**: Todos los esquemas Zod públicos deben retener la llamada a `.strict()`. Si se añade una nueva propiedad pública, esta debe declararse primero en la interfaz de TypeScript (`types/`), posteriormente en el validador Zod (`validation/`), y finalmente en el mapeador (`mappers/`).
3. **Ofuscación de metadatos de archivos**: Jamás incorpore el nombre técnico del archivo original en el payload público. Si la interfaz del portal requiere dar la opción de descarga con un nombre limpio, genere una cadena a partir de la signatura o slug (ej. `MV-TXT-2026-0044.txt`).
4. **Fechas coherentes**: Al manipular fechas, utilice siempre `toPublicHistoricalDate` para asegurar que el año, la década y la etiqueta de visualización se sincronicen correctamente a partir de la precisión disponible.

---

## 6. Restricciones y Limitaciones

- **Sin acceso directo a RLS**: El frontend del portal público no debe realizar consultas directas contra Supabase utilizando roles administrativos o bypasses de RLS. Toda la recolección debe ocurrir en el backend del Portal consumiendo esta capa de contratos.
- **Archivos privados**: No se permite la exposición de URLs firmadas de Supabase Storage correspondientes al bucket `historical-uploads` directamente al cliente público. El Portal resolverá los recursos multimedia a través de rutas controladas (como `/api/public/media/[id]`) y servirá las variantes optimizadas (derivados) una vez implementadas en la etapa 4.1.3.
- **Historias públicas**: Dado que no existen tablas editoriales de historias en esta etapa, el Portal interactuará con el mapper `toPublicStory` proveyendo un DTO temporal (`PublicStoryInput`) para preparar la visualización agrupada de aportes.
