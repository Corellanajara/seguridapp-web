import { supabase } from '@/lib/supabase'
import { Asistencia, AsistenciaConGuardia } from '@/types'

export interface CrearAsistenciaData {
  tipo_asistencia: 'entrada' | 'salida'
  foto_url: string
  latitud: number
  longitud: number
  firma_documental?: string
  firma_clave_unica?: boolean
  observaciones?: string
}

export const asistenciasService = {
  /**
   * Crea una nueva asistencia para el guardia autenticado
   */
  async crearAsistencia(data: CrearAsistenciaData): Promise<Asistencia> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuario no autenticado')
    }

    // Obtener el ID del guardia autenticado
    const { data: guardia, error: findError } = await supabase
      .from('guardias')
      .select('id')
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .single()

    if (findError || !guardia) {
      throw new Error('Guardia no encontrado. Contacta al administrador.')
    }

    // Crear la asistencia
    const { data: asistencia, error } = await supabase
      .from('asistencias')
      .insert([{
        guardia_id: guardia.id,
        tipo_asistencia: data.tipo_asistencia,
        foto_url: data.foto_url,
        latitud: data.latitud,
        longitud: data.longitud,
        firma_documental: data.firma_documental || null,
        firma_clave_unica: data.firma_clave_unica || false,
        observaciones: data.observaciones || null,
      }])
      .select()
      .single()

    if (error) throw error
    return asistencia as Asistencia
  },

  /**
   * Obtiene todas las asistencias del guardia autenticado
   */
  async getMisAsistencias(): Promise<Asistencia[]> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuario no autenticado')
    }

    // Obtener el ID del guardia autenticado
    const { data: guardia, error: findError } = await supabase
      .from('guardias')
      .select('id')
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .single()

    if (findError || !guardia) {
      throw new Error('Guardia no encontrado. Contacta al administrador.')
    }

    const { data, error } = await supabase
      .from('asistencias')
      .select('*')
      .eq('guardia_id', guardia.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Asistencia[]
  },

  /**
   * Obtiene todas las asistencias (solo para admins)
   */
  async getAllAsistencias(): Promise<AsistenciaConGuardia[]> {
    const { data, error } = await supabase
      .from('asistencias')
      .select(`
        *,
        guardia:guardias(*)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as AsistenciaConGuardia[]
  },

  /**
   * Obtiene las asistencias de un guardia específico
   */
  async getAsistenciasPorGuardia(guardiaId: string): Promise<Asistencia[]> {
    const { data, error } = await supabase
      .from('asistencias')
      .select('*')
      .eq('guardia_id', guardiaId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Asistencia[]
  },

  /**
   * Obtiene estadísticas de asistencias
   */
  async getEstadisticas(
    guardiaId?: string,
    fechaInicio?: string,
    fechaFin?: string
  ) {
    let query = supabase.rpc('get_asistencias_stats', {
      p_guardia_id: guardiaId || null,
      p_fecha_inicio: fechaInicio || null,
      p_fecha_fin: fechaFin || null,
    })

    const { data, error } = await query

    if (error) throw error
    return data?.[0] || {
      total_asistencias: 0,
      total_entradas: 0,
      total_salidas: 0,
      ultima_asistencia: null,
    }
  },

  /**
   * Obtiene la última asistencia del guardia autenticado
   */
  async getUltimaAsistencia(): Promise<Asistencia | null> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuario no autenticado')
    }

    // Obtener el ID del guardia autenticado
    const { data: guardia, error: findError } = await supabase
      .from('guardias')
      .select('id')
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .single()

    if (findError || !guardia) {
      throw new Error('Guardia no encontrado. Contacta al administrador.')
    }

    const { data, error } = await supabase
      .from('asistencias')
      .select('*')
      .eq('guardia_id', guardia.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      // Si no hay asistencias, retornar null
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }
    return data as Asistencia
  },
}
