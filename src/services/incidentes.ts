import { supabase } from '@/lib/supabase'
import { TipoIncidente, Incidente, IncidenteConDetalles } from '@/types'

export const incidentesService = {
  // ========== TIPOS DE INCIDENTE ==========
  async getAllTipos(): Promise<TipoIncidente[]> {
    const { data, error } = await supabase
      .from('tipos_incidente')
      .select('*')
      .eq('activo', true)
      .order('severidad', { ascending: false })

    if (error) throw error
    return data as TipoIncidente[]
  },

  async getTipoById(id: string): Promise<TipoIncidente> {
    const { data, error } = await supabase
      .from('tipos_incidente')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as TipoIncidente
  },

  async createTipo(tipo: Omit<TipoIncidente, 'id' | 'created_at' | 'updated_at'>): Promise<TipoIncidente> {
    const { data, error } = await supabase
      .from('tipos_incidente')
      .insert([tipo])
      .select()
      .single()

    if (error) throw error
    return data as TipoIncidente
  },

  async updateTipo(id: string, updates: Partial<TipoIncidente>): Promise<TipoIncidente> {
    const { data, error } = await supabase
      .from('tipos_incidente')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as TipoIncidente
  },

  async deleteTipo(id: string): Promise<void> {
    const { error } = await supabase
      .from('tipos_incidente')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // ========== INCIDENTES ==========
  async getAllIncidentes(): Promise<IncidenteConDetalles[]> {
    const { data, error } = await supabase
      .from('incidentes')
      .select(`
        *,
        guardia:guardias(*),
        tipo:tipos_incidente(*)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as IncidenteConDetalles[]
  },

  async getIncidenteById(id: string): Promise<IncidenteConDetalles> {
    const { data, error } = await supabase
      .from('incidentes')
      .select(`
        *,
        guardia:guardias(*),
        tipo:tipos_incidente(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data as IncidenteConDetalles
  },

  async getIncidentesByGuardia(guardiaId: string): Promise<IncidenteConDetalles[]> {
    const { data, error } = await supabase
      .from('incidentes')
      .select(`
        *,
        tipo:tipos_incidente(*)
      `)
      .eq('guardia_id', guardiaId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as IncidenteConDetalles[]
  },

  async getIncidentesPendientes(): Promise<IncidenteConDetalles[]> {
    const { data, error } = await supabase
      .from('incidentes')
      .select(`
        *,
        guardia:guardias(*),
        tipo:tipos_incidente(*)
      `)
      .in('estado', ['pendiente', 'en_proceso'])
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as IncidenteConDetalles[]
  },

  async createIncidente(incidente: Omit<Incidente, 'id' | 'created_at' | 'updated_at'>): Promise<Incidente> {
    // Obtener tipo de incidente para determinar prioridad automática
    const tipo = await this.getTipoById(incidente.tipo_id)
    
    const incidenteData = {
      ...incidente,
      prioridad: incidente.prioridad || tipo.severidad,
    }

    const { data, error } = await supabase
      .from('incidentes')
      .insert([incidenteData])
      .select()
      .single()

    if (error) throw error
    return data as Incidente
  },

  async updateIncidente(id: string, updates: Partial<Incidente>): Promise<Incidente> {
    const { data, error } = await supabase
      .from('incidentes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Incidente
  },

  async resolverIncidente(id: string, observaciones?: string): Promise<Incidente> {
    return this.updateIncidente(id, {
      estado: 'resuelto',
      observaciones: observaciones || 'Incidente resuelto',
    })
  },

  async cancelarIncidente(id: string, observaciones?: string): Promise<Incidente> {
    return this.updateIncidente(id, {
      estado: 'cancelado',
      observaciones: observaciones || 'Incidente cancelado',
    })
  },

  async deleteIncidente(id: string): Promise<void> {
    const { error } = await supabase
      .from('incidentes')
      .delete()
      .eq('id', id)

    if (error) throw error
  },
}
