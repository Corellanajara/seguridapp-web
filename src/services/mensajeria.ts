import { supabase } from '@/lib/supabase'
import { Conversacion, Mensaje, Notificacion } from '@/types'

export const mensajeriaService = {
  // ========== CONVERSACIONES ==========
  async getAllConversaciones(): Promise<Conversacion[]> {
    const { data, error } = await supabase
      .from('conversaciones')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data as Conversacion[]
  },

  async getConversacionById(id: string): Promise<Conversacion> {
    const { data, error } = await supabase
      .from('conversaciones')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Conversacion
  },

  async createConversacion(conversacion: Omit<Conversacion, 'id' | 'created_at' | 'updated_at'>): Promise<Conversacion> {
    const { data, error } = await supabase
      .from('conversaciones')
      .insert([conversacion])
      .select()
      .single()

    if (error) throw error
    return data as Conversacion
  },

  // ========== MENSAJES ==========
  async getMensajesPorConversacion(conversacionId: string): Promise<Mensaje[]> {
    const { data, error } = await supabase
      .from('mensajes')
      .select('*')
      .eq('conversacion_id', conversacionId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data as Mensaje[]
  },

  async crearMensaje(mensaje: Omit<Mensaje, 'id' | 'created_at'>): Promise<Mensaje> {
    const { data, error } = await supabase
      .from('mensajes')
      .insert([mensaje])
      .select()
      .single()

    if (error) throw error

    // Actualizar updated_at de la conversación
    await supabase
      .from('conversaciones')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', mensaje.conversacion_id)

    return data as Mensaje
  },

  async marcarMensajesComoLeidos(conversacionId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('mensajes')
      .update({ leido: true })
      .eq('conversacion_id', conversacionId)
      .neq('usuario_id', user.id)
  },

  // ========== NOTIFICACIONES ==========
  async getNotificaciones(): Promise<Notificacion[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuario no autenticado')

    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Notificacion[]
  },

  async getNotificacionesNoLeidas(): Promise<Notificacion[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuario no autenticado')

    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('leida', false)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Notificacion[]
  },

  async crearNotificacion(notificacion: Omit<Notificacion, 'id' | 'created_at'>): Promise<Notificacion> {
    const { data, error } = await supabase
      .from('notificaciones')
      .insert([notificacion])
      .select()
      .single()

    if (error) throw error
    return data as Notificacion
  },

  async marcarNotificacionComoLeida(id: string): Promise<void> {
    await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', id)
  },
}
