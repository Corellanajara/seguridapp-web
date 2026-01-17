import { supabase } from '@/lib/supabase'
import { guardiasService } from './guardias'

export const ubicacionService = {
  /**
   * Actualiza la ubicación del guardia autenticado
   * Usa Realtime para propagar los cambios inmediatamente
   * 
   * Opcionalmente puede usar la Edge Function si está desplegada
   * Para usar Edge Function, pasa useEdgeFunction: true
   */
  async updateMiUbicacion(
    latitud: number,
    longitud: number,
    useEdgeFunction: boolean = true // Usar Edge Function por defecto si está desplegada
  ) {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuario no autenticado')
    }

    // Si se solicita usar Edge Function (más seguro)
    if (useEdgeFunction) {
      try {
        const { data, error } = await supabase.functions.invoke('update-ubicacion', {
          body: { latitud, longitud }
        })

        if (error) throw error
        return data.data
      } catch (error: any) {
        // Si falla la Edge Function, usar método directo como fallback
        console.warn('Edge Function no disponible, usando método directo:', error.message)
      }
    }

    // Método directo (más rápido, usa RLS para seguridad)
    const { data: guardia, error: findError } = await supabase
      .from('guardias')
      .select('id')
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .single()

    if (findError || !guardia) {
      throw new Error('Guardia no encontrado. Contacta al administrador.')
    }

    // Actualizar ubicación usando el servicio de guardias
    const updated = await guardiasService.updateUbicacion(
      guardia.id,
      latitud,
      longitud
    )

    return updated
  },

  /**
   * Obtiene la información del guardia autenticado
   */
  async getMiPerfil() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuario no autenticado')
    }

    const { data, error } = await supabase
      .from('guardias')
      .select('*')
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      throw new Error('No se encontró el perfil del guardia. Contacta al administrador.')
    }
    return data
  },

  /**
   * Verifica si el usuario autenticado es un guardia
   */
  async esGuardia(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return false

    const { data, error } = await supabase
      .from('guardias')
      .select('id')
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .single()

    return !error && !!data
  },
}

