# Flujo de Carga y Gestión de Archivos Grandes (> 50 MB)

Este documento detalla el diseño, la base de datos y la experiencia de usuario para el tratamiento de aportes que contienen archivos digitales que superan el límite de subida web de 50 MB en la plataforma **Memoria Viva Pico Truncado**.

---

## 1. Contexto y Límite de Carga Web

Para garantizar el rendimiento de la red y evitar fallas por desconexión en cargas pesadas sobre HTTP, la plataforma establece un límite máximo de **50 MB** por archivo para las subidas a través de la interfaz web.

Sin embargo, durante el piloto editorial se detectó que algunos vecinos poseen material histórico valioso de mayor tamaño (ej: filmaciones digitalizadas, videos o audios extensos). Este flujo permite que el aporte se registre con éxito junto a sus metadatos y archivos permitidos, dejando una alerta persistente para coordinar la entrega física u optimizada del material pesado.

---

## 2. Flujo de Experiencia de Usuario (Paso a Paso)

### A. Carga por el Vecino (Público) u Operador (Admin)
1. El usuario selecciona uno o más archivos en el formulario.
2. El frontend evalúa el tamaño de cada archivo:
   - **Archivos <= 50 MB:** Se preparan para subida estándar o resumible (TUS) y se suben normalmente.
   - **Archivos > 50 MB:** No se intentan subir ni se crean sesiones de carga. Se muestran en una lista especial de **"Archivos grandes pendientes (entrega offline)"**.
3. El usuario completa los datos históricos y acepta el consentimiento legal. El formulario permite enviar el aporte aunque todos los archivos seleccionados sean demasiado grandes (creando una contribución sin archivos físicos en Supabase Storage temporalmente).
4. Tras el envío exitoso, si existían archivos grandes:
   - Se muestra un panel especial indicando que el aporte fue guardado con éxito, pero que los archivos pesados requieren coordinación.
   - Se provee el correo institucional `memoriavivapicotruncado@gmail.com` para contacto alternativo.

### B. Notificación y Trazabilidad en Administración
1. Al guardarse el aporte con excedidos, la función RPC `create_contribution_with_files` inserta de forma atómica:
   - Los registros de aviso en la tabla `oversized_file_notices` (con estado `'pending'`).
   - Una notificación administrativa en `admin_notifications` (con estado `'oversized_files'`).
2. En la cabecera del panel administrativo, los operadores del equipo visualizan un globo indicador rojo sobre una **Campanita de Notificaciones**.
3. Al desplegar la campanita, se listan los aportes pendientes con el nombre del aportante, teléfono, correo de contacto (cargados en tiempo real para proteger la privacidad en la tabla de notificaciones) y la lista de archivos pendientes.
4. El aporte conserva su estado editorial inicial como **"Recibido"**, pero en el panel administrativo se muestra con un distintivo visual naranja: **"⚠️ Recibido · faltan archivos"** con un tooltip informativo.

### C. Resolución de Avisos
1. El administrador contacta al vecino, obtiene el archivo original de forma física/offline, lo resguarda de manera externa y genera una versión optimizada (comprimida) que sea menor a 50 MB.
2. El administrador ingresa a `/admin/aportes/[id]` y visualiza la acción **"Agregar archivos"**.
3. Selecciona la copia optimizada localmente y elige el rol **"Copia optimizada para acceso"** (mapeado como `derivative`).
4. Selecciona explícitamente qué avisos pendientes de archivos grandes se resuelven con esta carga.
5. Confirma la carga. El sistema sube el archivo, lo vincula a la contribución y actualiza el estado del aviso a `'resolved'`.
6. Si ya no quedan avisos pendientes en estado `'pending'` para esa contribución, la alerta de la campanita se marca automáticamente como resuelta (`is_resolved = TRUE`) y leída.

---

## 3. Modelo de Base de Datos (Tablas y Relaciones)

### Tabla `public.oversized_file_notices`
Almacena cada uno de los archivos que superaron el tamaño permitido durante la carga web.
- `id` (UUID, Primary Key): Identificador único del aviso.
- `contribution_id` (UUID, FK a `contributions` ON DELETE CASCADE): Aporte asociado.
- `original_filename` (TEXT): Nombre original del archivo declarado por el navegador.
- `size_bytes` (BIGINT): Tamaño del archivo en bytes.
- `mime_type` (TEXT): Tipo de archivo detectado.
- `status` (TEXT, CHECK `status IN ('pending', 'resolved')`): Estado de la entrega del archivo.
- `created_at` (TIMESTAMPTZ): Fecha de creación del aviso.
- `resolved_at` (TIMESTAMPTZ, NULL): Fecha de resolución.
- `resolved_by` (UUID, FK a `profiles` ON DELETE SET NULL): Usuario del equipo que procesó la resolución.

### Tabla `public.admin_notifications`
Registra las alertas administrativas activas para el panel.
- `id` (UUID, Primary Key): Identificador único de la alerta.
- `type` (TEXT): Tipo de notificación (ej. `'oversized_files'`).
- `title` (TEXT): Título representativo de la alerta.
- `message` (TEXT): Detalle técnico del material e indicación de archivos pendientes (no duplica datos personales).
- `contribution_id` (UUID, FK a `contributions` ON DELETE CASCADE): Enlace al detalle del aporte.
- `is_read` (BOOLEAN): Control de lectura (estado global compartido por todo el equipo editorial durante el piloto).
- `is_resolved` (BOOLEAN): Control de resolución de la alerta (estado global compartido por todo el equipo editorial durante el piloto).
- `created_at` (TIMESTAMPTZ): Fecha de la alerta.
- `read_at` (TIMESTAMPTZ, NULL): Fecha de lectura.
- `resolved_at` (TIMESTAMPTZ, NULL): Fecha de resolución.
- `resolved_by` (UUID, FK a `profiles` ON DELETE SET NULL): Operador que cerró la alerta.

---

## 4. Políticas RLS y Seguridad

- **oversized_file_notices:**
  - El público general (`anon`) no posee ningún privilegio de lectura, creación directa o modificación sobre esta tabla.
  - Los operadores del equipo con roles autorizados (`admin`, `editor`, `validator`, `interviewer` verificado a través de `public.has_role()`) tienen privilegios completos de `SELECT` y `UPDATE`.
- **admin_notifications:**
  - Solo los operadores con roles autorizados del equipo tienen permisos de lectura y actualización.
- **Creación Segura:**
  - Las alertas y avisos son insertados de forma controlada y segura por el backend transaccional a través de la función RPC `create_contribution_with_files`, garantizando que no se puedan inyectar notificaciones falsas desde el cliente.
