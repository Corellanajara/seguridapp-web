import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { zonasService } from '@/services/zonas'
import { guardiasService } from '@/services/guardias'
import { Zona, AsignacionZona, AsignacionZonaConDetalles, Guardia, AlertaZona } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, MapPin, Users, Edit, Trash2, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
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
import ZonaMap from '@/components/ZonaMap'

export default function Zonas() {
  const { toast } = useToast()
  const [zonas, setZonas] = useState<Zona[]>([])
  const [asignaciones, setAsignaciones] = useState<AsignacionZonaConDetalles[]>([])
  const [alertas, setAlertas] = useState<AlertaZona[]>([])
  const [guardias, setGuardias] = useState<Guardia[]>([])
  const [loading, setLoading] = useState(true)
  const [openZona, setOpenZona] = useState(false)
  const [openAsignacion, setOpenAsignacion] = useState(false)
  const [editingZona, setEditingZona] = useState<Zona | null>(null)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [zonaCoordenadas, setZonaCoordenadas] = useState<string | null>(null)
  const [zonaTipo, setZonaTipo] = useState<'poligono' | 'circulo'>('poligono')

  const [formZona, setFormZona] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'poligono' as 'poligono' | 'circulo',
    activo: true,
  })

  const [formAsignacion, setFormAsignacion] = useState({
    guardia_id: '',
    zona_id: '',
    fecha_inicio: '',
    fecha_fin: '',
    activo: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [zonasData, asignacionesData, alertasData, guardiasData] = await Promise.all([
        zonasService.getAllZonas(),
        zonasService.getAllAsignaciones(),
        zonasService.getAlertasNoResueltas(),
        guardiasService.getAll(),
      ])
      setZonas(zonasData)
      setAsignaciones(asignacionesData)
      setAlertas(alertasData)
      setGuardias(guardiasData.filter(g => g.activo))
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

  const handleZonaCreada = (zona: { tipo: 'poligono' | 'circulo'; coordenadas: string }) => {
    setZonaCoordenadas(zona.coordenadas)
    setZonaTipo(zona.tipo)
    setModoEdicion(false)
    toast({
      title: 'Zona creada',
      description: 'Ahora completa el formulario para guardar la zona',
    })
  }

  const handleSubmitZona = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!zonaCoordenadas) {
      toast({
        title: 'Error',
        description: 'Debes crear la zona en el mapa primero',
        variant: 'destructive',
      })
      return
    }

    try {
      if (editingZona) {
        await zonasService.updateZona(editingZona.id, {
          ...formZona,
          coordenadas: zonaCoordenadas,
        })
        toast({
          title: 'Éxito',
          description: 'Zona actualizada correctamente',
        })
      } else {
        await zonasService.createZona({
          ...formZona,
          coordenadas: zonaCoordenadas,
        })
        toast({
          title: 'Éxito',
          description: 'Zona creada correctamente',
        })
      }
      setOpenZona(false)
      setEditingZona(null)
      setZonaCoordenadas(null)
      setFormZona({
        nombre: '',
        descripcion: '',
        tipo: 'poligono',
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

  const handleSubmitAsignacion = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await zonasService.createAsignacion({
        ...formAsignacion,
        fecha_fin: formAsignacion.fecha_fin || null,
      })
      toast({
        title: 'Éxito',
        description: 'Asignación creada correctamente',
      })
      setOpenAsignacion(false)
      setFormAsignacion({
        guardia_id: '',
        zona_id: '',
        fecha_inicio: '',
        fecha_fin: '',
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

  const handleEditZona = (zona: Zona) => {
    setEditingZona(zona)
    setFormZona({
      nombre: zona.nombre,
      descripcion: zona.descripcion || '',
      tipo: zona.tipo,
      activo: zona.activo,
    })
    setZonaCoordenadas(zona.coordenadas)
    setZonaTipo(zona.tipo)
    setOpenZona(true)
  }

  const handleDeleteZona = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta zona?')) return
    try {
      await zonasService.deleteZona(id)
      toast({
        title: 'Éxito',
        description: 'Zona eliminada correctamente',
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

  const handleDeleteAsignacion = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta asignación?')) return
    try {
      await zonasService.deleteAsignacion(id)
      toast({
        title: 'Éxito',
        description: 'Asignación eliminada correctamente',
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

  const handleResolverAlerta = async (id: string) => {
    try {
      await zonasService.resolverAlerta(id)
      toast({
        title: 'Éxito',
        description: 'Alerta resuelta',
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
          <h1 className="text-3xl font-bold">Zonas de Seguridad</h1>
          <p className="text-muted-foreground">
            Define y gestiona las zonas de seguridad geográficas
          </p>
        </div>

        <Tabs defaultValue="zonas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="zonas">Zonas</TabsTrigger>
            <TabsTrigger value="asignaciones">Asignaciones</TabsTrigger>
            <TabsTrigger value="alertas">Alertas</TabsTrigger>
          </TabsList>

          <TabsContent value="zonas" className="space-y-4">
            <div className="flex items-center justify-between">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Zonas Geográficas
                  </CardTitle>
                  <CardDescription>
                    Crea zonas de seguridad en el mapa (polígonos o círculos)
                  </CardDescription>
                </CardHeader>
              </Card>
              <Dialog open={openZona} onOpenChange={(open) => {
                setOpenZona(open)
                if (!open) {
                  setEditingZona(null)
                  setZonaCoordenadas(null)
                  setFormZona({
                    nombre: '',
                    descripcion: '',
                    tipo: 'poligono',
                    activo: true,
                  })
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Zona
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingZona ? 'Editar Zona' : 'Crear Nueva Zona'}
                    </DialogTitle>
                    <DialogDescription>
                      {modoEdicion
                        ? 'Haz clic en el mapa para crear la zona. Doble clic para finalizar polígono.'
                        : 'Completa el formulario y luego crea la zona en el mapa'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <form onSubmit={handleSubmitZona} className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="nombre">Nombre de la Zona</Label>
                        <Input
                          id="nombre"
                          value={formZona.nombre}
                          onChange={(e) =>
                            setFormZona({ ...formZona, nombre: e.target.value })
                          }
                          placeholder="Ej: Zona Norte, Edificio Principal"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="descripcion">Descripción</Label>
                        <Input
                          id="descripcion"
                          value={formZona.descripcion}
                          onChange={(e) =>
                            setFormZona({ ...formZona, descripcion: e.target.value })
                          }
                          placeholder="Descripción opcional de la zona"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="tipo">Tipo de Zona</Label>
                        <Select
                          value={formZona.tipo}
                          onValueChange={(value: 'poligono' | 'circulo') => {
                            setFormZona({ ...formZona, tipo: value })
                            setZonaTipo(value)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="poligono">Polígono</SelectItem>
                            <SelectItem value="circulo">Círculo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="h-96 rounded-lg overflow-hidden border">
                        <ZonaMap
                          zonas={editingZona ? [editingZona] : []}
                          modoEdicion={modoEdicion}
                          onZonaCreada={handleZonaCreada}
                        />
                      </div>
                      {!zonaCoordenadas && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setModoEdicion(true)}
                        >
                          {zonaTipo === 'poligono'
                            ? 'Comenzar a dibujar polígono (click para puntos, doble click para finalizar)'
                            : 'Comenzar a dibujar círculo (click para centro, segundo click para radio)'}
                        </Button>
                      )}
                      {zonaCoordenadas && (
                        <div className="p-2 bg-green-50 rounded text-sm text-green-800">
                          Zona creada en el mapa. Completa el formulario y guarda.
                        </div>
                      )}
                      <DialogFooter>
                        <Button type="submit" disabled={!zonaCoordenadas}>
                          {editingZona ? 'Actualizar' : 'Crear'} Zona
                        </Button>
                      </DialogFooter>
                    </form>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {zonas.map((zona) => (
                <Card key={zona.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{zona.nombre}</CardTitle>
                      {zona.activo ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <CardDescription>
                      {zona.descripcion || 'Sin descripción'}
                    </CardDescription>
                    <CardDescription className="capitalize">
                      Tipo: {zona.tipo}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          zona.activo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {zona.activo ? 'Activo' : 'Inactivo'}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditZona(zona)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteZona(zona.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {zonas.length === 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground">
                      <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay zonas creadas aún</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="asignaciones" className="space-y-4">
            <div className="flex items-center justify-between">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Asignaciones de Zonas
                  </CardTitle>
                  <CardDescription>
                    Asigna zonas a los guardias
                  </CardDescription>
                </CardHeader>
              </Card>
              <Dialog open={openAsignacion} onOpenChange={setOpenAsignacion}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Asignación
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nueva Asignación</DialogTitle>
                    <DialogDescription>
                      Asigna una zona a un guardia
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmitAsignacion}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="guardia_id">Guardia</Label>
                        <Select
                          value={formAsignacion.guardia_id}
                          onValueChange={(value) =>
                            setFormAsignacion({ ...formAsignacion, guardia_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un guardia" />
                          </SelectTrigger>
                          <SelectContent>
                            {guardias.map((guardia) => (
                              <SelectItem key={guardia.id} value={guardia.id}>
                                {guardia.nombre} {guardia.apellido}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="zona_id">Zona</Label>
                        <Select
                          value={formAsignacion.zona_id}
                          onValueChange={(value) =>
                            setFormAsignacion({ ...formAsignacion, zona_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una zona" />
                          </SelectTrigger>
                          <SelectContent>
                            {zonas.filter(z => z.activo).map((zona) => (
                              <SelectItem key={zona.id} value={zona.id}>
                                {zona.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="fecha_inicio">Fecha de Inicio</Label>
                        <Input
                          id="fecha_inicio"
                          type="date"
                          value={formAsignacion.fecha_inicio}
                          onChange={(e) =>
                            setFormAsignacion({ ...formAsignacion, fecha_inicio: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="fecha_fin">Fecha de Fin (Opcional)</Label>
                        <Input
                          id="fecha_fin"
                          type="date"
                          value={formAsignacion.fecha_fin}
                          onChange={(e) =>
                            setFormAsignacion({ ...formAsignacion, fecha_fin: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Crear Asignación</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {asignaciones.map((asignacion) => (
                <Card key={asignacion.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {asignacion.guardia?.nombre} {asignacion.guardia?.apellido}
                          </h3>
                          <span className="text-sm text-muted-foreground">
                            - {asignacion.zona?.nombre}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>
                            Desde: {new Date(asignacion.fecha_inicio).toLocaleDateString('es-AR')}
                          </p>
                          {asignacion.fecha_fin ? (
                            <p>
                              Hasta: {new Date(asignacion.fecha_fin).toLocaleDateString('es-AR')}
                            </p>
                          ) : (
                            <p>Hasta: Indefinido</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            asignacion.activo
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {asignacion.activo ? 'Activo' : 'Inactivo'}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteAsignacion(asignacion.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {asignaciones.length === 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay asignaciones creadas aún</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="alertas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Alertas de Zonas
                </CardTitle>
                <CardDescription>
                  Alertas cuando guardias entran o salen de sus zonas asignadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alertas.map((alerta) => (
                    <Card key={alerta.id} className="border-l-4 border-l-orange-500">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">
                              Alerta de {alerta.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Guardia ID: {alerta.guardia_id}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Zona ID: {alerta.zona_id}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(alerta.timestamp).toLocaleString('es-AR')}
                            </p>
                          </div>
                          {!alerta.resuelta && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolverAlerta(alerta.id)}
                            >
                              Resolver
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {alertas.length === 0 && (
                    <div className="text-center text-muted-foreground py-12">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay alertas pendientes</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}
