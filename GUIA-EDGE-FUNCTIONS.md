# Guía de Despliegue de Edge Functions - SeguridApp

Las Edge Functions son funciones serverless que se ejecutan en el edge de Supabase. Esta guía explica cómo desplegar las funciones creadas para SeguridApp.

## Requisitos Previos

1. **Supabase CLI instalado**:
   ```bash
   npm install -g supabase
   ```

2. **Autenticado en Supabase**:
   ```bash
   supabase login
   ```

3. **Proyecto vinculado**:
   ```bash
   supabase link --project-ref tu-project-ref
   ```
   
   Puedes encontrar tu `project-ref` en:
   - Dashboard de Supabase → Settings → General → Reference ID

## Edge Functions Incluidas

### 1. `validar-biometrica`
Valida reconocimiento facial para asistencias.

### 2. `api`
API REST pública para integraciones externas (requiere API key).

### 3. `analisis-ia`
Análisis con IA para detectar patrones y predecir incidentes.

### 4. `update-ubicacion` (ya existente)
Actualiza ubicaciones de guardias con validación adicional.

## Despliegue

### Opción 1: Desplegar todas las funciones

```bash
# Desde la raíz del proyecto
cd supabase/functions

# Desplegar cada función
supabase functions deploy validar-biometrica
supabase functions deploy api
supabase functions deploy analisis-ia
supabase functions deploy update-ubicacion
```

### Opción 2: Desplegar una función específica

```bash
# Ejemplo: desplegar solo la función de validación biométrica
supabase functions deploy validar-biometrica
```

## Configuración de Variables de Entorno

Algunas funciones requieren variables de entorno. Configúralas en el Dashboard de Supabase:

1. Ve a **Dashboard → Edge Functions → Settings**
2. Agrega las siguientes variables:

### Para la función `api`:
- `API_KEY`: Tu clave API personalizada (genera una clave segura)

### Para todas las funciones:
Las siguientes se configuran automáticamente:
- `SUPABASE_URL`: Se configura automáticamente
- `SUPABASE_ANON_KEY`: Se configura automáticamente
- `SUPABASE_SERVICE_ROLE_KEY`: Se configura automáticamente

## Verificación

Después del despliegue, puedes verificar que las funciones están activas:

1. Ve a **Dashboard → Edge Functions**
2. Deberías ver todas las funciones listadas
3. Puedes probarlas desde el dashboard o usando curl:

```bash
# Probar función de validación biométrica
curl -X POST https://tu-project-ref.supabase.co/functions/v1/validar-biometrica \
  -H "Authorization: Bearer tu-anon-key" \
  -H "Content-Type: application/json" \
  -d '{"foto": "base64...", "guardia_id": "uuid"}'
```

## Uso en el Código

Las funciones ya están integradas en los servicios:

- `src/services/biometrica.ts` - Usa `validar-biometrica`
- `src/services/ia.ts` - Usa `analisis-ia`
- `src/services/ubicacion.ts` - Usa `update-ubicacion` (opcional)

## Notas Importantes

1. **Las funciones son opcionales**: El sistema funciona sin ellas usando métodos directos con RLS.

2. **Costo**: Las Edge Functions tienen un costo asociado en el plan de Supabase. Revisa la documentación de precios.

3. **Desarrollo local**: Puedes probar las funciones localmente:
   ```bash
   supabase functions serve validar-biometrica
   ```

4. **Logs**: Puedes ver los logs de las funciones en:
   - Dashboard → Edge Functions → [Nombre de función] → Logs

## Solución de Problemas

### Error: "Function not found"
- Verifica que la función se desplegó correctamente
- Verifica que estás usando el nombre correcto de la función

### Error: "Unauthorized"
- Verifica que estás enviando el header `Authorization` correcto
- Para la función `api`, verifica que envías el header `x-api-key`

### Error: "Environment variable not found"
- Configura las variables de entorno en el Dashboard
- Reinicia la función después de agregar variables

## Próximos Pasos

1. Despliega las funciones que necesites
2. Configura las variables de entorno necesarias
3. Prueba las funciones desde el dashboard
4. Integra las funciones en tu código si es necesario

## Referencias

- [Documentación de Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
