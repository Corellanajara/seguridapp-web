import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { HistorialUbicacion } from '@/types'

// Fix para los iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface RutaMapProps {
  historial: HistorialUbicacion[]
  center?: [number, number]
  zoom?: number
  mostrarMarcadores?: boolean
}

function MapUpdater({ historial }: { historial: HistorialUbicacion[] }) {
  const map = useMap()

  useEffect(() => {
    if (historial.length === 0) return

    const puntos = historial
      .filter((h) => h.latitud && h.longitud)
      .map((h) => [h.latitud, h.longitud] as [number, number])

    if (puntos.length > 0) {
      const bounds = L.latLngBounds(puntos)
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [historial, map])

  return null
}

export default function RutaMap({
  historial,
  center = [-34.6037, -58.3816],
  zoom = 13,
  mostrarMarcadores = false,
}: RutaMapProps) {
  // Convertir historial a puntos para la línea
  const puntos = historial
    .filter((h) => h.latitud && h.longitud)
    .map((h) => [h.latitud, h.longitud] as [number, number])

  // Obtener punto inicial y final
  const puntoInicial = puntos.length > 0 ? puntos[0] : null
  const puntoFinal = puntos.length > 0 ? puntos[puntos.length - 1] : null

  // Crear iconos personalizados
  const iconoInicio = L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: #10b981;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
      ">
        I
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })

  const iconoFin = L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: #ef4444;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
      ">
        F
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater historial={historial} />
      
      {/* Línea de la ruta */}
      {puntos.length > 1 && (
        <Polyline
          positions={puntos}
          pathOptions={{
            color: '#3b82f6',
            weight: 4,
            opacity: 0.7,
          }}
        />
      )}

      {/* Marcador de inicio */}
      {puntoInicial && (
        <Marker position={puntoInicial} icon={iconoInicio} />
      )}

      {/* Marcador de fin */}
      {puntoFinal && puntoFinal !== puntoInicial && (
        <Marker position={puntoFinal} icon={iconoFin} />
      )}

      {/* Marcadores intermedios (opcional) */}
      {mostrarMarcadores &&
        puntos.slice(1, -1).map((punto, index) => (
          <Marker
            key={index}
            position={punto}
            icon={L.divIcon({
              className: 'custom-marker',
              html: `
                <div style="
                  background-color: #3b82f6;
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  border: 2px solid white;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                "></div>
              `,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
          />
        ))}
    </MapContainer>
  )
}
