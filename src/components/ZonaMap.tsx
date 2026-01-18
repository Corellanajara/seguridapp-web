import { useEffect, useState, useCallback, MutableRefObject } from 'react'
import { MapContainer, TileLayer, Polygon, Circle, useMap, useMapEvents, Marker, Polyline } from 'react-leaflet'
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
  tipoZona?: 'poligono' | 'circulo'
  onPuntosCountChange?: (count: number) => void
  finalizarPoligonoRef?: MutableRefObject<(() => void) | null>
}

function DrawingHandler({
  modoEdicion,
  onZonaCreada,
  tipoZona = 'poligono',
  onPuntosChange,
  onCentroChange,
  onRadioChange,
  finalizarPoligonoRef,
  onPuntosCountChange,
}: {
  modoEdicion?: boolean
  onZonaCreada?: (zona: { tipo: 'poligono' | 'circulo'; coordenadas: string }) => void
  tipoZona?: 'poligono' | 'circulo'
  onPuntosChange?: (puntos: [number, number][]) => void
  onCentroChange?: (centro: [number, number] | null) => void
  onRadioChange?: (radio: number) => void
  finalizarPoligonoRef?: MutableRefObject<(() => void) | null>
  onPuntosCountChange?: (count: number) => void
}) {
  const [puntos, setPuntos] = useState<[number, number][]>([])
  const [centro, setCentro] = useState<[number, number] | null>(null)

  // Calcular distancia entre dos puntos en metros
  const calcularDistancia = (p1: [number, number], p2: [number, number]): number => {
    const R = 6371e3 // Radio de la Tierra en metros
    const φ1 = (p1[0] * Math.PI) / 180
    const φ2 = (p2[0] * Math.PI) / 180
    const Δφ = ((p2[0] - p1[0]) * Math.PI) / 180
    const Δλ = ((p2[1] - p1[1]) * Math.PI) / 180

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  useMapEvents({
    click(e) {
      if (!modoEdicion) return

      if (tipoZona === 'poligono') {
        const nuevoPunto: [number, number] = [e.latlng.lat, e.latlng.lng]
        setPuntos((prevPuntos) => {
          return [...prevPuntos, nuevoPunto]
        })
      } else if (tipoZona === 'circulo' && onZonaCreada) {
        if (!centro) {
          // Primer click: establecer centro
          const nuevoCentro: [number, number] = [e.latlng.lat, e.latlng.lng]
          setCentro(nuevoCentro)
          if (onCentroChange) onCentroChange(nuevoCentro)
        } else {
          // Segundo click: calcular radio y crear círculo
          const nuevoPunto: [number, number] = [e.latlng.lat, e.latlng.lng]
          const distancia = calcularDistancia(centro, nuevoPunto)
          
          if (onRadioChange) onRadioChange(distancia)
          
          // Crear la zona después de un pequeño delay para que se vea el círculo temporal
          setTimeout(() => {
            const coordenadas = JSON.stringify({
              lat: centro[0],
              lng: centro[1],
              radio: distancia,
            })
            onZonaCreada({ tipo: 'circulo', coordenadas })
            setCentro(null)
            if (onCentroChange) onCentroChange(null)
            if (onRadioChange) onRadioChange(0)
          }, 100)
        }
      }
    },
  })

  // Exponer función para finalizar polígono
  const finalizarPoligono = useCallback(() => {
    if (tipoZona === 'poligono' && onZonaCreada) {
      setPuntos((currentPuntos) => {
        if (currentPuntos.length >= 3) {
          const coordenadas = JSON.stringify(
            currentPuntos.map((p) => ({ lat: p[0], lng: p[1] }))
          )
          onZonaCreada({ tipo: 'poligono', coordenadas })
          if (onPuntosChange) onPuntosChange([])
          if (onPuntosCountChange) onPuntosCountChange(0)
          return []
        }
        return currentPuntos
      })
    }
  }, [tipoZona, onZonaCreada, onPuntosChange, onPuntosCountChange])

  // Exponer función a través de ref
  useEffect(() => {
    if (finalizarPoligonoRef) {
      finalizarPoligonoRef.current = finalizarPoligono
    }
    return () => {
      if (finalizarPoligonoRef) {
        finalizarPoligonoRef.current = null
      }
    }
  }, [finalizarPoligono, finalizarPoligonoRef])

  // Sincronizar puntos con el componente padre después del render
  useEffect(() => {
    if (tipoZona === 'poligono') {
      if (onPuntosChange) {
        onPuntosChange(puntos)
      }
      if (onPuntosCountChange) {
        onPuntosCountChange(puntos.length)
      }
    }
  }, [puntos, tipoZona, onPuntosChange, onPuntosCountChange])

  // Reset cuando cambia el tipo de zona
  useEffect(() => {
    setPuntos([])
    setCentro(null)
    if (onPuntosChange) onPuntosChange([])
    if (onCentroChange) onCentroChange(null)
    if (onRadioChange) onRadioChange(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoZona])

  return null
}

// Componente para actualizar el centro del mapa dinámicamente
function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  
  return null
}

export default function ZonaMap({
  zonas = [],
  modoEdicion = false,
  onZonaCreada,
  center = [-34.6037, -58.3816],
  zoom = 13,
  tipoZona = 'poligono',
  onPuntosCountChange,
  finalizarPoligonoRef,
}: ZonaMapProps) {
  const [puntosTemporales, setPuntosTemporales] = useState<[number, number][]>([])
  const [centroTemporal, setCentroTemporal] = useState<[number, number] | null>(null)
  const [radioTemporal, setRadioTemporal] = useState<number>(0)
  const [zonaTemporal, setZonaTemporal] = useState<{ tipo: 'poligono' | 'circulo'; coordenadas: string } | null>(null)

  const handleZonaCreada = (zona: { tipo: 'poligono' | 'circulo'; coordenadas: string }) => {
    // Guardar la zona temporal para mostrarla
    setZonaTemporal(zona)
    setPuntosTemporales([])
    setCentroTemporal(null)
    setRadioTemporal(0)
    
    if (onZonaCreada) {
      onZonaCreada(zona)
    }
  }

  // Limpiar estados temporales cuando cambia el tipo de zona o se desactiva el modo de edición
  useEffect(() => {
    if (!modoEdicion) {
      setPuntosTemporales([])
      setCentroTemporal(null)
      setRadioTemporal(0)
      // No limpiar zonaTemporal aquí, se mantiene para mostrar la zona creada
    }
  }, [modoEdicion, tipoZona])
  
  // Limpiar zona temporal cuando se reciben nuevas zonas (después de guardar)
  useEffect(() => {
    if (zonas.length > 0 && zonaTemporal) {
      // Si hay zonas guardadas, limpiar la temporal después de un delay
      const timer = setTimeout(() => {
        setZonaTemporal(null)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [zonas.length])

  // Crear icono para marcadores de puntos
  const crearIconoPunto = (index?: number) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: #10b981;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
        ">
          ${index !== undefined ? index + 1 : ''}
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })
  }

  // Crear icono para el centro del círculo
  const crearIconoCentro = () => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: #3b82f6;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        "></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })
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
      <MapCenterUpdater center={center} />
      <DrawingHandler 
        modoEdicion={modoEdicion} 
        onZonaCreada={handleZonaCreada}
        tipoZona={tipoZona}
        onPuntosChange={(puntos) => {
          setPuntosTemporales(puntos)
        }}
        onCentroChange={setCentroTemporal}
        onRadioChange={setRadioTemporal}
        finalizarPoligonoRef={finalizarPoligonoRef}
        onPuntosCountChange={onPuntosCountChange}
      />
      {zonas.map(renderZona)}
      
      {/* Mostrar zona temporal recién creada */}
      {zonaTemporal && (() => {
        try {
          const coordenadas = JSON.parse(zonaTemporal.coordenadas)
          
          if (zonaTemporal.tipo === 'circulo') {
            const { lat, lng, radio } = coordenadas
            return (
              <Circle
                key="zona-temporal"
                center={[lat, lng]}
                radius={radio}
                pathOptions={{
                  color: '#10b981',
                  fillColor: '#10b981',
                  fillOpacity: 0.3,
                  weight: 3,
                }}
              />
            )
          } else {
            const puntos = Array.isArray(coordenadas)
              ? coordenadas.map((p: { lat: number; lng: number }) => [p.lat, p.lng] as [number, number])
              : []
            
            if (puntos.length < 3) return null

            return (
              <Polygon
                key="zona-temporal"
                positions={puntos}
                pathOptions={{
                  color: '#10b981',
                  fillColor: '#10b981',
                  fillOpacity: 0.3,
                  weight: 3,
                }}
              />
            )
          }
        } catch (error) {
          return null
        }
      })()}
      
      {/* Mostrar polígono temporal mientras se dibuja */}
      {modoEdicion && tipoZona === 'poligono' && puntosTemporales.length > 0 && (
        <>
          {/* Líneas del polígono */}
          {puntosTemporales.length > 1 && (
            <Polyline
              positions={puntosTemporales}
              pathOptions={{
                color: '#10b981',
                weight: 3,
                opacity: 0.7,
                dashArray: '5, 5',
              }}
            />
          )}
          {/* Marcadores en cada punto */}
          {puntosTemporales.map((punto, index) => (
            <Marker
              key={index}
              position={punto}
              icon={crearIconoPunto(index)}
            />
          ))}
        </>
      )}

      {/* Mostrar círculo temporal mientras se dibuja */}
      {modoEdicion && tipoZona === 'circulo' && centroTemporal && (
        <>
          {/* Marcador del centro */}
          <Marker
            position={centroTemporal}
            icon={crearIconoCentro()}
          />
          {/* Círculo temporal */}
          {radioTemporal > 0 && (
            <Circle
              center={centroTemporal}
              radius={radioTemporal}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.2,
                weight: 3,
                dashArray: '5, 5',
              }}
            />
          )}
        </>
      )}
    </MapContainer>
  )
}
