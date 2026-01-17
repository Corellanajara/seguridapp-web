-- ============================================
-- Funciones SQL para Reportes de SeguridApp
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- Dashboard > SQL Editor > New Query

-- ============================================
-- 1. FUNCIÓN PARA REPORTE DE ASISTENCIAS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_reporte_asistencias(
  p_guardia_id UUID DEFAULT NULL,
  p_fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_fecha_fin TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  guardia_id UUID,
  guardia_nombre TEXT,
  total_asistencias BIGINT,
  total_entradas BIGINT,
  total_salidas BIGINT,
  primera_asistencia TIMESTAMP WITH TIME ZONE,
  ultima_asistencia TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id as guardia_id,
    CONCAT(g.nombre, ' ', g.apellido) as guardia_nombre,
    COUNT(a.id)::BIGINT as total_asistencias,
    COUNT(a.id) FILTER (WHERE a.tipo_asistencia = 'entrada')::BIGINT as total_entradas,
    COUNT(a.id) FILTER (WHERE a.tipo_asistencia = 'salida')::BIGINT as total_salidas,
    MIN(a.created_at) as primera_asistencia,
    MAX(a.created_at) as ultima_asistencia
  FROM public.asistencias a
  INNER JOIN public.guardias g ON g.id = a.guardia_id
  WHERE
    (p_guardia_id IS NULL OR a.guardia_id = p_guardia_id)
    AND (p_fecha_inicio IS NULL OR a.created_at >= p_fecha_inicio)
    AND (p_fecha_fin IS NULL OR a.created_at <= p_fecha_fin)
  GROUP BY g.id, g.nombre, g.apellido
  ORDER BY total_asistencias DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. FUNCIÓN PARA CALCULAR HORAS TRABAJADAS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_reporte_horas_trabajadas(
  p_guardia_id UUID DEFAULT NULL,
  p_fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_fecha_fin TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  guardia_id UUID,
  guardia_nombre TEXT,
  fecha DATE,
  horas_trabajadas NUMERIC,
  horas_extras NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH entradas_salidas AS (
    SELECT
      a.guardia_id,
      DATE(a.created_at) as fecha,
      a.tipo_asistencia,
      a.created_at,
      LAG(a.created_at) OVER (
        PARTITION BY a.guardia_id, DATE(a.created_at)
        ORDER BY a.created_at
      ) as hora_anterior
    FROM public.asistencias a
    WHERE
      (p_guardia_id IS NULL OR a.guardia_id = p_guardia_id)
      AND (p_fecha_inicio IS NULL OR a.created_at >= p_fecha_inicio)
      AND (p_fecha_fin IS NULL OR a.created_at <= p_fecha_fin)
  ),
  horas_calculadas AS (
    SELECT
      es.guardia_id,
      es.fecha,
      EXTRACT(EPOCH FROM (es.created_at - es.hora_anterior)) / 3600.0 as horas
    FROM entradas_salidas es
    WHERE es.tipo_asistencia = 'salida'
      AND es.hora_anterior IS NOT NULL
      AND DATE(es.hora_anterior) = es.fecha
  )
  SELECT
    g.id as guardia_id,
    CONCAT(g.nombre, ' ', g.apellido) as guardia_nombre,
    hc.fecha,
    ROUND(SUM(hc.horas)::NUMERIC, 2) as horas_trabajadas,
    ROUND(GREATEST(SUM(hc.horas) - 8, 0)::NUMERIC, 2) as horas_extras
  FROM horas_calculadas hc
  INNER JOIN public.guardias g ON g.id = hc.guardia_id
  GROUP BY g.id, g.nombre, g.apellido, hc.fecha
  ORDER BY hc.fecha DESC, guardia_nombre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. FUNCIÓN PARA ESTADÍSTICAS DE PUNTUALIDAD
-- ============================================
-- Esta función requiere información de turnos asignados
-- Por ahora retorna datos básicos

CREATE OR REPLACE FUNCTION public.get_estadisticas_puntualidad(
  p_guardia_id UUID DEFAULT NULL,
  p_fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_fecha_fin TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  guardia_id UUID,
  guardia_nombre TEXT,
  total_dias BIGINT,
  dias_puntual BIGINT,
  dias_tarde BIGINT,
  dias_falta BIGINT,
  porcentaje_puntualidad NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH asistencias_por_dia AS (
    SELECT
      a.guardia_id,
      DATE(a.created_at) as fecha,
      MIN(a.created_at) FILTER (WHERE a.tipo_asistencia = 'entrada') as hora_entrada
    FROM public.asistencias a
    WHERE
      (p_guardia_id IS NULL OR a.guardia_id = p_guardia_id)
      AND (p_fecha_inicio IS NULL OR a.created_at >= p_fecha_inicio)
      AND (p_fecha_fin IS NULL OR a.created_at <= p_fecha_fin)
      AND a.tipo_asistencia = 'entrada'
    GROUP BY a.guardia_id, DATE(a.created_at)
  ),
  estadisticas AS (
    SELECT
      apd.guardia_id,
      COUNT(*)::BIGINT as total_dias,
      COUNT(*) FILTER (
        -- Aquí se podría comparar con el turno asignado
        -- Por ahora, consideramos puntual si llegó antes de las 9 AM
        WHERE EXTRACT(HOUR FROM apd.hora_entrada) < 9
      )::BIGINT as dias_puntual,
      COUNT(*) FILTER (
        WHERE EXTRACT(HOUR FROM apd.hora_entrada) >= 9
        AND EXTRACT(HOUR FROM apd.hora_entrada) < 10
      )::BIGINT as dias_tarde,
      COUNT(*) FILTER (
        WHERE apd.hora_entrada IS NULL
      )::BIGINT as dias_falta
    FROM asistencias_por_dia apd
    GROUP BY apd.guardia_id
  )
  SELECT
    g.id as guardia_id,
    CONCAT(g.nombre, ' ', g.apellido) as guardia_nombre,
    COALESCE(e.total_dias, 0) as total_dias,
    COALESCE(e.dias_puntual, 0) as dias_puntual,
    COALESCE(e.dias_tarde, 0) as dias_tarde,
    COALESCE(e.dias_falta, 0) as dias_falta,
    CASE
      WHEN COALESCE(e.total_dias, 0) > 0 THEN
        ROUND((COALESCE(e.dias_puntual, 0)::NUMERIC / e.total_dias::NUMERIC) * 100, 2)
      ELSE 0
    END as porcentaje_puntualidad
  FROM public.guardias g
  LEFT JOIN estadisticas e ON e.guardia_id = g.id
  WHERE
    (p_guardia_id IS NULL OR g.id = p_guardia_id)
    AND g.activo = true
  ORDER BY porcentaje_puntualidad DESC, guardia_nombre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- Estas funciones pueden ser llamadas desde el servicio de reportes
-- para obtener datos calculados directamente desde la base de datos
