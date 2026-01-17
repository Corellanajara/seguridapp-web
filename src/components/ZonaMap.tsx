import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Polygon, Circle, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Zona } from '@/types'

// Fix para los iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface ZonaMapProps {
  zonas?: Zona[]
  modoEdicion?: boolean
  onZonaCreada?: (zona: { tipo: 'poligono' | 'circulo'; coordenadas: string }) => void
  center?: [number, number]
  zoom?: number
}

function DrawingHandler({
  modoEdicion,
  onZonaCreada,
}: {
  modoEdicion?: boolean
  onZonaCreada?: (zona: { tipo: 'poligono' | 'circulo'; coordenadas: string }) => void
}) {
  const [puntos, setPuntos] = useState<[number, number][]>([])
  const [centro, setCentro] = useState<[number, number] | null>(null)
  const [radio, setRadio] = useState<number>(100)
  const [tipo, setTipo] = useState<'poligono' | 'circulo'>('poligono')
  const map = useMap()

  useMapEvents({
    click(e) {
      if (!modoEdicion || !onZonaCreada) return

      if (tipo === 'poligono') {
        const nuevoPunto: [number, number] = [e.latlng.lat, e.latlng.lng]
        setPuntos((prev) => [...prev, nuevoPunto])
      } else if (tipo === 'circulo') {
        if (!centro) {
          setCentro([e.latlng.lat, e.latlng.lng])
        } else {
          // Segundo click: crear círculo
          const coordenadas = JSON.stringify({
            lat: centro[0],
            lng: centro[1],
            radio: radio,
          })
          onZonaCreada({ tipo: 'circulo', coordenadas })
          setCentro(null)
        }
      }
    },
  })

  // Finalizar polígono con doble click
  useEffect(() => {
    if (!modoEdicion || tipo !== 'poligono' || puntos.length < 3) return

    const handleDoubleClick = () => {
      if (puntos.length >= 3 && onZonaCreada) {
        const coordenadas = JSON.stringify(
          puntos.map((p) => ({ lat: p[0], lng: p[1] }))
        )
        onZonaCreada({ tipo: 'poligono', coordenadas })
        setPuntos([])
      }
    }

    const mapElement = map.getContainer()
    mapElement.addEventListener('dblclick', handleDoubleClick)

    return () => {
      mapElement.removeEventListener('dblclick', handleDoubleClick)
    }
  }, [puntos, modoEdicion, tipo, onZonaCreada, map])

  return null
}

export default function ZonaMap({
  zonas = [],
  modoEdicion = false,
  onZonaCreada,
  center = [-34.6037, -58.3816],
  zoom = 13,
}: ZonaMapProps) {
  const [puntosTemporales, setPuntosTemporales] = useState<[number, number][]>([])

  const handleZonaCreada = (zona: { tipo: 'poligono' | 'circulo'; coordenadas: string }) => {
    if (onZonaCreada) {
      onZonaCreada(zona)
    }
    setPuntosTemporales([])
  }

  const renderZona = (zona: Zona) => {
    try {
      const coordenadas = JSON.parse(zona.coordenadas)

      if (zona.tipo === 'circulo') {
        const { lat, lng, radio } = coordenadas
        return (
          <Circle
            key={zona.id}
            center={[lat, lng]}
            radius={radio}
            pathOptions={{
              color: zona.activo ? '#3b82f6' : '#9ca3af',
              fillColor: zona.activo ? '#3b82f6' : '#9ca3af',
              fillOpacity: 0.2,
              weight: 2,
            }}
          />
        )
      } else {
        // Polígono
        const puntos = Array.isArray(coordenadas)
          ? coordenadas.map((p: { lat: number; lng: number }) => [p.lat, p.lng] as [number, number])
          : []
        
        if (puntos.length < 3) return null

        return (
          <Polygon
            key={zona.id}
            positions={puntos}
            pathOptions={{
              color: zona.activo ? '#3b82f6' : '#9ca3af',
              fillColor: zona.activo ? '#3b82f6' : '#9ca3af',
              fillOpacity: 0.2,
              weight: 2,
            }}
          />
        )
      }
    } catch (error) {
      console.error('Error al renderizar zona:', error)
      return null
    }
  }

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
      <DrawingHandler modoEdicion={modoEdicion} onZonaCreada={handleZonaCreada} />
      {zonas.map(renderZona)}
      {puntosTemporales.length > 0 && (
        <Polygon
          positions={puntosTemporales}
          pathOptions={{
            color: '#10b981',
            fillColor: '#10b981',
            fillOpacity: 0.2,
            weight: 2,
            dashArray: '5, 5',
          }}
        />
      )}
    </MapContainer>
  )
}
