-- ============================================
-- Script de configuración MULTI-TENANCY para SeguridApp
-- ============================================
-- NOTA: Este script modifica las tablas existentes para agregar empresa_id
-- Ejecutar con precaución en producción

CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  dominio TEXT UNIQUE,
  configuracion JSONB,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agregar empresa_id a tablas existentes (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guardias' AND column_name = 'empresa_id') THEN
    ALTER TABLE public.guardias ADD COLUMN empresa_id UUID REFERENCES public.empresas(id);
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_guardias_empresa ON public.guardias(empresa_id);

-- RLS
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer empresas activas" ON public.empresas FOR SELECT TO authenticated USING (activo = true);
CREATE POLICY "Solo admins pueden crear empresas" ON public.empresas FOR INSERT TO authenticated WITH CHECK (NOT public.es_guardia_autenticado());
