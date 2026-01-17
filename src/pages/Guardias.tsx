import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import { guardiasService } from '@/services/guardias'
import { Guardia } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Plus, MapPin, Phone, Mail } from 'lucide-react'
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

export default function Guardias() {
  const [guardias, setGuardias] = useState<Guardia[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    activo: true,
  })

  useEffect(() => {
    loadGuardias()
  }, [])

  const loadGuardias = async () => {
    try {
      const data = await guardiasService.getAll()
      setGuardias(data)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await guardiasService.create(formData)
      toast({
        title: 'Éxito',
        description: 'Guardia creado correctamente',
      })
      setOpen(false)
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        activo: true,
      })
      loadGuardias()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const toggleActivo = async (id: string, activo: boolean) => {
    try {
      await guardiasService.update(id, { activo: !activo })
      toast({
        title: 'Éxito',
        description: `Guardia ${!activo ? 'activado' : 'desactivado'}`,
      })
      loadGuardias()
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
          <div className="text-lg">Cargando guardias...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Guardias</h1>
            <p className="text-muted-foreground">
              Gestión de guardias de seguridad
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Guardia
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Guardia</DialogTitle>
                <DialogDescription>
                  Completa los datos del nuevo guardia
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) =>
                        setFormData({ ...formData, nombre: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="apellido">Apellido</Label>
                    <Input
                      id="apellido"
                      value={formData.apellido}
                      onChange={(e) =>
                        setFormData({ ...formData, apellido: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) =>
                        setFormData({ ...formData, telefono: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Crear Guardia</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {guardias.map((guardia) => (
            <Card key={guardia.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={guardia.foto_url} />
                    <AvatarFallback>
                      {guardia.nombre.charAt(0)}
                      {guardia.apellido.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle>
                      {guardia.nombre} {guardia.apellido}
                    </CardTitle>
                    <CardDescription>{guardia.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {guardia.telefono && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{guardia.telefono}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{guardia.email}</span>
                  </div>
                  {guardia.latitud && guardia.longitud && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {guardia.latitud.toFixed(4)}, {guardia.longitud.toFixed(4)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        guardia.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {guardia.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActivo(guardia.id, guardia.activo)}
                      >
                        {guardia.activo ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Link to={`/guardias/${guardia.id}`}>
                        <Button size="sm">Ver Detalle</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  )
}

