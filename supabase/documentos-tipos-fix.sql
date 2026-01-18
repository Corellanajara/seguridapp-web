-- ============================================
-- Script para actualizar tipos de documentos a 5 opciones fijas
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase si la tabla ya existe

-- Si la tabla no existe, se creará con el constraint
-- Si la tabla ya existe, primero eliminar el constraint anterior (si existe) y agregar el nuevo

-- Eliminar constraint anterior si existe
ALTER TABLE IF EXISTS public.documentos 
  DROP CONSTRAINT IF EXISTS documentos_tipo_check;

-- Agregar constraint con las 5 opciones fijas
ALTER TABLE IF EXISTS public.documentos 
  ADD CONSTRAINT documentos_tipo_check 
  CHECK (tipo IN ('contrato', 'manual', 'politica', 'procedimiento', 'formulario'));

-- Si hay documentos con tipos que no están en la lista, actualizarlos a 'manual' por defecto
UPDATE public.documentos 
SET tipo = 'manual' 
WHERE tipo NOT IN ('contrato', 'manual', 'politica', 'procedimiento', 'formulario');
