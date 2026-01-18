import { supabase } from '@/lib/supabase'

export interface ReporteAsistencias {
  guardia_id: string
  guardia_nombre: string
  total_asistencias: number
  total_entradas: number
  total_salidas: number
  primera_asistencia?: string
  ultima_asistencia?: string
}

export interface ReporteHorasTrabajadas {
  guardia_id: string
  guardia_nombre: string
  fecha: string
  horas_trabajadas: number
  horas_extras?: number
}

export interface EstadisticasPuntualidad {
  guardia_id: string
  guardia_nombre: string
  total_dias: number
  dias_puntual: number
  dias_tarde: number
  dias_falta: number
  porcentaje_puntualidad: number
}

export const reportesService = {
  /**
   * Genera reporte de asistencias por guardia y período
   */
  async getReporteAsistencias(
    guardiaId?: string,
    fechaInicio?: string,
    fechaFin?: string
  ): Promise<ReporteAsistencias[]> {
    let query = supabase
      .from('asistencias')
      .select(`
        *,
        guardia:guardias(id, nombre, apellido)
      `)

    if (guardiaId) {
      query = query.eq('guardia_id', guardiaId)
    }

    if (fechaInicio) {
      query = query.gte('created_at', fechaInicio)
    }

    if (fechaFin) {
      query = query.lte('created_at', fechaFin)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    // Agrupar por guardia
    const reportes = new Map<string, ReporteAsistencias>()

    data.forEach((asistencia: any) => {
      const gId = asistencia.guardia_id
      const guardia = asistencia.guardia

      if (!reportes.has(gId)) {
        reportes.set(gId, {
          guardia_id: gId,
          guardia_nombre: guardia
            ? `${guardia.nombre} ${guardia.apellido}`
            : 'Desconocido',
          total_asistencias: 0,
          total_entradas: 0,
          total_salidas: 0,
        })
      }

      const reporte = reportes.get(gId)!
      reporte.total_asistencias++
      if (asistencia.tipo_asistencia === 'entrada') {
        reporte.total_entradas++
      } else {
        reporte.total_salidas++
      }

      // Actualizar primera y última asistencia
      if (!reporte.primera_asistencia || asistencia.created_at < reporte.primera_asistencia) {
        reporte.primera_asistencia = asistencia.created_at
      }
      if (!reporte.ultima_asistencia || asistencia.created_at > reporte.ultima_asistencia) {
        reporte.ultima_asistencia = asistencia.created_at
      }
    })

    return Array.from(reportes.values())
  },

  /**
   * Calcula horas trabajadas basándose en asistencias
   */
  async getReporteHorasTrabajadas(
    guardiaId?: string,
    fechaInicio?: string,
    fechaFin?: string
  ): Promise<ReporteHorasTrabajadas[]> {
    // Obtener asistencias
    let query = supabase
      .from('asistencias')
      .select(`
        *,
        guardia:guardias(id, nombre, apellido)
      `)
      .order('created_at', { ascending: true })

    if (guardiaId) {
      query = query.eq('guardia_id', guardiaId)
    }

    if (fechaInicio) {
      query = query.gte('created_at', fechaInicio)
    }

    if (fechaFin) {
      query = query.lte('created_at', fechaFin)
    }

    const { data, error } = await query

    if (error) throw error

    // Agrupar por guardia y fecha
    const reportes = new Map<string, ReporteHorasTrabajadas>()
    const entradasPendientes = new Map<string, { fecha: string; hora: Date }>()

    data.forEach((asistencia: any) => {
      const gId = asistencia.guardia_id
      const fecha = new Date(asistencia.created_at).toISOString().split('T')[0]
      const key = `${gId}_${fecha}`
      const guardia = asistencia.guardia

      if (asistencia.tipo_asistencia === 'entrada') {
        entradasPendientes.set(key, {
          fecha,
          hora: new Date(asistencia.created_at),
        })
      } else if (asistencia.tipo_asistencia === 'salida') {
        const entrada = entradasPendientes.get(key)
        if (entrada) {
          const salida = new Date(asistencia.created_at)
          const horasTrabajadas = (salida.getTime() - entrada.hora.getTime()) / (1000 * 60 * 60)

          if (!reportes.has(key)) {
            reportes.set(key, {
              guardia_id: gId,
              guardia_nombre: guardia
                ? `${guardia.nombre} ${guardia.apellido}`
                : 'Desconocido',
              fecha: entrada.fecha,
              horas_trabajadas: 0,
            })
          }

          const reporte = reportes.get(key)!
          reporte.horas_trabajadas += horasTrabajadas

          // Calcular horas extras (más de 8 horas)
          if (reporte.horas_trabajadas > 8) {
            reporte.horas_extras = reporte.horas_trabajadas - 8
          }

          entradasPendientes.delete(key)
        }
      }
    })

    return Array.from(reportes.values())
  },

  /**
   * Genera estadísticas de puntualidad
   */
  async getEstadisticasPuntualidad(
    guardiaId?: string,
    fechaInicio?: string,
    fechaFin?: string
  ): Promise<EstadisticasPuntualidad[]> {
    // Esta función requiere información de turnos asignados
    // Por ahora retornamos datos básicos
    const asistencias = await this.getReporteAsistencias(guardiaId, fechaInicio, fechaFin)

    return asistencias.map((reporte) => ({
      guardia_id: reporte.guardia_id,
      guardia_nombre: reporte.guardia_nombre,
      total_dias: Math.ceil(reporte.total_entradas),
      dias_puntual: 0, // Se calculará con información de turnos
      dias_tarde: 0,
      dias_falta: 0,
      porcentaje_puntualidad: 0,
    }))
  },

  /**
   * Exporta reporte a CSV
   */
  exportarACSV(data: any[], nombreArchivo: string = 'reporte.csv'): void {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header]
            return typeof value === 'string' && value.includes(',')
              ? `"${value}"`
              : value
          })
          .join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', nombreArchivo)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  },
}
