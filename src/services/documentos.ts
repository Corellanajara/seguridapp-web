import { supabase } from '@/lib/supabase'
import { Documento, VersionDocumento } from '@/types'

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
}
