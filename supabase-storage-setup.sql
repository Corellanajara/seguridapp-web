-- ============================================
-- Script de configuración de Storage para fotos de asistencias
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- Dashboard > SQL Editor > New Query

-- ============================================
-- 1. CREAR BUCKET PARA FOTOS DE ASISTENCIAS
-- ============================================
-- Nota: Los buckets se crean desde el Dashboard de Supabase
-- Ve a Storage > Create a new bucket
-- Nombre: fotos-asistencias
-- Public: false (privado)
-- File size limit: 5MB (o el que prefieras)
-- Allowed MIME types: image/jpeg, image/png

-- ============================================
-- 2. ELIMINAR POLÍTICAS EXISTENTES (SI HAY)
-- ============================================

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Guardias pueden subir fotos de asistencias" ON storage.objects;
DROP POLICY IF EXISTS "Guardias pueden leer sus fotos de asistencias" ON storage.objects;
DROP POLICY IF EXISTS "Admins pueden leer todas las fotos de asistencias" ON storage.objects;

-- ============================================
-- 3. POLÍTICAS DE STORAGE (RLS)
-- ============================================
-- Estas políticas permiten que los guardias suban sus fotos
-- y que los admins puedan verlas

-- Política para INSERT: Los guardias pueden subir sus propias fotos
CREATE POLICY "Guardias pueden subir fotos de asistencias"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'fotos-asistencias'
  AND EXISTS (
    SELECT 1 FROM public.guardias
    WHERE guardias.user_id = auth.uid()
  )
);

-- Política para SELECT: Los guardias pueden leer sus propias fotos
CREATE POLICY "Guardias pueden leer sus fotos de asistencias"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'fotos-asistencias'
  AND EXISTS (
    SELECT 1 FROM public.guardias
    WHERE guardias.user_id = auth.uid()
  )
);

-- Política para SELECT: Los admins pueden leer todas las fotos
CREATE POLICY "Admins pueden leer todas las fotos de asistencias"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'fotos-asistencias'
  AND NOT EXISTS (
    SELECT 1 FROM public.guardias
    WHERE guardias.user_id = auth.uid()
  )
);

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. Primero debes crear el bucket desde el Dashboard:
--    - Ve a Storage en el menú lateral
--    - Click en "Create a new bucket"
--    - Nombre: fotos-asistencias
--    - Public: false (privado)
--    - File size limit: 5MB
--    - Allowed MIME types: image/jpeg, image/png
--
-- 2. Después ejecuta este script para crear las políticas
--
-- 3. Si las políticas no se crean correctamente, puedes crearlas manualmente
--    desde Storage > fotos-asistencias > Policies
--
-- 4. Alternativamente, si prefieres que las fotos sean públicas (menos seguro),
--    marca el bucket como público y no necesitarás políticas de SELECT
