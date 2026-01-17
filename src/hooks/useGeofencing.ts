import { useEffect, useState, useRef } from 'react'
import { zonasService } from '@/services/zonas'
import { AsignacionZonaConDetalles, AlertaZona } from '@/types'
import { supabase } from '@/lib/supabase'

interface UseGeofencingOptions {
  guardiaId: string
  latitud?: number
  longitud?: number
  intervalo?: number // Intervalo de verificación en milisegundos (default: 30000 = 30 segundos)
  onAlerta?: (alerta: AlertaZona) => void
}

interface EstadoZona {
  zonaId: string
  dentro: boolean
  ultimaVerificacion: Date
}

export function useGeofencing({
  guardiaId,
  latitud,
  longitud,
  intervalo = 30000,
  onAlerta,
}: UseGeofencingOptions) {
  const [asignaciones, setAsignaciones] = useState<AsignacionZonaConDetalles[]>([])
  const [estadosZonas, setEstadosZonas] = useState<Map<string, EstadoZona>>(new Map())
  const [alertas, setAlertas] = useState<AlertaZona[]>([])
  const intervaloRef = useRef<NodeJS.Timeout | null>(null)
  const estadosAnterioresRef = useRef<Map<string, boolean>>(new Map())

  useEffect(() => {
    if (!guardiaId) return

    const cargarAsignaciones = async () => {
      try {
        const data = await zonasService.getAsignacionesActivasByGuardia(guardiaId)
        setAsignaciones(data)
        
        // Inicializar estados
        const nuevosEstados = new Map<string, EstadoZona>()
        data.forEach((asignacion) => {
          if (asignacion.zona) {
            nuevosEstados.set(asignacion.zona.id, {
              zonaId: asignacion.zona.id,
              dentro: false,
              ultimaVerificacion: new Date(),
            })
          }
        })
        setEstadosZonas(nuevosEstados)
      } catch (error) {
        console.error('Error al cargar asignaciones de zonas:', error)
      }
    }

    cargarAsignaciones()
  }, [guardiaId])

  useEffect(() => {
    if (!latitud || !longitud || asignaciones.length === 0) return

    const verificarZonas = async () => {
      for (const asignacion of asignaciones) {
        if (!asignacion.zona || !asignacion.activo) continue

        try {
          const dentro = await zonasService.verificarPuntoEnZona(
            asignacion.zona.id,
            latitud,
            longitud
          )

          const estadoAnterior = estadosAnterioresRef.current.get(asignacion.zona.id) ?? null
          const estadoActual = dentro

          // Si cambió el estado (entró o salió)
          if (estadoAnterior !== null && estadoAnterior !== estadoActual) {
            const tipo = estadoActual ? 'entrada' : 'salida'
            
            // Crear alerta
            const nuevaAlerta = await zonasService.createAlerta({
              guardia_id: guardiaId,
              zona_id: asignacion.zona.id,
              tipo,
              timestamp: new Date().toISOString(),
              resuelta: false,
            })

            setAlertas((prev) => [nuevaAlerta, ...prev])
            
            // Llamar callback si existe
            if (onAlerta) {
              onAlerta(nuevaAlerta)
            }

            // Notificar a través de Realtime (opcional)
            await supabase
              .from('alertas_zona')
              .insert([nuevaAlerta])
              .then(() => {
                // La alerta ya se creó arriba, esto es solo para propagar
              })
          }

          // Actualizar estado
          estadosAnterioresRef.current.set(asignacion.zona.id, estadoActual)
          setEstadosZonas((prev) => {
            const nuevo = new Map(prev)
            nuevo.set(asignacion.zona!.id, {
              zonaId: asignacion.zona!.id,
              dentro: estadoActual,
              ultimaVerificacion: new Date(),
            })
            return nuevo
          })
        } catch (error) {
          console.error(`Error al verificar zona ${asignacion.zona.id}:`, error)
        }
      }
    }

    // Verificar inmediatamente
    verificarZonas()

    // Configurar intervalo
    intervaloRef.current = setInterval(verificarZonas, intervalo)

    return () => {
      if (intervaloRef.current) {
        clearInterval(intervaloRef.current)
      }
    }
  }, [latitud, longitud, asignaciones, guardiaId, intervalo, onAlerta])

  return {
    asignaciones,
    estadosZonas: Array.from(estadosZonas.values()),
    alertas,
    estaDentroDeZona: (zonaId: string) => estadosZonas.get(zonaId)?.dentro ?? false,
  }
}
