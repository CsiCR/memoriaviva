# Memoria Viva Pico Truncado - Registro de Versiones

## v3.2.1 — Dashboard de Gestión Editorial (Navegación contextual)

Estado: Estable

Fecha: 2026-07

Etapa: 3B.2

Navegación Contextual del Dashboard Editorial
Reglas D1 + Contrato de Navegación
Versión 1.1.0

### Incorporaciones

- Contrato canónico de filtros de aportes (`ContributionListFilter`) y helpers de serialización.
- Mapeo canónico de KPIs a filtros operacionales del Dashboard sin acoplamiento interno.
- Filtros interactivos del listado `/admin/aportes` cargados de `searchParams` y ejecutados mediante los motores.
- Chips visuales en la cabecera del listado para cada filtro activo, removibles en un clic.
- Paginación del listado en memoria y controles de navegación pura HTML/Link.
- Accesibilidad mejorada (enlaces semánticos, foco por teclado y hover micro-animado).

### Validación

Dashboard Editorial: 27/27
Navegación y Filtros: 14/14
Motor de Progreso: 44/44
Motor Editorial: 30/30
TypeScript: OK
Lint: OK
Build: OK

## v3.2.0 — Dashboard de Gestión Editorial

Estado: Estable

Fecha: 2026-07

Etapa: 3B.2

Dashboard Editorial
Reglas D1
Versión 1.0.0

### Incorporaciones

- Sub-módulo analítico de Dashboard puro e inmutable.
- Agrupación determinística por etapa y cuellos de botella con porcentajes.
- Distribución de severidad de indicadores y timeline mensual interactivo.
- Métricas estadísticas completas de productividad (media, mediana, stddev, percentiles P25/P75).
- Tarjeta ejecutiva de Salud Editorial (indicador de calidad con penalizaciones ponderadas).
- SmartActions (Dashboard Inteligente) estructuradas por prioridad.
- Filtros compuestos laterales y superiores integrados en tiempo real.
- Panel de control administrativo `/admin/dashboard` interactivo con gráficos SVG y CSS nativos.
- Trazabilidad y firmas de auditoría con hashes de exportación únicos.

### Validación

Dashboard Editorial: 27/27 (estrés de 10.000 aportes en 54ms)
Motor de Progreso: 44/44
Motor Editorial: 30/30
Consentimiento: 8/8
TypeScript: OK
Lint: OK
Build: OK

Estado:
Producción estable

## v3.1.0 — Progreso Editorial

Estado: Estable

Fecha: 2026-07

Etapa: 3B.1

Motor de Progreso Editorial
Reglas P1–P9
Versión 1.0.0

### Incorporaciones

- Motor de Progreso Editorial desacoplado.
- Evaluación sobre 9 dimensiones.
- Progreso de 0 a 100%.
- Etapas editoriales independientes del porcentaje.
- Recomendaciones priorizadas.
- Bloqueos estructurados.
- Cuellos de botella.
- Conflictos de validación histórica.
- Advertencias pospublicación.
- Vista previa con cambios no guardados.
- Integración con la interfaz administrativa.
- Preparación para Dashboard Editorial (Etapa 3B.2).

### Validación

Motor de Progreso: 44/44
Motor Editorial: 30/30
Consentimiento: 8/8
TypeScript: OK
Lint: OK
Build: OK

Estado:
Producción estable
