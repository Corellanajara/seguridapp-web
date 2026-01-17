-- ============================================
-- Script de Seed (Datos de Prueba) para SeguridApp
-- ============================================
-- Ejecuta este script DESPUÉS de ejecutar supabase-setup.sql
-- Dashboard > SQL Editor > New Query

-- ============================================
-- LIMPIAR DATOS EXISTENTES (OPCIONAL)
-- ============================================
-- Descomenta la siguiente línea si quieres eliminar todos los guardias antes de insertar
-- DELETE FROM public.guardias;

-- ============================================
-- INSERTAR GUARDIAS DE PRUEBA
-- ============================================
-- NOTA: Estos guardias NO tienen user_id vinculado por defecto
-- Para vincularlos con usuarios de autenticación, sigue estos pasos:
-- 1. Crea usuarios en Authentication con los mismos emails
-- 2. Ejecuta el script de vinculación al final de este archivo

-- Guardias activos con ubicaciones en Buenos Aires, Argentina
INSERT INTO public.guardias (nombre, apellido, email, telefono, activo, latitud, longitud, ultima_actualizacion) VALUES
  -- Zona Centro (Obelisco)
  ('Juan', 'Pérez', 'juan.perez@seguridapp.com', '+5491112345678', true, -34.603722, -58.381592, NOW() - INTERVAL '5 minutes'),
  ('María', 'González', 'maria.gonzalez@seguridapp.com', '+5491198765432', true, -34.604722, -58.382592, NOW() - INTERVAL '3 minutes'),
  
  -- Zona Palermo
  ('Carlos', 'Rodríguez', 'carlos.rodriguez@seguridapp.com', '+5491155555555', true, -34.588611, -58.410278, NOW() - INTERVAL '10 minutes'),
  ('Ana', 'Martínez', 'ana.martinez@seguridapp.com', '+5491166666666', true, -34.590611, -58.411278, NOW() - INTERVAL '2 minutes'),
  
  -- Zona Puerto Madero
  ('Luis', 'Fernández', 'luis.fernandez@seguridapp.com', '+5491177777777', true, -34.610278, -58.366667, NOW() - INTERVAL '7 minutes'),
  ('Laura', 'Sánchez', 'laura.sanchez@seguridapp.com', '+5491188888888', true, -34.611278, -58.367667, NOW() - INTERVAL '1 minute'),
  
  -- Zona Recoleta
  ('Pedro', 'López', 'pedro.lopez@seguridapp.com', '+5491199999999', true, -34.588056, -58.393056, NOW() - INTERVAL '4 minutes'),
  ('Sofía', 'Torres', 'sofia.torres@seguridapp.com', '+5491100000000', true, -34.589056, -58.394056, NOW() - INTERVAL '6 minutes'),
  
  -- Zona San Telmo
  ('Diego', 'Ramírez', 'diego.ramirez@seguridapp.com', '+5491111111111', true, -34.620833, -58.373056, NOW() - INTERVAL '8 minutes'),
  ('Carmen', 'Díaz', 'carmen.diaz@seguridapp.com', '+5491122222222', true, -34.621833, -58.374056, NOW() - INTERVAL '12 minutes'),
  
  -- Guardias inactivos (sin ubicación)
  ('Roberto', 'Morales', 'roberto.morales@seguridapp.com', '+5491133333333', false, NULL, NULL, NULL),
  ('Patricia', 'Vargas', 'patricia.vargas@seguridapp.com', '+5491144444444', false, NULL, NULL, NULL),
  
  -- Guardias activos sin ubicación aún
  ('Fernando', 'Castro', 'fernando.castro@seguridapp.com', '+5491155555555', true, NULL, NULL, NULL),
  ('Valentina', 'Ruiz', 'valentina.ruiz@seguridapp.com', '+5491166666666', true, NULL, NULL, NULL)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- VERIFICAR DATOS INSERTADOS
-- ============================================

-- Contar total de guardias
SELECT 
  COUNT(*) as total_guardias,
  COUNT(*) FILTER (WHERE activo = true) as guardias_activos,
  COUNT(*) FILTER (WHERE activo = false) as guardias_inactivos,
  COUNT(*) FILTER (WHERE latitud IS NOT NULL AND longitud IS NOT NULL) as guardias_con_ubicacion
FROM public.guardias;

-- Listar todos los guardias activos con ubicación
SELECT 
  id,
  nombre || ' ' || apellido as nombre_completo,
  email,
  telefono,
  activo,
  latitud,
  longitud,
  ultima_actualizacion,
  created_at
FROM public.guardias
WHERE activo = true
ORDER BY created_at DESC;

-- Listar guardias activos sin ubicación
SELECT 
  id,
  nombre || ' ' || apellido as nombre_completo,
  email,
  telefono
FROM public.guardias
WHERE activo = true 
  AND (latitud IS NULL OR longitud IS NULL)
ORDER BY nombre;

-- ============================================
-- DATOS ADICIONALES PARA PRUEBAS
-- ============================================

-- Si necesitas más guardias, puedes usar este patrón:
/*
INSERT INTO public.guardias (nombre, apellido, email, telefono, activo, latitud, longitud, ultima_actualizacion) VALUES
  ('Nombre', 'Apellido', 'email@seguridapp.com', '+54911XXXXXXXX', true, -34.XXXXXX, -58.XXXXXX, NOW());
*/

-- ============================================
-- ACTUALIZAR UBICACIONES DE FORMA ALEATORIA (PARA PRUEBAS)
-- ============================================
-- Este script actualiza las ubicaciones de los guardias activos con pequeñas variaciones
-- Útil para simular movimiento en tiempo real

/*
UPDATE public.guardias
SET 
  latitud = latitud + (RANDOM() - 0.5) * 0.001,
  longitud = longitud + (RANDOM() - 0.5) * 0.001,
  ultima_actualizacion = NOW()
WHERE activo = true 
  AND latitud IS NOT NULL 
  AND longitud IS NOT NULL;
*/

-- ============================================
-- VINCULAR GUARDIAS CON USUARIOS (OPCIONAL)
-- ============================================
-- Ejecuta este script DESPUÉS de crear los usuarios en Authentication
-- Esto vinculará automáticamente los guardias con sus usuarios por email

/*
UPDATE public.guardias g
SET user_id = u.id
FROM auth.users u
WHERE g.email = u.email
  AND g.user_id IS NULL;
*/

-- ============================================
-- NOTAS
-- ============================================
-- Las coordenadas usadas son de Buenos Aires, Argentina:
-- - Centro: -34.603722, -58.381592 (Obelisco)
-- - Palermo: -34.588611, -58.410278
-- - Puerto Madero: -34.610278, -58.366667
-- - Recoleta: -34.588056, -58.393056
-- - San Telmo: -34.620833, -58.373056
--
-- Puedes cambiar estas coordenadas por las de tu ciudad/región
--
-- Los teléfonos usan el formato argentino (+54911...)
-- Ajusta el formato según tu país
--
-- IMPORTANTE: Para que los guardias puedan iniciar sesión:
-- 1. Crea usuarios en Authentication con los mismos emails
-- 2. Ejecuta el script de vinculación (descomentado arriba)
-- 3. O vincula manualmente cada guardia con su user_id

-- ============================================
-- FIN DEL SCRIPT DE SEED
-- ============================================

