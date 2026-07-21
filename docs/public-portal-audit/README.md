# Auditoría Técnica Integral — Portal Público (v3.2.1)
**Memoria Viva Pico Truncado**

Este directorio contiene el informe y los capítulos de la **Auditoría Técnica Integral** realizada sobre la plataforma **v3.2.1** (Etapa **3B.2**) para evaluar la viabilidad, riesgos y arquitectura de la futura incorporación del **Portal Público de Consulta Histórica**.

---

## Ficha Técnica de la Auditoría

* **Proyecto**: Memoria Viva Pico Truncado
* **Versión Evaluada**: `v3.2.1`
* **Etapa Estable**: `3B.2` (Dashboard de Gestión Editorial - Navegación Contextual)
* **Objetivo**: Determinar la viabilidad técnica de la fase "Portal Público", mapear la exposición segura de datos, y auditar las configuraciones existentes de Supabase, RLS, Storage y los motores de negocio.
* **Fecha de Ejecución**: 21 de Julio de 2026
* **Restricción de Ejecución**: Pasivo de solo lectura. Ningún archivo de configuración, código fuente de la aplicación, política RLS, bucket de almacenamiento o esquema de base de datos fue modificado durante la auditoría.
* **Dictamen Final**: **VIABLE CON MIGRACIONES RECOMENDADAS** *(Ver conclusiones)*.

---

## Índice de Capítulos de la Auditoría

La auditoría se organiza en los siguientes documentos especializados:

### 1. [Base de Datos y Seguridad](file:///c:/Users/pc/Documents/antigravity/memoriaviva/docs/public-portal-audit/database_schema_and_security.md)
* Análisis del esquema de tablas físicas y relaciones reales.
* Auditoría de políticas Row Level Security (RLS) activas y del bucket privado de Storage.
* Riesgos críticos de seguridad: Uso de clave `service_role` y limitaciones reales de las URLs firmadas (`signedUrls`).
* Propuesta de arquitectura para archivos derivados públicos.

### 2. [Motores y Niveles de Consentimiento](file:///c:/Users/pc/Documents/antigravity/memoriaviva/docs/public-portal-audit/engines_and_consent_levels.md)
* Mapeo de elegibilidad editorial (Reglas E1–E8) y progreso (P1–P9) aplicadas a la divulgación.
* Significado operativo real de los niveles de autorización A, B, C y D verificados.
* Tratamiento de preferencias de crédito del aportante y autorización a nivel de archivos individuales.
* Comportamiento operativo ante revocación de consentimientos, retrocesos de estado y conflictos post-publicación.

### 3. [Arquitectura del Portal y Rutas](file:///c:/Users/pc/Documents/antigravity/memoriaviva/docs/public-portal-audit/portal_architecture_and_routes.md)
* Propuesta de rutas públicas SEO-friendly mediante slugs (`/archivo/[slug]`) en lugar de IDs UUIDs internos.
* Contrato TypeScript estricto de lista blanca (`PublicContribution`).
* Matriz de correspondencia de campos y visibilidad por niveles.
* Estrategia de caché, invalidación del portal y mecanismo de retirada de contenido en caliente (< 1 minuto).

### 4. [Conclusiones, Riesgos e Inventario de Decisiones](file:///c:/Users/pc/Documents/antigravity/memoriaviva/docs/public-portal-audit/conclusions_and_recommendations.md)
* Inventario de decisiones institucionales y de diseño pendientes por parte de la coordinación de Memoria Viva.
* Registro de riesgos de exposición e inconsistencias técnicas.
* **Matriz final de necesidades potenciales de migración** (estado, evidencia y fundamento).
* **Dictamen Final y Recomendación Fundada** sobre la urgencia y tipo de migraciones necesarias para comenzar.
