import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { IncidenteConDetalles } from '@/types'
import { MapPin, Clock, AlertTriangle, CheckCircle2, XCircle, Camera, User } from 'lucide-react'

interface IncidenteCardProps {
  incidente: IncidenteConDetalles
  onResolver?: (id: string) => void
  onCancelar?: (id: string) => void
  onVerDetalle?: (id: string) => void
}

const getEstadoColor = (estado: string) => {
  switch (estado) {
    case 'pendiente':
      return 'bg-yellow-100 text-yellow-800'
    case 'en_proceso':
      return 'bg-blue-100 text-blue-800'
    case 'resuelto':
      return 'bg-green-100 text-green-800'
    case 'cancelado':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getPrioridadColor = (prioridad?: string) => {
  switch (prioridad) {
    case 'critica':
      return 'bg-red-100 text-red-800'
    case 'alta':
      return 'bg-orange-100 text-orange-800'
    case 'media':
      return 'bg-yellow-100 text-yellow-800'
    case 'baja':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export default function IncidenteCard({
  incidente,
  onResolver,
  onCancelar,
  onVerDetalle,
}: IncidenteCardProps) {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Avatar>
              <AvatarImage src={incidente.guardia?.foto_url} />
              <AvatarFallback>
                {incidente.guardia?.nombre.charAt(0)}
                {incidente.guardia?.apellido.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                {incidente.tipo?.nombre || 'Incidente'}
              </CardTitle>
              <CardDescription>
                {incidente.guardia?.nombre} {incidente.guardia?.apellido}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <span className={`text-xs px-2 py-1 rounded-full ${getEstadoColor(incidente.estado)}`}>
              {incidente.estado === 'pendiente' && 'Pendiente'}
              {incidente.estado === 'en_proceso' && 'En Proceso'}
              {incidente.estado === 'resuelto' && 'Resuelto'}
              {incidente.estado === 'cancelado' && 'Cancelado'}
            </span>
            {incidente.prioridad && (
              <span className={`text-xs px-2 py-1 rounded-full ${getPrioridadColor(incidente.prioridad)}`}>
                {incidente.prioridad.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm">{incidente.descripcion}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {new Date(incidente.created_at).toLocaleString('es-AR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>
                {incidente.latitud.toFixed(6)}, {incidente.longitud.toFixed(6)}
              </span>
            </div>
            {incidente.foto_url && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Camera className="h-4 w-4" />
                <a
                  href={incidente.foto_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Ver foto
                </a>
              </div>
            )}
            {incidente.tipo?.severidad && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                <span>Severidad: {incidente.tipo.severidad}</span>
              </div>
            )}
          </div>

          {incidente.observaciones && (
            <div className="p-2 bg-muted rounded text-xs">
              <p className="font-medium mb-1">Observaciones:</p>
              <p className="text-muted-foreground">{incidente.observaciones}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {incidente.estado !== 'resuelto' && incidente.estado !== 'cancelado' && (
              <>
                {onResolver && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onResolver(incidente.id)}
                    className="flex-1"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Resolver
                  </Button>
                )}
                {onCancelar && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCancelar(incidente.id)}
                    className="flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                )}
              </>
            )}
            {onVerDetalle && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onVerDetalle(incidente.id)}
              >
                <User className="mr-2 h-4 w-4" />
                Ver Detalle
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
