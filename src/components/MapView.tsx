import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Guardia } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { User } from 'lucide-react'

// Fix para los iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface MapViewProps {
  guardias: Guardia[]
}

function MapUpdater({ guardias }: { guardias: Guardia[] }) {
  const map = useMap()

  useEffect(() => {
    if (guardias.length === 0) return

    const bounds = guardias
      .filter((g) => g.latitud && g.longitud)
      .map((g) => [g.latitud!, g.longitud!] as [number, number])

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [guardias, map])

  return null
}

export default function MapView({ guardias }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null)

  // Crear iconos personalizados para cada guardia
  const createCustomIcon = (guardia: Guardia) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${guardia.activo ? '#10b981' : '#6b7280'};
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 16px;
        ">
          ${guardia.nombre.charAt(0).toUpperCase()}
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    })
  }

  const defaultCenter: [number, number] = [-34.6037, -58.3816] // Buenos Aires por defecto

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater guardias={guardias} />
      {guardias
        .filter((g) => g.latitud && g.longitud && g.activo)
        .map((guardia) => (
          <Marker
            key={guardia.id}
            position={[guardia.latitud!, guardia.longitud!]}
            icon={createCustomIcon(guardia)}
          >
            <Popup>
              <Card className="w-64 border-0 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar>
                      <AvatarImage src={guardia.foto_url} />
                      <AvatarFallback>
                        {guardia.nombre.charAt(0)}
                        {guardia.apellido.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">
                        {guardia.nombre} {guardia.apellido}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {guardia.email}
                      </p>
                    </div>
                  </div>
                  {guardia.telefono && (
                    <p className="text-sm mb-2">
                      <strong>Teléfono:</strong> {guardia.telefono}
                    </p>
                  )}
                  {guardia.ultima_actualizacion && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Última actualización:{' '}
                      {new Date(guardia.ultima_actualizacion).toLocaleString('es-AR')}
                    </p>
                  )}
                  <Link to={`/guardias/${guardia.id}`}>
                    <Button size="sm" className="w-full" variant="outline">
                      <User className="mr-2 h-4 w-4" />
                      Ver Perfil
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  )
}

