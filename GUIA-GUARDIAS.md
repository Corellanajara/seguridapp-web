# Guía para Guardias - SeguridApp

Esta guía explica cómo configurar y usar el sistema para que los guardias puedan registrar su ubicación en tiempo real.

## Configuración Inicial

### 1. Vincular Usuario de Autenticación con Guardia

Para que un guardia pueda iniciar sesión y actualizar su ubicación, necesitas vincular su usuario de autenticación con su registro en la tabla `guardias`.

#### Opción A: Al crear el guardia (Recomendado)

Cuando creas un guardia desde la interfaz de administración, después de crear el usuario en Supabase Authentication, actualiza el guardia con el `user_id`:

```sql
-- 1. Crear usuario en Authentication (desde el Dashboard de Supabase)
-- 2. Obtener el user_id del usuario creado
-- 3. Actualizar el guardia con el user_id

UPDATE public.guardias
SET user_id = 'uuid-del-usuario-aqui'
WHERE email = 'email-del-guardia@seguridapp.com';
```

#### Opción B: Script SQL para vincular existentes

Si ya tienes guardias y usuarios creados:

```sql
-- Vincular guardia con usuario por email
UPDATE public.guardias g
SET user_id = u.id
FROM auth.users u
WHERE g.email = u.email
  AND g.user_id IS NULL;
```

### 2. Crear Usuario para Guardia

1. Ve a **Supabase Dashboard** → **Authentication** → **Users**
2. Click en **Add User** → **Create new user**
3. Completa:
   - **Email**: Debe coincidir con el email del guardia en la tabla `guardias`
   - **Password**: Crea una contraseña segura
   - **Auto Confirm User**: ✅ Activa esta opción
4. Click en **Create User**
5. Copia el **User ID** generado
6. Ejecuta el SQL para vincular:

```sql
UPDATE public.guardias
SET user_id = 'user-id-copiado'
WHERE email = 'email-del-guardia@seguridapp.com';
```

## Funcionalidades para Guardias

### Inicio de Sesión

1. El guardia accede a `/login`
2. Ingresa su email y contraseña
3. El sistema detecta automáticamente si es guardia o administrador
4. Si es guardia, es redirigido a `/guardia/app`

### App de Guardia (`/guardia/app`)

La aplicación del guardia incluye:

- **Geolocalización Automática**: 
  - Obtiene la ubicación del dispositivo usando la API de Geolocalización del navegador
  - Requiere permisos de ubicación del navegador

- **Actualización Automática**:
  - Actualiza la ubicación cada 30 segundos automáticamente
  - También puede actualizar manualmente con el botón

- **Visualización en Mapa**:
  - Muestra su ubicación actual en un mapa interactivo
  - El mapa se centra automáticamente en su posición

- **Información del Perfil**:
  - Muestra su información personal
  - Estado activo/inactivo

### Actualización de Ubicación

La ubicación se actualiza de dos formas:

1. **Automática**: Cada 30 segundos si el guardia tiene la app abierta
2. **Manual**: Click en "Actualizar Ubicación Ahora"

Los cambios se propagan en tiempo real a través de Supabase Realtime, por lo que los administradores verán la ubicación actualizada inmediatamente en el mapa del dashboard.

## Requisitos del Navegador

Para que funcione correctamente, el guardia necesita:

- **Navegador moderno** que soporte Geolocalización API
- **Permisos de ubicación** habilitados
- **HTTPS** (requerido para geolocalización en producción)
  - En desarrollo local (`localhost`) funciona sin HTTPS
  - En producción, necesitas un dominio con SSL

## Seguridad

- ✅ Solo el guardia autenticado puede actualizar su propia ubicación
- ✅ Row Level Security (RLS) protege los datos
- ✅ Las actualizaciones se validan antes de guardarse
- ✅ Opcionalmente puedes usar Edge Functions para validación adicional

## Edge Function (Opcional)

Para mayor seguridad, puedes desplegar la Edge Function `update-ubicacion`:

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Vincular proyecto
supabase link --project-ref tu-project-ref

# Desplegar función
supabase functions deploy update-ubicacion
```

Luego, en `src/services/ubicacion.ts`, puedes cambiar `useEdgeFunction: false` a `true` en la llamada a `updateMiUbicacion`.

## Solución de Problemas

### El guardia no puede iniciar sesión

- Verifica que el usuario existe en Authentication
- Verifica que el email coincide exactamente con el de la tabla `guardias`
- Verifica que el `user_id` está vinculado correctamente

### No se actualiza la ubicación

- Verifica que el navegador tiene permisos de ubicación
- Verifica que estás usando HTTPS (en producción)
- Revisa la consola del navegador para errores
- Verifica que el guardia está activo (`activo = true`)

### Error: "Guardia no encontrado"

- Verifica que existe un registro en la tabla `guardias` con el email del usuario
- Verifica que el `user_id` está vinculado o que el email coincide exactamente

### La ubicación no aparece en el mapa del administrador

- Verifica que Realtime está habilitado para la tabla `guardias`
- Verifica que el guardia tiene `latitud` y `longitud` no nulos
- Verifica que el guardia está activo (`activo = true`)

## Flujo Completo

1. **Administrador crea guardia** → Se crea registro en tabla `guardias`
2. **Administrador crea usuario** → Se crea usuario en Authentication
3. **Administrador vincula** → Actualiza `user_id` en `guardias`
4. **Guardia inicia sesión** → Sistema detecta que es guardia
5. **Guardia abre app** → Se solicita permiso de ubicación
6. **Ubicación se actualiza** → Automáticamente cada 30 segundos
7. **Administrador ve ubicación** → En tiempo real en el dashboard

## Notas Importantes

- El guardia debe mantener la aplicación abierta para que la ubicación se actualice
- En dispositivos móviles, la batería puede verse afectada por el seguimiento continuo
- Considera implementar una app móvil nativa para mejor rendimiento
- Las actualizaciones usan Realtime de Supabase, por lo que son instantáneas

