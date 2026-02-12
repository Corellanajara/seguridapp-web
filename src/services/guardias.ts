import { supabase } from '@/lib/supabase'
import { Guardia } from '@/types'

export const guardiasService = {
  async getAll() {
    const { data, error } = await supabase
      .from('guardias')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Guardia[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('guardias')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Guardia
  },

  async create(guardia: Omit<Guardia, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('guardias')
      .insert([guardia])
      .select()
      .single()

    if (error) throw error
    return data as Guardia
  },

  async createWithUser(
    guardia: Omit<Guardia, 'id' | 'created_at' | 'updated_at' | 'user_id'>,
    password: string
  ) {
    const { data, error } = await supabase.functions.invoke('crear-guardia', {
      body: {
        nombre: guardia.nombre,
        apellido: guardia.apellido,
        email: guardia.email,
        telefono: guardia.telefono,
        password,
        activo: guardia.activo,
      },
    })

    if (error) throw error

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Error al crear guardia con usuario')
    }

    return data.data as Guardia
  },

  async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from('guardias')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return data as Guardia
  },

  async update(id: string, updates: Partial<Guardia>) {
    const { data, error } = await supabase
      .from('guardias')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Guardia
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('guardias')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async updateUbicacion(id: string, latitud: number, longitud: number) {
    const { data, error } = await supabase
      .from('guardias')
      .update({
        latitud,
        longitud,
        ultima_actualizacion: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Guardia
  },
}

