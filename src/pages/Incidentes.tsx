import { useEffect, useState, useRef } from 'react'
import Layout from '@/components/Layout'
import { incidentesService } from '@/services/incidentes'
import { ubicacionService } from '@/services/ubicacion'
import { Incidente, IncidenteConDetalles, TipoIncidente, Guardia } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, AlertTriangle, Loader2, CheckCircle2, XCircle, Camera } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import IncidenteCard from '@/components/IncidenteCard'
import { useGeolocation } from '@/hooks/useGeolocation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function Incidentes() {
  const { toast } = useToast()
  const { role } = useAuth()
  const [incidentes, setIncidentes] = useState<IncidenteConDetalles[]>([])
  const [tipos, setTipos] = useState<TipoIncidente[]>([])
  const [loading, setLoading] = useState(true)
  const [openIncidente, setOpenIncidente] = useState(false)
  const [openTipo, setOpenTipo] = useState(false)
  const [mostrarCamara, setMostrarCamara] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const { latitud, longitud } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
  })

  const [formIncidente, setFormIncidente] = useState({
    tipo_id: '',
    descripcion: '',
    foto_url: '',
    latitud: 0,
    longitud: 0,
    estado: 'pendiente' as const,
    prioridad: 'media' as const,
  })

  const [formTipo, setFormTipo] = useState({
    nombre: '',
    descripcion: '',
    severidad: 'media' as const,
    tiempo_respuesta_minutos: 60,
    activo: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (latitud && longitud) {
      setFormIncidente((prev) => ({
        ...prev,
        latitud,
        longitud,
      }))
    }
  }, [latitud, longitud])

  const loadData = async () => {
    setLoading(true)
    try {
      const perfil = await ubicacionService.getMiPerfil()
      const tiposData = await incidentesService.getAllTipos()
      setTipos(tiposData)

      // Si es guardia, cargar solo sus incidentes
      if (role === 'guardia') {
        const incidentesData = await incidentesService.getIncidentesByGuardia(perfil.id)
        setIncidentes(incidentesData)
      } else {
        // Si es admin, cargar todos
        const incidentesData = await incidentesService.getAllIncidentes()
        setIncidentes(incidentesData)
      }
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

  const iniciarCamara = async () => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
      .catch((error) => {
        toast({
          title: 'Error',
          description: 'No se pudo acceder a la cámara',
          variant: 'destructive',
        })
      })
  }

  const capturarFoto = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!videoRef.current || !canvasRef.current) {
        reject(new Error('Cámara no disponible'))
        return
      }

      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (!context) {
        reject(new Error('No se pudo obtener el contexto del canvas'))
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0)

      const fotoBase64 = canvas.toDataURL('image/jpeg', 0.8)
      resolve(fotoBase64)
    })
  }

  const subirFoto = async (fotoBase64: string): Promise<string> => {
    try {
      const response = await fetch(fotoBase64)
      const blob = await response.blob()
      const fileName = `incidentes/${Date.now()}.jpg`

      const { data, error } = await supabase.storage
        .from('fotos-incidentes')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        })

      if (error) {
        console.warn('Error al subir foto, usando base64:', error.message)
        return fotoBase64
      }

      const { data: urlData } = supabase.storage
        .from('fotos-incidentes')
        .getPublicUrl(fileName)

      return urlData.publicUrl || fotoBase64
    } catch (error: any) {
      console.warn('Error al subir foto, usando base64:', error.message)
      return fotoBase64
    }
  }

  const handleSubmitIncidente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!latitud || !longitud) {
      toast({
        title: 'Error',
        description: 'No se pudo obtener tu ubicación',
        variant: 'destructive',
      })
      return
    }

    try {
      // Obtener perfil del guardia autenticado
      const perfil = await ubicacionService.getMiPerfil()

      // Capturar foto si la cámara está activa
      let fotoUrl = formIncidente.foto_url
      if (mostrarCamara && videoRef.current) {
        const fotoBase64 = await capturarFoto()
        fotoUrl = await subirFoto(fotoBase64)
        detenerCamara()
      }

      await incidentesService.createIncidente({
        guardia_id: perfil.id,
        tipo_id: formIncidente.tipo_id,
        descripcion: formIncidente.descripcion,
        foto_url: fotoUrl,
        latitud,
        longitud,
        estado: 'pendiente',
        prioridad: formIncidente.prioridad,
      })

      toast({
        title: 'Éxito',
        description: 'Incidente creado correctamente',
      })

      setOpenIncidente(false)
      setFormIncidente({
        tipo_id: '',
        descripcion: '',
        foto_url: '',
        latitud: 0,
        longitud: 0,
        estado: 'pendiente',
        prioridad: 'media',
      })
      loadData()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleSubmitTipo = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await incidentesService.createTipo(formTipo)
      toast({
        title: 'Éxito',
        description: 'Tipo de incidente creado correctamente',
      })
      setOpenTipo(false)
      setFormTipo({
        nombre: '',
        descripcion: '',
        severidad: 'media',
        tiempo_respuesta_minutos: 60,
        activo: true,
      })
      loadData()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleResolver = async (id: string) => {
    try {
      await incidentesService.resolverIncidente(id)
      toast({
        title: 'Éxito',
        description: 'Incidente resuelto',
      })
      loadData()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleCancelar = async (id: string) => {
    try {
      await incidentesService.cancelarIncidente(id)
      toast({
        title: 'Éxito',
        description: 'Incidente cancelado',
      })
      loadData()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const detenerCamara = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  useEffect(() => {
    if (mostrarCamara) {
      iniciarCamara()
    } else {
      detenerCamara()
    }
    return () => detenerCamara()
  }, [mostrarCamara])

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Incidentes</h1>
            <p className="text-muted-foreground">
              Gestión de incidentes y reportes de seguridad
            </p>
          </div>
          <div className="flex gap-2">
            {role === 'admin' && (
              <Dialog open={openTipo} onOpenChange={setOpenTipo}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Tipo
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Tipo de Incidente</DialogTitle>
                  <DialogDescription>
                    Define un nuevo tipo de incidente
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitTipo}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="nombre">Nombre</Label>
                      <Input
                        id="nombre"
                        value={formTipo.nombre}
                        onChange={(e) =>
                          setFormTipo({ ...formTipo, nombre: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="descripcion">Descripción</Label>
                      <Input
                        id="descripcion"
                        value={formTipo.descripcion}
                        onChange={(e) =>
                          setFormTipo({ ...formTipo, descripcion: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="severidad">Severidad</Label>
                      <Select
                        value={formTipo.severidad}
                        onValueChange={(value: any) =>
                          setFormTipo({ ...formTipo, severidad: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baja">Baja</SelectItem>
                          <SelectItem value="media">Media</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="critica">Crítica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Crear Tipo</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            )}
            <Dialog open={openIncidente} onOpenChange={setOpenIncidente}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Incidente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Reportar Incidente</DialogTitle>
                  <DialogDescription>
                    Describe el incidente y captura una foto si es necesario
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitIncidente}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="tipo_id">Tipo de Incidente</Label>
                      <Select
                        value={formIncidente.tipo_id}
                        onValueChange={(value) =>
                          setFormIncidente({ ...formIncidente, tipo_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {tipos.map((tipo) => (
                            <SelectItem key={tipo.id} value={tipo.id}>
                              {tipo.nombre} ({tipo.severidad})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="descripcion">Descripción</Label>
                      <textarea
                        id="descripcion"
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formIncidente.descripcion}
                        onChange={(e) =>
                          setFormIncidente({ ...formIncidente, descripcion: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="prioridad">Prioridad</Label>
                      <Select
                        value={formIncidente.prioridad}
                        onValueChange={(value: any) =>
                          setFormIncidente({ ...formIncidente, prioridad: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baja">Baja</SelectItem>
                          <SelectItem value="media">Media</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="critica">Crítica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setMostrarCamara(!mostrarCamara)}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        {mostrarCamara ? 'Ocultar Cámara' : 'Tomar Foto'}
                      </Button>
                      {mostrarCamara && (
                        <div className="relative bg-black rounded-lg overflow-hidden">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-64 object-cover"
                          />
                          <canvas ref={canvasRef} className="hidden" />
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={!latitud || !longitud}>
                      Reportar Incidente
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="todos" className="space-y-4">
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
            <TabsTrigger value="resueltos">Resueltos</TabsTrigger>
          </TabsList>

          <TabsContent value="todos" className="space-y-4">
            <div className="space-y-4">
              {incidentes.map((incidente) => (
                <IncidenteCard
                  key={incidente.id}
                  incidente={incidente}
                  onResolver={role === 'admin' ? handleResolver : undefined}
                  onCancelar={role === 'admin' ? handleCancelar : undefined}
                />
              ))}
              {incidentes.length === 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground py-12">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay incidentes registrados</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pendientes" className="space-y-4">
            <div className="space-y-4">
              {incidentes
                .filter((i) => i.estado === 'pendiente' || i.estado === 'en_proceso')
                .map((incidente) => (
                  <IncidenteCard
                    key={incidente.id}
                    incidente={incidente}
                    onResolver={role === 'admin' ? handleResolver : undefined}
                    onCancelar={role === 'admin' ? handleCancelar : undefined}
                  />
                ))}
            </div>
          </TabsContent>

          <TabsContent value="resueltos" className="space-y-4">
            <div className="space-y-4">
              {incidentes
                .filter((i) => i.estado === 'resuelto')
                .map((incidente) => (
                  <IncidenteCard key={incidente.id} incidente={incidente} />
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}
