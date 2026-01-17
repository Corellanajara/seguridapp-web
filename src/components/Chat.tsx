import { useEffect, useState, useRef } from 'react'
import { mensajeriaService } from '@/services/mensajeria'
import { Mensaje } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface ChatProps {
  conversacionId: string
}

export default function Chat({ conversacionId }: ChatProps) {
  const { user } = useAuth()
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [nuevoMensaje, setNuevoMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [cargando, setCargando] = useState(true)
  const mensajesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    cargarMensajes()
    suscribirMensajes()
  }, [conversacionId])

  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const cargarMensajes = async () => {
    try {
      const data = await mensajeriaService.getMensajesPorConversacion(conversacionId)
      setMensajes(data)
      await mensajeriaService.marcarMensajesComoLeidos(conversacionId)
    } catch (error) {
      console.error('Error al cargar mensajes:', error)
    } finally {
      setCargando(false)
    }
  }

  const suscribirMensajes = () => {
    const channel = supabase
      .channel(`mensajes:${conversacionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `conversacion_id=eq.${conversacionId}`,
        },
        (payload) => {
          setMensajes((prev) => [...prev, payload.new as Mensaje])
          if (payload.new.usuario_id !== user?.id) {
            mensajeriaService.marcarMensajesComoLeidos(conversacionId)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const enviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoMensaje.trim() || !user) return

    setEnviando(true)
    try {
      await mensajeriaService.crearMensaje({
        conversacion_id: conversacionId,
        usuario_id: user.id,
        contenido: nuevoMensaje,
        leido: false,
      })
      setNuevoMensaje('')
    } catch (error) {
      console.error('Error al enviar mensaje:', error)
    } finally {
      setEnviando(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {mensajes.map((mensaje) => (
          <div
            key={mensaje.id}
            className={`flex ${mensaje.usuario_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                mensaje.usuario_id === user?.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <p className="text-sm">{mensaje.contenido}</p>
              <p className="text-xs opacity-70 mt-1">
                {new Date(mensaje.created_at).toLocaleTimeString('es-AR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={mensajesEndRef} />
      </div>
      <form onSubmit={enviarMensaje} className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
            placeholder="Escribe un mensaje..."
            disabled={enviando}
          />
          <Button type="submit" disabled={enviando || !nuevoMensaje.trim()}>
            {enviando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
