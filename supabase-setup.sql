-- ============================================
-- Script de configuración de Supabase para SeguridApp
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- Dashboard > SQL Editor > New Query

-- ============================================
-- 1. CREAR TABLA DE GUARDIAS
-- ============================================

CREATE TABLE IF NOT EXISTS public.guardias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telefono TEXT,
  foto_url TEXT,
  activo BOOLEAN DEFAULT true,
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  ultima_actualizacion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. CREAR ÍNDICES PARA MEJOR RENDIMIENTO
-- ============================================

-- Índice para búsquedas por email
CREATE INDEX IF NOT EXISTS idx_guardias_email ON public.guardias(email);

-- Índice para búsquedas por user_id (para vincular con autenticación)
CREATE INDEX IF NOT EXISTS idx_guardias_user_id ON public.guardias(user_id) WHERE user_id IS NOT NULL;

-- Índice para filtrar guardias activos
CREATE INDEX IF NOT EXISTS idx_guardias_activo ON public.guardias(activo) WHERE activo = true;

-- Índice para búsquedas geográficas (guardias con ubicación)
CREATE INDEX IF NOT EXISTS idx_guardias_ubicacion ON public.guardias(latitud, longitud) 
WHERE latitud IS NOT NULL AND longitud IS NOT NULL;

-- Índice para ordenar por fecha de creación
CREATE INDEX IF NOT EXISTS idx_guardias_created_at ON public.guardias(created_at DESC);

-- ============================================
-- 3. FUNCIÓN PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_guardias_updated_at ON public.guardias;
CREATE TRIGGER update_guardias_updated_at
  BEFORE UPDATE ON public.guardias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 4. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.guardias ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer guardias" ON public.guardias;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear guardias" ON public.guardias;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar guardias" ON public.guardias;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar guardias" ON public.guardias;

-- Política para SELECT: Todos los usuarios autenticados pueden leer guardias
CREATE POLICY "Usuarios autenticados pueden leer guardias"
  ON public.guardias
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para INSERT: Todos los usuarios autenticados pueden crear guardias
CREATE POLICY "Usuarios autenticados pueden crear guardias"
  ON public.guardias
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para UPDATE: Todos los usuarios autenticados pueden actualizar guardias
CREATE POLICY "Usuarios autenticados pueden actualizar guardias"
  ON public.guardias
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política para DELETE: Todos los usuarios autenticados pueden eliminar guardias
CREATE POLICY "Usuarios autenticados pueden eliminar guardias"
  ON public.guardias
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 6. HABILITAR REALTIME PARA LA TABLA
-- ============================================

-- Asegurarse de que la publicación de Realtime incluya la tabla guardias
ALTER PUBLICATION supabase_realtime ADD TABLE public.guardias;

-- ============================================
-- 7. DATOS DE PRUEBA (OPCIONAL)
-- ============================================
-- Para insertar datos de prueba, ejecuta el archivo supabase-seed.sql
-- después de ejecutar este script de configuración.

-- ============================================
-- 8. VERIFICACIÓN
-- ============================================
-- Ejecuta estas consultas para verificar que todo está configurado correctamente

-- Verificar que la tabla existe
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'guardias';

-- Verificar que RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'guardias';

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'guardias';

-- Verificar que Realtime está habilitado
SELECT * FROM pg_publication_tables WHERE tablename = 'guardias';

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- Después de ejecutar este script:
-- 1. (Opcional) Ejecuta supabase-seed.sql para insertar datos de prueba
-- 2. Ve a Authentication > Users y crea un usuario de prueba
-- 3. Configura las variables de entorno en tu proyecto
-- 4. Inicia la aplicación y prueba el login

