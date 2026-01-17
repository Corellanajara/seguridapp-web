import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { mensajeriaService } from '@/services/mensajeria'
import { Conversacion, Notificacion } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, Bell, Loader2, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Chat from '@/components/Chat'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function Mensajeria() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([])
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [conversacionSeleccionada, setConversacionSeleccionada] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    suscribirNotificaciones()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [conversacionesData, notificacionesData] = await Promise.all([
        mensajeriaService.getAllConversaciones(),
        mensajeriaService.getNotificacionesNoLeidas(),
      ])
      setConversaciones(conversacionesData)
      setNotificaciones(notificacionesData)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const suscribirNotificaciones = () => {
    const channel = supabase
      .channel('notificaciones')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${user?.id}`,
        },
        () => {
          loadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const marcarNotificacionLeida = async (id: string) => {
    await mensajeriaService.marcarNotificacionComoLeida(id)
    loadData()
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mensajería</h1>
          <p className="text-muted-foreground">
            Chat y notificaciones del sistema
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {conversaciones.map((conv) => (
                  <Button
                    key={conv.id}
                    variant={conversacionSeleccionada === conv.id ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => setConversacionSeleccionada(conv.id)}
                  >
                    {conv.nombre || `Conversación ${conv.tipo}`}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificaciones
                {notificaciones.length > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs">
                    {notificaciones.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {notificaciones.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-3 border rounded-lg flex items-start justify-between"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{notif.titulo}</p>
                      <p className="text-xs text-muted-foreground">{notif.mensaje}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => marcarNotificacionLeida(notif.id)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {notificaciones.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay notificaciones nuevas
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {conversacionSeleccionada && (
          <Card className="h-[600px]">
            <CardHeader>
              <CardTitle>Chat</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-80px)]">
              <Chat conversacionId={conversacionSeleccionada} />
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}
