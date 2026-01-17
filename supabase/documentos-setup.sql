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

-- Índices
CREATE INDEX IF NOT EXISTS idx_documentos_empresa ON public.documentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_versiones_documento ON public.versiones_documento(documento_id);

-- RLS
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.versiones_documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aprobaciones_documento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer documentos" ON public.documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins pueden crear documentos" ON public.documentos FOR INSERT TO authenticated WITH CHECK (NOT public.es_guardia_autenticado());
