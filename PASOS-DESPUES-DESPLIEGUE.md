# Pasos Después de Desplegar la Edge Function

¡Felicidades! Ya tienes la Edge Function desplegada. Ahora sigue estos pasos para completar la configuración:

## ✅ Paso 1: Verificar que la Función Funciona

Puedes probar la función desde el Dashboard de Supabase:

1. Ve a **Supabase Dashboard** → **Edge Functions**
2. Click en `update-ubicacion`
3. Ve a la pestaña **Logs** para ver si hay errores
4. (Opcional) Usa la pestaña **Invoke** para probarla manualmente

## ✅ Paso 2: Configurar Base de Datos

Si aún no lo has hecho, ejecuta los scripts SQL:

1. **Ejecuta `supabase-setup.sql`**:
   - Dashboard → SQL Editor → New Query
   - Copia y pega el contenido completo
   - Ejecuta el script

2. **(Opcional) Ejecuta `supabase-seed.sql`**:
   - Para tener datos de prueba
   - Ejecuta en SQL Editor

## ✅ Paso 3: Crear Usuario Administrador

1. Ve a **Authentication** → **Users** → **Add User**
2. Crea un usuario con:
   - Email: `admin@seguridapp.com` (o el que prefieras)
   - Password: (crea una contraseña segura)
   - **Auto Confirm User**: ✅ Activa esta opción
3. Este usuario será tu administrador

## ✅ Paso 4: Crear y Vincular Guardias

### Opción A: Crear Guardia desde la Interfaz

1. Inicia sesión como administrador en la app
2. Ve a `/guardias`
3. Click en "Nuevo Guardia"
4. Completa el formulario con los datos del guardia
5. Guarda el email que usaste

### Opción B: Usar Datos del Seed

Si ejecutaste `supabase-seed.sql`, ya tienes guardias creados. Usa uno de esos emails.

### Vincular Usuario con Guardia

1. **Crear usuario en Authentication**:
   - Ve a **Authentication** → **Users** → **Add User**
   - Email: Debe ser **exactamente igual** al email del guardia
   - Password: Crea una contraseña
   - **Auto Confirm User**: ✅ Activa esta opción

2. **Obtener el User ID**:
   - Después de crear el usuario, copia el **User ID** (UUID)

3. **Vincular en la base de datos**:
   - Ve a **SQL Editor**
   - Ejecuta este SQL (reemplaza los valores):

```sql
UPDATE public.guardias
SET user_id = 'user-id-copiado-aqui'
WHERE email = 'email-del-guardia@seguridapp.com';
```

### Vincular Múltiples Guardias Automáticamente

Si tienes varios guardias y usuarios creados, puedes vincularlos todos de una vez:

```sql
UPDATE public.guardias g
SET user_id = u.id
FROM auth.users u
WHERE g.email = u.email
  AND g.user_id IS NULL;
```

## ✅ Paso 5: Probar el Sistema Completo

### Como Administrador:

1. Inicia sesión con el usuario administrador
2. Deberías ver el Dashboard con el mapa
3. Ve a `/guardias` para ver la lista de guardias
4. Verifica que los guardias vinculados aparecen correctamente

### Como Guardia:

1. Cierra sesión como administrador
2. Inicia sesión con las credenciales de un guardia vinculado
3. Deberías ser redirigido automáticamente a `/guardia/app`
4. La app solicitará permisos de ubicación → **Permite el acceso**
5. Deberías ver:
   - Tu perfil
   - Estado de geolocalización
   - Mapa con tu ubicación actual
   - La ubicación se actualiza automáticamente cada 30 segundos

### Verificar en Tiempo Real:

1. Abre **dos ventanas del navegador**:
   - Ventana 1: Como administrador en `/` (Dashboard)
   - Ventana 2: Como guardia en `/guardia/app`

2. En la ventana del guardia, permite la ubicación
3. En la ventana del administrador, deberías ver aparecer el guardia en el mapa en tiempo real
4. Mueve la ventana del guardia (o actualiza manualmente la ubicación)
5. Deberías ver el marcador moverse en el mapa del administrador

## ✅ Paso 6: Verificar Edge Function

Para confirmar que la Edge Function está funcionando:

1. Abre la consola del navegador (F12) en la app del guardia
2. Deberías ver que las actualizaciones se hacen correctamente
3. Si hay errores, revisa los logs en Supabase Dashboard → Edge Functions → update-ubicacion → Logs

## 🔧 Solución de Problemas

### El guardia no puede iniciar sesión

- Verifica que el usuario existe en Authentication
- Verifica que el email coincide **exactamente** con el de la tabla `guardias`
- Verifica que el `user_id` está vinculado correctamente

### La ubicación no se actualiza

- Verifica que el navegador tiene permisos de ubicación
- Verifica que estás usando HTTPS (en producción) o localhost (en desarrollo)
- Revisa la consola del navegador para errores
- Verifica los logs de la Edge Function en Supabase Dashboard

### El guardia no aparece en el mapa del administrador

- Verifica que el guardia está activo (`activo = true`)
- Verifica que tiene `latitud` y `longitud` no nulos
- Verifica que Realtime está habilitado para la tabla `guardias`
- Refresca el mapa del administrador

### Error en Edge Function

- Ve a Supabase Dashboard → Edge Functions → update-ubicacion → Logs
- Revisa los errores específicos
- Verifica que la función tiene acceso a la tabla `guardias`
- Verifica que las políticas RLS están correctamente configuradas

## 📝 Notas Importantes

- ✅ La Edge Function está configurada para usar por defecto (más seguro)
- ✅ Si la Edge Function falla, el sistema automáticamente usa el método directo como fallback
- ✅ Las actualizaciones se propagan en tiempo real gracias a Supabase Realtime
- ✅ El guardia debe mantener la app abierta para que la ubicación se actualice
- ✅ En producción, necesitas HTTPS para que funcione la geolocalización

## 🎉 ¡Listo!

Una vez completados estos pasos, tu sistema estará completamente funcional:

- ✅ Administradores pueden ver el mapa en tiempo real
- ✅ Guardias pueden actualizar su ubicación automáticamente
- ✅ Todo funciona con Realtime de Supabase
- ✅ Edge Function proporciona seguridad adicional

¿Necesitas ayuda con algún paso específico? Consulta `GUIA-GUARDIAS.md` para más detalles.

