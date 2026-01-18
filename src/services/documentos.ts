import { supabase } from '@/lib/supabase'
import { Documento, VersionDocumento, AsignacionDocumento, AsignacionDocumentoConDetalles, FirmaDocumento, FirmaData } from '@/types'

export const documentosService = {
  async getAllDocumentos(): Promise<Documento[]> {
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Documento[]
  },

  async createDocumento(documento: Omit<Documento, 'id' | 'created_at' | 'updated_at' | 'version'>): Promise<Documento> {
    const { data, error } = await supabase
      .from('documentos')
      .insert([{ ...documento, version: 1 }])
      .select()
      .single()

    if (error) throw error
    return data as Documento
  },

  async getVersiones(documentoId: string): Promise<VersionDocumento[]> {
    const { data, error } = await supabase
      .from('versiones_documento')
      .select('*')
      .eq('documento_id', documentoId)
      .order('version', { ascending: false })

    if (error) throw error
    return data as VersionDocumento[]
  },

  // Asignar documento a uno o varios guardias
  async asignarDocumento(documentoId: string, guardiaIds: string[]): Promise<AsignacionDocumento[]> {
    const asignaciones = guardiaIds.map(guardiaId => ({
      documento_id: documentoId,
      guardia_id: guardiaId,
      estado: 'pendiente' as const,
    }))

    const { data, error } = await supabase
      .from('asignaciones_documento')
      .insert(asignaciones)
      .select()

    if (error) throw error
    return data as AsignacionDocumento[]
  },

  // Obtener asignaciones de un documento
  async getAsignacionesByDocumento(documentoId: string): Promise<AsignacionDocumentoConDetalles[]> {
    const { data, error } = await supabase
      .from('asignaciones_documento')
      .select(`
        *,
        documento:documentos(*),
        guardia:guardias(*)
      `)
      .eq('documento_id', documentoId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as AsignacionDocumentoConDetalles[]
  },

  // Obtener documentos pendientes de firma para el guardia autenticado
  async getDocumentosPendientesFirma(): Promise<AsignacionDocumentoConDetalles[]> {
    // Primero obtener el guardia del usuario autenticado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuario no autenticado')

    const { data: guardia } = await supabase
      .from('guardias')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!guardia) throw new Error('Guardia no encontrado')

    // Obtener asignaciones pendientes con detalles del documento
    const { data, error } = await supabase
      .from('asignaciones_documento')
      .select(`
        *,
        documento:documentos(*),
        guardia:guardias(*)
      `)
      .eq('guardia_id', guardia.id)
      .eq('estado', 'pendiente')
      .order('fecha_asignacion', { ascending: false })

    if (error) throw error
    return data as AsignacionDocumentoConDetalles[]
  },

  // Firmar un documento
  async firmarDocumento(asignacionId: string, firma: FirmaData): Promise<FirmaDocumento> {
    // Validar que la asignación existe y está pendiente
    const { data: asignacion, error: asignacionError } = await supabase
      .from('asignaciones_documento')
      .select('*')
      .eq('id', asignacionId)
      .eq('estado', 'pendiente')
      .single()

    if (asignacionError || !asignacion) {
      throw new Error('Asignación no encontrada o ya firmada')
    }

    // Obtener información del navegador
    const ipAddress = null // En producción, obtener del servidor
    const userAgent = navigator.userAgent

    // Crear el registro de firma
    const { data, error } = await supabase
      .from('firmas_documento')
      .insert([{
        asignacion_id: asignacionId,
        firma_data: JSON.stringify(firma),
        tipo_firma: firma.tipo,
        hash_firma: firma.hash,
        ip_address: ipAddress,
        user_agent: userAgent,
      }])
      .select()
      .single()

    if (error) throw error

    // El trigger actualizará automáticamente el estado de la asignación
    return data as FirmaDocumento
  },

  // Obtener historial de firmas de un documento
  async getFirmasByDocumento(documentoId: string): Promise<FirmaDocumento[]> {
    const { data, error } = await supabase
      .from('firmas_documento')
      .select(`
        *,
        asignacion:asignaciones_documento!inner(documento_id)
      `)
      .eq('asignacion.documento_id', documentoId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as FirmaDocumento[]
  },

  // Eliminar asignación
  async eliminarAsignacion(asignacionId: string): Promise<void> {
    const { error } = await supabase
      .from('asignaciones_documento')
      .delete()
      .eq('id', asignacionId)

    if (error) throw error
  },
}
