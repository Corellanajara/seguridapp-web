# Instrucciones de Configuración de Supabase

## Paso a Paso

### 1. Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Inicia sesión o crea una cuenta
3. Click en "New Project"
4. Completa:
   - **Name**: SeguridApp (o el nombre que prefieras)
   - **Database Password**: Guarda esta contraseña de forma segura
   - **Region**: Elige la región más cercana
5. Espera a que se cree el proyecto (2-3 minutos)

### 2. Ejecutar el Script SQL de Configuración

1. En el Dashboard de Supabase, ve a **SQL Editor** (menú lateral izquierdo)
2. Click en **New Query**
3. Abre el archivo `supabase-setup.sql` de este proyecto
4. Copia TODO el contenido del archivo
5. Pégalo en el editor SQL de Supabase
6. Click en **Run** o presiona `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### 2.1. Configurar Tabla de Asistencias

1. En el **SQL Editor**, crea una nueva query
2. Abre el archivo `supabase-asistencias-setup.sql` de este proyecto
3. Copia TODO el contenido del archivo
4. Pégalo en el editor SQL de Supabase
5. Click en **Run** o presiona `Ctrl+Enter`

Esto creará:
- ✅ Tabla `asistencias` con geolocalización, foto y firma documental
- ✅ Políticas RLS para que guardias registren sus asistencias
- ✅ Políticas para que admins vean todas las asistencias
- ✅ Función para obtener estadísticas de asistencias

### 2.2. Configurar Storage para Fotos

1. Ve a **Storage** en el menú lateral de Supabase
2. Click en **Create a new bucket**
3. Configura el bucket:
   - **Name**: `fotos-asistencias`
   - **Public**: `false` (privado)
   - **File size limit**: `5MB` (o el que prefieras)
   - **Allowed MIME types**: `image/jpeg, image/png`
4. Click en **Create bucket**
5. En el **SQL Editor**, crea una nueva query
6. Abre el archivo `supabase-storage-setup.sql` de este proyecto
7. Copia TODO el contenido del archivo
8. Pégalo en el editor SQL de Supabase
9. Click en **Run** o presiona `Ctrl+Enter`

Esto creará las políticas de storage para que:
- ✅ Los guardias puedan subir sus fotos de asistencia
- ✅ Los admins puedan ver todas las fotos

### 2.3. (Opcional) Insertar Datos de Prueba

Si quieres tener datos de ejemplo para probar la aplicación:

1. En el **SQL Editor**, crea una nueva query
2. Abre el archivo `supabase-seed.sql` de este proyecto
3. Copia TODO el contenido del archivo
4. Pégalo en el editor SQL de Supabase
5. Click en **Run** o presiona `Ctrl+Enter`

Esto insertará:
- ✅ 14 guardias de ejemplo (10 activos con ubicación, 2 inactivos, 2 activos sin ubicación)
- ✅ Ubicaciones distribuidas en diferentes zonas de Buenos Aires
- ✅ Datos realistas para pruebas

### 3. Verificar la Configuración

Después de ejecutar los scripts, verifica que todo esté correcto:

1. Ve a **Table Editor** → Deberías ver las tablas:
   - `guardias` (si ejecutaste el seed, deberías ver 14 guardias)
   - `asistencias` (vacía inicialmente)
2. Ve a **Authentication** → **Policies** → Verifica que hay políticas para:
   - `guardias` (4 políticas)
   - `asistencias` (5 políticas)
3. Ve a **Storage** → Deberías ver el bucket `fotos-asistencias`
4. Ve a **Database** → **Replication** → Verifica que `guardias` y `asistencias` están en la lista

### 4. Obtener las Credenciales

1. Ve a **Settings** (⚙️) → **API**
2. Copia los siguientes valores:
   - **Project URL** → Esta es tu `VITE_SUPABASE_URL`
   - **anon public** key → Esta es tu `VITE_SUPABASE_ANON_KEY`

### 5. Configurar Variables de Entorno

1. En la raíz del proyecto, crea un archivo `.env`:
   ```bash
   touch .env
   ```

2. Agrega las siguientes líneas (reemplaza con tus valores reales):
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
   ```

3. **IMPORTANTE**: No subas el archivo `.env` a Git (ya está en `.gitignore`)

### 6. Crear Usuario de Prueba

1. Ve a **Authentication** → **Users**
2. Click en **Add User** → **Create new user**
3. Completa:
   - **Email**: admin@seguridapp.com (o el que prefieras)
   - **Password**: Crea una contraseña segura
   - **Auto Confirm User**: ✅ Activa esta opción
4. Click en **Create User**

### 7. Probar la Conexión

1. Instala las dependencias:
   ```bash
   npm install
   ```

2. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

3. Abre el navegador en `http://localhost:5173`
4. Intenta iniciar sesión con el usuario que creaste

## Solución de Problemas

### Error: "relation 'guardias' does not exist"
- **Solución**: Asegúrate de haber ejecutado el script SQL completo

### Error: "new row violates row-level security policy"
- **Solución**: Verifica que las políticas RLS estén creadas correctamente
- Ve a **Authentication** → **Policies** y verifica que existen 4 políticas

### Error: "Realtime subscription failed"
- **Solución**: 
  1. Ve a **Database** → **Replication**
  2. Asegúrate de que `guardias` esté habilitada para Realtime
  3. Si no está, ejecuta: `ALTER PUBLICATION supabase_realtime ADD TABLE public.guardias;`

### Error: "Invalid API key"
- **Solución**: Verifica que copiaste correctamente la `anon` key (no la `service_role` key)

### El mapa no muestra guardias
- **Solución**: 
  1. Verifica que hay guardias creados con `activo = true`
  2. Verifica que los guardias tienen `latitud` y `longitud` no nulos
  3. Revisa la consola del navegador para errores

## Estructura de las Tablas

### Tabla Guardias

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único (generado automáticamente) |
| `nombre` | TEXT | Nombre del guardia (requerido) |
| `apellido` | TEXT | Apellido del guardia (requerido) |
| `email` | TEXT | Email único del guardia (requerido) |
| `telefono` | TEXT | Teléfono del guardia (opcional) |
| `foto_url` | TEXT | URL de la foto del guardia (opcional) |
| `activo` | BOOLEAN | Si el guardia está activo (default: true) |
| `latitud` | DOUBLE PRECISION | Latitud de la ubicación (opcional) |
| `longitud` | DOUBLE PRECISION | Longitud de la ubicación (opcional) |
| `ultima_actualizacion` | TIMESTAMP | Última vez que se actualizó la ubicación |
| `created_at` | TIMESTAMP | Fecha de creación (automático) |
| `updated_at` | TIMESTAMP | Fecha de última actualización (automático) |

### Tabla Asistencias

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único (generado automáticamente) |
| `guardia_id` | UUID | ID del guardia (FK a guardias) |
| `tipo_asistencia` | TEXT | Tipo: 'entrada' o 'salida' |
| `foto_url` | TEXT | URL de la foto tomada en el momento |
| `latitud` | DOUBLE PRECISION | Latitud del registro (geolocalización) |
| `longitud` | DOUBLE PRECISION | Longitud del registro (geolocalización) |
| `firma_documental` | TEXT | Mock de firma electrónica (JSON) |
| `firma_clave_unica` | BOOLEAN | Si se usó clave única (mock, pendiente) |
| `observaciones` | TEXT | Observaciones adicionales |
| `created_at` | TIMESTAMP | Fecha y hora del registro (automático) |
| `updated_at` | TIMESTAMP | Fecha de última actualización (automático) |

## Seguridad

- ✅ **Row Level Security (RLS)** está habilitado
- ✅ Solo usuarios autenticados pueden acceder a los datos
- ✅ Las políticas permiten CRUD completo a usuarios autenticados
- ✅ Usa la clave `anon` en el frontend (nunca la `service_role`)

## Funcionalidades Implementadas

### Control de Asistencia para Guardias

Cuando un guardia inicia sesión, puede:
- ✅ Registrar entrada o salida
- ✅ Tomar una foto en el momento del registro
- ✅ Registro georeferenciado automáticamente
- ✅ Firma documental mockeada (preparada para Clave Única)

### Vista de Asistencias para Administradores

Los administradores pueden:
- ✅ Ver todas las asistencias registradas
- ✅ Ver fotos de cada registro
- ✅ Ver geolocalización de cada asistencia
- ✅ Ver información de firma documental
- ✅ Filtrar por guardia y fecha

## Próximos Pasos

Una vez configurado Supabase:

1. ✅ Ejecuta `npm install`
2. ✅ Configura el archivo `.env`
3. ✅ Ejecuta `npm run dev`
4. ✅ Inicia sesión con el usuario creado
5. ✅ Crea algunos guardias de prueba desde la interfaz
6. ✅ Actualiza las ubicaciones de los guardias (desde la app móvil o manualmente)
7. ✅ Prueba el control de asistencia desde la app del guardia
8. ✅ Verifica las asistencias desde la vista de administración

## Notas Importantes

- **Nunca** expongas la `service_role` key en el frontend
- El archivo `.env` debe estar en `.gitignore` (ya está configurado)
- Las ubicaciones de los guardias se actualizan desde la aplicación móvil o web del guardia
- Realtime funciona automáticamente una vez configurado

