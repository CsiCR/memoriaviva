# Plan de Estabilización (Post-Lanzamiento)
## Memoria Viva Pico Truncado — Etapa 6.0

Este plan define las actividades de soporte, monitoreo y mitigación de riesgos para las primeras **dos semanas (14 días)** posteriores al lanzamiento público del portal de producción. El objetivo es consolidar la resiliencia del sistema y corregir problemas críticos de manera estructurada.

---

### 1. Actividades Diarias de Monitoreo
Durante los primeros 14 días, el responsable de desarrollo/operaciones revisará a primera hora:
* **Logs de Servidor**: Análisis de excepciones registradas en la consola o el panel de Vercel.
* **Búsquedas sin Resultados**: Monitoreo de consultas infructuosas de usuarios en `/contributions` para evaluar si faltan sinónimos, etiquetas o contenidos relevantes.
* **Tiempos de Respuesta**: Identificación de consultas lentas en base de datos.
* **Estado de Storage**: Inspección del espacio consumido en el bucket `historical-uploads` y validación de archivos temporales/huérfanos.
* **Aportes Incompletos**: Revisión de registros que hayan quedado a medio catalogar o sin el consentimiento verificado.

---

### 2. Clasificación y Triage de Incidentes
Los problemas reportados o detectados se catalogarán bajo tres niveles de severidad:

| Severidad | Descripción | Ejemplo | Tiempo de Resolución (SLA) |
| :--- | :--- | :--- | :--- |
| **P1 - Crítico** | El sitio está caído, RLS está roto, fuga de datos privados o fallos de seguridad. | Error 500 generalizado, exposición de emails de colaboradores. | `< 2 horas` (Rollback inmediato si aplica) |
| **P2 - Mayor** | Alguna funcionalidad principal no responde pero el sitio sigue en línea. | El buscador no devuelve resultados, no cargan imágenes de portada. | `< 24 horas` (Despliegue correctivo) |
| **P3 - Menor** | Detalle estético, enlace roto menor o mejora de texto que no bloquea la navegación. | Mala alineación en móviles, errata tipográfica en el banner. | Siguiente ciclo de despliegue programado |

---

### 3. Frecuencia de Despliegues Correctivos
* **Durante fallos P1**: Los despliegues correctivos se realizarán de manera inmediata una vez testeados localmente y validados en Staging.
* **Durante fallos P2/P3**: Se agruparán en un despliegue de mantenimiento diario a última hora del día (fuera del horario pico de tráfico local) para evitar interrupciones de caché en navegadores.

---

### 4. Criterio de Rollback (Cuándo Revertir)
Se activará el plan de rollback de forma obligatoria si:
1. Un despliegue introduce un fallo de tipo **P1** que no puede corregirse ("hotfix") en un lapso de 30 minutos.
2. Se sospecha o confirma una intrusión en la seguridad o una vulnerabilidad de filtrado de datos privados en producción.
3. Se detecta corrupción de datos en la base de datos de producción debido a un cambio de esquema reciente.

---

### 5. Registro de Feedback de Usuarios
Se habilitará un canal de comunicación directo (correo de contacto o formulario discreto de sugerencias) para que los pioneros de la comunidad reporten problemas. Estos se registrarán de forma estructurada para alimentar el desarrollo de la siguiente etapa.
