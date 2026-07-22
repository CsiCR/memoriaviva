# Checklist de Lanzamiento a Producción
## Memoria Viva Pico Truncado — Etapa 6.0

Este documento contiene la lista de verificaciones obligatorias antes del lanzamiento al dominio público de producción.

---

### 1. Infraestructura y Configuración
- [ ] **Ambiente**: `NEXT_PUBLIC_APP_ENV` está configurado en `production` en Vercel.
- [ ] **Dominios**: Dominio oficial `memoriavivapicotruncado.org` conectado y resolviendo con HTTPS activo.
- [ ] **Variables de Entorno**: Todas las variables obligatorias configuradas en Vercel y validadas con el módulo Zod.
- [ ] **Supabase de Producción**: Instancia separada y limpia de producción inicializada y con la semilla del administrador.
- [ ] **Políticas RLS**: Row Level Security activo en todas las tablas (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
- [ ] **Buckets de Storage**: Storage configurado con políticas RLS y separación de bucket restringido/público.
- [ ] **Backups**: Respaldos automatizados diarios activos en Supabase.

### 2. Aplicación y Código
- [ ] **Pruebas**: 100% de la suite de pruebas unitarias y de contratos aprobadas (`test:public`).
- [ ] **Lint**: Código limpio de advertencias y lints (`npm run lint`).
- [ ] **Build**: Compilación del bundle de producción sin fallos (`npm run build`).
- [ ] **Health Check**: Ruta `/api/health` retorna `status: ok` y expone correctamente el estado de sus componentes.
- [ ] **Páginas de Error**: Vistas de `error.tsx`, `global-error.tsx`, `not-found.tsx` y `loading.tsx` validadas estéticamente.
- [ ] **Robots y Sitemap**: `robots.txt` expuesto con prioridad de indexación y `sitemap.xml` autogenerándose.
- [ ] **RSS Feed**: `/feed.xml` responde con la estructura RSS 2.0 y enclosures de multimedia de portada.

### 3. Contenidos y Aspectos Editoriales
- [ ] **Aportes Iniciales**: Mínimo de aportes publicados en base de datos cargados y aprobados históricamente.
- [ ] **Atribución y Consentimiento**: Todos los registros publicados tienen `consent_verified = true` y nivel de atribución configurado.
- [ ] **Portadas**: Todos los aportes públicos cuentan con imagen de portada (`cover`).
- [ ] **Metadatos SEO**: Sin aportes con títulos vacíos, resúmenes sin contenido ni imágenes rotas.
- [ ] **Privacidad**: DTO públicos verificados. Ningún dato personal (teléfono, DNI, email) ni notas de editor expuestas.

### 4. Pruebas de Dispositivos Reales (Manuales)
- [ ] **Escritorio**: Navegadores Chrome, Firefox y Safari probados en resolución de escritorio.
- [ ] **Tablet**: Layout responsivo y grillas validadas en tablets iOS y Android.
- [ ] **Celular**: Probado en móviles reales bajo redes 4G/5G verificando velocidad y rendimiento de imágenes.

### 5. Lanzamiento y Despliegue
- [ ] **Backup Previo**: Dump de la base de datos realizado antes del cambio final de DNS.
- [ ] **Deploy**: Merge de rama `main` a producción.
- [ ] **Smoke Tests de Producción**: `npm run smoke:production` ejecutado con éxito post-deploy.
- [ ] **Monitoreo**: Panel de logs y observabilidad activo y limpio de excepciones de servidor.

---

## SECCIÓN DECISORIA: GO / NO GO

Para proceder con la apertura pública y habilitar la indexación en buscadores, se requiere la aprobación unánime de los responsables del proyecto:

| Criterio / Validación | Estado | Responsable | Firma / Fecha |
| :--- | :---: | :--- | :--- |
| **Responsable Técnico** (Build, seguridad, performance, RLS, backups) | `[ ] Aprobado` | [Nombre del Responsable] | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ / \_\_-\_\_-\_\_ |
| **Responsable Editorial** (Consentimiento, exactitud de datos, ortografía) | `[ ] Aprobado` | [Nombre del Responsable] | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ / \_\_-\_\_-\_\_ |
| **Backup de Seguridad Realizado** | `[ ] Aprobado` | Operador de Infraestructura | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ / \_\_-\_\_-\_\_ |
| **Smoke Tests de Producción Aprobados** | `[ ] Aprobado` | DevOps / Tester | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ / \_\_-\_\_-\_\_ |
| **Aceptación de Riesgos Residuales** | `[ ] Aprobado` | Director del Proyecto | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ / \_\_-\_\_-\_\_ |

> [!IMPORTANT]
> **AUTORIZACIÓN FINAL DE DESPLIEGUE**: Si todas las casillas anteriores están marcadas, se firma la autorización formal para abrir el tráfico de red de producción a buscadores públicos.
