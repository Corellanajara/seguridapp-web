# Corrección de Políticas RLS para Asistencias

## Problema Identificado

Las políticas RLS estaban intentando acceder directamente a la tabla `auth.users`, lo cual no está permitido en Supabase y causaba los siguientes errores:

1. **Error al crear asistencia**: `"permission denied for table users"`
2. **Error al subir foto**: `"new row violates row-level security policy"`

## Solución

Se han corregido las políticas para:
- Usar solo `user_id` de la tabla `guardias` (sin acceder a `auth.users`)
- Crear una función auxiliar `es_guardia_autenticado()` con `SECURITY DEFINER` para verificar si un usuario es guardia
- Simplificar las políticas de storage para usar la misma lógica

## Pasos para Aplicar la Corrección

### 1. Ejecutar el Script Corregido de Asistencias

1. Ve a **SQL Editor** en Supabase
2. Crea una nueva query
3. Copia y pega el contenido completo de `supabase-asistencias-setup.sql`
4. Ejecuta el script (esto recreará las políticas con la corrección)

**Importante**: Este script eliminará las políticas antiguas y creará las nuevas correctas.

### 2. Ejecutar el Script Corregido de Storage

1. En el **SQL Editor**, crea una nueva query
2. Copia y pega el contenido completo de `supabase-storage-setup.sql`
3. Ejecuta el script

**Nota**: Asegúrate de que el bucket `fotos-asistencias` ya esté creado en Storage.

### 3. Verificar que Funciona

1. Inicia sesión como guardia
2. Intenta registrar una asistencia (entrada o salida)
3. Debería funcionar sin errores

## Cambios Realizados

### En `supabase-asistencias-setup.sql`:

1. **Nueva función auxiliar**:
   ```sql
   CREATE OR REPLACE FUNCTION public.es_guardia_autenticado()
   RETURNS BOOLEAN AS $$
   BEGIN
     RETURN EXISTS (
       SELECT 1 FROM public.guardias
       WHERE guardias.user_id = auth.uid()
     );
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

2. **Políticas simplificadas**:
   - Ya no intentan acceder a `auth.users`
   - Usan solo `guardias.user_id = auth.uid()`
   - Para admins, usan `NOT es_guardia_autenticado()`

### En `supabase-storage-setup.sql`:

1. **Políticas corregidas**:
   - Usan `CREATE POLICY` en lugar de `INSERT INTO storage.policies`
   - Ya no intentan acceder a `auth.users`
   - Usan solo `guardias.user_id = auth.uid()`

## Verificación

Después de ejecutar los scripts, verifica que:

1. La función `es_guardia_autenticado()` existe:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'es_guardia_autenticado';
   ```

2. Las políticas de asistencias están creadas:
   ```sql
   SELECT policyname FROM pg_policies WHERE tablename = 'asistencias';
   ```
   Deberías ver 5 políticas.

3. Las políticas de storage están creadas:
   ```sql
   SELECT policyname FROM pg_policies 
   WHERE schemaname = 'storage' AND tablename = 'objects';
   ```
   Deberías ver 3 políticas para el bucket `fotos-asistencias`.

## Si Aún Hay Problemas

Si después de ejecutar los scripts corregidos aún hay problemas:

1. **Verifica que el guardia tenga `user_id` asignado**:
   ```sql
   SELECT id, nombre, email, user_id 
   FROM guardias 
   WHERE email = 'email-del-guardia@ejemplo.com';
   ```
   Si `user_id` es NULL, actualízalo:
   ```sql
   UPDATE guardias 
   SET user_id = (SELECT id FROM auth.users WHERE email = 'email-del-guardia@ejemplo.com')
   WHERE email = 'email-del-guardia@ejemplo.com';
   ```

2. **Verifica que el bucket de storage existe**:
   - Ve a Storage en Supabase
   - Asegúrate de que el bucket `fotos-asistencias` existe
   - Si no existe, créalo manualmente

3. **Revisa los logs de Supabase**:
   - Ve a Logs > Postgres Logs
   - Busca errores relacionados con RLS

## Notas Importantes

- Las políticas ahora son más simples y seguras
- No se accede directamente a `auth.users` desde las políticas
- La función `es_guardia_autenticado()` usa `SECURITY DEFINER` para poder acceder a `auth.uid()`
- Si un guardia no tiene `user_id` asignado, las políticas no funcionarán correctamente
