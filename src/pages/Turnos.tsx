import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { turnosService } from '@/services/turnos'
import { guardiasService } from '@/services/guardias'
import { Turno, Horario, AsignacionTurno, AsignacionTurnoConDetalles, Guardia } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Clock, Users, Edit, Trash2, Loader2, CheckCircle2, XCircle } from 'lucide-react'
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

const DIAS_SEMANA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
]

export default function Turnos() {
  const { toast } = useToast()
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [asignaciones, setAsignaciones] = useState<AsignacionTurnoConDetalles[]>([])
  const [guardias, setGuardias] = useState<Guardia[]>([])
  const [loading, setLoading] = useState(true)
  const [openTurno, setOpenTurno] = useState(false)
  const [openAsignacion, setOpenAsignacion] = useState(false)
  const [editingTurno, setEditingTurno] = useState<Turno | null>(null)

  const [formTurno, setFormTurno] = useState({
    nombre: '',
    hora_inicio: '',
    hora_fin: '',
    activo: true,
  })

  const [formAsignacion, setFormAsignacion] = useState({
    guardia_id: '',
    turno_id: '',
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
      const [turnosData, asignacionesData, guardiasData] = await Promise.all([
        turnosService.getAllTurnos(),
        turnosService.getAllAsignaciones(),
        guardiasService.getAll(),
      ])
      setTurnos(turnosData)
      setAsignaciones(asignacionesData)
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

  const handleSubmitTurno = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingTurno) {
        await turnosService.updateTurno(editingTurno.id, formTurno)
        toast({
          title: 'Éxito',
          description: 'Turno actualizado correctamente',
        })
      } else {
        await turnosService.createTurno(formTurno)
        toast({
          title: 'Éxito',
          description: 'Turno creado correctamente',
        })
      }
      setOpenTurno(false)
      setEditingTurno(null)
      setFormTurno({
        nombre: '',
        hora_inicio: '',
        hora_fin: '',
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
      await turnosService.createAsignacion({
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
        turno_id: '',
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

  const handleEditTurno = (turno: Turno) => {
    setEditingTurno(turno)
    setFormTurno({
      nombre: turno.nombre,
      hora_inicio: turno.hora_inicio,
      hora_fin: turno.hora_fin,
      activo: turno.activo,
    })
    setOpenTurno(true)
  }

  const handleDeleteTurno = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este turno?')) return
    try {
      await turnosService.deleteTurno(id)
      toast({
        title: 'Éxito',
        description: 'Turno eliminado correctamente',
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
      await turnosService.deleteAsignacion(id)
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

  const toggleActivoAsignacion = async (id: string, activo: boolean) => {
    try {
      await turnosService.updateAsignacion(id, { activo: !activo })
      toast({
        title: 'Éxito',
        description: `Asignación ${!activo ? 'activada' : 'desactivada'}`,
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
          <h1 className="text-3xl font-bold">Turnos y Horarios</h1>
          <p className="text-muted-foreground">
            Gestión de turnos y asignación de horarios a guardias
          </p>
        </div>

        <Tabs defaultValue="turnos" className="space-y-4">
          <TabsList>
            <TabsTrigger value="turnos">Turnos</TabsTrigger>
            <TabsTrigger value="asignaciones">Asignaciones</TabsTrigger>
          </TabsList>

          <TabsContent value="turnos" className="space-y-4">
            <div className="flex items-center justify-between">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Turnos Disponibles
                  </CardTitle>
                  <CardDescription>
                    Define los turnos de trabajo (mañana, tarde, noche)
                  </CardDescription>
                </CardHeader>
              </Card>
              <Dialog open={openTurno} onOpenChange={(open) => {
                setOpenTurno(open)
                if (!open) {
                  setEditingTurno(null)
                  setFormTurno({
                    nombre: '',
                    hora_inicio: '',
                    hora_fin: '',
                    activo: true,
                  })
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Turno
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingTurno ? 'Editar Turno' : 'Crear Nuevo Turno'}
                    </DialogTitle>
                    <DialogDescription>
                      Define el nombre y horario del turno
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmitTurno}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="nombre">Nombre del Turno</Label>
                        <Input
                          id="nombre"
                          value={formTurno.nombre}
                          onChange={(e) =>
                            setFormTurno({ ...formTurno, nombre: e.target.value })
                          }
                          placeholder="Ej: Mañana, Tarde, Noche"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="hora_inicio">Hora de Inicio</Label>
                        <Input
                          id="hora_inicio"
                          type="time"
                          value={formTurno.hora_inicio}
                          onChange={(e) =>
                            setFormTurno({ ...formTurno, hora_inicio: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="hora_fin">Hora de Fin</Label>
                        <Input
                          id="hora_fin"
                          type="time"
                          value={formTurno.hora_fin}
                          onChange={(e) =>
                            setFormTurno({ ...formTurno, hora_fin: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">
                        {editingTurno ? 'Actualizar' : 'Crear'} Turno
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {turnos.map((turno) => (
                <Card key={turno.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{turno.nombre}</CardTitle>
                      {turno.activo ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <CardDescription>
                      {turno.hora_inicio} - {turno.hora_fin}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          turno.activo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {turno.activo ? 'Activo' : 'Inactivo'}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditTurno(turno)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteTurno(turno.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {turnos.length === 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay turnos creados aún</p>
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
                    Asignaciones de Turnos
                  </CardTitle>
                  <CardDescription>
                    Asigna turnos a los guardias con fechas de inicio y fin
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
                      Asigna un turno a un guardia
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
                        <Label htmlFor="turno_id">Turno</Label>
                        <Select
                          value={formAsignacion.turno_id}
                          onValueChange={(value) =>
                            setFormAsignacion({ ...formAsignacion, turno_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un turno" />
                          </SelectTrigger>
                          <SelectContent>
                            {turnos.filter(t => t.activo).map((turno) => (
                              <SelectItem key={turno.id} value={turno.id}>
                                {turno.nombre} ({turno.hora_inicio} - {turno.hora_fin})
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
                            - {asignacion.turno?.nombre}
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
                          <p>
                            Horario: {asignacion.turno?.hora_inicio} - {asignacion.turno?.hora_fin}
                          </p>
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
                          onClick={() => toggleActivoAsignacion(asignacion.id, asignacion.activo)}
                        >
                          {asignacion.activo ? 'Desactivar' : 'Activar'}
                        </Button>
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
        </Tabs>
      </div>
    </Layout>
  )
}
