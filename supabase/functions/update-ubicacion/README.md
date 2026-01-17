# Edge Function: update-ubicacion

Esta Edge Function actualiza la ubicación del guardia autenticado de forma segura.

## Despliegue

### Opción 1: Usando Supabase CLI (Recomendado)

**Primero, asegúrate de tener el archivo `supabase/config.toml` en la raíz del proyecto.**

```bash
# Asegúrate de estar en la raíz del proyecto
cd /Users/cristopherorellana/Desktop/mio/seguridapp

# Iniciar sesión en Supabase (si no lo has hecho)
npx supabase login

# Vincular tu proyecto (obtén el project-ref del Dashboard)
npx supabase link --project-ref tu-project-ref

# Desplegar la función
npx supabase functions deploy update-ubicacion
```

**Nota**: El `project-ref` lo encuentras en:
- Supabase Dashboard → Settings → General → Reference ID

### Opción 2: Desde el Dashboard (Más Simple)

Si tienes problemas con la CLI, puedes desplegar directamente desde el Dashboard:

1. Ve a tu **Supabase Dashboard** → **Edge Functions**
2. Click en **Create a new function**
3. Nombre: `update-ubicacion`
4. Copia el contenido completo de `supabase/functions/update-ubicacion/index.ts`
5. Click en **Deploy**

Esta opción es más simple y no requiere configuración adicional.

## Uso

La función se puede llamar desde el cliente:

```typescript
const { data, error } = await supabase.functions.invoke('update-ubicacion', {
  body: { latitud: -34.603722, longitud: -58.381592 }
})
```

## Seguridad

- ✅ Requiere autenticación
- ✅ Valida coordenadas
- ✅ Solo permite actualizar la propia ubicación
- ✅ Usa RLS de Supabase

