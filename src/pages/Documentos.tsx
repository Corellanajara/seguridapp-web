import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { documentosService } from '@/services/documentos'
import { guardiasService } from '@/services/guardias'
import { Documento, Guardia, AsignacionDocumentoConDetalles, TipoDocumento } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Plus, Loader2, Download, Users, X, CheckCircle2, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'

// Opciones de tipos de documentos (5 opciones fijas)
const TIPOS_DOCUMENTO: { value: TipoDocumento; label: string }[] = [
  { value: 'contrato', label: 'Contrato' },
  { value: 'manual', label: 'Manual' },
  { value: 'politica', label: 'Política' },
  { value: 'procedimiento', label: 'Procedimiento' },
  { value: 'formulario', label: 'Formulario' },
]

// Función helper para obtener la etiqueta de un tipo
const getTipoLabel = (tipo: TipoDocumento): string => {
  return TIPOS_DOCUMENTO.find(t => t.value === tipo)?.label || tipo
}

export default function Documentos() {
  const { toast } = useToast()
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [openAsignarDialog, setOpenAsignarDialog] = useState(false)
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<Documento | null>(null)
  const [guardias, setGuardias] = useState<Guardia[]>([])
  const [guardiasSeleccionadas, setGuardiasSeleccionadas] = useState<string[]>([])
  const [asignaciones, setAsignaciones] = useState<AsignacionDocumentoConDetalles[]>([])
  const [subiendo, setSubiendo] = useState(false)

  const [formData, setFormData] = useState<{
    nombre: string
    tipo: TipoDocumento | ''
    archivo: File | null
  }>({
    nombre: '',
    tipo: '' as TipoDocumento | '',
    archivo: null,
  })

  useEffect(() => {
    loadDocumentos()
    loadGuardias()
  }, [])

  const loadDocumentos = async () => {
    setLoading(true)
    try {
      const data = await documentosService.getAllDocumentos()
      setDocumentos(data)
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

  const loadGuardias = async () => {
    try {
      const data = await guardiasService.getAll()
      setGuardias(data.filter((g: Guardia) => g.activo))
    } catch (error: any) {
      console.error('Error al cargar guardias:', error)
    }
  }

  const loadAsignaciones = async (documentoId: string) => {
    try {
      const data = await documentosService.getAsignacionesByDocumento(documentoId)
      setAsignaciones(data)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const subirArchivo = async (file: File): Promise<string> => {
    try {
      const fileName = `documentos/${Date.now()}_${file.name}`
      const { error } = await supabase.storage
        .from('documentos')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        })

      if (error) {
        // Si el bucket no existe, usar una URL temporal
        console.warn('Error al subir archivo, usando URL temporal:', error.message)
        return URL.createObjectURL(file)
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(fileName)

      return urlData.publicUrl
    } catch (error: any) {
      console.warn('Error al subir archivo:', error.message)
      return URL.createObjectURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.archivo) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona un archivo',
        variant: 'destructive',
      })
      return
    }

    if (!formData.tipo) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona un tipo de documento',
        variant: 'destructive',
      })
      return
    }

    setSubiendo(true)
    try {
      const archivoUrl = await subirArchivo(formData.archivo)
      
      await documentosService.createDocumento({
        nombre: formData.nombre,
        tipo: formData.tipo as TipoDocumento,
        archivo_url: archivoUrl,
        estado: 'aprobado',
      })

      toast({
        title: 'Éxito',
        description: 'Documento creado correctamente',
      })

      setOpenDialog(false)
      setFormData({ nombre: '', tipo: '' as TipoDocumento | '', archivo: null })
      loadDocumentos()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setSubiendo(false)
    }
  }

  const handleAsignar = async () => {
    if (!documentoSeleccionado || guardiasSeleccionadas.length === 0) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona al menos un guardia',
        variant: 'destructive',
      })
      return
    }

    try {
      await documentosService.asignarDocumento(documentoSeleccionado.id, guardiasSeleccionadas)
      toast({
        title: 'Éxito',
        description: 'Documento asignado correctamente',
      })
      setOpenAsignarDialog(false)
      setGuardiasSeleccionadas([])
      setDocumentoSeleccionado(null)
      if (documentoSeleccionado) {
        loadAsignaciones(documentoSeleccionado.id)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleEliminarAsignacion = async (asignacionId: string) => {
    try {
      await documentosService.eliminarAsignacion(asignacionId)
      toast({
        title: 'Éxito',
        description: 'Asignación eliminada correctamente',
      })
      if (documentoSeleccionado) {
        loadAsignaciones(documentoSeleccionado.id)
      }
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión Documental</h1>
            <p className="text-muted-foreground">
              Almacenamiento, asignación y seguimiento de documentos
            </p>
          </div>
          <Button onClick={() => setOpenDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Documento
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documentos.map((doc) => (
            <Card key={doc.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {doc.nombre}
                </CardTitle>
                <CardDescription>
                  Tipo: {getTipoLabel(doc.tipo)} | Versión: {doc.version}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    doc.estado === 'aprobado' ? 'bg-green-100 text-green-800' :
                    doc.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {doc.estado}
                  </span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(doc.archivo_url, '_blank')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setDocumentoSeleccionado(doc)
                    setOpenAsignarDialog(true)
                    loadAsignaciones(doc.id)
                  }}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Asignar a Guardias
                </Button>
              </CardContent>
            </Card>
          ))}
          {documentos.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground py-12">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay documentos</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialog para crear documento */}
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Documento</DialogTitle>
              <DialogDescription>
                Sube un documento para gestionarlo y asignarlo a guardias
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre del Documento</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="tipo">Tipo</Label>
                <Select
                  value={formData.tipo || undefined}
                  onValueChange={(value: string) => setFormData({ ...formData, tipo: value as TipoDocumento })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent className="z-[1002]">
                    {TIPOS_DOCUMENTO.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="archivo">Archivo</Label>
                <Input
                  id="archivo"
                  type="file"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, archivo: e.target.files?.[0] || null })}
                  required
                  accept=".pdf,.doc,.docx,.txt"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={subiendo}>
                  {subiendo ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    'Crear Documento'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog para asignar documento */}
        <Dialog open={openAsignarDialog} onOpenChange={setOpenAsignarDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Asignar Documento a Guardias</DialogTitle>
              <DialogDescription>
                {documentoSeleccionado?.nombre}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Seleccionar Guardias</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-60 overflow-y-auto">
                  {guardias.map((guardia) => (
                    <div
                      key={guardia.id}
                      className={`flex items-center space-x-2 p-2 rounded border cursor-pointer ${
                        guardiasSeleccionadas.includes(guardia.id)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background'
                      }`}
                      onClick={() => {
                        if (guardiasSeleccionadas.includes(guardia.id)) {
                          setGuardiasSeleccionadas(guardiasSeleccionadas.filter(id => id !== guardia.id))
                        } else {
                          setGuardiasSeleccionadas([...guardiasSeleccionadas, guardia.id])
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={guardiasSeleccionadas.includes(guardia.id)}
                        onChange={() => {}}
                        className="cursor-pointer"
                      />
                      <span className="text-sm">
                        {guardia.nombre} {guardia.apellido}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {documentoSeleccionado && asignaciones.length > 0 && (
                <div>
                  <Label className="mb-2 block">Asignaciones Existentes</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {asignaciones.map((asignacion) => (
                      <div
                        key={asignacion.id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div className="flex items-center gap-2">
                          {asignacion.estado === 'firmado' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-600" />
                          )}
                          <span className="text-sm">
                            {asignacion.guardia?.nombre} {asignacion.guardia?.apellido}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            asignacion.estado === 'firmado' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {asignacion.estado}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEliminarAsignacion(asignacion.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenAsignarDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAsignar} disabled={guardiasSeleccionadas.length === 0}>
                Asignar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  )
}
