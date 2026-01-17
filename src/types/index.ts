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

export interface Turno {
  id: string
  nombre: string
  hora_inicio: string // Formato HH:MM
  hora_fin: string // Formato HH:MM
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Horario {
  id: string
  turno_id: string
  dia_semana: number // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  hora_inicio: string // Formato HH:MM
  hora_fin: string // Formato HH:MM
  created_at: string
  updated_at: string
}

export interface AsignacionTurno {
  id: string
  guardia_id: string
  turno_id: string
  fecha_inicio: string // Formato YYYY-MM-DD
  fecha_fin?: string | null // Formato YYYY-MM-DD, null = indefinido
  activo: boolean
  created_at: string
  updated_at: string
}

export interface AsignacionTurnoConDetalles extends AsignacionTurno {
  guardia?: Guardia
  turno?: Turno
}

export interface Zona {
  id: string
  nombre: string
  descripcion?: string
  tipo: 'poligono' | 'circulo'
  coordenadas: string // JSON string con las coordenadas
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Geocerca {
  id: string
  zona_id: string
  latitud: number
  longitud: number
  radio?: number // Solo para círculos, en metros
  orden?: number // Para polígonos, orden de los puntos
}

export interface AsignacionZona {
  id: string
  guardia_id: string
  zona_id: string
  fecha_inicio: string
  fecha_fin?: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface AsignacionZonaConDetalles extends AsignacionZona {
  guardia?: Guardia
  zona?: Zona
}

export interface AlertaZona {
  id: string
  guardia_id: string
  zona_id: string
  tipo: 'entrada' | 'salida'
  timestamp: string
  resuelta: boolean
  created_at: string
  updated_at: string
}

export interface HistorialUbicacion {
  id: string
  guardia_id: string
  latitud: number
  longitud: number
  timestamp: string
  velocidad?: number | null
  created_at: string
}

export interface TipoIncidente {
  id: string
  nombre: string
  descripcion?: string
  severidad: 'baja' | 'media' | 'alta' | 'critica'
  tiempo_respuesta_minutos?: number
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Incidente {
  id: string
  guardia_id: string
  tipo_id: string
  descripcion: string
  foto_url?: string
  latitud: number
  longitud: number
  estado: 'pendiente' | 'en_proceso' | 'resuelto' | 'cancelado'
  prioridad?: 'baja' | 'media' | 'alta' | 'critica'
  observaciones?: string
  created_at: string
  updated_at: string
}

export interface IncidenteConDetalles extends Incidente {
  guardia?: Guardia
  tipo?: TipoIncidente
}

export interface Conversacion {
  id: string
  tipo: 'individual' | 'grupo'
  nombre?: string
  created_at: string
  updated_at: string
}

export interface Mensaje {
  id: string
  conversacion_id: string
  usuario_id: string
  contenido: string
  leido: boolean
  created_at: string
}

export interface Notificacion {
  id: string
  usuario_id: string
  tipo: 'info' | 'alerta' | 'emergencia' | 'sistema'
  titulo: string
  mensaje: string
  leida: boolean
  created_at: string
}

export interface Empresa {
  id: string
  nombre: string
  dominio?: string
  configuracion?: string // JSON
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Rol {
  id: string
  nombre: string
  descripcion?: string
  empresa_id?: string
  created_at: string
  updated_at: string
}

export interface Permiso {
  id: string
  nombre: string
  recurso: string
  accion: string
  created_at: string
}

export interface Documento {
  id: string
  nombre: string
  tipo: string
  archivo_url: string
  version: number
  estado: 'borrador' | 'pendiente' | 'aprobado' | 'rechazado'
  empresa_id?: string
  created_at: string
  updated_at: string
}

export interface VersionDocumento {
  id: string
  documento_id: string
  version: number
  archivo_url: string
  cambios?: string
  created_at: string
}
