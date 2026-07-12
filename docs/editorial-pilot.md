# Piloto Editorial: Observaciones y Seguimiento de Aportes Reales

Este documento detalla los resultados, observaciones y el proceso de trabajo con los primeros aportes reales recibidos en la plataforma **Memoria Viva Pico Truncado**. La experiencia obtenida durante esta fase piloto servirá como base empírica para la futura Arquitectura Editorial Inteligente.

---

## 1. Objetivos del Piloto

- **Validación del Flujo Editorial**: Observar la transición de estados de los aportes reales desde su recepción hasta su clasificación final.
- **Detección de Brechas de Información**: Identificar qué datos faltan con mayor frecuencia en la carga inicial de los vecinos.
- **Control de Tiempos**: Medir los tiempos requeridos por los gestores del archivo para realizar transcripciones, verificaciones de firmas y catalogación histórica.
- **Evaluación Legal**: Validar la consistencia de los niveles de autorización y preferencias de créditos seleccionadas.

---

## 2. Metodología de Observación

- **Seguimiento Individual**: Auditoría paso a paso del historial de modificaciones en la bitácora de cada aporte.
- **Monitoreo de Carga**: Análisis de la calidad del contenido ingresado directamente por los aportantes en el formulario web público.
- **Entrevistas Internas**: Reunión con Edith Gómez (Centro Chileno) y Adrián Montet (Unión Vecinal Barrio YPF) para recopilar comentarios sobre la usabilidad del panel de administración.

---

## 3. Decisiones Editoriales Adoptadas

- **Nivel de Autorización**: Asignar "Nivel A (Público)" únicamente tras verificar la firma en el formulario digital o la imagen de la planilla física (Caso 2). De lo contrario, mantener en "Nivel C (Interno)" por precaución.
- **Títulos de Aportes**: Se determinó que los títulos cargados por el usuario suelen ser automáticos o descriptivos del formulario (ej. "Lugar de nacimiento: Comodoro Rivadavia"). El equipo editorial modificará el título para hacerlo más representativo del valor histórico antes de la aprobación (ej. "Llegada del pionero Andrés Freile").

---

## 4. Tiempos de Procesamiento Estimados

- **Revisión Inicial**: 5 a 10 minutos por aporte para verificar datos de contacto y consistencia básica.
- **Transcripción de Audios (Caso 2/3)**: 30 a 45 minutos por cada 10 minutos de grabación oral de pioneros.
- **Validación Histórica**: 1 a 2 horas (involucra contrastar nombres de comercios o fechas de arribo con actas del Centro Chileno).

---

## 5. Problemas Detectados y Mejoras Sugeridas

1. **Títulos Redundantes / Poco Descriptivos**: Los usuarios a menudo ingresan respuestas a las preguntas del wizard como título (ej. "Lugar de nacimiento...").
   - *Mejora Sugerida*: Implementar una sugerencia de título asistida en el formulario público o autogenerarlo combinando nombre del aportante y tipo de material si se deja vacío.
2. **Campos Opcionales Vacíos**: Contexto histórico o nombres mencionados usualmente quedan en blanco.
   - *Mejora Sugerida*: Agregar placeholders descriptivos y ejemplos dinámicos locales (ej. "Ej: Vecinos de la fonda de Don Pepe en la década del 50").
3. **Calidad de Archivos Adjuntos**: Algunas fotografías históricas se cargan con baja resolución o en formatos móviles de compresión pesada.
   - *Mejora Sugerida*: Alerta en frontend si la resolución es menor a 1200px o sugerencia de digitalización directa por el equipo.

---

## 6. Fichas Normalizadas de Aportes Tratados

A continuación se detallan las fichas correspondientes a los primeros 3 aportes reales cargados en la plataforma:

### Ficha Aporte 1
- **Signatura de Catálogo**: `MV-TXT-2026-0001`
- **Título Original**: "Lugar de nacimiento: Comodoro rivadavia"
- **Tipo de Aporte**: Testimonio escrito
- **Aportante**: Andrés Freile
- **Fecha de Carga**: 08/07/2026 23:40 (Hora de Argentina)
- **Estado Editorial**: Recibido
- **Responsable de Revisión**: Edith Gómez
- **Tiempo de Procesamiento Estimado**: 15 minutos (revisión inicial)
- **Problemas Detectados**: El título es un dato demográfico genérico. El relato del testimonio es breve y carece de detalles sobre el año de arribo a Pico Truncado.
- **Acciones Realizadas**:
  - Se contactó telefónicamente al aportante para expandir los detalles de su relato.
  - Se cambió el estado a "Datos incompletos" en espera de la ampliación.
- **Datos Faltantes**: Década aproximada de radicación en la localidad y contexto familiar.
- **Mejoras Sugeridas**: Separar en el wizard de carga una pregunta explícita sobre el "Año/Década de llegada a Pico Truncado" en lugar de dejarla dentro de la descripción general.

---

### Ficha Aporte 2
- **Signatura de Catálogo**: `MV-TXT-2026-0002`
- **Título Original**: "Lugar de nacimiento: Mendoza"
- **Tipo de Aporte**: Testimonio escrito
- **Aportante**: Marianela iperiche
- **Fecha de Carga**: 08/07/2026 23:46 (Hora de Argentina)
- **Estado Editorial**: Recibido
- **Responsable de Revisión**: Adrián Montet
- **Tiempo de Procesamiento Estimado**: 10 minutos
- **Problemas Detectados**: Nombre del aportante ingresado con minúscula inicial ("iperiche"). Título no representativo del testimonio.
- **Acciones Realizadas**:
  - Corrección gramatical del nombre del aportante en la ficha de administración.
  - Clasificación interna temporal en estado "En revisión".
- **Datos Faltantes**: Relación biográfica explícita con la ciudad (por qué nació en Mendoza pero aporta a Pico Truncado).
- **Mejoras Sugeridas**: Aplicar capitalización automática (`capitalize`) en el campo de Nombre Completo del aportante en el frontend.

---

### Ficha Aporte 3
- **Signatura de Catálogo**: `MV-TXT-2026-0003`
- **Título Original**: "Lugar de nacimiento: Comodoro Rivadavia"
- **Tipo de Aporte**: Testimonio escrito
- **Aportante**: Elizabeth Viviana
- **Fecha de Carga**: 08/07/2026 23:52 (Hora de Argentina)
- **Estado Editorial**: Recibido
- **Responsable de Revisión**: Edith Gómez
- **Tiempo de Procesamiento Estimado**: 12 minutos
- **Problemas Detectados**: Título idéntico al Aporte 1. Falta el apellido de la aportante (cargó solo "Elizabeth Viviana").
- **Acciones Realizadas**:
  - Búsqueda en el padrón interno del Centro Chileno para intentar asociar el apellido.
  - Clasificación en estado "En revisión" e indicación de contacto pendiente.
- **Datos Faltantes**: Apellido de la aportante y autorización explícita para publicación con nombre completo (al no tener apellido, la preferencia de crédito "Nombre completo" se dificulta).
- **Mejoras Sugeridas**: Hacer obligatorio el campo de Apellido (o validar que contenga al menos dos palabras el campo Nombre Completo) en el formulario de aportante.

---

## 7. Mejoras de la Versión 1 (Piloto Editorial)

A partir de las observaciones anteriores, se implementaron las siguientes mejoras operativas:

### 1. Flexibilización del Correo Electrónico
- **Contexto:** Se detectaron aportantes de avanzada edad que no disponen de dirección de correo electrónico.
- **Cambio técnico:** La columna `contributors.email` se modificó a nullable. Las validaciones de frontend y APIs normalizan strings vacíos a `NULL` en PostgreSQL, evitando la inyección de valores genéricos o ficticios (ej: "—").

### 2. Tratamiento de Archivos Excedidos (> 50 MB)
- **Contexto:** La plataforma web restringe la subida directa a 50 MB por rendimiento de red.
- **Cambio técnico:** Los archivos pesados se identifican en el navegador y se excluyen de la subida local. El aporte se guarda con éxito, registrando los nombres y tamaños de los archivos excedidos en la tabla `oversized_file_notices` en estado `pending`.
- **Alertas y Carga Posterior:** Se diseñó una campanita interactiva con notificaciones internas en el panel administrativo. Los operadores resguardan externamente el material master, generan una copia comprimida <= 50 MB, y la vinculan al aporte existente resolviendo los avisos pendientes.

---

## 8. Comentarios del Equipo Editorial

> "Es muy valioso contar con el registro de auditoría en la hora oficial de nuestro país (Buenos Aires). Al revisar la carga de testimonios que ocurren tarde en la noche, podemos asociarlos con precisión a las planillas físicas de entrevistas recolectadas ese mismo día."
> — *Edith Gómez, Centro Chileno*

> "Pausar los cambios de base de datos nos permite familiarizarnos con la carga web sin temor a perder la información histórica que los pioneros ya se animaron a cargar. El cambio de títulos y formato de nombres es nuestra prioridad número uno antes de publicar."
> — *Adrián Montet, Unión Vecinal Barrio YPF*
