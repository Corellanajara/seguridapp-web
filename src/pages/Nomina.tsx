import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { nominaService } from '@/services/nomina'
import { guardiasService } from '@/services/guardias'
import { Guardia } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, FileText, Loader2 } from 'lucide-react'
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

export default function Nomina() {
  const { toast } = useToast()
  const [guardias, setGuardias] = useState<Guardia[]>([])
  const [guardiaId, setGuardiaId] = useState<string>('all')
  const [fechaInicio, setFechaInicio] = useState<string>('')
  const [fechaFin, setFechaFin] = useState<string>('')
  const [formato, setFormato] = useState<'csv' | 'excel' | 'json'>('csv')
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    const hoy = new Date()
    const haceUnMes = new Date()
    haceUnMes.setMonth(haceUnMes.getMonth() - 1)
    setFechaInicio(haceUnMes.toISOString().split('T')[0])
    setFechaFin(hoy.toISOString().split('T')[0])

    loadGuardias()
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

  const handleExportar = async () => {
    setExportando(true)
    try {
      await nominaService.exportarHorasTrabajadas(
        guardiaId === 'all' ? undefined : guardiaId,
        fechaInicio || undefined,
        fechaFin || undefined,
        formato
      )
      toast({
        title: 'Éxito',
        description: 'Datos exportados correctamente',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setExportando(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Exportación de Nómina</h1>
          <p className="text-muted-foreground">
            Exporta horas trabajadas para sistemas de nómina
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Configuración de Exportación
            </CardTitle>
            <CardDescription>
              Selecciona los parámetros para la exportación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="guardia">Guardia</Label>
                <Select value={guardiaId} onValueChange={setGuardiaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
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
              <div className="grid gap-2">
                <Label htmlFor="formato">Formato</Label>
                <Select value={formato} onValueChange={(value: any) => setFormato(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="excel">Excel (CSV)</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={handleExportar} disabled={exportando}>
                {exportando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
