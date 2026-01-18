import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import MapView from '@/components/MapView'
import { guardiasService } from '@/services/guardias'
import { Guardia } from '@/types'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useGeolocation } from '@/hooks/useGeolocation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Loader2, AlertCircle, Navigation } from 'lucide-react'

export default function Dashboard() {
  const [guardias, setGuardias] = useState<Guardia[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { latitud, longitud, error: geoError, loading: geoLoading, requestLocation } = useGeolocation({
    autoStart: false, // No iniciar automáticamente
  })
  
  // Verificar si el permiso está denegado
  const permisoDenegado = geoError?.includes('denegado') || geoError?.includes('Permiso de ubicación denegado')

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

  const handlePedirPermiso = () => {
    requestLocation()
  }

  const handleObtenerUbicacionActual = () => {
    if (!latitud || !longitud) {
      requestLocation()
    } else {
      // Si ya tenemos ubicación, centrar el mapa
      toast({
        title: 'Ubicación actual',
        description: `Centrando en: ${latitud.toFixed(6)}, ${longitud.toFixed(6)}`,
      })
    }
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mapa en Tiempo Real</h1>
            <p className="text-muted-foreground">
              Monitoreo de guardias activos
            </p>
          </div>
          <div className="flex gap-2">
            {permisoDenegado ? (
              <Button
                onClick={handlePedirPermiso}
                disabled={geoLoading}
                variant="outline"
                className="gap-2"
              >
                {geoLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Solicitando...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4" />
                    Pedir permiso de ubicación
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleObtenerUbicacionActual}
                disabled={geoLoading}
                variant="outline"
                className="gap-2"
              >
                {geoLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Obteniendo...
                  </>
                ) : (
                  <>
                    <Navigation className="h-4 w-4" />
                    Obtener ubicación actual
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {geoError && permisoDenegado && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="h-5 w-5" />
                Permiso de ubicación requerido
              </CardTitle>
              <CardDescription className="text-orange-700">
                {geoError}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handlePedirPermiso}
                disabled={geoLoading}
                variant="outline"
                className="gap-2"
              >
                {geoLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Solicitando permiso...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4" />
                    Pedir permiso de ubicación
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {geoError && !permisoDenegado && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="h-5 w-5" />
                Advertencia
              </CardTitle>
              <CardDescription className="text-yellow-700">
                {geoError}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="h-[calc(100vh-250px)] rounded-lg overflow-hidden border">
          <MapView 
            guardias={guardias} 
            centerOnUser={latitud && longitud ? [latitud, longitud] : undefined}
          />
        </div>
      </div>
    </Layout>
  )
}

