-- ============================================
-- Script de configuración de ROLES Y PERMISOS para SeguridApp
-- ============================================

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  empresa_id UUID REFERENCES public.empresas(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permisos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  recurso TEXT NOT NULL,
  accion TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rol_permisos (
  rol_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  permiso_id UUID REFERENCES public.permisos(id) ON DELETE CASCADE,
  PRIMARY KEY (rol_id, permiso_id)
);

CREATE TABLE IF NOT EXISTS public.usuario_roles (
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rol_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id),
  PRIMARY KEY (usuario_id, rol_id, empresa_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_rol_permisos_rol ON public.rol_permisos(rol_id);
CREATE INDEX IF NOT EXISTS idx_usuario_roles_usuario ON public.usuario_roles(usuario_id);

-- RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rol_permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Todos pueden leer permisos" ON public.permisos FOR SELECT TO authenticated USING (true);
