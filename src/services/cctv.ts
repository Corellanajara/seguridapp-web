import { supabase } from '@/lib/supabase'

export interface Camara {
  id: string
  nombre: string
  url_stream: string
  ubicacion?: string
  activa: boolean
}

export const cctvService = {
  /**
   * Obtiene todas las cámaras disponibles
   */
  async getAllCamaras(): Promise<Camara[]> {
    // Mock: En producción, esto se obtendría de una tabla o API externa
    return []
  },

  /**
   * Obtiene el stream de una cámara
   */
  async getStream(camaraId: string): Promise<string> {
    // Mock: En producción, esto retornaría la URL del stream
    return ''
  },
}
