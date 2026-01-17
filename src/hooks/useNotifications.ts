import { useEffect, useState } from 'react'
import { mensajeriaService } from '@/services/mensajeria'
import { Notificacion } from '@/types'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export function useNotifications() {
  const { user } = useAuth()
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas] = useState(0)

  useEffect(() => {
    if (!user) return

    cargarNotificaciones()
    suscribirNotificaciones()
  }, [user])

  const cargarNotificaciones = async () => {
    try {
      const data = await mensajeriaService.getNotificacionesNoLeidas()
      setNotificaciones(data)
      setNoLeidas(data.length)
    } catch (error) {
      console.error('Error al cargar notificaciones:', error)
    }
  }

  const suscribirNotificaciones = () => {
    if (!user) return

    const channel = supabase
      .channel('notificaciones-usuario')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${user.id}`,
        },
        () => {
          cargarNotificaciones()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const marcarComoLeida = async (id: string) => {
    await mensajeriaService.marcarNotificacionComoLeida(id)
    cargarNotificaciones()
  }

  return {
    notificaciones,
    noLeidas,
    marcarComoLeida,
    recargar: cargarNotificaciones,
  }
}
