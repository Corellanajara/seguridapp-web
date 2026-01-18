-- ============================================
-- Script de configuración de DOCUMENTOS para SeguridApp
-- ============================================

CREATE TABLE IF NOT EXISTS public.documentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  archivo_url TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  estado TEXT NOT NULL CHECK (estado IN ('borrador', 'pendiente', 'aprobado', 'rechazado')) DEFAULT 'borrador',
  empresa_id UUID REFERENCES public.empresas(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.versiones_documento (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  documento_id UUID NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  archivo_url TEXT NOT NULL,
  cambios TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.aprobaciones_documento (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  documento_id UUID NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  estado TEXT NOT NULL CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  comentario TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para asignar documentos a guardias
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

-- Tabla para almacenar las firmas de documentos
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_documentos_empresa ON public.documentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_versiones_documento ON public.versiones_documento(documento_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_documento_guardia ON public.asignaciones_documento(guardia_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_documento_documento ON public.asignaciones_documento(documento_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_documento_estado ON public.asignaciones_documento(estado);
CREATE INDEX IF NOT EXISTS idx_firmas_documento_asignacion ON public.firmas_documento(asignacion_id);

-- RLS
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.versiones_documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aprobaciones_documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones_documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firmas_documento ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para documentos
CREATE POLICY "Todos pueden leer documentos" ON public.documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins pueden crear documentos" ON public.documentos FOR INSERT TO authenticated WITH CHECK (NOT public.es_guardia_autenticado());
CREATE POLICY "Admins pueden actualizar documentos" ON public.documentos FOR UPDATE TO authenticated USING (NOT public.es_guardia_autenticado());
CREATE POLICY "Admins pueden eliminar documentos" ON public.documentos FOR DELETE TO authenticated USING (NOT public.es_guardia_autenticado());

-- Políticas RLS para asignaciones
CREATE POLICY "Guardias pueden ver sus asignaciones" ON public.asignaciones_documento FOR SELECT TO authenticated 
  USING (
    guardia_id IN (
      SELECT id FROM public.guardias WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins pueden ver todas las asignaciones" ON public.asignaciones_documento FOR SELECT TO authenticated 
  USING (NOT public.es_guardia_autenticado());

CREATE POLICY "Admins pueden crear asignaciones" ON public.asignaciones_documento FOR INSERT TO authenticated 
  WITH CHECK (NOT public.es_guardia_autenticado());

CREATE POLICY "Guardias pueden actualizar sus asignaciones pendientes" ON public.asignaciones_documento FOR UPDATE TO authenticated 
  USING (
    estado = 'pendiente' AND
    guardia_id IN (
      SELECT id FROM public.guardias WHERE user_id = auth.uid()
    )
  );

-- Políticas RLS para firmas
CREATE POLICY "Guardias pueden ver sus firmas" ON public.firmas_documento FOR SELECT TO authenticated 
  USING (
    asignacion_id IN (
      SELECT id FROM public.asignaciones_documento 
      WHERE guardia_id IN (
        SELECT id FROM public.guardias WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins pueden ver todas las firmas" ON public.firmas_documento FOR SELECT TO authenticated 
  USING (NOT public.es_guardia_autenticado());CREATE POLICY "Guardias pueden crear firmas para sus asignaciones" ON public.firmas_documento FOR INSERT TO authenticated 
  WITH CHECK (
    asignacion_id IN (
      SELECT id FROM public.asignaciones_documento 
      WHERE estado = 'pendiente' AND
      guardia_id IN (
        SELECT id FROM public.guardias WHERE user_id = auth.uid()
      )
    )
  );

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_asignaciones_documento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_asignaciones_documento_updated_at
  BEFORE UPDATE ON public.asignaciones_documento
  FOR EACH ROW
  EXECUTE FUNCTION update_asignaciones_documento_updated_at();

-- Función para actualizar el estado de la asignación cuando se crea una firma
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
$$ LANGUAGE plpgsql;

-- Trigger para actualizar el estado cuando se crea una firma
CREATE TRIGGER actualizar_estado_al_firmar
  AFTER INSERT ON public.firmas_documento
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_estado_asignacion_al_firmar();
