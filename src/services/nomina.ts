import { reportesService } from './reportes'
import { exporters } from '@/lib/exporters'

export const nominaService = {
  /**
   * Exporta horas trabajadas para nómina
   */
  async exportarHorasTrabajadas(
    guardiaId?: string,
    fechaInicio?: string,
    fechaFin?: string,
    formato: 'csv' | 'excel' | 'json' = 'csv'
  ): Promise<void> {
    const horas = await reportesService.getReporteHorasTrabajadas(
      guardiaId,
      fechaInicio,
      fechaFin
    )

    const datos = horas.map((h) => ({
      'Guardia': h.guardia_nombre,
      'Fecha': h.fecha,
      'Horas Trabajadas': h.horas_trabajadas.toFixed(2),
      'Horas Extras': (h.horas_extras || 0).toFixed(2),
    }))

    const fecha = new Date().toISOString().split('T')[0]
    const filename = `nomina_horas_${fecha}.${formato === 'excel' ? 'csv' : formato}`

    if (formato === 'json') {
      exporters.toJSON(datos, filename)
    } else {
      exporters.toCSV(datos, filename)
    }
  },

  /**
   * Calcula horas extras basándose en turnos asignados
   */
  async calcularHorasExtras(
    guardiaId: string,
    fechaInicio: string,
    fechaFin: string
  ): Promise<number> {
    // Esta función se implementará cuando tengamos la lógica completa de turnos
    const horas = await reportesService.getReporteHorasTrabajadas(
      guardiaId,
      fechaInicio,
      fechaFin
    )

    return horas.reduce((total, h) => total + (h.horas_extras || 0), 0)
  },
}
