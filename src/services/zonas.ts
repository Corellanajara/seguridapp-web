import { supabase } from '@/lib/supabase'
import { Zona, AsignacionZona, AsignacionZonaConDetalles, AlertaZona } from '@/types'

export const zonasService = {
  // ========== ZONAS ==========
  async getAllZonas(): Promise<Zona[]> {
    const { data, error } = await supabase
      .from('zonas')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Zona[]
  },

  async getZonaById(id: string): Promise<Zona> {
    const { data, error } = await supabase
      .from('zonas')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Zona
  },

  async createZona(zona: Omit<Zona, 'id' | 'created_at' | 'updated_at'>): Promise<Zona> {
    const { data, error } = await supabase
      .from('zonas')
      .insert([zona])
      .select()
      .single()

    if (error) throw error
    return data as Zona
  },

  async updateZona(id: string, updates: Partial<Zona>): Promise<Zona> {
    const { data, error } = await supabase
      .from('zonas')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Zona
  },

  async deleteZona(id: string): Promise<void> {
    const { error } = await supabase
      .from('zonas')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // ========== ASIGNACIONES DE ZONAS ==========
  async getAllAsignaciones(): Promise<AsignacionZonaConDetalles[]> {
    const { data, error } = await supabase
      .from('asignaciones_zona')
      .select(`
        *,
        guardia:guardias(*),
        zona:zonas(*)
      `)
      .order('fecha_inicio', { ascending: false })

    if (error) throw error
    return data as AsignacionZonaConDetalles[]
  },

  async getAsignacionesByGuardia(guardiaId: string): Promise<AsignacionZonaConDetalles[]> {
    const { data, error } = await supabase
      .from('asignaciones_zona')
      .select(`
        *,
        zona:zonas(*)
      `)
      .eq('guardia_id', guardiaId)
      .order('fecha_inicio', { ascending: false })

    if (error) throw error
    return data as AsignacionZonaConDetalles[]
  },

  async getAsignacionesActivasByGuardia(guardiaId: string): Promise<AsignacionZonaConDetalles[]> {
    const hoy = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('asignaciones_zona')
      .select(`
        *,
        zona:zonas(*)
      `)
      .eq('guardia_id', guardiaId)
      .eq('activo', true)
      .lte('fecha_inicio', hoy)
      .or(`fecha_fin.is.null,fecha_fin.gte.${hoy}`)
      .order('fecha_inicio', { ascending: false })

    if (error) throw error
    return data as AsignacionZonaConDetalles[]
  },

  async createAsignacion(asignacion: Omit<AsignacionZona, 'id' | 'created_at' | 'updated_at'>): Promise<AsignacionZona> {
    const { data, error } = await supabase
      .from('asignaciones_zona')
      .insert([asignacion])
      .select()
      .single()

    if (error) throw error
    return data as AsignacionZona
  },

  async updateAsignacion(id: string, updates: Partial<AsignacionZona>): Promise<AsignacionZona> {
    const { data, error } = await supabase
      .from('asignaciones_zona')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as AsignacionZona
  },

  async deleteAsignacion(id: string): Promise<void> {
    const { error } = await supabase
      .from('asignaciones_zona')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // ========== ALERTAS ==========
  async getAllAlertas(): Promise<AlertaZona[]> {
    const { data, error } = await supabase
      .from('alertas_zona')
      .select('*')
      .order('timestamp', { ascending: false })

    if (error) throw error
    return data as AlertaZona[]
  },

  async getAlertasByGuardia(guardiaId: string): Promise<AlertaZona[]> {
    const { data, error } = await supabase
      .from('alertas_zona')
      .select('*')
      .eq('guardia_id', guardiaId)
      .order('timestamp', { ascending: false })

    if (error) throw error
    return data as AlertaZona[]
  },

  async getAlertasNoResueltas(): Promise<AlertaZona[]> {
    const { data, error } = await supabase
      .from('alertas_zona')
      .select('*')
      .eq('resuelta', false)
      .order('timestamp', { ascending: false })

    if (error) throw error
    return data as AlertaZona[]
  },

  async createAlerta(alerta: Omit<AlertaZona, 'id' | 'created_at' | 'updated_at'>): Promise<AlertaZona> {
    const { data, error } = await supabase
      .from('alertas_zona')
      .insert([alerta])
      .select()
      .single()

    if (error) throw error
    return data as AlertaZona
  },

  async resolverAlerta(id: string): Promise<AlertaZona> {
    const { data, error } = await supabase
      .from('alertas_zona')
      .update({ resuelta: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as AlertaZona
  },

  // ========== UTILIDADES ==========
  /**
   * Verifica si un punto (lat, lng) está dentro de una zona
   */
  async verificarPuntoEnZona(
    zonaId: string,
    latitud: number,
    longitud: number
  ): Promise<boolean> {
    const zona = await this.getZonaById(zonaId)
    if (!zona || !zona.activo) return false

    try {
      const coordenadas = JSON.parse(zona.coordenadas)
      
      if (zona.tipo === 'circulo') {
        // Verificar si está dentro del círculo
        const { lat: centerLat, lng: centerLng, radio } = coordenadas
        const distancia = this.calcularDistancia(latitud, longitud, centerLat, centerLng)
        return distancia <= radio
      } else {
        // Verificar si está dentro del polígono usando ray casting
        return this.puntoEnPoligono(latitud, longitud, coordenadas)
      }
    } catch (error) {
      console.error('Error al verificar punto en zona:', error)
      return false
    }
  },

  /**
   * Calcula la distancia entre dos puntos en metros (fórmula de Haversine)
   */
  calcularDistancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000 // Radio de la Tierra en metros
    const dLat = this.toRad(lat2 - lat1)
    const dLng = this.toRad(lng2 - lng1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  },

  toRad(degrees: number): number {
    return (degrees * Math.PI) / 180
  },

  /**
   * Verifica si un punto está dentro de un polígono usando ray casting
   */
  puntoEnPoligono(lat: number, lng: number, poligono: Array<{ lat: number; lng: number }>): boolean {
    let dentro = false
    for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
      const xi = poligono[i].lng
      const yi = poligono[i].lat
      const xj = poligono[j].lng
      const yj = poligono[j].lat

      const intersecta =
        yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi
      if (intersecta) dentro = !dentro
    }
    return dentro
  },
}
