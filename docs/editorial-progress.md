# Motor de Progreso Editorial — Especificaciones de la Etapa 3B.1 (v1.0 / Plataforma v3.1.0)

Este documento detalla las especificaciones técnicas del **Motor de Progreso Editorial** y sus reglas en la plataforma Memoria Viva Pico Truncado.

---

## 1. Objetivo y Filosofía

El **Motor de Progreso Editorial** es un módulo de lógica pura determinística y reutilizable responsable de medir cuantitativa y cualitativamente el avance del trabajo editorial realizado sobre un aporte. Responde a preguntas de gestión como:
* ¿Qué porcentaje del trabajo editorial está completado?
* ¿En qué etapa formal de progreso se encuentra el aporte?
* ¿Qué tareas ya están completas, cuáles están pendientes y cuáles bloqueadas?
* ¿Cuál es la próxima acción recomendada prioritaria?

### Diferencias Clave con el Motor de Elegibilidad

| Característica | Motor de Elegibilidad (E1–E8) | Motor de Progreso (P1–P9) |
| :--- | :--- | :--- |
| **Pregunta Central** | ¿El aporte cumple las condiciones mínimas de seguridad para ser expuesto en el portal público? | ¿Cuánto esfuerzo editorial se ha invertido en este aporte y qué queda pendiente? |
| **Resultado** | Binario (`eligibleForPublication: boolean`) + lista de incidencias críticas. | Escalar (`progress: 0–100`) + etapa actual (`EditorialProgressStage`) + tareas detalladas. |
| **Comportamiento** | Restrictivo y de cumplimiento estricto de políticas. | Informativo, consultivo y de guía de flujo de trabajo. |
| **Bloqueo** | Impide que el estado de publicación sea `"published"`. | Indica cuellos de botella (`blockedItems`) que obstruyen el hito formal (etapa), pero **no** capan el porcentaje de progreso. |

---

## 2. Estructura de Archivos del Módulo

El motor reside en `src/lib/editorial/progress/` y se compone de los siguientes archivos:
* **`progressTypes.ts`**: Contiene la definición de los contratos de entrada (`EditorialProgressInput`), salida (`EditorialProgressResult`), ítems de progreso y recomendaciones.
* **`progressConstants.ts`**: Define los pesos de las 9 dimensiones de puntuación, el ordenamiento de prioridades de las recomendaciones y las etapas estables.
* **`progressMessages.ts`**: Centraliza los títulos, severidades y explicaciones de cada recomendación editorial.
* **`progressScore.ts`**: Implementa las fórmulas y reglas puras para calcular el puntaje de cada una de las 9 dimensiones (P1 a P9).
* **`progressStages.ts`**: Traduce la combinación de progreso e hitos obligatorios a la etapa editorial del aporte.
* **`progressRules.ts`**: Organiza las tareas en completadas, pendientes y bloqueadas, y calcula códigos estructurados de bloqueos y conflictos.
* **`evaluateEditorialProgress.ts`**: Orquesta el cálculo completo, normaliza entradas y genera el informe resumido final.
* **`mapContributionToProgressInput.ts`**: Adapta el formato de datos real de Supabase al contrato del motor de progreso de manera aislada.

---

## 3. Modelo de Puntaje (100 puntos) y Reglas P1–P9

El puntaje mide de forma continua el volumen de trabajo editorial completado. Está dividido en 9 dimensiones fijas:

1. **P1 — Identificación Básica (Hasta 10 pts):**
   * Título presente: 3 pts.
   * Aportante identificado (id o nombre): 3 pts.
   * Tipo de contenido especificado: 2 pts.
   * Fecha de recepción registrada: 2 pts.
2. **P2 — Descripción Editorial (Hasta 10 pts):**
   * Descripción vacía: 0 pts.
   * Menos de 40 caracteres: 4 pts (descripción parcial/incompleta).
   * 40 caracteres o más: 10 pts (descripción suficiente).
3. **P3 — Consentimiento Válido (Hasta 20 pts):**
   * `consent.verified === true`: 20 pts.
   * Caso contrario: 0 pts (Genera un ítem bloqueado prioritario `BLOCK_NO_CONSENT`).
4. **P4 — Archivos o Contenido Utilizable (Hasta 15 pts):**
   * Si es de tipo `"textual"` (Testimonio escrito): 15 pts por defecto (los archivos multimedia son opcionales).
   * Para otros tipos (Fotografía, Audio, Video, Documento, Mixto): 15 pts si posee al menos un archivo digital utilizable (ruta no vacía y estado no fallido/eliminado). Si no posee archivos útiles: 0 pts (Genera bloqueo `BLOCK_MISSING_REQUIRED_FILES`).
5. **P5 — Procesamiento Editorial (Hasta 10 pts):**
   * Estado editorial clasificado (código canonical distinto de `"received"` e `"incomplete"`): 10 pts.
   * Estado inicial o ausente: 0 pts.
6. **P6 — Revisión Editorial (Hasta 10 pts):**
   * Intervención editorial realizada (`hasEditorialIntervention === true`): 4 pts.
   * Notas de revisión internas provistas: 3 pts.
   * Estado editorial en revisión o superior: 3 pts.
7. **P7 — Validación Histórica (Hasta 15 pts):**
   * Validación aprobada (`validated`) o no requerida (`not_required`): 15 pts.
   * Validación pendiente (`pending`): 5 pts.
   * Validación rechazada (`rejected`) o sin datos: 0 pts.
8. **P8 — Indicadores Resueltos (Hasta 5 pts):**
   * Sin indicadores activos o solo informativos: 5 pts.
   * Algún indicador de advertencia (`warning`) activo: 2 pts.
   * Algún indicador crítico o bloqueante activo: 0 pts (Genera bloqueo `BLOCK_ACTIVE_CRITICAL_INDICATORS`).
9. **P9 — Preparación / Publicación (Hasta 5 pts):**
   * Estado de publicación `"published"`: 5 pts.
   * Estado listo (`publishable` / `ready` / `scheduled`): 4 pts.
   * Estado borrador / revisión (`draft` / `review`): 2 pts.
   * Sin estado o no evaluado: 0 pts.

---

## 4. Etapas del Progreso Editorial y Capado Formal

La etapa editorial representa el hito formal alcanzado y se determina combinando el puntaje obtenido y el cumplimiento de hitos obligatorios:

* **`RECEIVED`** (Recibido - Rango 0–14): Aporte recién ingresado al sistema. Cae aquí si no ha sido clasificado.
* **`CLASSIFIED`** (Procesamiento Editorial - Rango 15–29): Aporte clasificado. Se requiere descripción mínima suficiente para superar esta etapa.
* **`DOCUMENTED`** (Documentación y Archivos - Rango 30–49): Datos y archivos cargados. Se requiere archivo útil (para tipos no textuales) para superarla.
* **`UNDER_REVIEW`** (En Revisión Editorial - Rango 50–69): En revisión. Se requiere consentimiento verificado y ausencia de indicadores críticos para superarla.
* **`HISTORICAL_VALIDATION`** (Validación Histórica - Rango 70–89): Validación en curso. Se requiere validación histórica completada (o marcada no requerida) para avanzar.
* **`READY_FOR_PUBLICATION`** (Listo para Publicar - Rango 90–99): Cumple todos los hitos y está listo.
* **`PUBLISHED`** (Publicado - 100): Forzado si el estado de publicación es publicado, independientemente del puntaje de progreso.

### Regla de Independencia de Porcentaje

El porcentaje de progreso **no es capado** por las limitaciones de etapa. Mide estrictamente la suma de trabajos realizados. Así, un aporte puede tener un **95% de progreso** (porcentaje de trabajo) pero encontrarse en la etapa **`UNDER_REVIEW`** debido a que no tiene consentimiento verificado.

---

## 5. Recomendaciones Priorizadas y Acciones

Las recomendaciones se ordenan de mayor a menor prioridad según la constante `PROGRESS_ACTION_PRIORITY`:

1. `ADD_CONSENT` (Prioridad 100) — Bloqueante.
2. `RESOLVE_BLOCKING_INDICATOR` (Prioridad 95) — Bloqueante.
3. `ADD_REQUIRED_FILE` (Prioridad 90) — Bloqueante.
4. `COMPLETE_DESCRIPTION` (Prioridad 80) — Advertencia.
5. `START_EDITORIAL_PROCESSING` (Prioridad 70) — Informativa.
6. `START_EDITORIAL_REVIEW` (Prioridad 60) — Informativa.
7. `ADD_REVIEW_NOTES` (Prioridad 50) — Informativa.
8. `REQUEST_HISTORICAL_VALIDATION` (Prioridad 40) — Informativa.
9. `MARK_READY_FOR_PUBLICATION` (Prioridad 20) — Informativa.
10. `PUBLISH_CONTRIBUTION` (Prioridad 10) — Informativa.

La recomendación activa de mayor prioridad se expone como `nextAction`.

---

## 6. Detección de Inconsistencias y Conflictos

* **`CONFLICT_HISTORICAL_VALIDATION`**: Se detecta si hay contradicción entre los campos estructurados (por ejemplo, validación histórica marcada como `"validated"` pero con el indicador activo de `"historical_validation_pending"`).
* **`hasPostPublicationInconsistencies`**: Se marca como `true` si el aporte está publicado (`isPublished === true`) pero cuenta con algún bloqueo activo (como falta de consentimiento verificado o archivos requeridos ausentes).

---

## 7. Integración en la Interfaz de Usuario (UI)

El panel **Progreso Editorial** se integra dentro del formulario `ContributionEditForm` de forma visualmente independiente del **Motor Editorial** tradicional.

### Previsualización en Tiempo Real y `isDirty`
El componente cliente calcula en tiempo real dos instancias del motor usando `useMemo`:
1. `savedProgressResult`: Progreso real guardado en la base de datos (basado en props iniciales).
2. `currentProgressResult`: Progreso en edición (basado en el estado actual de los inputs del formulario).

Si el usuario altera cualquier control antes de presionar "Guardar", se detecta el estado `isDirty` y el panel muestra un aviso destacando que se visualiza una **"Vista previa (cambios no guardados)"**.

---

## 8. Limitaciones y Evolución Futura (Etapa 3B.2)

* **Limitación actual**: La asignación de editor es virtual e inferida (`hasEditorialIntervention`), ya que la tabla de aportes no cuenta con un campo físico de asignación en esta etapa.
* **Evolución 3B.2**: La futura Etapa 3B.2 consumirá los resultados de este motor (como los códigos estructurados de bloqueo, la etapa actual y el porcentaje) para generar vistas agregadas del panel de control de la institución, calcular tiempos de permanencia por etapa e identificar cuellos de botella globales.

---

## 9. Evolución del Motor Editorial

| Versión | Etapa | Incorporación / Hito |
| :--- | :--- | :--- |
| **3.0.0** | 3A | Motor de Elegibilidad (E1–E8) |
| **3.0.1** | Patch | Consistencia de consentimiento ( triggers SQL) |
| **3.1.0** | 3B.1 | Motor de Progreso Editorial (P1–P9) |
| **3.2.0** | 3B.2 | Dashboard Editorial (planificado) |
