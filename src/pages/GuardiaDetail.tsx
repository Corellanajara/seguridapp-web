import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import { guardiasService } from '@/services/guardias'
import { Guardia } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin, Phone, Mail, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import MapView from '@/components/MapView'

export default function GuardiaDetail() {
  const { id } = useParams<{ id: string }>()
  const [guardia, setGuardia] = useState<Guardia | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (id) {
      loadGuardia()
    }
  }, [id])

  const loadGuardia = async () => {
    if (!id) return
    try {
      const data = await guardiasService.getById(id)
      setGuardia(data)
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
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Cargando...</div>
        </div>
      </Layout>
    )
  }

  if (!guardia) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Guardia no encontrado</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <Link to="/guardias">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={guardia.foto_url} />
                  <AvatarFallback className="text-2xl">
                    {guardia.nombre.charAt(0)}
                    {guardia.apellido.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">
                    {guardia.nombre} {guardia.apellido}
                  </CardTitle>
                  <CardDescription>Perfil del Guardia</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{guardia.email}</p>
                </div>
              </div>
              {guardia.telefono && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Teléfono</p>
                    <p className="font-medium">{guardia.telefono}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 flex items-center justify-center">
                  <span
                    className={`h-3 w-3 rounded-full ${
                      guardia.activo ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <p className="font-medium">
                    {guardia.activo ? 'Activo' : 'Inactivo'}
                  </p>
                </div>
              </div>
              {guardia.ultima_actualizacion && (
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Última actualización
                    </p>
                    <p className="font-medium">
                      {new Date(guardia.ultima_actualizacion).toLocaleString('es-AR')}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {guardia.latitud && guardia.longitud && (
            <Card>
              <CardHeader>
                <CardTitle>Ubicación Actual</CardTitle>
                <CardDescription>
                  {guardia.latitud.toFixed(6)}, {guardia.longitud.toFixed(6)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 rounded-lg overflow-hidden border">
                  <MapView guardias={[guardia]} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  )
}

