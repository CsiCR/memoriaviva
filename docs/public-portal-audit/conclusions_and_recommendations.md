# Capítulo 4: Conclusiones, Registro de Riesgos y Dictamen de Migraciones
**Portal Público — Memoria Viva Pico Truncado**

Este documento recopila el análisis final de riesgos, las decisiones pendientes de la organización y el dictamen fundado sobre la necesidad de migraciones físicas en la base de datos.

---

## 1. Registro de Riesgos Técnicos (Risk Registry)

A partir de la inspección del código y la base de datos v3.2.1, se identifican los siguientes riesgos operativos para la implementación del Portal Público:

| ID | Riesgo Identificado | Impacto | Severidad | Acción de Mitigación Recomendada |
| :--- | :--- | :--- | :---: | :--- |
| **R-01** | **Fuga de datos personales por joins no controlados** | Exposición pública de DNI, teléfono o email del aportante. | **ALTA** | Prohibir joins directos con la tabla `contributors` en consultas expuestas a la API pública. Usar mapeo estricto del crédito en el servidor. |
| **R-02** | **Acceso directo a archivos originales privados** | Descarga no autorizada de materiales de alta resolución u hojas de firmas de consentimiento. | **ALTA** | Nunca retornar en el contrato público el `file_path` original. Mantener el bucket `historical-uploads` cerrado y utilizar derivados. |
| **R-03** | **Bypass de RLS en API routes con `service_role`** | Un error en el código de Next.js podría permitir a un usuario descargar consentimientos firmados o archivos protegidos de otros aportes. | **ALTA** | Implementar validaciones explícitas de estado de publicación (`published`) y elegibilidad en el servidor antes de realizar operaciones de Storage. |
| **R-04** | **Envenenamiento de caché (Cache Poisoning) en Takedowns** | Un aporte retirado legalmente sigue apareciendo en el Portal Público debido a la caché de la CDN. | **MEDIA** | Utilizar revalidación activa vía `revalidatePath` en Next.js Server Actions al guardar modificaciones administrativas. |

---

## 2. Inventario de Decisiones Institucionales Pendientes

Antes de proceder a escribir código para el portal de consulta, la coordinación de Memoria Viva Pico Truncado debe definir:

1. **Protocolo ante reclamo de propiedad**: Si un tercero denuncia que un aporte publicado infringe derechos de autor, ¿se debe habilitar un botón de reporte directo en el portal, o el reclamo se canalizará por correo tradicional?
2. **Definición de marcas de agua**: ¿Se aplicará una marca de agua institucional sobre los derivados de fotografía y documento para evitar la apropiación no autorizada del acervo digital?
3. **Identificación de Aportantes Fallecidos**: En caso de testimonios de personas fallecidas, ¿cómo se reflejarán los créditos (ej. "Aporte de la Familia [Apellido] en memoria de [Aportante]")?

---

## 3. Matriz de Necesidades Potenciales de Migración

| Propuesta de Cambio | Estado de Urgencia | Evidencia del Código / Esquema | Fundamento Técnico |
| :--- | :---: | :--- | :--- |
| **Agregar columna `slug` a la tabla `contributions`** | **RECOMENDADA** | Actualmente `contributions` solo posee la clave primaria `id` (UUID) y `catalog_code` (ej: `MV-FOT-2026-0002`). | Permite implementar URLs semánticas amigables para el usuario y el SEO (`/archivo/[slug]`), protegiendo de paso los identificadores administrativos del sistema de ataques de enumeración. |
| **Crear tabla o columnas para `derived_files`** | **RECOMENDADA** | Actualmente `contribution_files` solo cuenta con `file_path` al archivo original. | Permite asociar, registrar y servir copias optimizadas en baja resolución (WebP, MP3 comprimido, PDF ligero) en un bucket público, aislando los archivos originales en el almacenamiento privado. |
| **Agregar flag `is_public` a la tabla `contributions`** | **NO REQUERIDA** | El estado de publicación ya está vinculado mediante `publication_status_option_id` al catálogo `select_options`. | Evita redundancia de datos. Filtrar por `publication_status_option_id` resolviendo el código a `'published'` es suficiente para certificar la publicación. |
| **Agregar tabla de bitácora de revocaciones (`revocation_logs`)** | **OPCIONAL** | Los cambios de estado de consentimiento quedan registrados de forma genérica en `audit_logs`. | Aporta un registro específico y legalmente auditable para documentar cuándo y quién solicitó la baja de un material del portal público. |

---

## 4. Dictamen Final y Viabilidad

### 4.1 Viabilidad del Proyecto
La incorporación del Portal Público en la plataforma Memoria Viva Pico Truncado v3.2.1 es **100% VIABLE**. La plataforma cuenta con motores de elegibilidad y progreso maduros y desacoplados que permiten automatizar la auditoría de cada aporte en tiempo real.

### 4.2 Dictamen de Migraciones
Se determina que las migraciones son **RECOMENDADAS**:
* **Viabilidad sin migraciones (Caso Mínimo)**: Es posible técnicamente lanzar el portal público utilizando los UUIDs internos (`/archivo/[id]`) y firmando URLs temporales del bucket privado mediante consultas en el servidor. Esto no requiere alterar la base de datos física actual.
* **Viabilidad óptima (Caso Recomendado)**: Para cumplir con los requerimientos óptimos de posicionamiento SEO, rendimiento y seguridad de la información (evitando la descarga masiva de archivos originales de alta calidad), se recomienda ejecutar dos migraciones sencillas antes de iniciar la interfaz:
  1. Agregar la columna `slug` (VARCHAR UNIQUE) a la tabla `contributions`.
  2. Agregar soporte para vincular archivos derivados optimizados públicos (columnas adicionales en `contribution_files` o tabla intermedia).
