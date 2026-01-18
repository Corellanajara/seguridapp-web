import { useEffect, useState } from 'react'
import { reportesService, ReporteAsistencias, ReporteHorasTrabajadas, EstadisticasPuntualidad } from '@/services/reportes'
import { guardiasService } from '@/services/guardias'
import { Guardia } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Download, Loader2, Calendar, Users, Clock, TrendingUp } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function Reportes() {
  const { toast } = useToast()
  const [guardias, setGuardias] = useState<Guardia[]>([])
  const [loading, setLoading] = useState(false)
  
  // Filtros
  const [guardiaId, setGuardiaId] = useState<string>('all')
  const [fechaInicio, setFechaInicio] = useState<string>('')
  const [fechaFin, setFechaFin] = useState<string>('')

  // Datos de reportes
  const [reporteAsistencias, setReporteAsistencias] = useState<ReporteAsistencias[]>([])
  const [reporteHoras, setReporteHoras] = useState<ReporteHorasTrabajadas[]>([])
  const [estadisticas, setEstadisticas] = useState<EstadisticasPuntualidad[]>([])

  useEffect(() => {
    loadGuardias()
    // Establecer fechas por defecto (último mes)
    const hoy = new Date()
    const haceUnMes = new Date()
    haceUnMes.setMonth(haceUnMes.getMonth() - 1)
    setFechaInicio(haceUnMes.toISOString().split('T')[0])
    setFechaFin(hoy.toISOString().split('T')[0])
  }, [])

  const loadGuardias = async () => {
    try {
      const data = await guardiasService.getAll()
      setGuardias(data.filter(g => g.activo))
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const cargarReporteAsistencias = async () => {
    setLoading(true)
    try {
      const data = await reportesService.getReporteAsistencias(
        guardiaId === 'all' ? undefined : guardiaId,
        fechaInicio || undefined,
        fechaFin || undefined
      )
      setReporteAsistencias(data)
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

  const cargarReporteHoras = async () => {
    setLoading(true)
    try {
      const data = await reportesService.getReporteHorasTrabajadas(
        guardiaId === 'all' ? undefined : guardiaId,
        fechaInicio || undefined,
        fechaFin || undefined
      )
      setReporteHoras(data)
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

  const cargarEstadisticas = async () => {
    setLoading(true)
    try {
      const data = await reportesService.getEstadisticasPuntualidad(
        guardiaId === 'all' ? undefined : guardiaId,
        fechaInicio || undefined,
        fechaFin || undefined
      )
      setEstadisticas(data)
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

  const exportarAsistencias = () => {
    reportesService.exportarACSV(reporteAsistencias, `reporte_asistencias_${Date.now()}.csv`)
    toast({
      title: 'Éxito',
      description: 'Reporte exportado correctamente',
    })
  }

  const exportarHoras = () => {
    reportesService.exportarACSV(reporteHoras, `reporte_horas_${Date.now()}.csv`)
    toast({
      title: 'Éxito',
      description: 'Reporte exportado correctamente',
    })
  }

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reportes y Estadísticas</h1>
          <p className="text-muted-foreground">
            Genera reportes de asistencias, horas trabajadas y estadísticas
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="guardia">Guardia</Label>
                <Select value={guardiaId} onValueChange={setGuardiaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los guardias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los guardias</SelectItem>
                    {guardias.map((guardia) => (
                      <SelectItem key={guardia.id} value={guardia.id}>
                        {guardia.nombre} {guardia.apellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
                <Input
                  id="fecha_inicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fecha_fin">Fecha Fin</Label>
                <Input
                  id="fecha_fin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    cargarReporteAsistencias()
                    cargarReporteHoras()
                    cargarEstadisticas()
                  }}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Generar Reportes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="asistencias" className="space-y-4">
          <TabsList>
            <TabsTrigger value="asistencias">Asistencias</TabsTrigger>
            <TabsTrigger value="horas">Horas Trabajadas</TabsTrigger>
            <TabsTrigger value="puntualidad">Puntualidad</TabsTrigger>
          </TabsList>

          <TabsContent value="asistencias" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Reporte de Asistencias
                    </CardTitle>
                    <CardDescription>
                      Resumen de asistencias por guardia
                    </CardDescription>
                  </div>
                  {reporteAsistencias.length > 0 && (
                    <Button onClick={exportarAsistencias} variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Exportar CSV
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : reporteAsistencias.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay datos para mostrar. Aplica filtros y genera el reporte.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Guardia</th>
                          <th className="text-right p-2">Total</th>
                          <th className="text-right p-2">Entradas</th>
                          <th className="text-right p-2">Salidas</th>
                          <th className="text-left p-2">Primera Asistencia</th>
                          <th className="text-left p-2">Última Asistencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reporteAsistencias.map((reporte) => (
                          <tr key={reporte.guardia_id} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{reporte.guardia_nombre}</td>
                            <td className="text-right p-2">{reporte.total_asistencias}</td>
                            <td className="text-right p-2">{reporte.total_entradas}</td>
                            <td className="text-right p-2">{reporte.total_salidas}</td>
                            <td className="p-2 text-sm text-muted-foreground">
                              {reporte.primera_asistencia
                                ? new Date(reporte.primera_asistencia).toLocaleDateString('es-AR')
                                : '-'}
                            </td>
                            <td className="p-2 text-sm text-muted-foreground">
                              {reporte.ultima_asistencia
                                ? new Date(reporte.ultima_asistencia).toLocaleDateString('es-AR')
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="horas" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Reporte de Horas Trabajadas
                    </CardTitle>
                    <CardDescription>
                      Horas trabajadas por guardia y fecha
                    </CardDescription>
                  </div>
                  {reporteHoras.length > 0 && (
                    <Button onClick={exportarHoras} variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Exportar CSV
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : reporteHoras.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay datos para mostrar. Aplica filtros y genera el reporte.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Guardia</th>
                          <th className="text-left p-2">Fecha</th>
                          <th className="text-right p-2">Horas Trabajadas</th>
                          <th className="text-right p-2">Horas Extras</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reporteHoras.map((reporte, index) => (
                          <tr key={`${reporte.guardia_id}_${reporte.fecha}_${index}`} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{reporte.guardia_nombre}</td>
                            <td className="p-2">{new Date(reporte.fecha).toLocaleDateString('es-AR')}</td>
                            <td className="text-right p-2">{reporte.horas_trabajadas.toFixed(2)}</td>
                            <td className="text-right p-2">
                              {reporte.horas_extras ? reporte.horas_extras.toFixed(2) : '0.00'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="puntualidad" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Estadísticas de Puntualidad
                </CardTitle>
                <CardDescription>
                  Análisis de puntualidad por guardia
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : estadisticas.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay datos para mostrar. Aplica filtros y genera el reporte.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Guardia</th>
                          <th className="text-right p-2">Total Días</th>
                          <th className="text-right p-2">Días Puntual</th>
                          <th className="text-right p-2">Días Tarde</th>
                          <th className="text-right p-2">Días Falta</th>
                          <th className="text-right p-2">% Puntualidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {estadisticas.map((estadistica) => (
                          <tr key={estadistica.guardia_id} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{estadistica.guardia_nombre}</td>
                            <td className="text-right p-2">{estadistica.total_dias}</td>
                            <td className="text-right p-2">{estadistica.dias_puntual}</td>
                            <td className="text-right p-2">{estadistica.dias_tarde}</td>
                            <td className="text-right p-2">{estadistica.dias_falta}</td>
                            <td className="text-right p-2">
                              {estadistica.porcentaje_puntualidad.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  )
}
