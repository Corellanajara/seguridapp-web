import { supabase } from '@/lib/supabase'
import { Rol, Permiso } from '@/types'

export const permisosService = {
  async getAllRoles(): Promise<Rol[]> {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('nombre', { ascending: true })

    if (error) throw error
    return data as Rol[]
  },

  async getPermisosPorRol(rolId: string): Promise<Permiso[]> {
    const { data, error } = await supabase
      .from('rol_permisos')
      .select('permiso:permisos(*)')
      .eq('rol_id', rolId)

    if (error) throw error
    return (data as any[]).map((item) => item.permiso).filter(Boolean) as Permiso[]
  },
}
