-- ============================================
-- Script de configuración de tabla ASISTENCIAS para SeguridApp
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- Dashboard > SQL Editor > New Query

-- ============================================
-- 1. CREAR TABLA DE ASISTENCIAS
-- ============================================

CREATE TABLE IF NOT EXISTS public.asistencias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guardia_id UUID NOT NULL REFERENCES public.guardias(id) ON DELETE CASCADE,
  tipo_asistencia TEXT NOT NULL CHECK (tipo_asistencia IN ('entrada', 'salida')),
  foto_url TEXT NOT NULL, -- URL de la foto tomada en el momento del control
  latitud DOUBLE PRECISION NOT NULL, -- Geolocalización del registro
  longitud DOUBLE PRECISION NOT NULL, -- Geolocalización del registro
  firma_documental TEXT, -- Mock de firma electrónica (JSON o texto)
  firma_clave_unica BOOLEAN DEFAULT false, -- Indica si se usó clave única para firmar
  observaciones TEXT, -- Observaciones adicionales
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. CREAR ÍNDICES PARA MEJOR RENDIMIENTO
-- ============================================

-- Índice para búsquedas por guardia
CREATE INDEX IF NOT EXISTS idx_asistencias_guardia_id ON public.asistencias(guardia_id);

-- Índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_asistencias_created_at ON public.asistencias(created_at DESC);

-- Índice para búsquedas por tipo de asistencia
CREATE INDEX IF NOT EXISTS idx_asistencias_tipo ON public.asistencias(tipo_asistencia);

-- Índice compuesto para búsquedas por guardia y fecha
CREATE INDEX IF NOT EXISTS idx_asistencias_guardia_fecha ON public.asistencias(guardia_id, created_at DESC);

-- Índice para búsquedas geográficas
CREATE INDEX IF NOT EXISTS idx_asistencias_ubicacion ON public.asistencias(latitud, longitud);

-- ============================================
-- 3. FUNCIÓN PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- ============================================

-- La función ya existe en supabase-setup.sql, pero la verificamos
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_asistencias_updated_at ON public.asistencias;
CREATE TRIGGER update_asistencias_updated_at
  BEFORE UPDATE ON public.asistencias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 4. FUNCIÓN AUXILIAR PARA VERIFICAR SI ES GUARDIA
-- ============================================
-- Esta función permite verificar si el usuario autenticado es un guardia
-- sin acceder directamente a auth.users

CREATE OR REPLACE FUNCTION public.es_guardia_autenticado()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.guardias
    WHERE guardias.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Guardias pueden leer sus propias asistencias" ON public.asistencias;
DROP POLICY IF EXISTS "Guardias pueden crear sus propias asistencias" ON public.asistencias;
DROP POLICY IF EXISTS "Admins pueden leer todas las asistencias" ON public.asistencias;
DROP POLICY IF EXISTS "Admins pueden actualizar asistencias" ON public.asistencias;
DROP POLICY IF EXISTS "Admins pueden eliminar asistencias" ON public.asistencias;

-- Política para SELECT: Los guardias pueden leer solo sus propias asistencias
CREATE POLICY "Guardias pueden leer sus propias asistencias"
  ON public.asistencias
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guardias
      WHERE guardias.id = asistencias.guardia_id
      AND guardias.user_id = auth.uid()
    )
  );

-- Política para SELECT: Los admins pueden leer todas las asistencias
-- (Si no es guardia, entonces es admin)
CREATE POLICY "Admins pueden leer todas las asistencias"
  ON public.asistencias
  FOR SELECT
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  );

-- Política para INSERT: Los guardias pueden crear solo sus propias asistencias
CREATE POLICY "Guardias pueden crear sus propias asistencias"
  ON public.asistencias
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guardias
      WHERE guardias.id = asistencias.guardia_id
      AND guardias.user_id = auth.uid()
    )
  );

-- Política para UPDATE: Solo admins pueden actualizar asistencias
CREATE POLICY "Admins pueden actualizar asistencias"
  ON public.asistencias
  FOR UPDATE
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  )
  WITH CHECK (
    NOT public.es_guardia_autenticado()
  );

-- Política para DELETE: Solo admins pueden eliminar asistencias
CREATE POLICY "Admins pueden eliminar asistencias"
  ON public.asistencias
  FOR DELETE
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  );

-- ============================================
-- 6. HABILITAR REALTIME PARA LA TABLA
-- ============================================

-- Asegurarse de que la publicación de Realtime incluya la tabla asistencias
-- Solo agregar si no está ya incluida
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'asistencias'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.asistencias;
  END IF;
END $$;

-- ============================================
-- 7. FUNCIÓN PARA OBTENER ESTADÍSTICAS DE ASISTENCIA
-- ============================================

CREATE OR REPLACE FUNCTION public.get_asistencias_stats(
  p_guardia_id UUID DEFAULT NULL,
  p_fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_fecha_fin TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  total_asistencias BIGINT,
  total_entradas BIGINT,
  total_salidas BIGINT,
  ultima_asistencia TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_asistencias,
    COUNT(*) FILTER (WHERE tipo_asistencia = 'entrada')::BIGINT as total_entradas,
    COUNT(*) FILTER (WHERE tipo_asistencia = 'salida')::BIGINT as total_salidas,
    MAX(created_at) as ultima_asistencia
  FROM public.asistencias
  WHERE
    (p_guardia_id IS NULL OR guardia_id = p_guardia_id)
    AND (p_fecha_inicio IS NULL OR created_at >= p_fecha_inicio)
    AND (p_fecha_fin IS NULL OR created_at <= p_fecha_fin);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. VERIFICACIÓN
-- ============================================
-- Ejecuta estas consultas para verificar que todo está configurado correctamente

-- Verificar que la tabla existe
-- SELECT table_name, table_schema 
-- FROM information_schema.tables 
-- WHERE table_name = 'asistencias';

-- Verificar que RLS está habilitado
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'asistencias';

-- Verificar políticas RLS
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'asistencias';

-- Verificar que Realtime está habilitado
-- SELECT * FROM pg_publication_tables WHERE tablename = 'asistencias';

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- Después de ejecutar este script:
-- 1. Verifica que la tabla se creó correctamente
-- 2. Verifica que las políticas RLS están activas
-- 3. Prueba crear una asistencia desde la app del guardia
-- 4. Verifica que los admins pueden ver todas las asistencias
