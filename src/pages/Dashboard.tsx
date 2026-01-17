import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import MapView from '@/components/MapView'
import { guardiasService } from '@/services/guardias'
import { Guardia } from '@/types'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

export default function Dashboard() {
  const [guardias, setGuardias] = useState<Guardia[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadGuardias()

    // Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel('guardias-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guardias',
        },
        (payload) => {
          console.log('Cambio detectado:', payload)
          loadGuardias()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadGuardias = async () => {
    try {
      const data = await guardiasService.getAll()
      setGuardias(data.filter((g) => g.activo))
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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-lg">Cargando mapa...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Mapa en Tiempo Real</h1>
          <p className="text-muted-foreground">
            Monitoreo de guardias activos
          </p>
        </div>
        <div className="h-[calc(100vh-250px)] rounded-lg overflow-hidden border">
          <MapView guardias={guardias} />
        </div>
      </div>
    </Layout>
  )
}

