# Plan de Rollback (Plan de Contingencia)
## Memoria Viva Pico Truncado — Etapa 6.0

Este documento contiene las instrucciones precisas para revertir un despliegue defectuoso en producción a una versión estable anterior.

---

### 1. Tiempos Objetivo de Recuperación (RTO)

| Acción | Objetivo de Tiempo | Responsable |
| :--- | :--- | :--- |
| **Rollback en Vercel (Reversión de código)** | `< 5 minutos` | DevOps / Programador |
| **Restauración de Base de Datos** | `< 30 minutos` | Administrador de DB |
| **Restauración de Archivos (Storage)** | `< 60 minutos` | Administrador de DB / Redes |

---

### 2. Responsables Operativos
* **Operador de Infraestructura / DevOps**: Encargado de ejecutar la reversión en Vercel y reconfigurar DNS si es necesario.
* **Administrador de la Base de Datos**: Responsable de aplicar restauraciones lógicas de base de datos.
* **Coordinador del Proyecto**: Autoriza el rollback y gestiona la comunicación pública de incidencias.

---

### 3. Procedimiento de Rollback

#### Paso 1: Activar el Mensaje de Mantenimiento
Para evitar que los usuarios visualicen pantallas rotas o errores de conexión durante el rollback, colocar la página en modo mantenimiento:
* En Vercel, redirigir el tráfico del dominio principal a una página estática de mantenimiento (por ejemplo, usando Vercel Edge Config o reescribiendo la ruta temporalmente a una página estática `maintenance.html`).
* Mensaje sugerido: *"Estamos realizando tareas de mantenimiento preventivo. Volveremos en unos minutos."*

#### Paso 2: Revertir Despliegue en Vercel
1. Ingresar al dashboard del proyecto en Vercel.
2. Ir a la pestaña **Deployments**.
3. Buscar el último despliegue estable exitoso (previo al despliegue defectuoso).
4. Hacer clic en los tres puntos (`...`) junto al despliegue y seleccionar **Instant Rollback**.
5. Confirmar la acción. Vercel redirigirá el tráfico de producción de forma instantánea en menos de 1 minuto.

*Nota: Alternativamente, si se usa Git, revertir la rama `main` al commit anterior estable y forzar un deploy:*
```bash
git checkout main
git reset --hard [COMMIT_ESTABLE_SHA]
git push origin main --force
```

#### Paso 3: Restaurar Base de Datos
Si el despliegue defectuoso alteró datos o corrompió relaciones, aplicar la restauración del último backup válido siguiendo la [Guía de Restauración](file:///c:/Users/pc/Documents/antigravity/memoriaviva/docs/operations/backup-and-restore.md):
```bash
pg_restore -h db.[PROJECT_ID].supabase.co -U postgres -d postgres -v backup_logical.dump
```

#### Paso 4: Restaurar Storage
Si los archivos físicos en Supabase Storage fueron alterados o eliminados accidentalmente:
1. Localizar la copia de seguridad de assets local.
2. Resincronizar los archivos del bucket utilizando Supabase CLI o la API de administración.

---

### 4. Pasos de Verificación Post-Rollback
Una vez completado el rollback de código y datos, realizar las siguientes pruebas antes de reabrir el tráfico al público:
1. **Verificar Health Check**: Acceder a `${targetUrl}/api/health` y comprobar que devuelve `status: ok` y todos los componentes están en verde.
2. **Ejecutar Smoke Tests**: Correr localmente `npm run smoke:production -- --confirm` para asegurar que las páginas básicas (Home, buscador, RSS) responden correctamente.
3. **Revisar Logs de Errores**: Monitorear los logs en tiempo real para verificar que cesaron las excepciones críticas.
4. **Desactivar Modo de Mantenimiento**: Retirar la redirección de mantenimiento en Vercel para restaurar el acceso normal.
