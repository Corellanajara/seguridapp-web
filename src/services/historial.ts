import { supabase } from '@/lib/supabase'
import { HistorialUbicacion } from '@/types'

export const historialService = {
  /**
   * Guarda una ubicación en el historial
   */
  async guardarUbicacion(
    guardiaId: string,
    latitud: number,
    longitud: number,
    velocidad?: number
  ): Promise<HistorialUbicacion> {
    const { data, error } = await supabase
      .from('historial_ubicaciones')
      .insert([
        {
          guardia_id: guardiaId,
          latitud,
          longitud,
          timestamp: new Date().toISOString(),
          velocidad: velocidad || null,
        },
      ])
      .select()
      .single()

    if (error) throw error
    return data as HistorialUbicacion
  },

  /**
   * Obtiene el historial de ubicaciones de un guardia
   */
  async getHistorialPorGuardia(
    guardiaId: string,
    fechaInicio?: string,
    fechaFin?: string,
    limite?: number
  ): Promise<HistorialUbicacion[]> {
    let query = supabase
      .from('historial_ubicaciones')
      .select('*')
      .eq('guardia_id', guardiaId)
      .order('timestamp', { ascending: false })

    if (fechaInicio) {
      query = query.gte('timestamp', fechaInicio)
    }

    if (fechaFin) {
      query = query.lte('timestamp', fechaFin)
    }

    if (limite) {
      query = query.limit(limite)
    }

    const { data, error } = await query

    if (error) throw error
    return data as HistorialUbicacion[]
  },

  /**
   * Obtiene todas las ubicaciones (solo para admins)
   */
  async getAllHistorial(
    fechaInicio?: string,
    fechaFin?: string,
    limite?: number
  ): Promise<HistorialUbicacion[]> {
    let query = supabase
      .from('historial_ubicaciones')
      .select('*')
      .order('timestamp', { ascending: false })

    if (fechaInicio) {
      query = query.gte('timestamp', fechaInicio)
    }

    if (fechaFin) {
      query = query.lte('timestamp', fechaFin)
    }

    if (limite) {
      query = query.limit(limite)
    }

    const { data, error } = await query

    if (error) throw error
    return data as HistorialUbicacion[]
  },

  /**
   * Obtiene la ruta de un guardia en un período específico
   */
  async getRutaPorGuardia(
    guardiaId: string,
    fechaInicio: string,
    fechaFin: string
  ): Promise<HistorialUbicacion[]> {
    const { data, error } = await supabase
      .from('historial_ubicaciones')
      .select('*')
      .eq('guardia_id', guardiaId)
      .gte('timestamp', fechaInicio)
      .lte('timestamp', fechaFin)
      .order('timestamp', { ascending: true })

    if (error) throw error
    return data as HistorialUbicacion[]
  },

  /**
   * Elimina ubicaciones antiguas (más de X días)
   */
  async limpiarHistorialAntiguo(dias: number = 30): Promise<void> {
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() - dias)

    const { error } = await supabase
      .from('historial_ubicaciones')
      .delete()
      .lt('timestamp', fechaLimite.toISOString())

    if (error) throw error
  },
}
