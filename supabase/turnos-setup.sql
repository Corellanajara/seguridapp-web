-- ============================================
-- Script de configuración de tablas TURNOS para SeguridApp
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- Dashboard > SQL Editor > New Query

-- ============================================
-- 1. CREAR TABLA DE TURNOS
-- ============================================

CREATE TABLE IF NOT EXISTS public.turnos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  hora_inicio TIME NOT NULL, -- Formato HH:MM:SS
  hora_fin TIME NOT NULL, -- Formato HH:MM:SS
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. CREAR TABLA DE HORARIOS
-- ============================================

CREATE TABLE IF NOT EXISTS public.horarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  turno_id UUID NOT NULL REFERENCES public.turnos(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6), -- 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. CREAR TABLA DE ASIGNACIONES DE TURNOS
-- ============================================

CREATE TABLE IF NOT EXISTS public.asignaciones_turnos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guardia_id UUID NOT NULL REFERENCES public.guardias(id) ON DELETE CASCADE,
  turno_id UUID NOT NULL REFERENCES public.turnos(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE, -- NULL = indefinido
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. CREAR ÍNDICES PARA MEJOR RENDIMIENTO
-- ============================================

-- Índices para turnos
CREATE INDEX IF NOT EXISTS idx_turnos_activo ON public.turnos(activo);
CREATE INDEX IF NOT EXISTS idx_turnos_hora_inicio ON public.turnos(hora_inicio);

-- Índices para horarios
CREATE INDEX IF NOT EXISTS idx_horarios_turno_id ON public.horarios(turno_id);
CREATE INDEX IF NOT EXISTS idx_horarios_dia_semana ON public.horarios(dia_semana);

-- Índices para asignaciones
CREATE INDEX IF NOT EXISTS idx_asignaciones_guardia_id ON public.asignaciones_turnos(guardia_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_turno_id ON public.asignaciones_turnos(turno_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_activo ON public.asignaciones_turnos(activo);
CREATE INDEX IF NOT EXISTS idx_asignaciones_fecha_inicio ON public.asignaciones_turnos(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_asignaciones_fecha_fin ON public.asignaciones_turnos(fecha_fin);
CREATE INDEX IF NOT EXISTS idx_asignaciones_guardia_fecha ON public.asignaciones_turnos(guardia_id, fecha_inicio DESC);

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
DROP TRIGGER IF EXISTS update_turnos_updated_at ON public.turnos;
CREATE TRIGGER update_turnos_updated_at
  BEFORE UPDATE ON public.turnos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_horarios_updated_at ON public.horarios;
CREATE TRIGGER update_horarios_updated_at
  BEFORE UPDATE ON public.horarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_asignaciones_turnos_updated_at ON public.asignaciones_turnos;
CREATE TRIGGER update_asignaciones_turnos_updated_at
  BEFORE UPDATE ON public.asignaciones_turnos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 6. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones_turnos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. POLÍTICAS DE SEGURIDAD (RLS) - TURNOS
-- ============================================

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Todos los usuarios autenticados pueden leer turnos" ON public.turnos;
DROP POLICY IF EXISTS "Solo admins pueden crear turnos" ON public.turnos;
DROP POLICY IF EXISTS "Solo admins pueden actualizar turnos" ON public.turnos;
DROP POLICY IF EXISTS "Solo admins pueden eliminar turnos" ON public.turnos;

-- Política para SELECT: Todos los usuarios autenticados pueden leer turnos
CREATE POLICY "Todos los usuarios autenticados pueden leer turnos"
  ON public.turnos
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para INSERT: Solo admins pueden crear turnos
CREATE POLICY "Solo admins pueden crear turnos"
  ON public.turnos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT public.es_guardia_autenticado()
  );

-- Política para UPDATE: Solo admins pueden actualizar turnos
CREATE POLICY "Solo admins pueden actualizar turnos"
  ON public.turnos
  FOR UPDATE
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  )
  WITH CHECK (
    NOT public.es_guardia_autenticado()
  );

-- Política para DELETE: Solo admins pueden eliminar turnos
CREATE POLICY "Solo admins pueden eliminar turnos"
  ON public.turnos
  FOR DELETE
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  );

-- ============================================
-- 8. POLÍTICAS DE SEGURIDAD (RLS) - HORARIOS
-- ============================================

DROP POLICY IF EXISTS "Todos los usuarios autenticados pueden leer horarios" ON public.horarios;
DROP POLICY IF EXISTS "Solo admins pueden crear horarios" ON public.horarios;
DROP POLICY IF EXISTS "Solo admins pueden actualizar horarios" ON public.horarios;
DROP POLICY IF EXISTS "Solo admins pueden eliminar horarios" ON public.horarios;

CREATE POLICY "Todos los usuarios autenticados pueden leer horarios"
  ON public.horarios
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo admins pueden crear horarios"
  ON public.horarios
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT public.es_guardia_autenticado()
  );

CREATE POLICY "Solo admins pueden actualizar horarios"
  ON public.horarios
  FOR UPDATE
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  )
  WITH CHECK (
    NOT public.es_guardia_autenticado()
  );

CREATE POLICY "Solo admins pueden eliminar horarios"
  ON public.horarios
  FOR DELETE
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  );

-- ============================================
-- 9. POLÍTICAS DE SEGURIDAD (RLS) - ASIGNACIONES
-- ============================================

DROP POLICY IF EXISTS "Guardias pueden leer sus propias asignaciones" ON public.asignaciones_turnos;
DROP POLICY IF EXISTS "Admins pueden leer todas las asignaciones" ON public.asignaciones_turnos;
DROP POLICY IF EXISTS "Solo admins pueden crear asignaciones" ON public.asignaciones_turnos;
DROP POLICY IF EXISTS "Solo admins pueden actualizar asignaciones" ON public.asignaciones_turnos;
DROP POLICY IF EXISTS "Solo admins pueden eliminar asignaciones" ON public.asignaciones_turnos;

-- Política para SELECT: Los guardias pueden leer solo sus propias asignaciones
CREATE POLICY "Guardias pueden leer sus propias asignaciones"
  ON public.asignaciones_turnos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guardias
      WHERE guardias.id = asignaciones_turnos.guardia_id
      AND guardias.user_id = auth.uid()
    )
  );

-- Política para SELECT: Los admins pueden leer todas las asignaciones
CREATE POLICY "Admins pueden leer todas las asignaciones"
  ON public.asignaciones_turnos
  FOR SELECT
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  );

-- Política para INSERT: Solo admins pueden crear asignaciones
CREATE POLICY "Solo admins pueden crear asignaciones"
  ON public.asignaciones_turnos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT public.es_guardia_autenticado()
  );

-- Política para UPDATE: Solo admins pueden actualizar asignaciones
CREATE POLICY "Solo admins pueden actualizar asignaciones"
  ON public.asignaciones_turnos
  FOR UPDATE
  TO authenticated
  USING (
    NOT public.es_guardia_autenticado()
  )
  WITH CHECK (
    NOT public.es_guardia_autenticado()
  );

-- Política para DELETE: Solo admins pueden eliminar asignaciones
CREATE POLICY "Solo admins pueden eliminar asignaciones"
  ON public.asignaciones_turnos
  FOR DELETE
  TO authenticated
  USING (
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
    AND tablename = 'turnos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.turnos;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'horarios'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.horarios;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'asignaciones_turnos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.asignaciones_turnos;
  END IF;
END $$;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- Después de ejecutar este script:
-- 1. Verifica que las tablas se crearon correctamente
-- 2. Verifica que las políticas RLS están activas
-- 3. Prueba crear un turno desde la interfaz de administración
-- 4. Verifica que los guardias pueden ver sus asignaciones
