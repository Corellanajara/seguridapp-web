# SeguridApp - Control de Guardias de Seguridad

Plataforma de control y monitoreo en tiempo real de guardias de seguridad, construida con React, Shadcn/ui y Supabase.

## Características

- 🗺️ **Mapa en Tiempo Real**: Visualización de la ubicación de guardias en tiempo real usando Leaflet
- 👥 **Gestión de Guardias**: CRUD completo para gestión de guardias
- 📍 **Seguimiento de Ubicación**: Actualización automática de ubicaciones
- 🔐 **Autenticación Segura**: Sistema de autenticación con Supabase
- 🎨 **UI Moderna**: Interfaz construida con Shadcn/ui y Tailwind CSS
- ⚡ **Tiempo Real**: Suscripciones en tiempo real con Supabase Realtime
- 👮 **App para Guardias**: Los guardias pueden iniciar sesión y actualizar su ubicación en tiempo real
- 📱 **Geolocalización**: Uso de la API de Geolocalización del navegador para seguimiento preciso
- 🔄 **Edge Functions**: Soporte para Edge Functions de Supabase para validación adicional

## Requisitos Previos

- Node.js 18+ y npm/yarn
- Cuenta de Supabase
- Proyecto de Supabase configurado

## Configuración de Supabase

### 1. Crear las tablas en Supabase

**Opción A: Usar el script completo (Recomendado)**

1. Abre el SQL Editor en Supabase (Dashboard → SQL Editor → New Query)
2. Copia y pega el contenido completo del archivo `supabase-setup.sql`
3. Ejecuta el script completo

El script incluye:
- ✅ Creación de la tabla `guardias`
- ✅ Índices para optimización
- ✅ Función y trigger para `updated_at` automático
- ✅ Habilitación de Row Level Security (RLS)
- ✅ Políticas de seguridad completas
- ✅ Habilitación de Realtime
- ✅ Consultas de verificación

**Opción B: Ejecutar SQL manualmente**

Si prefieres ejecutar el SQL paso a paso, puedes copiar las secciones del archivo `supabase-setup.sql` según necesites.

### 1.1. (Opcional) Insertar Datos de Prueba

Para tener datos de ejemplo y probar la aplicación rápidamente:

1. Ejecuta el archivo `supabase-seed.sql` en el SQL Editor de Supabase
2. Esto insertará 14 guardias de ejemplo con ubicaciones distribuidas en Buenos Aires

**Nota**: Puedes modificar las coordenadas en `supabase-seed.sql` para usar ubicaciones de tu ciudad/región.

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

Puedes encontrar estas credenciales en tu proyecto de Supabase:
- Dashboard → Settings → API
- `URL` → `VITE_SUPABASE_URL`
- `anon public` key → `VITE_SUPABASE_ANON_KEY`

## Instalación

1. Instala las dependencias:

```bash
npm install
```

2. Configura las variables de entorno (ver arriba)

3. Inicia el servidor de desarrollo:

```bash
npm run dev
```

## Estructura del Proyecto

```
src/
├── components/        # Componentes reutilizables
│   ├── ui/           # Componentes de Shadcn/ui
│   ├── Layout.tsx    # Layout principal
│   └── MapView.tsx   # Componente del mapa
├── contexts/         # Contextos de React
│   └── AuthContext.tsx
├── hooks/            # Custom hooks
├── lib/              # Utilidades y configuración
│   ├── supabase.ts   # Cliente de Supabase
│   └── utils.ts      # Utilidades
├── pages/            # Páginas de la aplicación
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Guardias.tsx
│   ├── GuardiaDetail.tsx
│   └── Administracion.tsx
├── services/         # Servicios de API
│   └── guardias.ts
└── types/            # Tipos TypeScript
    └── index.ts
```

## Uso

### Autenticación

#### Para Administradores

1. Crea un usuario en Supabase:
   - Dashboard → Authentication → Users → Add user
   - Email: `admin@seguridapp.com` (o el que prefieras)
   - Password: Crea una contraseña segura
   - Auto Confirm User: ✅ Activa esta opción

2. Inicia sesión con las credenciales creadas
3. Serás redirigido al Dashboard de administración

#### Para Guardias

1. Crea un guardia desde la interfaz de administración (`/guardias`)
2. Crea un usuario en Supabase Authentication con el mismo email del guardia
3. Vincula el usuario con el guardia (ver `GUIA-GUARDIAS.md`)
4. El guardia puede iniciar sesión y será redirigido a `/guardia/app`
5. La app del guardia actualiza su ubicación automáticamente cada 30 segundos

**Nota**: Consulta `GUIA-GUARDIAS.md` para instrucciones detalladas sobre la configuración de guardias.

### Gestión de Guardias

- **Ver todos los guardias**: Navega a `/guardias`
- **Crear guardia**: Click en "Nuevo Guardia" y completa el formulario
- **Ver perfil**: Click en "Ver Detalle" en cualquier guardia
- **Activar/Desactivar**: Usa el botón en la tarjeta del guardia

### Mapa en Tiempo Real

- El mapa muestra automáticamente todos los guardias activos
- Las ubicaciones se actualizan en tiempo real
- Click en un marcador para ver el perfil del guardia

## Seguridad

- **Row Level Security (RLS)**: Habilitado en todas las tablas
- **Autenticación requerida**: Todas las rutas están protegidas
- **Políticas de seguridad**: Solo usuarios autenticados pueden acceder a los datos

## Tecnologías

- **React 18** - Framework UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool
- **Supabase** - Backend y autenticación
- **Shadcn/ui** - Componentes UI
- **Tailwind CSS** - Estilos
- **Leaflet** - Mapas
- **React Router** - Navegación

## Scripts Disponibles

- `npm run dev` - Inicia servidor de desarrollo
- `npm run build` - Construye para producción
- `npm run preview` - Preview de la build de producción
- `npm run lint` - Ejecuta el linter

## Notas Importantes

- Las ubicaciones de los guardias deben actualizarse desde la aplicación móvil o web del guardia
- El sistema usa solo el cliente de Supabase (no hay backend adicional)
- Todas las operaciones están protegidas por RLS de Supabase

## Estructura de Rutas

- `/login` - Página de inicio de sesión (común para admin y guardias)
- `/` - Dashboard de administración (solo admin)
- `/guardias` - Gestión de guardias (solo admin)
- `/guardias/:id` - Detalle de guardia (solo admin)
- `/administracion` - Panel de administración (solo admin)
- `/guardia/app` - Aplicación del guardia (solo guardias)

El sistema detecta automáticamente el tipo de usuario y redirige según corresponda.

## Edge Functions

El proyecto incluye una Edge Function opcional para actualizar ubicaciones de forma más segura:

- `supabase/functions/update-ubicacion/` - Valida y actualiza ubicaciones

Para desplegarla, consulta el README dentro de la carpeta de la función.

## Próximas Mejoras

- [x] Aplicación web para guardias
- [ ] Aplicación móvil nativa para guardias
- [ ] Historial de ubicaciones
- [ ] Zonas de seguridad
- [ ] Turnos y horarios
- [ ] Reportes y estadísticas
- [ ] Notificaciones push

