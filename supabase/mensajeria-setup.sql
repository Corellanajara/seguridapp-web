-- ============================================
-- Script de configuración de tablas MENSAJERÍA para SeguridApp
-- ============================================

CREATE TABLE IF NOT EXISTS public.conversaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('individual', 'grupo')),
  nombre TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mensajes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversacion_id UUID NOT NULL REFERENCES public.conversaciones(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contenido TEXT NOT NULL,
  leido BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notificaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('info', 'alerta', 'emergencia', 'sistema')),
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion ON public.mensajes(conversacion_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_usuario ON public.mensajes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON public.notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON public.notificaciones(leida);

-- Triggers
DROP TRIGGER IF EXISTS update_conversaciones_updated_at ON public.conversaciones;
CREATE TRIGGER update_conversaciones_updated_at
  BEFORE UPDATE ON public.conversaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Todos pueden leer conversaciones" ON public.conversaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Todos pueden crear conversaciones" ON public.conversaciones FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios pueden leer mensajes de sus conversaciones" ON public.mensajes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios pueden crear mensajes" ON public.mensajes FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden leer sus notificaciones" ON public.notificaciones FOR SELECT TO authenticated USING (auth.uid() = usuario_id);
CREATE POLICY "Sistema puede crear notificaciones" ON public.notificaciones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios pueden actualizar sus notificaciones" ON public.notificaciones FOR UPDATE TO authenticated USING (auth.uid() = usuario_id);

-- Realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'mensajes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notificaciones') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;
  END IF;
END $$;
