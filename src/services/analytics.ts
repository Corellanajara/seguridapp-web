import { supabase } from '@/lib/supabase'

export interface KPIData {
  total_guardias: number
  guardias_activos: number
  total_asistencias_hoy: number
  incidentes_pendientes: number
  alertas_activas: number
}

export interface TendenciaData {
  fecha: string
  valor: number
}

export const analyticsService = {
  async getKPIs(): Promise<KPIData> {
    const hoy = new Date().toISOString().split('T')[0]

    const [guardias, asistencias, incidentes, alertas] = await Promise.all([
      supabase.from('guardias').select('id, activo', { count: 'exact' }),
      supabase.from('asistencias').select('id', { count: 'exact' }).gte('created_at', hoy),
      supabase.from('incidentes').select('id', { count: 'exact' }).in('estado', ['pendiente', 'en_proceso']),
      supabase.from('alertas_zona').select('id', { count: 'exact' }).eq('resuelta', false),
    ])

    return {
      total_guardias: guardias.count || 0,
      guardias_activos: guardias.data?.filter((g) => g.activo).length || 0,
      total_asistencias_hoy: asistencias.count || 0,
      incidentes_pendientes: incidentes.count || 0,
      alertas_activas: alertas.count || 0,
    }
  },

  async getTendenciasAsistencias(dias: number = 7): Promise<TendenciaData[]> {
    const fechaInicio = new Date()
    fechaInicio.setDate(fechaInicio.getDate() - dias)

    const { data, error } = await supabase
      .from('asistencias')
      .select('created_at')
      .gte('created_at', fechaInicio.toISOString())

    if (error) throw error

    const tendencias = new Map<string, number>()
    data.forEach((item) => {
      const fecha = new Date(item.created_at).toISOString().split('T')[0]
      tendencias.set(fecha, (tendencias.get(fecha) || 0) + 1)
    })

    return Array.from(tendencias.entries())
      .map(([fecha, valor]) => ({ fecha, valor }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
  },
}
