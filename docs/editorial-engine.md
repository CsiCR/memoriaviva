# Motor Editorial - Etapa 3A: Motor de Elegibilidad (Reglas v1.0 / Plataforma v3.0.1)

Este documento detalla las especificaciones técnicas del **Motor Editorial** y sus reglas en la plataforma Memoria Viva Pico Truncado.

El motor es un módulo de lógica pura desacoplado de la base de datos y de la interfaz de usuario, responsable de diagnosticar la calidad e idoneidad de un aporte para su divulgación pública.

---

## 1. Estructura del Módulo

El motor se encuentra centralizado en la carpeta `src/lib/editorial/` y se compone de los siguientes archivos:

*   **`editorialConstants.ts`**: Centraliza los conjuntos de códigos estables (como autorizaciones públicas y estados elegibles), mappers y la utilidad `isUsableEditorialFile`.
*   **`types.ts`**: Interfaces TypeScript para la entrada del aporte, incidencia estructurada (`EditorialIssue`) y salida evaluada (`EditorialEvaluation`).
*   **`editorialMessages.ts`**: Catálogo unificado de mensajes de aviso y próximas acciones del sistema.
*   **`editorialScore.ts`**: Algoritmo para el cálculo del puntaje de calidad informativa sobre 100 puntos.
*   **`editorialRules.ts`**: Orquestación y lógica secuencial de las reglas del negocio de elegibilidad (E1 a E8).
*   **`evaluateContribution.ts`**: Punto de entrada de la función pura `evaluateContribution`.

---

## 2. Definición de la Entrada (`ContributionInput`)

El motor opera exclusivamente sobre un objeto en memoria con la siguiente estructura:

```typescript
export interface ContributionInput {
  id?: string;
  title?: string | null;
  description?: string | null;
  internal_notes?: string | null;
  content_type?: "textual" | "documentary" | "audiovisual" | "mixed" | null;
  editorial_status: {
    id?: string | null;
    code: string | null;
    name: string | null;
  } | null;
  publication_status: {
    id: string | null;
    code: string | null;
    name: string | null;
  } | null;
  publication_notes?: string | null;
  publication_scheduled_at?: string | null;
  consent_verified: boolean;
  authorization_level: string | null;
  credit_preference: string | null;
  consent_source: string | null;
  historical_validation_status?: "not_evaluated" | "pending" | "validated" | "not_required" | null;
  contributor?: {
    full_name: string;
    email?: string | null;
    phone?: string | null;
    relation_to_city?: string | null;
  } | null;
  files?: Array<{
    id?: string;
    file_name: string;
    file_size?: number;
    file_role?: string | null;
    processing_status?: string | null;
  }>;
  consent_records?: Array<{
    accepted_at?: string | null;
    authorization_level?: string | null;
  }>;
  active_indicators?: Array<{
    id: string;
    category: string;
    value: string;
    name: string;
    code: string | null;
    metadata?: {
      blocks_publication?: boolean;
      help_key?: string;
      severity?: "info" | "warning" | "blocking" | "critical";
    } | null;
  }>;
}
```

---

## 3. Reglas de Elegibilidad

*   **E1 — Consentimiento**: Se requiere consentimiento verificado (`consent_verified === true`). De lo contrario, `eligibleForPublication = false` y se registra una incidencia de bloqueo.
*   **E2 — Autorización**: El nivel de autorización debe permitir la difusión pública (códigos válidos: `"A"`, `"public"`, o `"public_with_credit"`). Si no se cumple, se bloquea la elegibilidad.
*   **E3 — Estado Editorial**: El aporte solo es elegible si pertenece al conjunto de estados de publicación habilitantes: `"validated"`, `"approved_archive"`, `"approved_for_archive"`, o `"completed"`.
*   **E4 — Indicadores Bloqueantes**: Cualquier indicador activo con la bandera `blocks_publication === true` (o severidad de bloqueo) invalida la elegibilidad.
*   **E5 — Archivos y Tipo de Aporte**:
    *   Si no se ha especificado el tipo de aporte y la lista de archivos está vacía, se asume bloqueo por falta de tipo de aporte.
    *   Si es de tipo `"textual"` y no tiene archivos, se permite su elegibilidad generando solo una advertencia.
    *   Si es de tipo `"documentary"`, `"audiovisual"` o `"mixed"` y no posee archivos válidos, se genera bloqueo de elegibilidad.
*   **E6 — Publicado con Bloqueo Posterior**: Si el estado de publicación actual es `"published"` y se detecta alguna incidencia de bloqueo posterior, se genera una incidencia de severidad `"critical"`.
*   **E7 — Recomendación de Publicación**: Si el aporte es elegible y no se encuentra ya marcado como `"publishable"` o `"published"`, se recomienda transicionar a `"publishable"`.
*   **E8 — Sin Escrituras Automáticas**: El motor actúa de forma pasiva y consultiva.

---

## 4. Algoritmo del Puntaje de Calidad (100 puntos)

El puntaje se compone de seis dimensiones de evaluación estructuradas:

1.  **Consentimiento y Autorización (20 pts)**:
    *   10 pts por consentimiento verificado.
    *   10 pts por nivel de autorización compatible con internet.
2.  **Descripción del Aporte (15 pts)**:
    *   15 pts si tiene 50 caracteres o más.
    *   8 pts si tiene entre 10 y 49 caracteres.
3.  **Material Requerido (20 pts)**:
    *   20 pts si es textual (los archivos son opcionales para la elegibilidad), o si requiere material y cuenta con al menos un archivo útil y procesado.
4.  **Indicadores de Control (20 pts)**:
    *   20 pts iniciales. Se restan 5 pts por cada indicador bloqueante/crítico activo, y 2 pts por cada indicador no bloqueante activo. Mínimo de 0 pts.
5.  **Validación Histórica (15 pts)**:
    *   15 pts si existe evidencia explícita de validación (estado `"validated"`, `"not_required"`, o presencia del indicador `historical_validation_completed`).
6.  **Estado Editorial (10 pts)**:
    *   10 pts si es un estado avanzado de publicación. 5 pts para estados intermedios.

---

## 5. Ejecución del Diagnóstico

El motor es ejecutado en tiempo de renderizado de React mediante `useMemo` dentro de la interfaz `ContributionEditForm` y retorna un informe completo en tiempo real con las incidencias, advertencias, puntaje de calidad y siguientes pasos de acción recomendados.

---

## 6. Coexistencia con el Motor de Progreso Editorial (Etapa 3B.1)

A partir de la versión **v3.1.0**, la plataforma incorpora de forma paralela y desacoplada el **Motor de Progreso Editorial** (Reglas P1-P9 / Módulo `src/lib/editorial/progress/`). 

El Motor de Elegibilidad (E1–E8) se mantiene intacto e independiente, garantizando que no existan interferencias entre la lógica binaria de publicación y el cálculo de avance editorial continuo. Ambos motores son funciones puras que operan sobre sus respectivos contratos y se previsualizan de forma dinámica e independiente en la interfaz.
