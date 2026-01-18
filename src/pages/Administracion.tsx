import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, Building, MapPin, Settings, Clock, Camera, FileSignature, Loader2, RefreshCw } from 'lucide-react'
import { asistenciasService } from '@/services/asistencias'
import { AsistenciaConGuardia } from '@/types'
import { useToast } from '@/hooks/use-toast'
import Turnos from './Turnos'
import Zonas from './Zonas'
import Reportes from './Reportes'

export default function Administracion() {
  const { toast } = useToast()
  const [asistencias, setAsistencias] = useState<AsistenciaConGuardia[]>([])
  const [loadingAsistencias, setLoadingAsistencias] = useState(false)

  useEffect(() => {
    cargarAsistencias()
  }, [])

  const cargarAsistencias = async () => {
    setLoadingAsistencias(true)
    try {
      const data = await asistenciasService.getAllAsistencias()
      setAsistencias(data)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron cargar las asistencias',
        variant: 'destructive',
      })
    } finally {
      setLoadingAsistencias(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Administración</h1>
          <p className="text-muted-foreground">
            Gestión de entidades y configuraciones del sistema
          </p>
        </div>

        <Tabs defaultValue="asistencias" className="space-y-4">
          <TabsList>
            <TabsTrigger value="asistencias">Asistencias</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="zonas">Zonas</TabsTrigger>
            <TabsTrigger value="turnos">Turnos</TabsTrigger>
            <TabsTrigger value="reportes">Reportes</TabsTrigger>
          </TabsList>

          <TabsContent value="asistencias" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Control de Asistencias
                    </CardTitle>
                    <CardDescription>
                      Registro de entradas y salidas de los guardias con foto y geolocalización
                    </CardDescription>
                  </div>
                  <Button
                    onClick={cargarAsistencias}
                    disabled={loadingAsistencias}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loadingAsistencias ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingAsistencias ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : asistencias.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay asistencias registradas aún</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {asistencias.map((asistencia) => (
                      <Card key={asistencia.id} className="border-l-4 border-l-primary">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            {/* Foto del guardia */}
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={asistencia.guardia?.foto_url} />
                              <AvatarFallback>
                                {asistencia.guardia?.nombre.charAt(0)}
                                {asistencia.guardia?.apellido.charAt(0)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="font-semibold">
                                    {asistencia.guardia?.nombre} {asistencia.guardia?.apellido}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {asistencia.guardia?.email}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      asistencia.tipo_asistencia === 'entrada'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    {asistencia.tipo_asistencia === 'entrada' ? 'Entrada' : 'Salida'}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                {/* Información de fecha y hora */}
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Fecha y Hora</p>
                                  <p className="text-sm font-medium">
                                    {new Date(asistencia.created_at).toLocaleString('es-AR', {
                                      dateStyle: 'long',
                                      timeStyle: 'short',
                                    })}
                                  </p>
                                </div>

                                {/* Geolocalización */}
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Ubicación</p>
                                  <p className="text-sm font-medium">
                                    {asistencia.latitud.toFixed(6)}, {asistencia.longitud.toFixed(6)}
                                  </p>
                                </div>

                                {/* Foto de asistencia */}
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Foto de Asistencia</p>
                                  {asistencia.foto_url && (
                                    <a
                                      href={asistencia.foto_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                    >
                                      <Camera className="h-3 w-3" />
                                      Ver foto
                                    </a>
                                  )}
                                </div>

                                {/* Firma documental */}
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Firma Documental</p>
                                  {asistencia.firma_documental ? (
                                    <div className="space-y-2">
                                      {(() => {
                                        try {
                                          const firmaData = JSON.parse(asistencia.firma_documental)
                                          const esFirmaManual = firmaData.tipo === 'manual' && firmaData.datos
                                          
                                          return esFirmaManual ? (
                                            <div className="space-y-1">
                                              <img
                                                src={firmaData.datos}
                                                alt="Firma del guardia"
                                                className="max-w-full h-20 border rounded bg-white object-contain"
                                              />
                                              <p className="text-xs text-muted-foreground">
                                                Firma manual - {new Date(firmaData.timestamp).toLocaleString('es-AR')}
                                              </p>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-2">
                                              <FileSignature className="h-3 w-3 text-muted-foreground" />
                                              <span className="text-xs text-muted-foreground">
                                                {asistencia.firma_clave_unica
                                                  ? 'Clave Única (Mock)'
                                                  : 'Firma Electrónica'}
                                              </span>
                                            </div>
                                          )
                                        } catch (error) {
                                          return (
                                            <div className="flex items-center gap-2">
                                              <FileSignature className="h-3 w-3 text-muted-foreground" />
                                              <span className="text-xs text-muted-foreground">
                                                Firma registrada (formato no válido)
                                              </span>
                                            </div>
                                          )
                                        }
                                      })()}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <FileSignature className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">Pendiente</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Observaciones */}
                              {asistencia.observaciones && (
                                <div className="mt-3 p-2 bg-muted rounded text-xs">
                                  <p className="text-muted-foreground">{asistencia.observaciones}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configuración General
                  </CardTitle>
                  <CardDescription>
                    Ajustes generales de la plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Próximamente: Configuración de parámetros del sistema
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Usuarios del Sistema
                  </CardTitle>
                  <CardDescription>
                    Gestión de usuarios administrativos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Próximamente: Gestión de usuarios y permisos
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="zonas" className="space-y-4">
            <Zonas />
          </TabsContent>

          <TabsContent value="turnos" className="space-y-4">
            <Turnos />
          </TabsContent>

          <TabsContent value="reportes" className="space-y-4">
            <Reportes />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}

