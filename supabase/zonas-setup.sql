-- ============================================
-- Script de configuración de tablas ZONAS para SeguridApp
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- Dashboard > SQL Editor > New Query

-- ============================================
-- 1. CREAR TABLA DE ZONAS
-- ============================================

CREATE TABLE IF NOT EXISTS public.zonas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('poligono', 'circulo')),
  coordenadas TEXT NOT NULL, -- JSON string con las coordenadas
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. CREAR TABLA DE ASIGNACIONES DE ZONAS
-- ============================================

CREATE TABLE IF NOT EXISTS public.asignaciones_zona (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guardia_id UUID NOT NULL REFERENCES public.guardias(id) ON DELETE CASCADE,
  zona_id UUID NOT NULL REFERENCES public.zonas(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE, -- NULL = indefinido
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. CREAR TABLA DE ALERTAS DE ZONAS
-- ============================================

CREATE TABLE IF NOT EXISTS public.alertas_zona (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guardia_id UUID NOT NULL REFERENCES public.guardias(id) ON DELETE CASCADE,
  zona_id UUID NOT NULL REFERENCES public.zonas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  resuelta BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. CREAR ÍNDICES PARA MEJOR RENDIMIENTO
-- ============================================

-- Índices para zonas
CREATE INDEX IF NOT EXISTS idx_zonas_activo ON public.zonas(activo);
CREATE INDEX IF NOT EXISTS idx_zonas_tipo ON public.zonas(tipo);

-- Índices para asignaciones
CREATE INDEX IF NOT EXISTS idx_asignaciones_zona_guardia_id ON public.asignaciones_zona(guardia_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_zona_zona_id ON public.asignaciones_zona(zona_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_zona_activo ON public.asignaciones_zona(activo);
CREATE INDEX IF NOT EXISTS idx_asignaciones_zona_fecha_inicio ON public.asignaciones_zona(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_asignaciones_zona_fecha_fin ON public.asignaciones_zona(fecha_fin);
CREATE INDEX IF NOT EXISTS idx_asignaciones_zona_guardia_fecha ON public.asignaciones_zona(guardia_id, fecha_inicio DESC);

-- Índices para alertas
CREATE INDEX IF NOT EXISTS idx_alertas_zona_guardia_id ON public.alertas_zona(guardia_id);
CREATE INDEX IF NOT EXISTS idx_alertas_zona_zona_id ON public.alertas_zona(zona_id);
CREATE INDEX IF NOT EXISTS idx_alertas_zona_resuelta ON public.alertas_zona(resuelta);
CREATE INDEX IF NOT EXISTS idx_alertas_zona_timestamp ON public.alertas_zona(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alertas_zona_tipo ON public.alertas_zona(tipo);

-- ============================================
-- 5. FUNCIÓN PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- ============================================

-- La función ya existe, pero la verificamos
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_zonas_updated_at ON public.zonas;
CREATE TRIGGER update_zonas_updated_at
  BEFORE UPDATE ON public.zonas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_asignaciones_zona_updated_at ON public.asignaciones_zona;
CREATE TRIGGER update_asignaciones_zona_updated_at
  BEFORE UPDATE ON public.asignaciones_zona
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_alertas_zona_updated_at ON public.alertas_zona;
CREATE TRIGGER update_alertas_zona_updated_at
  BEFORE UPDATE ON public.alertas_zona
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 6. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.zonas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones_zona ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_zona ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. POLÍTICAS DE SEGURIDAD (RLS) - ZONAS
-- ============================================

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Todos los usuarios autenticados pueden leer zonas" ON public.zonas;
DROP POLICY IF EXISTS "Solo admins pueden crear zonas" ON public.zonas;
DROP POLICY IF EXISTS "Solo admins pueden actualizar zonas" ON public.zonas;
DROP POLICY IF EXISTS "Solo admins pueden eliminar zonas" ON public.zonas;

-- Política para SELECT: Todos los usuarios autenticados pueden leer zonas
CREATE POLICY "Todos los usuarios autenticados pueden leer zonas"
  ON public.zonas
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para INSERT: Solo admins pueden crear zonas
CREATE POLICY "Solo admins pueden crear zonas"
  ON public.zonas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT public.es_guardia_autenticado()
  );

-- Política para UPDATE: Solo admins pueden actualizar zonas
CREATE POLICY "Solo admins pueden actualizar zonas"
  ON public.zonas
  FOR UPDATE
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  )
  WITH CHECK (
    NOT public.es_guardia_autenticado()
  );

-- Política para DELETE: Solo admins pueden eliminar zonas
CREATE POLICY "Solo admins pueden eliminar zonas"
  ON public.zonas
  FOR DELETE
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  );

-- ============================================
-- 8. POLÍTICAS DE SEGURIDAD (RLS) - ASIGNACIONES
-- ============================================

DROP POLICY IF EXISTS "Guardias pueden leer sus propias asignaciones de zona" ON public.asignaciones_zona;
DROP POLICY IF EXISTS "Admins pueden leer todas las asignaciones de zona" ON public.asignaciones_zona;
DROP POLICY IF EXISTS "Solo admins pueden crear asignaciones de zona" ON public.asignaciones_zona;
DROP POLICY IF EXISTS "Solo admins pueden actualizar asignaciones de zona" ON public.asignaciones_zona;
DROP POLICY IF EXISTS "Solo admins pueden eliminar asignaciones de zona" ON public.asignaciones_zona;

-- Política para SELECT: Los guardias pueden leer solo sus propias asignaciones
CREATE POLICY "Guardias pueden leer sus propias asignaciones de zona"
  ON public.asignaciones_zona
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guardias
      WHERE guardias.id = asignaciones_zona.guardia_id
      AND guardias.user_id = auth.uid()
    )
  );

-- Política para SELECT: Los admins pueden leer todas las asignaciones
CREATE POLICY "Admins pueden leer todas las asignaciones de zona"
  ON public.asignaciones_zona
  FOR SELECT
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  );

-- Política para INSERT: Solo admins pueden crear asignaciones
CREATE POLICY "Solo admins pueden crear asignaciones de zona"
  ON public.asignaciones_zona
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT public.es_guardia_autenticado()
  );

-- Política para UPDATE: Solo admins pueden actualizar asignaciones
CREATE POLICY "Solo admins pueden actualizar asignaciones de zona"
  ON public.asignaciones_zona
  FOR UPDATE
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  )
  WITH CHECK (
    NOT public.es_guardia_autenticado()
  );

-- Política para DELETE: Solo admins pueden eliminar asignaciones
CREATE POLICY "Solo admins pueden eliminar asignaciones de zona"
  ON public.asignaciones_zona
  FOR DELETE
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  );

-- ============================================
-- 9. POLÍTICAS DE SEGURIDAD (RLS) - ALERTAS
-- ============================================

DROP POLICY IF EXISTS "Guardias pueden leer sus propias alertas" ON public.alertas_zona;
DROP POLICY IF EXISTS "Admins pueden leer todas las alertas" ON public.alertas_zona;
DROP POLICY IF EXISTS "Sistema puede crear alertas" ON public.alertas_zona;
DROP POLICY IF EXISTS "Solo admins pueden actualizar alertas" ON public.alertas_zona;

-- Política para SELECT: Los guardias pueden leer solo sus propias alertas
CREATE POLICY "Guardias pueden leer sus propias alertas"
  ON public.alertas_zona
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guardias
      WHERE guardias.id = alertas_zona.guardia_id
      AND guardias.user_id = auth.uid()
    )
  );

-- Política para SELECT: Los admins pueden leer todas las alertas
CREATE POLICY "Admins pueden leer todas las alertas"
  ON public.alertas_zona
  FOR SELECT
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  );

-- Política para INSERT: Cualquier usuario autenticado puede crear alertas (el sistema las crea)
CREATE POLICY "Sistema puede crear alertas"
  ON public.alertas_zona
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para UPDATE: Solo admins pueden actualizar alertas (resolver)
CREATE POLICY "Solo admins pueden actualizar alertas"
  ON public.alertas_zona
  FOR UPDATE
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  )
  WITH CHECK (
    NOT public.es_guardia_autenticado()
  );

-- ============================================
-- 10. HABILITAR REALTIME PARA LAS TABLAS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'zonas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.zonas;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'asignaciones_zona'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.asignaciones_zona;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'alertas_zona'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.alertas_zona;
  END IF;
END $$;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- Después de ejecutar este script:
-- 1. Verifica que las tablas se crearon correctamente
-- 2. Verifica que las políticas RLS están activas
-- 3. Prueba crear una zona desde la interfaz de administración
-- 4. Verifica que los guardias pueden ver sus asignaciones
