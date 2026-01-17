-- ============================================
-- Script de configuración de tabla HISTORIAL_UBICACIONES para SeguridApp
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- Dashboard > SQL Editor > New Query

-- ============================================
-- 1. CREAR TABLA DE HISTORIAL DE UBICACIONES
-- ============================================

CREATE TABLE IF NOT EXISTS public.historial_ubicaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guardia_id UUID NOT NULL REFERENCES public.guardias(id) ON DELETE CASCADE,
  latitud DOUBLE PRECISION NOT NULL,
  longitud DOUBLE PRECISION NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  velocidad DOUBLE PRECISION, -- Velocidad en m/s (opcional)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. CREAR ÍNDICES PARA MEJOR RENDIMIENTO
-- ============================================

-- Índice para búsquedas por guardia
CREATE INDEX IF NOT EXISTS idx_historial_guardia_id ON public.historial_ubicaciones(guardia_id);

-- Índice para búsquedas por timestamp
CREATE INDEX IF NOT EXISTS idx_historial_timestamp ON public.historial_ubicaciones(timestamp DESC);

-- Índice compuesto para búsquedas por guardia y fecha
CREATE INDEX IF NOT EXISTS idx_historial_guardia_fecha ON public.historial_ubicaciones(guardia_id, timestamp DESC);

-- Índice para búsquedas geográficas
CREATE INDEX IF NOT EXISTS idx_historial_ubicacion ON public.historial_ubicaciones(latitud, longitud);

-- Índice para limpieza de datos antiguos
CREATE INDEX IF NOT EXISTS idx_historial_created_at ON public.historial_ubicaciones(created_at);

-- ============================================
-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.historial_ubicaciones ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Guardias pueden leer su propio historial" ON public.historial_ubicaciones;
DROP POLICY IF EXISTS "Admins pueden leer todo el historial" ON public.historial_ubicaciones;
DROP POLICY IF EXISTS "Sistema puede crear historial" ON public.historial_ubicaciones;
DROP POLICY IF EXISTS "Solo admins pueden eliminar historial" ON public.historial_ubicaciones;

-- Política para SELECT: Los guardias pueden leer solo su propio historial
CREATE POLICY "Guardias pueden leer su propio historial"
  ON public.historial_ubicaciones
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guardias
      WHERE guardias.id = historial_ubicaciones.guardia_id
      AND guardias.user_id = auth.uid()
    )
  );

-- Política para SELECT: Los admins pueden leer todo el historial
CREATE POLICY "Admins pueden leer todo el historial"
  ON public.historial_ubicaciones
  FOR SELECT
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  );

-- Política para INSERT: Cualquier usuario autenticado puede crear historial (el sistema lo crea)
CREATE POLICY "Sistema puede crear historial"
  ON public.historial_ubicaciones
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para DELETE: Solo admins pueden eliminar historial
CREATE POLICY "Solo admins pueden eliminar historial"
  ON public.historial_ubicaciones
  FOR DELETE
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  );

-- ============================================
-- 5. HABILITAR REALTIME PARA LA TABLA
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'historial_ubicaciones'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.historial_ubicaciones;
  END IF;
END $$;

-- ============================================
-- 6. FUNCIÓN PARA LIMPIAR HISTORIAL ANTIGUO
-- ============================================

CREATE OR REPLACE FUNCTION public.limpiar_historial_antiguo(dias INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  registros_eliminados INTEGER;
BEGIN
  DELETE FROM public.historial_ubicaciones
  WHERE created_at < NOW() - (dias || ' days')::INTERVAL;
  
  GET DIAGNOSTICS registros_eliminados = ROW_COUNT;
  RETURN registros_eliminados;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- Después de ejecutar este script:
-- 1. Verifica que la tabla se creó correctamente
-- 2. Verifica que las políticas RLS están activas
-- 3. Configura un job programado para limpiar historial antiguo (opcional)
-- 4. El historial se guardará automáticamente cuando los guardias actualicen su ubicación
