# Catálogo de Indicadores Editoriales

Los **Indicadores Editoriales** (`editorial_indicator`) representan banderas de advertencia utilizadas por el equipo para identificar y resolver pendientes técnicos, legales o de contenido antes de que un aporte sea elegible para su publicación.

---

## Catálogo de Indicadores Iniciales

A continuación se detalla la configuración inicial sembrada en la base de datos:

| Código / ID Técnico | Nombre en Pantalla | Color / Icono | Criterio de Activación | Instrucciones de Resolución | Bloquea Pub. |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `missing_files` | Archivos faltantes | `red` / `file-warning` | Faltan subir archivos o su tamaño supera el límite admitido. | Solicitar el envío correcto de los documentos al aportante y subirlos a la plataforma. | **Sí** |
| `missing_information` | Información faltante | `orange` / `file-text` | Descripción del recuerdo vacía o incongruente con los datos biográficos. | Completar los metadatos obligatorios entrevistando telefónicamente al aportante. | No |
| `transcription_pending` | Transcripción pendiente | `blue` / `history` | Audios o videos cargados que no cuentan con su transcripción a texto. | Transcribir el archivo multimedia utilizando herramientas automáticas o manuales. | No |
| `historical_validation` | Pendiente validación histórica | `purple` / `shield-alert` | Datos biográficos, fechas o hechos clave que no han sido contrastados. | Corroborar fechas o eventos con el archivo histórico de la ciudad o referencias locales. | No |
| `doubtful_authenticity` | Duda de autenticidad | `amber` / `help-circle` | Coherencia del testimonio o procedencia del material en duda. | Solicitar confirmación de propiedad intelectual o referencias de otros testimonios. | No |
| `sensitive_content` | Contenido sensible | `orange` / `lock` | Mención de datos privados protegidos o hechos conflictivos locales. | Editar u omitir extractos que violen la privacidad personal antes de la publicación. | No |
| `technical_issue` | Problema técnico | `red` / `settings` | Audios corruptos, imágenes de muy baja resolución o videos desincronizados. | Intentar reprocesar o restaurar el archivo original. | **Sí** |
| `consent_pending` | Consentimiento pendiente | `red` / `lock` | Firma física o digital del acuerdo legal no verificada. | Contactar al aportante para formalizar la firma del formulario de consentimiento. | **Sí** |

---

## Ciclo de Vida y Trazabilidad

A diferencia del estado de publicación, los indicadores son aditivos e históricos.

### Estados de un Indicador
* **Activo (`is_active = TRUE`)**: La alerta está vigente. El usuario puede verla en la ficha editorial y en el listado de aportes.
* **Resuelto (`is_active = FALSE`)**: Un miembro de la mesa editorial solucionó el inconveniente. La fila almacena quién lo resolvió (`resolved_by`) y cuándo (`resolved_at`).

### Reactivación
Si un problema técnico o administrativo reaparece tras haber sido marcado como resuelto:
1. El sistema **no** sobrescribe la fila resuelta.
2. Crea una nueva fila en `contribution_editorial_indicators` con `is_active = TRUE`.
3. Esto permite conservar el historial completo de ciclos editoriales por aporte para fines de auditoría y análisis de rendimiento operativo.
