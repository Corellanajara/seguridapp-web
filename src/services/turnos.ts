import { supabase } from '@/lib/supabase'
import { Turno, Horario, AsignacionTurno, AsignacionTurnoConDetalles } from '@/types'

export const turnosService = {
  // ========== TURNOS ==========
  async getAllTurnos(): Promise<Turno[]> {
    const { data, error } = await supabase
      .from('turnos')
      .select('*')
      .order('hora_inicio', { ascending: true })

    if (error) throw error
    return data as Turno[]
  },

  async getTurnoById(id: string): Promise<Turno> {
    const { data, error } = await supabase
      .from('turnos')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Turno
  },

  async createTurno(turno: Omit<Turno, 'id' | 'created_at' | 'updated_at'>): Promise<Turno> {
    const { data, error } = await supabase
      .from('turnos')
      .insert([turno])
      .select()
      .single()

    if (error) throw error
    return data as Turno
  },

  async updateTurno(id: string, updates: Partial<Turno>): Promise<Turno> {
    const { data, error } = await supabase
      .from('turnos')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Turno
  },

  async deleteTurno(id: string): Promise<void> {
    const { error } = await supabase
      .from('turnos')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // ========== HORARIOS ==========
  async getHorariosByTurno(turnoId: string): Promise<Horario[]> {
    const { data, error } = await supabase
      .from('horarios')
      .select('*')
      .eq('turno_id', turnoId)
      .order('dia_semana', { ascending: true })

    if (error) throw error
    return data as Horario[]
  },

  async createHorario(horario: Omit<Horario, 'id' | 'created_at' | 'updated_at'>): Promise<Horario> {
    const { data, error } = await supabase
      .from('horarios')
      .insert([horario])
      .select()
      .single()

    if (error) throw error
    return data as Horario
  },

  async updateHorario(id: string, updates: Partial<Horario>): Promise<Horario> {
    const { data, error } = await supabase
      .from('horarios')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Horario
  },

  async deleteHorario(id: string): Promise<void> {
    const { error } = await supabase
      .from('horarios')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async deleteHorariosByTurno(turnoId: string): Promise<void> {
    const { error } = await supabase
      .from('horarios')
      .delete()
      .eq('turno_id', turnoId)

    if (error) throw error
  },

  // ========== ASIGNACIONES ==========
  async getAllAsignaciones(): Promise<AsignacionTurnoConDetalles[]> {
    const { data, error } = await supabase
      .from('asignaciones_turnos')
      .select(`
        *,
        guardia:guardias(*),
        turno:turnos(*)
      `)
      .order('fecha_inicio', { ascending: false })

    if (error) throw error
    return data as AsignacionTurnoConDetalles[]
  },

  async getAsignacionesByGuardia(guardiaId: string): Promise<AsignacionTurnoConDetalles[]> {
    const { data, error } = await supabase
      .from('asignaciones_turnos')
      .select(`
        *,
        turno:turnos(*)
      `)
      .eq('guardia_id', guardiaId)
      .order('fecha_inicio', { ascending: false })

    if (error) throw error
    return data as AsignacionTurnoConDetalles[]
  },

  async getAsignacionActivaByGuardia(guardiaId: string): Promise<AsignacionTurnoConDetalles | null> {
    const hoy = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('asignaciones_turnos')
      .select(`
        *,
        turno:turnos(*)
      `)
      .eq('guardia_id', guardiaId)
      .eq('activo', true)
      .lte('fecha_inicio', hoy)
      .or(`fecha_fin.is.null,fecha_fin.gte.${hoy}`)
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as AsignacionTurnoConDetalles | null
  },

  async createAsignacion(asignacion: Omit<AsignacionTurno, 'id' | 'created_at' | 'updated_at'>): Promise<AsignacionTurno> {
    const { data, error } = await supabase
      .from('asignaciones_turnos')
      .insert([asignacion])
      .select()
      .single()

    if (error) throw error
    return data as AsignacionTurno
  },

  async updateAsignacion(id: string, updates: Partial<AsignacionTurno>): Promise<AsignacionTurno> {
    const { data, error } = await supabase
      .from('asignaciones_turnos')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as AsignacionTurno
  },

  async deleteAsignacion(id: string): Promise<void> {
    const { error } = await supabase
      .from('asignaciones_turnos')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // ========== UTILIDADES ==========
  async validarAsistenciaSegunTurno(guardiaId: string, tipoAsistencia: 'entrada' | 'salida'): Promise<{ valido: boolean; mensaje?: string }> {
    const asignacion = await this.getAsignacionActivaByGuardia(guardiaId)
    
    if (!asignacion || !asignacion.turno) {
      return { valido: false, mensaje: 'No tiene un turno asignado activo' }
    }

    const ahora = new Date()
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes()
    const [horaInicioH, horaInicioM] = asignacion.turno.hora_inicio.split(':').map(Number)
    const [horaFinH, horaFinM] = asignacion.turno.hora_fin.split(':').map(Number)
    const horaInicio = horaInicioH * 60 + horaInicioM
    const horaFin = horaFinH * 60 + horaFinM

    // Validar si está dentro del horario del turno (con margen de 30 minutos)
    const margen = 30
    const dentroHorario = horaActual >= (horaInicio - margen) && horaActual <= (horaFin + margen)

    if (tipoAsistencia === 'entrada') {
      if (!dentroHorario || horaActual > horaInicio + margen) {
        return { valido: false, mensaje: 'Fuera del horario de entrada del turno' }
      }
    } else {
      if (!dentroHorario || horaActual < horaFin - margen) {
        return { valido: false, mensaje: 'Fuera del horario de salida del turno' }
      }
    }

    return { valido: true }
  },

  async calcularHorasTrabajadas(_guardiaId: string, _fechaInicio: string, _fechaFin: string): Promise<number> {
    // Esta función calcula las horas trabajadas basándose en las asistencias
    // Se implementará más adelante cuando tengamos el historial completo
    return 0
  },
}
