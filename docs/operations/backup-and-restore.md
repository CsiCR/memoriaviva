# Guía Operativa de Respaldos y Restauración
## Memoria Viva Pico Truncado — Etapa 6.0

Este documento describe la estrategia de respaldo y el procedimiento paso a paso para restaurar datos en caso de incidente grave.

---

### 1. Responsable Operativo
* **Líder de Infraestructura y DevOps** (o responsable técnico asignado al proyecto).
* Tareas: Programar auditorías de backup, verificar disponibilidad de backups diarios y realizar pruebas de restauración trimestrales.

---

### 2. Estrategia de Respaldos

#### A. Respaldos Automáticos de Supabase
* **Base de Datos**: Supabase realiza respaldos diarios automáticos (copia física). Estos se conservan de acuerdo con el plan contratado (7 a 30 días).
* **Storage (Assets)**: Los archivos del bucket `historical-uploads` residen en AWS S3 administrado por Supabase, con replicación interna y resiliencia integrada.

#### B. Exportación Externa Periódica (Backup Lógico Manual)
Antes de cada hito importante o despliegue en producción (y de forma semanal automatizada), se debe descargar un respaldo lógico comprimido (SQL Dump):

```bash
# Exportar base de datos usando Supabase CLI
supabase db dump --project-ref [YOUR_PROJECT_REF] -f backup_logical.sql
```

O bien mediante `pg_dump` directo:

```bash
# Exportar esquema y datos de la base de datos PostgreSQL
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres" -F c -b -v -f backup_logical.dump
```

---

### 3. Plan de Restauración (Paso a Paso)

> [!WARNING]
> Restaurar una base de datos sobrescribe los datos actuales. Asegúrese de coordinar una ventana de mantenimiento y colocar la aplicación en "Modo de Mantenimiento" (desactivando temporalmente el portal de Vercel).

#### Paso 1: Detener tráfico público
Apagar o pausar el despliegue en Vercel para congelar las escrituras en la base de datos.

#### Paso 2: Realizar snapshot de resguardo
Hacer una copia de seguridad rápida de la base de datos defectuosa antes de sobrescribirla:
```bash
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres" -f pre_restore_rescue.sql
```

#### Paso 3: Ejecutar la restauración del backup lógico
Si el backup se realizó en formato comprimido `.dump`:
```bash
pg_restore -h db.[PROJECT_ID].supabase.co -U postgres -d postgres -v backup_logical.dump
```
Si el backup se realizó en texto plano `.sql`:
```bash
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres" -f backup_logical.sql
```

#### Paso 4: Restauración de archivos (Storage)
Si hay pérdida de material histórico en storage, sincronizar los archivos utilizando Supabase CLI o scripts de copia remota.

---

### 4. Prueba de Recuperación (Simulación y Verificación)
Para garantizar que los backups son válidos y legibles, se debe simular una restauración en una base de datos local de desarrollo:

1. Levantar contenedor Docker local: `supabase start`.
2. Restaurar el dump de producción sobre la base local:
   ```bash
   psql "postgresql://postgres:postgres@localhost:54322/postgres" -f backup_logical.sql
   ```
3. Ejecutar la suite de pruebas unitarias (`npm run test:public`) en local contra la base de datos restaurada.
4. Verificar que se pueden listar y abrir las contribuciones restauradas sin pérdidas de relaciones.

---

### 5. Política de Retención
* **Backups diarios (Supabase)**: Retención de 7 días (en planes gratuitos/Pro básicos) o 30 días (planes Enterprise).
* **Backups lógicos locales (Exportaciones)**: Se conservan de forma segura en un almacenamiento local corporativo externo durante **90 días**.
