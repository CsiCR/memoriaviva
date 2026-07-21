# Capítulo 1: Base de Datos, Storage y Políticas de Seguridad RLS
**Portal Público — Memoria Viva Pico Truncado**

Este documento detalla el análisis del esquema de base de datos actual, la estructura física de almacenamiento y las políticas Row Level Security (RLS) para el diseño del Portal Público.

---

## 1. Hechos Verificados (Evidencia del Esquema)

### 1.1 Estructura de Tablas Relacionadas
* **`public.contributors`**: Almacena datos personales sensibles de los aportantes.
  * *Evidencia*: [supabase/schema.sql:L12-L23](file:///c:/Users/pc/Documents/antigravity/memoriaviva/supabase/schema.sql#L12-L23)
  * *Campos*: `id`, `dni`, `full_name`, `phone`, `email`, `relation_to_city`, `neighborhood_or_institution`, `comments`, `allow_contact`, `created_at`.
* **`public.contributions`**: Contiene los metadatos principales del testimonio o material histórico.
  * *Evidencia*: [supabase/schema.sql:L35-L63](file:///c:/Users/pc/Documents/antigravity/memoriaviva/supabase/schema.sql#L35-L63) y parche de dimensiones en [supabase/migrations/202607142200_editorial_dimensions.sql:L31-L35](file:///c:/Users/pc/Documents/antigravity/memoriaviva/supabase/migrations/202607142200_editorial_dimensions.sql#L31-L35).
  * *Relaciones*: `contributor_id` apunta a `contributors(id)`. `publication_status_option_id` apunta a `select_options(id)`. `institutional_agreement_id` apunta a `institutional_agreements(id)`.
* **`public.contribution_files`**: Detalla los archivos cargados asociados a los testimonios.
  * *Evidencia*: [supabase/schema.sql:L66-L76](file:///c:/Users/pc/Documents/antigravity/memoriaviva/supabase/schema.sql#L66-L76).
  * *Relaciones*: `contribution_id` apunta a `contributions(id)`.
* **`public.consent_records`**: Registro inmutable de consentimiento legal.
  * *Evidencia*: [supabase/schema.sql:L79-L90](file:///c:/Users/pc/Documents/antigravity/memoriaviva/supabase/schema.sql#L79-L90).
* **`public.select_options`**: Diccionario de estados editoriales, niveles y estados de publicación.
  * *Evidencia*: Parche en [supabase/migrations/202607142200_editorial_dimensions.sql:L1-L29](file:///c:/Users/pc/Documents/antigravity/memoriaviva/supabase/migrations/202607142200_editorial_dimensions.sql#L1-L29).

### 1.2 Políticas Row Level Security (RLS) Activas
Actualmente, todas las tablas tienen RLS habilitado ([schema.sql:L104-L111](file:///c:/Users/pc/Documents/antigravity/memoriaviva/supabase/schema.sql#L104-L111)). Sin embargo, **ninguna** de las tablas cuenta con políticas que permitan la **lectura pública (anon)** de registros.
* **`contributions`**: Lectura permitida únicamente a usuarios autenticados con roles administrativos (`admin`, `editor`, `validator`, `interviewer`).
  * *Evidencia*: [schema.sql:L155-L157](file:///c:/Users/pc/Documents/antigravity/memoriaviva/supabase/schema.sql#L155-L157).
* **`contributors`**: Lectura de datos personales restringida únicamente al equipo administrativo.
  * *Evidencia*: [schema.sql:L138-L140](file:///c:/Users/pc/Documents/antigravity/memoriaviva/supabase/schema.sql#L138-L140).
* **`contribution_files`**: Lectura restringida al equipo administrativo.
  * *Evidencia*: [schema.sql:L172-L174](file:///c:/Users/pc/Documents/antigravity/memoriaviva/supabase/schema.sql#L172-L174).
* **`consent_records`**: Lectura restringida al equipo administrativo.
  * *Evidencia*: [schema.sql:L185-L187](file:///c:/Users/pc/Documents/antigravity/memoriaviva/supabase/schema.sql#L185-L187).

### 1.3 Almacenamiento de Archivos (Storage)
* Existe un único bucket configurado: **`historical-uploads`**.
* **Estado**: Privado (`public = FALSE`).
  * *Evidencia*: Definición en [schema.sql:L341-L366](file:///c:/Users/pc/Documents/antigravity/memoriaviva/supabase/schema.sql#L341-L366).
* **Tamaño límite**: 50 MB por archivo.
* **Políticas de Storage**:
  * Carga pública (`INSERT` para `anon, authenticated`) permitida sin validación previa para posibilitar el formulario de aportantes.
  * Lectura (`SELECT`) y borrado (`DELETE`) **bloqueados** para usuarios anónimos. Solo el equipo administrativo autenticado tiene permisos de lectura.
  * *Evidencia*: [schema.sql:L367-L379](file:///c:/Users/pc/Documents/antigravity/memoriaviva/supabase/schema.sql#L367-L379).

---

## 2. Análisis de Seguridad y Exposición

### 2.1 Uso Crítico de la clave `service_role` (Bypass de RLS)
Para consultar testimonios en el Portal Público sin habilitar políticas RLS de lectura anónima sobre toda la base de datos, el servidor de Next.js podría verse forzado a instanciar un cliente de Supabase con la clave de servicio (`service_role`).

> [!WARNING]
> La clave `service_role` actúa con privilegios de superusuario (`bypassrls`). Esto significa que **cualquier consulta ejecutada bajo este cliente ignorará todas las políticas RLS**.

#### Riesgos e Implicaciones de Código:
* **Validación en Servidor Obligatoria**: Nunca se debe pasar un identificador o ruta provistos directamente por el cliente web (un input del navegador) a una consulta de `service_role` sin verificar primero en el servidor que dicho recurso pertenece a un aporte con estado `published` (Publicado).
* **Inyección de Rutas**: Si una ruta de API expone la descarga de archivos basada en el path enviado por el usuario (ej. `/api/download?path=...`), y dicha API utiliza `service_role` para obtener la URL firmada, un atacante podría enviar el path del archivo de consentimiento legal (`consent_file_path`) de cualquier aportante y descargarlo, burlando toda la seguridad.

### 2.2 Limitación Tecnológica de URLs Firmadas (Signed URLs)
Para visualizar imágenes o documentos almacenados en el bucket privado, el sistema genera URLs firmadas temporales (ej. con duración de 15 minutos).

> [!IMPORTANT]
> Las URLs firmadas **no evitan las descargas ni el raspado de datos (scraping)**.
> Su única función es restringir el acceso temporalmente (evitando enlaces permanentes que puedan ser indexados o compartidos indefinidamente). Una vez que la URL está firmada y renderizada en el navegador del usuario:
> 1. El navegador puede descargar el recurso de forma limpia.
> 2. Cualquier robot de scraping puede descargar y guardar el archivo mientras la firma esté activa.
> 3. No impide la duplicación del contenido visualizado (capturas de pantalla, click derecho guardar como, etc.).

---

## 3. Hipótesis y Recomendaciones de Arquitectura

### 3.1 Arquitectura de Archivos Derivados Públicos
* **Hipótesis**: Los archivos históricos de alta resolución (originales) cargados por los usuarios representan un volumen de datos masivo y contienen metadatos innecesarios o potencialmente sensibles (como ubicación GPS en fotos o datos EXIF). Exponerlos directamente al público degrada el rendimiento de carga y facilita la copia no autorizada en calidad de impresión.
* **Recomendación**: Implementar un sistema de **Archivos Derivados**.
  * **Originales**: Permanecen estrictamente en el bucket privado `historical-uploads`, aislados de cualquier acceso público.
  * **Derivados**: Generar copias optimizadas en baja resolución o formatos más eficientes (ej. imágenes WebP redimensionadas, marcas de agua, clips de audio de 30 segundos, PDFs de transcripción comprimidos).
  * **Ubicación de Derivados**: Almacenar los derivados en un **segundo bucket** configurado como **público (`public = TRUE`)**, donde el nombre del archivo derivado no guarde ninguna relación visible con el ID del aportante ni con el archivo original, limitando el riesgo y mejorando el almacenamiento de caché CDN.

---

## 4. Decisiones Pendientes de Seguridad
1. **Acceso a la Base de Datos**: ¿Se habilitará lectura selectiva pública (`TO anon USING (editorial_status = 'Validado')`) en las tablas de Supabase, o se encapsulará el acceso del Portal Público exclusivamente mediante endpoints de API en el servidor Next.js que ejecuten consultas controladas?
2. **Marca de Agua en Imágenes**: ¿Se requiere la superposición de marcas de agua institucionales para las fotografías expuestas en el archivo de consulta?
3. **Calidad de Archivos de Audio/Video**: ¿El Portal Público reproducirá la entrevista completa o resúmenes y fragmentos seleccionados por los validadores?
