# Arquitectura Editorial: Modelo de Tres Dimensiones

Este documento describe la arquitectura y diseño técnico de las tres dimensiones del flujo de trabajo de contenidos en la plataforma **Memoria Viva Pico Truncado**.

## Introducción y Filosofía
Para evitar cuellos de botella y confusiones operativas en la validación de testimonios históricos, la plataforma separa formalmente la gestión en tres dimensiones independientes pero correlacionadas:

1. **Estado Editorial**: Representa el estado administrativo del procesamiento del aporte. Es único.
2. **Indicadores Editoriales**: Alertas y advertencias para documentar aspectos pendientes (ej. falta consentimiento, archivos dañados). Pueden existir múltiples simultáneamente.
3. **Estado de Publicación**: Controla la disponibilidad del aporte para ser expuesto en el portal público o programar su salida. Es único.

```
       ┌────────────────────────────────────────────────────────┐
       │                  Aporte (Contribution)                 │
       └─────┬───────────────────┬────────────────────────┬─────┘
             │                   │                        │
             ▼                   ▼                        ▼
 ┌──────────────────────┐  ┌───────────┐            ┌───────────┐
 │   Estado Editorial   │  │Indicador A│ (Bloquea)  │ Estado de │
 │  (Único, Adm. Local) │  ├───────────┤ ──────────►│Publicación│
 └──────────────────────┘  │Indicador B│            │  (Único)  │
                           └───────────┘            └───────────┘
```

---

## Modelo de Datos

### Tabla: `public.select_options`
Esta tabla canónica actúa como el catálogo administrable de opciones del sistema. Se agregaron y renombraron columnas para uniformar el diseño:
* `name` (antes `label`): Nombre visible en pantalla.
* `display_order` (antes `sort_order`): Orden de despliegue.
* `code`: Clave única para opciones del sistema (inmutable).
* `is_system`: Bandera booleana para proteger configuraciones críticas de eliminación.
* `description`: Explicación detallada del propósito de la opción, consumida dinámicamente por la ayuda contextual.
* `metadata`: JSONB para almacenar parámetros de presentación (`color`, `icon`) y validación de negocio (`blocks_publication`, `requires_publication_date`).

### Tabla Relacional: `public.contribution_editorial_indicators`
Mapea de forma asíncrona múltiples indicadores simultáneos a un aporte:
* `contribution_id`: Referencia al aporte.
* `indicator_option_id`: Referencia a la opción de la categoría `editorial_indicator`.
* `is_active`: Estado lógico (activo/resuelto).
* `resolved_at` / `resolved_by`: Trazabilidad e historial de resolución.

### Índice Único y Prevención de Duplicados Activos
Para evitar colisiones lógicas, se creó un índice único parcial que restringe a lo sumo un registro activo por indicador y por aporte:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_indicator_per_contribution 
ON public.contribution_editorial_indicators (contribution_id, indicator_option_id) 
WHERE is_active = TRUE;
```

---

## Funcionalidad Transaccional: RPC `update_editorial_dimensions`

Las modificaciones a los estados e indicadores se coordinan a nivel de base de datos a través de una función almacenada PL/pgSQL transaccional, garantizando atomicidad completa (rollback total en caso de fallos).

### Firma de la RPC
```sql
FUNCTION public.update_editorial_dimensions(
    p_contribution_id UUID,
    p_editorial_status TEXT,
    p_publication_status_option_id UUID,
    p_publication_scheduled_at TIMESTAMPTZ,
    p_internal_notes TEXT,
    p_active_indicator_option_ids UUID[]
) RETURNS VOID;
```

### Reglas de Validación Aplicadas
1. **Control de Fechas de Programación**: Si el estado de publicación seleccionado requiere fecha programada (ej. `scheduled`), `p_publication_scheduled_at` no puede ser nulo.
2. **Auditoría Automática**: Almacena de forma automática el usuario autenticado (`auth.uid()`) en los campos de auditoría.
3. **Resolución y Ciclos Históricos**: 
   * Todo indicador marcado en `p_active_indicator_option_ids` que no estaba presente se inserta como `is_active = TRUE`.
   * Todo indicador ausente en la lista que estaba previamente marcado como activo pasa a `is_active = FALSE`, completando `resolved_at = NOW()` y `resolved_by = auth.uid()`.
   * Si se vuelve a activar un indicador resuelto en el pasado, **no se sobrescribe la fila anterior**. Se genera un nuevo registro para conservar la trazabilidad histórica de los ciclos editoriales.

---

## Siguientes Etapas Pendientes

### Motor de Elegibilidad para Publicación
La automatización de bloqueos y la habilitación de publicación según el cumplimiento legal (consentimiento firmado y validación técnica/histórica libre de indicadores bloqueantes) se delegará a un motor de elegibilidad en la siguiente fase de desarrollo.
