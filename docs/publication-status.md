# Estados de Publicación y Reglas de Visibilidad

El **Estado de Publicación** (`publication_status`) controla la visibilidad pública de los aportes y la programación temporal para su despliegue en la plataforma.

---

## Catálogo de Estados de Publicación

| Código / ID Técnico | Nombre en Pantalla | Color / Icono | Propósito / Comportamiento | Requiere Fecha |
| :--- | :--- | :--- | :--- | :---: |
| `not_evaluated` | No evaluado | `gray` / `circle` | Estado inicial asignado automáticamente a todo aporte nuevo. | No |
| `not_publishable` | No publicable | `red` / `x-circle` | Aporte descartado de forma permanente por motivos editoriales o legales. | No |
| `publishable` | Publicable | `blue` / `check-circle` | Aporte validado y listo para ser expuesto, pendiente de programar. | No |
| `scheduled` | Programado | `amber` / `calendar` | Aporte con fecha y hora específicas programadas para su publicación. | **Sí** |
| `published` | Publicado | `green` / `eye` | Aporte expuesto activamente en el portal público (lógica no activa en Fase 1). | No |
| `withdrawn` | Retirado | `gray` / `eye-off` | Aporte previamente expuesto que fue retirado por solicitud o revisión. | No |

---

## Comportamiento de Fechas y Auditoría

La actualización del estado de publicación coordina automáticamente las siguientes columnas de fecha en la tabla `public.contributions`:

1. **`publication_scheduled_at`**:
   * Requerida cuando el estado es `scheduled`.
   * Si el estado cambia a otro valor, la fecha programada histórica **no se borra silenciosamente** de la base de datos para mantener constancia de la planificación.
2. **`published_at`**:
   * Completada automáticamente con la marca de tiempo actual (`NOW()`) cuando se establece el estado a `published`.
3. **`withdrawn_at`**:
   * Completada automáticamente con la marca de tiempo actual (`NOW()`) cuando se establece el estado a `withdrawn`.

---

## Integridad y Control Operativo

En esta etapa inicial del desarrollo:
* **No se bloquea la interfaz pública**: Las reglas de elegibilidad por indicadores y la publicación física automática aún no están implementadas.
* **Foco Administrativo**: El diseño actual prioriza el registro seguro de estados y auditoría a fin de estructurar el flujo de datos para la futura automatización.

---

## Siguientes Etapas Pendientes

### Motor de Elegibilidad para Publicación
En la siguiente fase se diseñará e implementará un motor de elegibilidad automatizado que evaluará activamente los indicadores del aporte (ej. `consent_pending`, `missing_files`) contra sus banderas de restricción (`blocks_publication`) para habilitar o impedir la transición hacia los estados `publishable` y `published`.
