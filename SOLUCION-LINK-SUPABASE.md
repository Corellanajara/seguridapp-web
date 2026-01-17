# Solución: Error al hacer `supabase link`

## Problema

Al ejecutar `supabase link --project-ref tu-project-ref`, obtienes un error de autenticación:
```
failed SASL auth (FATAL: password authentication failed for user "postgres")
```

## Soluciones

### Solución 1: Usar la contraseña de la base de datos (Recomendado)

Cuando creaste tu proyecto en Supabase, se generó una contraseña para la base de datos. Úsala así:

```bash
supabase link --project-ref tu-project-ref --password tu-database-password
```

**¿Dónde encontrar la contraseña?**
- Si la guardaste cuando creaste el proyecto, úsala
- Si no la recuerdas, puedes resetearla:
  1. Ve a **Supabase Dashboard → Settings → Database**
  2. Click en **Reset Database Password**
  3. Copia la nueva contraseña
  4. Úsala en el comando `supabase link`

**¿Dónde encontrar el project-ref?**
- **Supabase Dashboard → Settings → General → Reference ID**
- Es un string como: `wmcilkkslrxghwvllfmj` (el que aparece en tu error)

### Solución 2: Autenticarse primero con Supabase CLI

```bash
# 1. Asegúrate de estar autenticado
supabase login

# 2. Luego intenta el link sin contraseña
supabase link --project-ref tu-project-ref
```

### Solución 3: No usar `supabase link` (Alternativa)

**IMPORTANTE**: Las Edge Functions son **opcionales**. Puedes desplegarlas directamente desde el Dashboard sin necesidad de hacer `link`:

1. Ve a **Supabase Dashboard → Edge Functions**
2. Click en **Create a new function**
3. Nombre: `validar-biometrica` (o el nombre de la función)
4. Copia el contenido del archivo `supabase/functions/[nombre-funcion]/index.ts`
5. Pégalo en el editor
6. Click en **Deploy**

Esto es más simple y no requiere configuración de CLI.

## Comando Completo (Solución 1)

```bash
# Reemplaza estos valores:
# - tu-project-ref: El Reference ID de tu proyecto
# - tu-database-password: La contraseña de tu base de datos

supabase link --project-ref wmcilkkslrxghwvllfmj --password tu-database-password
```

## Verificar que funcionó

Después de hacer `link` correctamente, deberías ver:
```
Finished supabase link.
```

## Si sigues teniendo problemas

1. **Verifica que estás usando la contraseña correcta**:
   - Dashboard → Settings → Database → Reset Database Password

2. **Verifica el project-ref**:
   - Dashboard → Settings → General → Reference ID

3. **Prueba sin link**:
   - Despliega las funciones directamente desde el Dashboard (Solución 3)

## Nota Importante

**No es necesario hacer `link` para usar la aplicación**. El `link` solo es necesario si quieres:
- Desplegar Edge Functions desde la terminal
- Usar Supabase CLI para desarrollo local

Si prefieres, puedes desplegar las funciones desde el Dashboard y omitir el `link` completamente.
