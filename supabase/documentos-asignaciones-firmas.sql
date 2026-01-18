-- ============================================
-- Script NUEVO: Asignaciones y Firmas de Documentos
-- ============================================
-- Este script contiene SOLO las partes nuevas agregadas para:
-- - Asignar documentos a guardias
-- - Firmar documentos por guardias
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- Dashboard > SQL Editor > New Query
-- ============================================

-- ============================================
-- 1. FUNCIÓN AUXILIAR (si no existe ya)
-- ============================================
-- Esta función permite verificar si el usuario autenticado es un guardia
-- Si ya existe en tu base de datos, puedes omitir esta sección

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
-- 2. TABLA: ASIGNACIONES DE DOCUMENTOS
-- ============================================
-- Esta tabla relaciona documentos con guardias para asignarlos

CREATE TABLE IF NOT EXISTS public.asignaciones_documento (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  documento_id UUID NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  guardia_id UUID NOT NULL REFERENCES public.guardias(id) ON DELETE CASCADE,
  estado TEXT NOT NULL CHECK (estado IN ('pendiente', 'firmado', 'rechazado')) DEFAULT 'pendiente',
  fecha_asignacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_firma TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(documento_id, guardia_id)
);

-- ============================================
-- 3. TABLA: FIRMAS DE DOCUMENTOS
-- ============================================
-- Esta tabla almacena las firmas realizadas por los guardias

CREATE TABLE IF NOT EXISTS public.firmas_documento (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asignacion_id UUID NOT NULL REFERENCES public.asignaciones_documento(id) ON DELETE CASCADE,
  firma_data TEXT NOT NULL, -- JSON con los datos de la firma
  tipo_firma TEXT NOT NULL CHECK (tipo_firma IN ('manual', 'clave_unica', 'electronica')),
  hash_firma TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. ÍNDICES PARA MEJOR RENDIMIENTO
-- ============================================

CREATE INDEX IF NOT EXISTS idx_asignaciones_documento_guardia ON public.asignaciones_documento(guardia_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_documento_documento ON public.asignaciones_documento(documento_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_documento_estado ON public.asignaciones_documento(estado);
CREATE INDEX IF NOT EXISTS idx_firmas_documento_asignacion ON public.firmas_documento(asignacion_id);

-- ============================================
-- 5. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.asignaciones_documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firmas_documento ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. POLÍTICAS RLS PARA ASIGNACIONES
-- ============================================

-- Guardias pueden ver sus propias asignaciones
CREATE POLICY "Guardias pueden ver sus asignaciones" ON public.asignaciones_documento 
  FOR SELECT TO authenticated 
  USING (
    guardia_id IN (
      SELECT id FROM public.guardias WHERE user_id = auth.uid()
    )
  );

-- Admins pueden ver todas las asignaciones
CREATE POLICY "Admins pueden ver todas las asignaciones" ON public.asignaciones_documento 
  FOR SELECT TO authenticated 
  USING (NOT public.es_guardia_autenticado());

-- Admins pueden crear asignaciones
CREATE POLICY "Admins pueden crear asignaciones" ON public.asignaciones_documento 
  FOR INSERT TO authenticated 
  WITH CHECK (NOT public.es_guardia_autenticado());

-- Guardias pueden actualizar sus asignaciones pendientes (para firmar)
CREATE POLICY "Guardias pueden actualizar sus asignaciones pendientes" ON public.asignaciones_documento 
  FOR UPDATE TO authenticated 
  USING (
    estado = 'pendiente' AND
    guardia_id IN (
      SELECT id FROM public.guardias WHERE user_id = auth.uid()
    )
  );

-- Admins pueden eliminar asignaciones
CREATE POLICY "Admins pueden eliminar asignaciones" ON public.asignaciones_documento 
  FOR DELETE TO authenticated 
  USING (NOT public.es_guardia_autenticado());

-- ============================================
-- 7. POLÍTICAS RLS PARA FIRMAS
-- ============================================

-- Guardias pueden ver sus propias firmas
CREATE POLICY "Guardias pueden ver sus firmas" ON public.firmas_documento 
  FOR SELECT TO authenticated 
  USING (
    asignacion_id IN (
      SELECT id FROM public.asignaciones_documento 
      WHERE guardia_id IN (
        SELECT id FROM public.guardias WHERE user_id = auth.uid()
      )
    )
  );

-- Admins pueden ver todas las firmas
CREATE POLICY "Admins pueden ver todas las firmas" ON public.firmas_documento 
  FOR SELECT TO authenticated 
  USING (NOT public.es_guardia_autenticado());

-- Guardias pueden crear firmas para sus asignaciones pendientes
CREATE POLICY "Guardias pueden crear firmas para sus asignaciones" ON public.firmas_documento 
  FOR INSERT TO authenticated 
  WITH CHECK (
    asignacion_id IN (
      SELECT id FROM public.asignaciones_documento 
      WHERE estado = 'pendiente' AND
      guardia_id IN (
        SELECT id FROM public.guardias WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- 8. FUNCIÓN: ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- ============================================

CREATE OR REPLACE FUNCTION update_asignaciones_documento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. TRIGGER: ACTUALIZAR updated_at
-- ============================================

DROP TRIGGER IF EXISTS update_asignaciones_documento_updated_at ON public.asignaciones_documento;

CREATE TRIGGER update_asignaciones_documento_updated_at
  BEFORE UPDATE ON public.asignaciones_documento
  FOR EACH ROW
  EXECUTE FUNCTION update_asignaciones_documento_updated_at();

-- ============================================
-- 10. FUNCIÓN: ACTUALIZAR ESTADO AL FIRMAR
-- ============================================
-- Esta función actualiza automáticamente el estado de la asignación
-- a 'firmado' cuando se crea una firma

CREATE OR REPLACE FUNCTION actualizar_estado_asignacion_al_firmar()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.asignaciones_documento
  SET estado = 'firmado',
      fecha_firma = NOW(),
      updated_at = NOW()
  WHERE id = NEW.asignacion_id AND estado = 'pendiente';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 11. TRIGGER: ACTUALIZAR ESTADO AL FIRMAR
-- ============================================

DROP TRIGGER IF EXISTS actualizar_estado_al_firmar ON public.firmas_documento;

CREATE TRIGGER actualizar_estado_al_firmar
  AFTER INSERT ON public.firmas_documento
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_estado_asignacion_al_firmar();

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- Después de ejecutar este script:
-- 1. Verifica que las tablas se crearon correctamente
-- 2. Verifica que las políticas RLS están activas
-- 3. Prueba asignar un documento a un guardia desde la aplicación
-- 4. Prueba que el guardia pueda ver y firmar el documento
-- ============================================
