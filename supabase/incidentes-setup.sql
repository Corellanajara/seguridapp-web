-- ============================================
-- Script de configuración de tablas INCIDENTES para SeguridApp
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- Dashboard > SQL Editor > New Query

-- ============================================
-- 1. CREAR TABLA DE TIPOS DE INCIDENTE
-- ============================================

CREATE TABLE IF NOT EXISTS public.tipos_incidente (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  severidad TEXT NOT NULL CHECK (severidad IN ('baja', 'media', 'alta', 'critica')),
  tiempo_respuesta_minutos INTEGER,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. CREAR TABLA DE INCIDENTES
-- ============================================

CREATE TABLE IF NOT EXISTS public.incidentes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guardia_id UUID NOT NULL REFERENCES public.guardias(id) ON DELETE CASCADE,
  tipo_id UUID NOT NULL REFERENCES public.tipos_incidente(id) ON DELETE RESTRICT,
  descripcion TEXT NOT NULL,
  foto_url TEXT,
  latitud DOUBLE PRECISION NOT NULL,
  longitud DOUBLE PRECISION NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('pendiente', 'en_proceso', 'resuelto', 'cancelado')) DEFAULT 'pendiente',
  prioridad TEXT CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. CREAR ÍNDICES PARA MEJOR RENDIMIENTO
-- ============================================

-- Índices para tipos_incidente
CREATE INDEX IF NOT EXISTS idx_tipos_incidente_activo ON public.tipos_incidente(activo);
CREATE INDEX IF NOT EXISTS idx_tipos_incidente_severidad ON public.tipos_incidente(severidad);

-- Índices para incidentes
CREATE INDEX IF NOT EXISTS idx_incidentes_guardia_id ON public.incidentes(guardia_id);
CREATE INDEX IF NOT EXISTS idx_incidentes_tipo_id ON public.incidentes(tipo_id);
CREATE INDEX IF NOT EXISTS idx_incidentes_estado ON public.incidentes(estado);
CREATE INDEX IF NOT EXISTS idx_incidentes_prioridad ON public.incidentes(prioridad);
CREATE INDEX IF NOT EXISTS idx_incidentes_created_at ON public.incidentes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidentes_guardia_fecha ON public.incidentes(guardia_id, created_at DESC);

-- ============================================
-- 4. FUNCIÓN PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_tipos_incidente_updated_at ON public.tipos_incidente;
CREATE TRIGGER update_tipos_incidente_updated_at
  BEFORE UPDATE ON public.tipos_incidente
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_incidentes_updated_at ON public.incidentes;
CREATE TRIGGER update_incidentes_updated_at
  BEFORE UPDATE ON public.incidentes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 5. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.tipos_incidente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidentes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. POLÍTICAS DE SEGURIDAD (RLS) - TIPOS
-- ============================================

DROP POLICY IF EXISTS "Todos pueden leer tipos de incidente" ON public.tipos_incidente;
DROP POLICY IF EXISTS "Solo admins pueden crear tipos" ON public.tipos_incidente;
DROP POLICY IF EXISTS "Solo admins pueden actualizar tipos" ON public.tipos_incidente;
DROP POLICY IF EXISTS "Solo admins pueden eliminar tipos" ON public.tipos_incidente;

CREATE POLICY "Todos pueden leer tipos de incidente"
  ON public.tipos_incidente
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo admins pueden crear tipos"
  ON public.tipos_incidente
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT public.es_guardia_autenticado()
  );

CREATE POLICY "Solo admins pueden actualizar tipos"
  ON public.tipos_incidente
  FOR UPDATE
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  )
  WITH CHECK (
    NOT public.es_guardia_autenticado()
  );

CREATE POLICY "Solo admins pueden eliminar tipos"
  ON public.tipos_incidente
  FOR DELETE
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  );

-- ============================================
-- 7. POLÍTICAS DE SEGURIDAD (RLS) - INCIDENTES
-- ============================================

DROP POLICY IF EXISTS "Guardias pueden leer sus propios incidentes" ON public.incidentes;
DROP POLICY IF EXISTS "Admins pueden leer todos los incidentes" ON public.incidentes;
DROP POLICY IF EXISTS "Guardias pueden crear incidentes" ON public.incidentes;
DROP POLICY IF EXISTS "Solo admins pueden actualizar incidentes" ON public.incidentes;
DROP POLICY IF EXISTS "Solo admins pueden eliminar incidentes" ON public.incidentes;

CREATE POLICY "Guardias pueden leer sus propios incidentes"
  ON public.incidentes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guardias
      WHERE guardias.id = incidentes.guardia_id
      AND guardias.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins pueden leer todos los incidentes"
  ON public.incidentes
  FOR SELECT
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  );

CREATE POLICY "Guardias pueden crear incidentes"
  ON public.incidentes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guardias
      WHERE guardias.id = incidentes.guardia_id
      AND guardias.user_id = auth.uid()
    )
  );

CREATE POLICY "Solo admins pueden actualizar incidentes"
  ON public.incidentes
  FOR UPDATE
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  )
  WITH CHECK (
    NOT public.es_guardia_autenticado()
  );

CREATE POLICY "Solo admins pueden eliminar incidentes"
  ON public.incidentes
  FOR DELETE
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  );

-- ============================================
-- 8. HABILITAR REALTIME
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'tipos_incidente'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tipos_incidente;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'incidentes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.incidentes;
  END IF;
END $$;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
