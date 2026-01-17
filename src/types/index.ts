export interface Guardia {
  id: string
  user_id?: string // ID del usuario de autenticación
  nombre: string
  apellido: string
  email: string
  telefono?: string
  foto_url?: string
  activo: boolean
  latitud?: number
  longitud?: number
  ultima_actualizacion?: string
  created_at: string
  updated_at: string
}

export interface Ubicacion {
  id: string
  guardia_id: string
  latitud: number
  longitud: number
  timestamp: string
}

export interface Asistencia {
  id: string
  guardia_id: string
  tipo_asistencia: 'entrada' | 'salida'
  foto_url: string
  latitud: number
  longitud: number
  firma_documental?: string | null
  firma_clave_unica: boolean
  observaciones?: string | null
  created_at: string
  updated_at: string
}

export interface AsistenciaConGuardia extends Asistencia {
  guardia?: Guardia
}

export type UserRole = 'admin' | 'guardia'
